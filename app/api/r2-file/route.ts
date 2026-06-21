import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
const ALLOWED_PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/', 'atuem/Música/', 'atuem/Animacao/', 'atuem/atuem/Animacao/'];
const ALLOWED_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.glb'];

export async function GET(req: NextRequest) {
  try {
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeKey(key)) {
      return NextResponse.json({ error: 'Arquivo nao permitido.' }, { status: 400 });
    }

    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 nao configurado.' }, { status: 500 });
    }

    const object = await bucket.get(key);

    if (!object?.body) {
      return NextResponse.json({ error: 'Arquivo nao encontrado no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body, {
      headers: {
        'Content-Type': contentTypeForKey(key),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (error: any) {
    console.error('R2 file proxy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o arquivo.' }, { status: 500 });
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

function isSafeKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  const lower = key.toLowerCase();
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix)) && ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.glb')) return 'model/gltf-binary';
  return 'application/octet-stream';
}
