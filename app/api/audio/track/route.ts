import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const PREFIX = 'atuem/music/';
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

export async function GET(req: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);
    const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');
    const mood = req.nextUrl.searchParams.get('mood') || 'lobby-theme';
    const genres = req.nextUrl.searchParams.getAll('genre').map(cleanFolderName).filter(Boolean);

    if (!bucket || !publicBaseUrl || genres.length === 0) {
      return NextResponse.json({ url: '' });
    }

    for (const genre of genres) {
      const listed = await bucket.list({ prefix: `${PREFIX}${genre}/`, limit: 100 });
      const tracks = (listed.objects || [])
        .map((object: any) => String(object.key || ''))
        .filter((key: string) => isAudioKey(key))
        .sort();

      if (tracks.length > 0) {
        const key = tracks[pickIndex(mood, tracks.length)];
        return NextResponse.json({
          key,
          url: `${publicBaseUrl.replace(/\/+$/, '')}/${key}`,
          genre,
          title: cleanTitle(key),
        });
      }
    }

    return NextResponse.json({ url: '' });
  } catch (error: any) {
    console.error('Audio track error:', error);
    return NextResponse.json({ url: '' });
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

function cleanFolderName(value: string) {
  return value.split('/').join('').split('..').join('').trim();
}

function cleanTitle(key: string) {
  return (key.split('/').pop() || key)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Musica';
}

function isAudioKey(key: string) {
  const lower = key.toLowerCase();
  return AUDIO_TYPES.some((extension) => lower.endsWith(extension));
}

function pickIndex(seed: string, length: number) {
  const sum = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % length;
}
