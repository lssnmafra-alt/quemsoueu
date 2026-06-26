import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2Storage';

const DENIED_PREFIXES = ['private/', 'secrets/'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.mpeg', '.mpga', '.ogg', '.oga', '.wav', '.wave', '.m4a', '.aac', '.flac', '.webm', '.mp4', '.glb'];

export async function GET(req: NextRequest) {
  try {
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeKey(key)) {
      return NextResponse.json({ error: 'Arquivo nao permitido.' }, { status: 400 });
    }

    const resolved = await getR2ObjectWithFallback(key);

    if (!resolved.object?.body) {
      return NextResponse.json({ error: 'Arquivo nao encontrado no R2.', key, triedKeys: resolved.triedKeys }, { status: 404 });
    }

    return new NextResponse(resolved.object.body as any, {
      headers: {
        'Content-Type': resolved.object.httpMetadata?.contentType || contentTypeForKey(resolved.key),
        'Cache-Control': cacheForKey(resolved.key),
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-R2-Key': resolved.key,
      },
    });
  } catch (error: any) {
    console.error('R2 file proxy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o arquivo.' }, { status: 500 });
  }
}

async function getR2ObjectWithFallback(key: string) {
  const triedKeys = uniqueKeys([key, ...alternateKeys(key)]).filter(isSafeKey);

  for (const candidate of triedKeys) {
    const object = await getR2Object(candidate).catch(() => null);
    if (object?.body) return { key: candidate, object, triedKeys };
  }

  return { key, object: null, triedKeys };
}

function alternateKeys(key: string) {
  const keys: string[] = [];

  if (key.startsWith('atuem/atuem/')) keys.push(key.replace(/^atuem\/atuem\//, 'atuem/'));
  else if (key.startsWith('atuem/')) keys.push(key.replace(/^atuem\//, 'atuem/atuem/'));

  if (key.includes('/Padrao/')) keys.push(key.replace('/Padrao/', '/Padrão/'));
  if (key.includes('/Padrão/')) keys.push(key.replace('/Padrão/', '/Padrao/'));

  if (key.endsWith('.webm')) keys.push(key.replace(/\.webm$/i, '.mp4'));
  if (key.endsWith('.mp4')) keys.push(key.replace(/\.mp4$/i, '.webm'));

  return keys;
}

function uniqueKeys(keys: string[]) {
  return [...new Set(keys.map((item) => item.trim()).filter(Boolean))];
}

function isSafeKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes(String.fromCharCode(92))) return false;
  const lower = key.toLowerCase().trim();
  if (DENIED_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false;
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp3') || lower.endsWith('.mpeg') || lower.endsWith('.mpga')) return 'audio/mpeg';
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg';
  if (lower.endsWith('.wav') || lower.endsWith('.wave')) return 'audio/wav';
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.glb')) return 'model/gltf-binary';
  return 'application/octet-stream';
}

function cacheForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mp3') || lower.endsWith('.ogg') || lower.endsWith('.wav')) {
    return 'public, max-age=604800, stale-while-revalidate=2592000';
  }

  return 'public, max-age=86400, stale-while-revalidate=604800';
}
