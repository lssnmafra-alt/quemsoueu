import { NextRequest, NextResponse } from 'next/server';
import { getR2Object, listR2Objects } from '@/lib/r2Storage';

const BRANDING_PREFIXES: Record<string, string[]> = {
  logo: ['atuem/atuem/Logo/', 'atuem/atuem/logo/', 'atuem/Logo/', 'atuem/logo/', 'Logo/', 'logo/'],
  loading: ['atuem/atuem/Loading/', 'atuem/atuem/loading/', 'atuem/Loading/', 'atuem/loading/', 'Loading/', 'loading/'],
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, context: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await context.params;
    const normalizedType = String(type || '').trim().toLowerCase();
    const prefixes = BRANDING_PREFIXES[normalizedType];

    if (!prefixes) {
      return NextResponse.json({ error: 'Tipo de branding invalido.' }, { status: 400 });
    }

    const kind = String(req.nextUrl.searchParams.get('kind') || 'image').trim().toLowerCase();
    const extensions = kind === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
    const keyFromQuery = decodeURIComponent(req.nextUrl.searchParams.get('key') || '').trim();
    const key = keyFromQuery && isAllowedBrandingKey(keyFromQuery, prefixes, extensions)
      ? keyFromQuery
      : await findBrandingAsset(prefixes, normalizedType, extensions);

    if (!key) {
      return NextResponse.json({ error: 'Arquivo de branding nao encontrado no R2.', type: normalizedType, kind, prefixes }, { status: 404 });
    }

    const object = await getR2Object(key);
    if (!object?.body) {
      return NextResponse.json({ error: 'Arquivo de branding nao encontrado no R2.', key }, { status: 404 });
    }

    return new NextResponse(object.body as any, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || contentTypeForKey(key),
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-R2-Branding-Key': key,
      },
    });
  } catch (error: any) {
    console.error('Branding asset error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o branding.' }, { status: 500 });
  }
}

async function findBrandingAsset(prefixes: string[], type: string, extensions: string[]) {
  const candidates = [];

  for (const prefix of prefixes) {
    const listed = await listR2Objects(prefix, 500);
    for (const object of listed || []) {
      if (isMediaKey(object.key, extensions)) candidates.push(object);
    }
  }

  candidates.sort((a, b) => {
    const scoreDiff = assetScore(String(b.key), type) - assetScore(String(a.key), type);
    if (scoreDiff !== 0) return scoreDiff;
    const aUploaded = a.uploaded ? Date.parse(a.uploaded) : 0;
    const bUploaded = b.uploaded ? Date.parse(b.uploaded) : 0;
    return bUploaded - aUploaded || String(a.key).localeCompare(String(b.key));
  });

  return candidates[0]?.key || '';
}

function assetScore(key: string, type: string) {
  const name = key.toLowerCase().split('/').pop() || key.toLowerCase();
  let score = 0;

  if (type === 'logo') {
    if (name.includes('logo')) score += 100;
    if (name.includes('quem')) score += 30;
    if (name.includes('loading') || name.includes('capa') || name.includes('cover')) score -= 40;
  }

  if (type === 'loading') {
    if (name.includes('loading')) score += 100;
    if (name.includes('carreg')) score += 90;
    if (name.includes('capa')) score += 80;
    if (name.includes('cover')) score += 80;
    if (name.includes('background')) score += 70;
    if (name.includes('logo')) score -= 120;
  }

  return score;
}

function isAllowedBrandingKey(key: string, prefixes: string[], extensions: string[]) {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  return prefixes.some((prefix) => key.startsWith(prefix)) && isMediaKey(key, extensions);
}

function isMediaKey(key: string, extensions: string[]) {
  const lower = String(key || '').toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'application/octet-stream';
}
