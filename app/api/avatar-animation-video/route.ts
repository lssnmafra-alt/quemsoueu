import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PREFIXES = ['atuem/atuem/avatar/', 'atuem/avatar/', 'atuem/atuem/Animacao/', 'atuem/Animacao/'];
const VIDEO_EXTENSIONS = ['.webm', '.mp4'];
type AnimationEventType = 'home' | 'lobby' | 'intro' | 'victory' | 'defeat';

const EVENT_SUFFIX: Record<AnimationEventType, string> = {
  home: 'A',
  lobby: '1',
  intro: 'A',
  victory: '2',
  defeat: '3',
};

const EVENT_ALIASES: Record<AnimationEventType, string[]> = {
  home: ['a', 'home', 'inicio', 'start', 'tela-inicial'],
  lobby: ['1', 'lobby', 'idle', 'loop', 'sala'],
  intro: ['a', 'intro', 'entrada', 'inicio', 'start'],
  victory: ['2', 'victory', 'vitoria', 'venceu', 'win'],
  defeat: ['3', 'defeat', 'derrota', 'perdeu', 'loss'],
};

type VideoSearchResult = {
  key: string;
  candidates: string[];
  checkedKeys: number;
  matches: Array<{ key: string; score: number }>;
  ambiguous: boolean;
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitSlug = req.nextUrl.searchParams.get('slug') || '';
    const eventType = normalizeEventType(req.nextUrl.searchParams.get('eventType') || req.nextUrl.searchParams.get('event') || 'lobby');
    const debug = req.nextUrl.searchParams.get('debug') === '1';
    const parsedAvatar = parseAvatarSelection(avatarUrl);
    const explicitAnimationKey = animationKeyFromSelection(parsedAvatar, eventType);
    const slug = cleanSlug(explicitSlug) || cleanSlug(parsedAvatar?.animationSlug || parsedAvatar?.avatarId || '') || slugFromAvatarUrl(avatarUrl);

    if (explicitAnimationKey) {
      return animationResponse(explicitAnimationKey, eventType, slug || 'avatar', debug ? { explicit: true } : undefined);
    }

    if (!slug) {
      return NextResponse.json({ available: false, reason: 'avatar-sem-slug', eventType }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const search = await findVideoKey(slug, eventType);
    if (!search.key) {
      return NextResponse.json({
        available: false,
        slug,
        eventType,
        expected: search.candidates,
        reason: search.ambiguous ? 'video-ambiguo' : 'video-nao-encontrado',
        ...(debug ? diagnosticPayload(avatarUrl, slug, search) : {}),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return animationResponse(search.key, eventType, slug, debug ? diagnosticPayload(avatarUrl, slug, search) : undefined);
  } catch (error: any) {
    console.error('Avatar animation video error:', error);
    return NextResponse.json({ available: false, error: error.message || 'Nao foi possivel resolver o video.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}

async function animationResponse(key: string, eventType: AnimationEventType, slug: string, extra?: any) {
  const extension = key.split('.').pop() || 'mp4';
  const filename = `${slug.split('/')[0] || 'animacao'}-${EVENT_SUFFIX[eventType]}.${extension}`;
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
    ...(extra || {}),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

async function findVideoKey(slug: string, eventType: AnimationEventType) {
  const candidates = expectedNames(slug, eventType);
  const normalizedCandidates = candidates.map(normalizeComparable);
  const matches: VideoSearchResult['matches'] = [];
  let checkedKeys = 0;

  for (const prefix of prefixesForSlug(slug)) {
    const listed = await listR2Objects(prefix, 5000);
    const keys = listed.map((object) => object.key);
    checkedKeys += keys.length;

    const exact = keys.find((key) => {
      const filename = key.split('/').pop() || '';
      const lower = filename.toLowerCase();
      const base = filename.replace(/\.[^.]+$/, '');
      return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext)) && normalizedCandidates.includes(normalizeComparable(base));
    });
    if (exact) return { key: exact, candidates, checkedKeys, matches: [{ key: exact, score: 100 }], ambiguous: false };

    for (const key of keys) {
      const score = scoreVideoKey(key, prefix, slug, eventType);
      if (score > 0) matches.push({ key, score });
    }
  }

  const uniqueMatches = [...new Map(matches.map((match) => [match.key, match])).values()]
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const best = uniqueMatches[0];
  const second = uniqueMatches[1];

  if (best && (!second || best.score > second.score)) {
    return { key: best.key, candidates, checkedKeys, matches: uniqueMatches.slice(0, 10), ambiguous: false };
  }

  return { key: '', candidates, checkedKeys, matches: uniqueMatches.slice(0, 10), ambiguous: Boolean(best) };
}

function prefixesForSlug(slug: string) {
  const avatarKey = slug.split('/')[0] || slug;
  return [
    `atuem/atuem/avatar/${avatarKey}/Animacao/`,
    `atuem/atuem/avatar/${avatarKey}/animacao/`,
    `atuem/atuem/avatar/${avatarKey}/animations/`,
    `atuem/avatar/${avatarKey}/Animacao/`,
    'atuem/atuem/Animacao/',
    'atuem/Animacao/',
    ...PREFIXES,
  ];
}

function expectedNames(slug: string, eventType: AnimationEventType) {
  const avatarKey = slug.split('/')[0] || slug;
  const skinCode = slug.split('/')[1] || 'skin-1';
  const suffix = EVENT_SUFFIX[eventType];
  const premiumSuffix = numericSuffixForSkin(skinCode, eventType);
  const aliases = EVENT_ALIASES[eventType].filter((alias) => alias !== suffix.toLowerCase());
  return [
    `${avatarKey}-${premiumSuffix}`,
    `${avatarKey}_${premiumSuffix}`,
    `${avatarKey} ${premiumSuffix}`,
    `${avatarKey}-${suffix}`,
    `${avatarKey}_${suffix}`,
    `${avatarKey} ${suffix}`,
    `${avatarKey}.${suffix}`,
    ...aliases.flatMap((alias) => [`${avatarKey}-${alias}`, `${avatarKey}_${alias}`, `${avatarKey} ${alias}`]),
    `${avatarKey}.mp4`,
    `${avatarKey}.webm`,
  ];
}

function numericSuffixForSkin(skinCode: string, eventType: AnimationEventType) {
  const skin = Math.max(1, Number(String(skinCode || '').match(/\d+/)?.[0] || 1));
  const base = eventType === 'victory' ? 2 : eventType === 'defeat' ? 3 : 1;
  return String((skin - 1) * 10 + base);
}

function scoreVideoKey(key: string, prefix: string, slug: string, eventType: AnimationEventType) {
  const lower = key.toLowerCase();
  if (!VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 0;

  const avatarKey = slug.split('/')[0] || slug;
  const relative = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const subject = relative.replace(/\.[^.]+$/, '');
  const subjectComparable = normalizeComparable(subject);
  const slugComparable = normalizeComparable(avatarKey);
  if (!slugComparable || !subjectComparable.includes(slugComparable)) return 0;

  const tokens = tokenSet(subject);
  const wantedAliases = EVENT_ALIASES[eventType].map(normalizeComparable);
  const otherAliases = Object.entries(EVENT_ALIASES)
    .filter(([type]) => type !== eventType)
    .flatMap(([, aliases]) => aliases.map(normalizeComparable));
  const hasWantedEvent = wantedAliases.some((alias) => tokens.has(alias) || subjectComparable.includes(`${slugComparable}${alias}`));
  const hasOtherEvent = otherAliases.some((alias) => tokens.has(alias) || subjectComparable.endsWith(alias));

  if (hasOtherEvent && !hasWantedEvent) return 0;
  if (eventType !== 'home' && eventType !== 'intro' && !hasWantedEvent) return 0;

  let score = 40;
  if (subjectComparable === slugComparable) score += 30;
  if (subjectComparable.startsWith(slugComparable)) score += 20;
  if (hasWantedEvent) score += 25;
  if (lower.endsWith('.mp4')) score += 2;
  if (key.includes('/avatar/')) score += 6;
  return score;
}

function tokenSet(value: string) {
  return new Set(String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.toLowerCase())
    .filter(Boolean));
}

function diagnosticPayload(avatarUrl: string, slug: string, search: VideoSearchResult) {
  return {
    diagnostic: {
      avatarOriginal: avatarUrl,
      slugGerado: slug,
      candidatosTestados: search.candidates,
      chavesR2Verificadas: search.checkedKeys,
      correspondencias: search.matches,
      resultadoEncontrado: search.key || null,
    },
  };
}

function normalizeEventType(value: string): AnimationEventType {
  const clean = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (clean === 'home' || clean === 'tela-inicial' || clean === 'inicio') return 'home';
  if (clean === 'lobby' || clean === 'sala' || clean === 'idle') return 'lobby';
  if (clean === 'victory' || clean === 'vitoria' || clean === 'venceu' || clean === 'win') return 'victory';
  if (clean === 'defeat' || clean === 'derrota' || clean === 'perdeu' || clean === 'loss') return 'defeat';
  return 'intro';
}

function parseAvatarSelection(avatarUrl: string) {
  if (!avatarUrl?.startsWith('avatar:')) return null;
  try {
    return JSON.parse(decodeURIComponent(avatarUrl.slice(7)));
  } catch {
    return null;
  }
}

function animationKeyFromSelection(selection: any, eventType: AnimationEventType) {
  const animations = selection?.animations || {};
  const key = animations[eventType] || (eventType === 'home' ? animations.intro : '') || (eventType === 'intro' ? animations.home : '');
  return typeof key === 'string' && isSafeAnimationKey(key) ? key : '';
}

function isSafeAnimationKey(key: string) {
  const lower = key.toLowerCase();
  return key && !key.includes('..') && !key.startsWith('/') && !key.includes('\\') && VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function slugFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';

  const decoded = decodeURIComponent(value);
  const markers = ['/atuem/atuem/avatar/', 'atuem/atuem/avatar/', '/atuem/avatar/', 'atuem/avatar/'];
  const marker = markers.find((item) => decoded.includes(item));
  const part = marker ? decoded.slice(decoded.indexOf(marker) + marker.length) : decoded.split('/').pop() || '';
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
