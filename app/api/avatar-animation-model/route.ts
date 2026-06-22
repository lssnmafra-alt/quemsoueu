import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ANIMATION_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const MODEL_FILENAMES = ['personagem.glb', 'character.glb', 'modelo.glb', 'model.glb'];

const CLIP_CANDIDATES = {
  defeat: ['NlaTrack', 'perdeu', 'Perdeu', 'derrota', 'Derrota', 'defeat', 'Defeat', 'Animation 1', 'Animação 1', 'Animacao 1'],
  intro: ['NlaTrack.001', 'entrada', 'Entrada', 'inicio', 'Inicio', 'intro', 'Intro', 'start', 'Start', 'Animation 2', 'Animação 2', 'Animacao 2'],
  victory: ['NlaTrack.002', 'venceu', 'Venceu', 'vitoria', 'Vitoria', 'victory', 'Victory', 'win', 'Win', 'Animation 3', 'Animação 3', 'Animacao 3'],
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitSlug = req.nextUrl.searchParams.get('slug') || req.nextUrl.searchParams.get('avatar') || '';
    const slug = cleanSlug(explicitSlug) || slugFromAvatarUrl(avatarUrl);

    if (!slug) {
      return NextResponse.json({ available: false, reason: 'avatar-sem-slug', clipCandidates: CLIP_CANDIDATES }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const candidateKeys = buildCandidateKeys(slug);
    const key = await findExistingKey(candidateKeys, slug);

    if (!key) {
      return NextResponse.json({ available: false, slug, expectedKeys: candidateKeys, clipCandidates: CLIP_CANDIDATES, reason: 'glb-nao-encontrado' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const directUrl = await getPublicR2Url(key);
    const proxyUrl = modelProxyUrlForKey(key, slug);

    return NextResponse.json({
      available: true,
      slug,
      key,
      url: proxyUrl,
      proxyUrl,
      directUrl,
      clipCandidates: CLIP_CANDIDATES,
      clipIndex: { defeat: 0, intro: 1, victory: 2 },
      proxied: true,
      reason: 'usando-proxy-para-evitar-cors-do-r2-publico',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Avatar animation model error:', error);
    return NextResponse.json({ available: false, error: error.message || 'Nao foi possivel resolver a animacao 3D.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
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

function buildCandidateKeys(slug: string) {
  const fileNames = [...MODEL_FILENAMES, `${slug}.glb`];
  const folderKeys = ANIMATION_PREFIXES.flatMap((prefix) => MODEL_FILENAMES.map((filename) => `${prefix}${slug}/${filename}`));
  const flatKeys = ANIMATION_PREFIXES.flatMap((prefix) => fileNames.map((filename) => `${prefix}${filename}`));
  return [...folderKeys, ...flatKeys];
}

async function findExistingKey(keys: string[], slug: string) {
  const lowerSlug = slug.toLowerCase();

  for (const prefix of ANIMATION_PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    const keySet = new Set(listed.map((object) => object.key));
    const direct = keys.find((key) => keySet.has(key));
    if (direct) return direct;

    const found = listed
      .map((object) => object.key)
      .find((objectKey) => {
        const lower = objectKey.toLowerCase();
        const filename = lower.split('/').pop() || '';
        return lower.endsWith('.glb') && (filename === `${lowerSlug}.glb` || lower.includes(`/${lowerSlug}/`));
      });
    if (found) return found;
  }

  return '';
}

function modelProxyUrlForKey(key: string, slug: string) {
  const filename = `${slug.split('/').pop() || 'modelo'}.glb`;
  return `/api/r2-model/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}`;
}
