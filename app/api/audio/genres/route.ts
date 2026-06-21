import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const PREFIX = 'atuem/music/';
const DEFAULT_GENRES = ['Disco', 'Kpop', 'Rock', 'Indie', 'Eletronica', 'Pop', 'Funk', 'Rap'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

export async function GET() {
  try {
    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);

    if (!bucket) return NextResponse.json({ genres: DEFAULT_GENRES });

    const listed = await bucket.list({ prefix: PREFIX, delimiter: '/', limit: 100 });
    const folders = (listed.delimitedPrefixes || [])
      .map((prefix: string) => prefix.replace(PREFIX, '').replace(/\/+$/, '').trim())
      .filter(Boolean);
    const objectFolders = (listed.objects || [])
      .map((object: any) => String(object.key || '').replace(PREFIX, '').split('/')[0])
      .filter(Boolean);
    const genres = Array.from(new Set([...folders, ...objectFolders]))
      .map(humanizeGenre)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return NextResponse.json({ genres: genres.length ? genres : DEFAULT_GENRES });
  } catch (error: any) {
    console.error('Audio genres error:', error);
    return NextResponse.json({ genres: DEFAULT_GENRES });
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

function humanizeGenre(value: string) {
  return value.split('_').join(' ').split('-').join(' ').trim();
}
