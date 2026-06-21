import { AVATARS, avatarSelectionToUrl, normalizeAvatarSelection } from './avatars';
import { getPublicR2Url, listR2Objects } from './r2Storage';

export type ServerAvatarOption = {
  key: string;
  name: string;
  url: string;
};

export const R2_AVATAR_PREFIX = 'atuem/avatar/';

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
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

function humanizeName(name: string) {
  return name
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Avatar';
}

function stableIndex(seed: string, length: number) {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}
