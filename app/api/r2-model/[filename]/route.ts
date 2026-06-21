import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2Storage';

const ALLOWED_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];

export async function GET(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeModelKey(key) || !String(filename || '').toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: 'Modelo nao permitido.' }, { status: 400 });
    }

    const object = await getR2Object(key);

    if (!object?.body) {
      return NextResponse.json({ error: 'GLB nao encontrado no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body as any, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `inline; filename="${safeFilename(filename)}"`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('R2 model proxy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o GLB.' }, { status: 500 });
  }
}

function isSafeModelKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  return key.toLowerCase().endsWith('.glb') && ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function safeFilename(filename: string) {
  return String(filename || 'modelo.glb').replace(/[^a-zA-Z0-9._-]/g, '_');
}
