import { AVATARS, avatarSelectionToUrl, normalizeAvatarSelection } from './avatars';
import { getPublicR2Url, listR2Objects } from './r2Storage';

export type ServerAvatarOption = {
  key: string;
  name: string;
  url: string;
};

export const R2_AVATAR_PREFIX = 'atuem/avatar/';
const R2_ANIMATION_PREFIXES = ['atuem/Animacao/', 'atuem/atuem/Animacao/'];

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MODEL_EXTENSIONS = ['.glb'];
const BOT_PALETTES = [
  ['#EF4444', '#111827'],
  ['#2563EB', '#F59E0B'],
  ['#7C3AED', '#0F172A'],
  ['#16A34A', '#052E16'],
  ['#EA580C', '#1F2937'],
  ['#DB2777', '#312E81'],
  ['#0891B2', '#0F172A'],
  ['#CA8A04', '#422006'],
];

export async function listServerAvatars(limit = 100): Promise<ServerAvatarOption[]> {
  const listed = await listR2Objects(R2_AVATAR_PREFIX, limit);
  const keys = listed.map((object) => object.key).filter(isImageKey).sort();

  return Promise.all(keys.map(async (key) => ({
    key,
    name: humanizeName(key.replace(R2_AVATAR_PREFIX, '')),
    url: await getPublicR2Url(key),
  })));
}

export async function listAnimatedServerAvatars(limit = 100): Promise<ServerAvatarOption[]> {
  const avatars = await listServerAvatars(limit);
  if (avatars.length === 0) return [];

  const animationSlugs = new Set<string>();

  for (const prefix of R2_ANIMATION_PREFIXES) {
    try {
      const models = await listR2Objects(prefix, 1000);
      for (const model of models) {
        if (!isModelKey(model.key)) continue;
        animationSlugs.add(normalizeComparable(model.key.split('/').pop() || ''));
        const parts = model.key.slice(prefix.length).split('/').filter(Boolean);
        if (parts.length > 1) animationSlugs.add(normalizeComparable(parts[0]));
      }
    } catch {
      continue;
    }
  }

  if (animationSlugs.size === 0) return [];

  return avatars.filter((avatar) => {
    const filename = avatar.key.split('/').pop() || avatar.name;
    return animationSlugs.has(normalizeComparable(filename)) || animationSlugs.has(normalizeComparable(avatar.name));
  });
}

export function pickBotAvatarUrl(pool: ServerAvatarOption[], seed: string, index: number) {
  if (pool.length > 0) {
    const picked = pool[(stableIndex(`${seed}:${index}`, pool.length) + index) % pool.length];
    return picked.url;
  }

  const avatar = AVATARS[(stableIndex(seed, AVATARS.length) + index) % AVATARS.length];
  const palette = BOT_PALETTES[(stableIndex(`${seed}:color`, BOT_PALETTES.length) + index) % BOT_PALETTES.length];

  return avatarSelectionToUrl(normalizeAvatarSelection({
    avatarId: avatar.id,
    primaryColor: palette[0],
    secondaryColor: palette[1],
    frameId: 'none',
  }));
}

export async function getBotAvatarPool() {
  try {
    const animatedAvatars = await listAnimatedServerAvatars(200);
    if (animatedAvatars.length > 0) return animatedAvatars;
    return await listServerAvatars(200);
  } catch (error) {
    console.warn('Bot avatar pool unavailable:', error);
    return [];
  }
}

function isImageKey(key: string) {
  const lower = key.toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isModelKey(key: string) {
  const lower = key.toLowerCase();
  return ALLOWED_MODEL_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function humanizeName(name: string) {
  return name
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Avatar';
}

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

function stableIndex(seed: string, length: number) {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}
