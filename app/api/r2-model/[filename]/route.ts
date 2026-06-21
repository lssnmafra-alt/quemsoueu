import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
const ALLOWED_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];

export async function GET(req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeModelKey(key) || !String(filename || '').toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: 'Modelo nao permitido.' }, { status: 400 });
    }

    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 nao configurado.' }, { status: 500 });
    }

    const object = await bucket.get(key);

    if (!object?.body) {
      return NextResponse.json({ error: 'GLB nao encontrado no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body, {
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

async function getRuntimeEnv() {
  try {
    return (await getCloudflareContext({ async: true })).env as Record<string, any>;
  } catch {
    return process.env as Record<string, any>;
  }
}

function getR2Bucket(env: Record<string, any>) {
  for (const name of BINDING_NAMES) {
    const bucket = env[name];
    if (bucket && typeof bucket.get === 'function') return bucket;
  }
  return null;
}

function isSafeModelKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  return key.toLowerCase().endsWith('.glb') && ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function safeFilename(filename: string) {
  return String(filename || 'modelo.glb').replace(/[^a-zA-Z0-9._-]/g, '_');
}
