import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const ANIMATION_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];
const MODEL_FILENAMES = ['personagem.glb', 'character.glb', 'modelo.glb', 'model.glb'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

const CLIP_CANDIDATES = {
  defeat: ['perdeu', 'Perdeu', 'derrota', 'Derrota', 'defeat', 'Defeat', 'Animation 1', 'Animação 1', 'Animacao 1'],
  intro: ['entrada', 'Entrada', 'inicio', 'Inicio', 'intro', 'Intro', 'start', 'Start', 'Animation 2', 'Animação 2', 'Animacao 2'],
  victory: ['venceu', 'Venceu', 'vitoria', 'Vitoria', 'victory', 'Victory', 'win', 'Win', 'Animation 3', 'Animação 3', 'Animacao 3'],
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const slug = slugFromAvatarUrl(avatarUrl);

    if (!slug) {
      return NextResponse.json({ available: false, reason: 'avatar-sem-slug', clipCandidates: CLIP_CANDIDATES });
    }

    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);
    const candidateKeys = buildCandidateKeys(slug);

    if (!bucket) {
      return NextResponse.json({ available: false, slug, expectedKeys: candidateKeys, clipCandidates: CLIP_CANDIDATES, reason: 'bucket-r2-nao-configurado' });
    }

    const key = await findExistingKey(bucket, candidateKeys, slug);
    if (!key) {
      return NextResponse.json({ available: false, slug, expectedKeys: candidateKeys, clipCandidates: CLIP_CANDIDATES, reason: 'glb-nao-encontrado' });
    }

    return NextResponse.json({
      available: true,
      slug,
      key,
      url: `/api/r2-file?key=${encodeURIComponent(key)}`,
      clipCandidates: CLIP_CANDIDATES,
      clipIndex: { defeat: 0, intro: 1, victory: 2 },
      proxied: true,
    });
  } catch (error: any) {
    console.error('Avatar animation model error:', error);
    return NextResponse.json({ available: false, error: error.message || 'Nao foi possivel resolver a animacao 3D.' }, { status: 200 });
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

async function findExistingKey(bucket: any, keys: string[], slug: string) {
  const lowerSlug = slug.toLowerCase();

  for (const key of keys) {
    try {
      if (typeof bucket.head === 'function') {
        const object = await bucket.head(key);
        if (object) return key;
      }
    } catch {}
  }

  for (const prefix of ANIMATION_PREFIXES) {
    try {
      const listed = await bucket.list({ prefix, limit: 200 });
      const found = (listed.objects || [])
        .map((object: any) => String(object.key || ''))
        .find((objectKey: string) => {
          const lower = objectKey.toLowerCase();
          const filename = lower.split('/').pop() || '';
          return lower.endsWith('.glb') && (filename === `${lowerSlug}.glb` || lower.includes(`/${lowerSlug}/`));
        });
      if (found) return found;
    } catch {}
  }

  return '';
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
    if (bucket && typeof bucket.list === 'function') return bucket;
  }
  return null;
}
