import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2Storage';

const ALLOWED_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/', 'atuem/avatar/', 'atuem/atuem/avatar/'];
const CONTENT_TYPES: Record<string, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
};

export async function GET(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const originalKey = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeVideoKey(originalKey)) {
      return missingAnimationResponse(originalKey, [], filename, 'invalid-key');
    }

    const resolved = await resolveR2VideoObject(originalKey);

    if (!resolved.object?.body) {
      return missingAnimationResponse(originalKey, resolved.checked, filename, 'not-found');
    }

    const resolvedKey = resolved.key;
    const extension = String(resolvedKey || filename || '').split('.').pop()?.toLowerCase() || '';

    if (!CONTENT_TYPES[extension]) {
      return NextResponse.json({ error: 'Tipo de animacao nao permitido.' }, { status: 400 });
    }

    const bytes = await bodyToBytes(resolved.object.body);
    const size = bytes.length;
    const range = req.headers.get('range');
    const commonHeaders = {
      'Content-Type': CONTENT_TYPES[extension],
      'Content-Disposition': `inline; filename="${safeFilename(resolvedKey.split('/').pop() || filename)}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'X-QSE-R2-Key': resolvedKey,
    };

    if (range) {
      const parsed = parseRange(range, size);
      if (!parsed) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...commonHeaders,
            'Content-Range': `bytes */${size}`,
          },
        });
      }

      const chunk: Uint8Array = bytes.subarray(parsed.start, parsed.end + 1);
      return new NextResponse(chunk as BodyInit, {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${parsed.start}-${parsed.end}/${size}`,
        },
      });
    }

    return new NextResponse(bytes as BodyInit, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Length': String(size),
      },
    });
  } catch (error: any) {
    console.error('R2 animation proxy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar a animacao.' }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  const response = await GET(req, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function resolveR2VideoObject(key: string) {
  const checked: string[] = [];

  for (const candidate of keyCandidates(key)) {
    if (!isSafeVideoKey(candidate) || checked.includes(candidate)) continue;
    checked.push(candidate);
    const object = await getR2Object(candidate).catch(() => null);
    if (object?.body) return { key: candidate, object, checked };
  }

  return { key, object: null, checked };
}

function keyCandidates(key: string) {
  const variants = [key];

  if (key.startsWith('atuem/avatar/')) variants.push(key.replace(/^atuem\/avatar\//, 'atuem/atuem/avatar/'));
  if (key.startsWith('atuem/atuem/avatar/')) variants.push(key.replace(/^atuem\/atuem\/avatar\//, 'atuem/avatar/'));

  const avatarMatch = key.match(/^atuem\/(?:atuem\/)?avatar\/([^/]+)\/([^/]+\.(?:mp4|webm))$/i);
  if (avatarMatch) {
    const [, avatarKey, file] = avatarMatch;
    variants.push(`atuem/atuem/avatar/Padrao/${avatarKey}/${file}`);
    variants.push(`atuem/avatar/Padrao/${avatarKey}/${file}`);
  }

  return [...new Set(variants.filter(Boolean))];
}

function missingAnimationResponse(key: string, checked: string[], filename: string, reason: string) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
      'X-QSE-R2-Missing': reason,
      'X-QSE-R2-Key': key || filename || '',
      'X-QSE-R2-Checked': checked.slice(0, 8).join(','),
    },
  });
}

function parseRange(range: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || size <= 0) return null;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;

  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

async function bodyToBytes(body: BodyInit): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (typeof body === 'string') return new TextEncoder().encode(body);

  const stream = body as ReadableStream<Uint8Array>;
  if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
    }
    const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  }

  return new Uint8Array();
}

function isSafeVideoKey(key: string) {
  const lower = key.toLowerCase();
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  if (!(lower.endsWith('.webm') || lower.endsWith('.mp4'))) return false;
  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  return true;
}

function safeFilename(filename: string) {
  return String(filename || 'animacao.webm').replace(/[^a-zA-Z0-9._-]/g, '_');
}
