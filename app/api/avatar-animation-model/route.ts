import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, getR2Object, listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ANIMATION_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const MODEL_FILENAMES = ['personagem.glb', 'character.glb', 'modelo.glb', 'model.glb'];

const CLIP_CANDIDATES = {
  defeat: ['NlaTrack', 'perdeu', 'Perdeu', 'derrota', 'Derrota', 'defeat', 'Defeat', 'Animation 1', 'Animação 1', 'Animacao 1'],
  intro: ['NlaTrack.001', 'entrada', 'Entrada', 'inicio', 'Inicio', 'intro', 'Intro', 'start', 'Start', 'Animation 2', 'Animação 2', 'Animacao 2'],
  victory: ['NlaTrack.002', 'venceu', 'Venceu', 'vitoria', 'Vitoria', 'victory', 'Victory', 'win', 'Win', 'Animation 3', 'Animação 3', 'Animacao 3'],
};

const FRONT_VIEW = {
  cameraOrbit: '180deg 75deg 115%',
  cameraTarget: 'auto auto auto',
  fieldOfView: '30deg',
  orientation: '0deg 0deg 0deg',
};

const NATURAL_FRONT_VIEW = {
  cameraOrbit: '0deg 75deg 115%',
  cameraTarget: 'auto auto auto',
  fieldOfView: '30deg',
  orientation: '0deg 0deg 0deg',
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
      return NextResponse.json({ available: false, slug, normalizedSlug: normalizeComparable(slug), expectedKeys: candidateKeys, clipCandidates: CLIP_CANDIDATES, reason: 'glb-nao-encontrado' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const directUrl = await getPublicR2Url(key);
    const proxyUrl = modelProxyUrlForKey(key, slug);
    const config = await readAnimationConfig(key, slug);
    const view = resolveView(slug, key, config);

    return NextResponse.json({
      available: true,
      slug,
      normalizedSlug: normalizeComparable(slug),
      key,
      url: proxyUrl,
      proxyUrl,
      directUrl,
      clipCandidates: config?.clipCandidates || CLIP_CANDIDATES,
      clipIndex: config?.clipIndex || { defeat: 0, intro: 1, victory: 2 },
      cameraOrbit: view.cameraOrbit,
      cameraTarget: view.cameraTarget,
      fieldOfView: view.fieldOfView,
      orientation: view.orientation,
      proxied: true,
      reason: 'usando-proxy-para-evitar-cors-do-r2-publico',
      configApplied: Boolean(config),
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
  const normalizedSlug = normalizeComparable(slug);

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
        const baseName = filename.replace(/\.glb$/, '');
        return lower.endsWith('.glb') && (normalizeComparable(baseName) === normalizedSlug || lower.includes(`/${slug.toLowerCase()}/`) || normalizeComparable(lower).includes(normalizedSlug));
      });
    if (found) return found;
  }

  return '';
}

async function readAnimationConfig(key: string, slug: string) {
  const configKeys = [
    key.replace(/\.glb$/i, '.json'),
    ...ANIMATION_PREFIXES.map((prefix) => `${prefix}${slug}.json`),
  ];

  for (const configKey of [...new Set(configKeys)]) {
    try {
      const object = await getR2Object(configKey);
      if (!object?.body) continue;
      const text = await bodyToText(object.body);
      const parsed = JSON.parse(text);
      return sanitizeConfig(parsed);
    } catch {
      continue;
    }
  }

  return null;
}

function sanitizeConfig(config: any) {
  if (!config || typeof config !== 'object') return null;
  return {
    cameraOrbit: typeof config.cameraOrbit === 'string' ? config.cameraOrbit : undefined,
    cameraTarget: typeof config.cameraTarget === 'string' ? config.cameraTarget : undefined,
    fieldOfView: typeof config.fieldOfView === 'string' ? config.fieldOfView : undefined,
    orientation: typeof config.orientation === 'string' ? config.orientation : undefined,
    clipCandidates: config.clipCandidates && typeof config.clipCandidates === 'object' ? config.clipCandidates : undefined,
    clipIndex: config.clipIndex && typeof config.clipIndex === 'object' ? config.clipIndex : undefined,
  };
}

function resolveView(slug: string, key: string, config: any) {
  const normalized = normalizeComparable(slug || key);
  const naturalFront = normalized.includes('arlecchino') || normalized.includes('arlequino') || normalized.includes('arlequin');
  const base = naturalFront ? NATURAL_FRONT_VIEW : FRONT_VIEW;

  return {
    cameraOrbit: config?.cameraOrbit || base.cameraOrbit,
    cameraTarget: config?.cameraTarget || base.cameraTarget,
    fieldOfView: config?.fieldOfView || base.fieldOfView,
    orientation: config?.orientation || base.orientation,
  };
}

async function bodyToText(body: BodyInit) {
  if (typeof body === 'string') return body;
  if (body instanceof Blob) return body.text();
  const stream = body as ReadableStream<Uint8Array>;
  if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
  }
  return '';
}

function modelProxyUrlForKey(key: string, slug: string) {
  const filename = `${slug.split('/').pop() || 'modelo'}.glb`;
  return `/api/r2-model/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}`;
}

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}
