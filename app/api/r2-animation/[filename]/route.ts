import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2Storage';

const ALLOWED_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const CONTENT_TYPES: Record<string, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
};

export async function GET(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();
    const extension = String(filename || '').split('.').pop()?.toLowerCase() || '';

    if (!isSafeVideoKey(key) || !CONTENT_TYPES[extension]) {
      return NextResponse.json({ error: 'Animacao nao permitida.' }, { status: 400 });
    }

    const object = await getR2Object(key);

    if (!object?.body) {
      return NextResponse.json({ error: 'Animacao nao encontrada no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body as any, {
      headers: {
        'Content-Type': CONTENT_TYPES[extension],
        'Content-Disposition': `inline; filename="${safeFilename(filename)}"`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('R2 animation proxy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar a animacao.' }, { status: 500 });
  }
}

function isSafeVideoKey(key: string) {
  const lower = key.toLowerCase();
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  return (lower.endsWith('.webm') || lower.endsWith('.mp4')) && ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function safeFilename(filename: string) {
  return String(filename || 'animacao.webm').replace(/[^a-zA-Z0-9._-]/g, '_');
}
