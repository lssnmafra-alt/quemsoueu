import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const AVATAR_PREFIX = 'atuem/avatar/';
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

export async function GET() {
  try {
    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);
    const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');

    if (!bucket || !publicBaseUrl) {
      return NextResponse.json({ avatars: [] });
    }

    const listed = await bucket.list({ prefix: AVATAR_PREFIX, limit: 100 });
    const avatars = (listed.objects || [])
      .filter((object: any) => isImageKey(object.key))
      .map((object: any) => ({
        key: object.key,
        name: humanizeName(object.key.replace(AVATAR_PREFIX, '')),
        url: `${publicBaseUrl.replace(/\/+$/, '')}/${object.key}`,
      }));

    return NextResponse.json({ avatars });
  } catch (error: any) {
    console.error('Avatar options error:', error);
    return NextResponse.json({ avatars: [], error: error.message || 'Nao foi possivel listar avatares.' }, { status: 200 });
  }
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
    .split('/').pop()!
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Avatar';
}
