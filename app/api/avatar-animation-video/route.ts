import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const VIDEO_EXTENSIONS = ['.webm', '.mp4'];
type AnimationEventType = 'intro' | 'victory' | 'defeat';

const EVENT_SUFFIX: Record<AnimationEventType, string> = {
  intro: '1',
  victory: '2',
  defeat: '3',
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitSlug = req.nextUrl.searchParams.get('slug') || '';
    const eventType = normalizeEventType(req.nextUrl.searchParams.get('eventType') || req.nextUrl.searchParams.get('event') || 'intro');
    const slug = cleanSlug(explicitSlug) || slugFromAvatarUrl(avatarUrl);

    if (!slug) {
      return NextResponse.json({ available: false, reason: 'avatar-sem-slug', eventType }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const key = await findVideoKey(slug, eventType);
    if (!key) {
      return NextResponse.json({ available: false, slug, eventType, expected: expectedNames(slug, eventType), reason: 'video-nao-encontrado' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const extension = key.split('.').pop() || 'mp4';
    const filename = `${slug.split('/').pop() || 'animacao'}-${EVENT_SUFFIX[eventType]}.${extension}`;
    const proxyUrl = `/api/r2-animation/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      available: true,
      mediaType: 'video',
      eventType,
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

async function findVideoKey(slug: string, eventType: AnimationEventType) {
  const candidates = expectedNames(slug, eventType).map(normalizeComparable);

  for (const prefix of PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    const keys = listed.map((object) => object.key);

    const exact = keys.find((key) => {
      const filename = key.split('/').pop() || '';
      const lower = filename.toLowerCase();
      const base = filename.replace(/\.[^.]+$/, '');
      return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext)) && candidates.includes(normalizeComparable(base));
    });
    if (exact) return exact;
  }

  return '';
}

function expectedNames(slug: string, eventType: AnimationEventType) {
  const base = slug.split('/').pop() || slug;
  const suffix = EVENT_SUFFIX[eventType];
  return [`${base}-${suffix}`, `${base}_${suffix}`, `${base} ${suffix}`];
}

function normalizeEventType(value: string): AnimationEventType {
  const clean = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (clean === 'victory' || clean === 'vitoria' || clean === 'venceu' || clean === 'win') return 'victory';
  if (clean === 'defeat' || clean === 'derrota' || clean === 'perdeu' || clean === 'loss') return 'defeat';
  return 'intro';
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
