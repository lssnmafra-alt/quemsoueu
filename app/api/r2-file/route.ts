import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2Storage';

const ALLOWED_PREFIXES = [
  'atuem/avatar/',
  'atuem/atuem/avatar/',
  'atuem/music/',
  'atuem/atuem/music/',
  'atuem/Music/',
  'atuem/musica/',
  'atuem/atuem/musica/',
  'atuem/Musica/',
  'atuem/Música/',
  'atuem/musicas/',
  'atuem/atuem/musicas/',
  'atuem/Musicas/',
  'atuem/Músicas/',
  'atuem/audio/',
  'atuem/atuem/audio/',
  'atuem/audios/',
  'music/',
  'Music/',
  'musica/',
  'Musica/',
  'música/',
  'musicas/',
  'Musicas/',
  'Músicas/',
  'audio/',
  'audios/',
  'atuem/Animacao/',
  'atuem/atuem/Animacao/',
  'atuem/atuem/Loading/',
  'atuem/atuem/Logo/',
];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.ogg', '.wav', '.m4a', '.glb'];

export async function GET(req: NextRequest) {
  try {
    const key = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();

    if (!isSafeKey(key)) {
      return NextResponse.json({ error: 'Arquivo nao permitido.' }, { status: 400 });
    }

    const object = await getR2Object(key);

    if (!object?.body) {
      return NextResponse.json({ error: 'Arquivo nao encontrado no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body as any, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || contentTypeForKey(key),
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

function isSafeKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  const lower = key.toLowerCase();
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix)) && ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.glb')) return 'model/gltf-binary';
  return 'application/octet-stream';
}
