import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AVATARS, avatarSelectionToUrl, normalizeAvatarSelection } from './avatars';

export type ServerAvatarOption = {
  key: string;
  name: string;
  url: string;
};

export const R2_AVATAR_PREFIX = 'atuem/avatar/';

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
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
  const env = await getRuntimeEnv();
  const bucket = getR2Bucket(env);
  const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');

  if (!bucket || !publicBaseUrl) return [];

  const listed = await bucket.list({ prefix: R2_AVATAR_PREFIX, limit });
  return (listed.objects || [])
    .map((object: any) => String(object.key || ''))
    .filter(isImageKey)
    .sort()
    .map((key: string) => ({
      key,
      name: humanizeName(key.replace(R2_AVATAR_PREFIX, '')),
      url: publicUrlForKey(publicBaseUrl, key),
    }));
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

export function publicUrlForKey(publicBaseUrl: string, key: string) {
  const encodedKey = String(key || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${publicBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
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

function getStringEnv(env: Record<string, any>, key: string) {
  const value = env[key] ?? process.env[key];
  return typeof value === 'string' ? value.trim() : '';
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
