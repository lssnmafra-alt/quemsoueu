import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const VIDEO_EXTENSIONS = ['.webm', '.mp4'];

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitSlug = req.nextUrl.searchParams.get('slug') || '';
    const slug = cleanSlug(explicitSlug) || slugFromAvatarUrl(avatarUrl);

    if (!slug) {
      return NextResponse.json({ available: false, reason: 'avatar-sem-slug' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const key = await findVideoKey(slug);
    if (!key) {
      return NextResponse.json({ available: false, slug, reason: 'video-nao-encontrado' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const extension = key.split('.').pop() || 'webm';
    const filename = `${slug.split('/').pop() || 'animacao'}.${extension}`;
    const proxyUrl = `/api/r2-animation/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      available: true,
      mediaType: 'video',
      slug,
      key,
      url: proxyUrl,
      videoUrl: proxyUrl,
      proxyUrl,
      directUrl: await getPublicR2Url(key),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Avatar animation video error:', error);
    return NextResponse.json({ available: false, error: error.message || 'Nao foi possivel resolver o video.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}

async function findVideoKey(slug: string) {
  const normalizedSlug = normalizeComparable(slug);

  for (const prefix of PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    const keys = listed.map((object) => object.key);

    const exact = keys.find((key) => {
      const filename = key.split('/').pop() || '';
      const lower = filename.toLowerCase();
      const base = filename.replace(/\.[^.]+$/, '');
      return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext)) && normalizeComparable(base) === normalizedSlug;
    });
    if (exact) return exact;
  }

  return '';
}

function slugFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('avatar:')) {
    try {
      const parsed = JSON.parse(decodeURIComponent(value.slice(7)));
      return cleanSlug(parsed.avatarId || '');
    } catch {
      return '';
    }
  }

  const decoded = decodeURIComponent(value);
  const marker = '/atuem/avatar/';
  const directMarker = 'atuem/avatar/';
  const index = decoded.indexOf(marker);
  const directIndex = decoded.indexOf(directMarker);
  const part = index >= 0
    ? decoded.slice(index + marker.length)
    : directIndex >= 0
      ? decoded.slice(directIndex + directMarker.length)
      : decoded.split('/').pop() || '';

  return cleanSlug(part.replace(/\.[^.]+$/, ''));
}

function cleanSlug(value: string) {
  return String(value || '')
    .split('..').join('')
    .split('\\').join('/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\.[^.]+$/, '')
    .trim();
}

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}
