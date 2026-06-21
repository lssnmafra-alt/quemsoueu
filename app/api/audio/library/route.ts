import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MUSIC_PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/', 'atuem/Música/'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

type AudioTrack = {
  key: string;
  title: string;
  genre: string;
  folder: string;
  url: string;
};

export async function GET() {
  try {
    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);

    if (!bucket) {
      return NextResponse.json({ genres: [], tracks: [], error: 'bucket-r2-nao-configurado' });
    }

    const tracks = await listAllTracks(bucket);
    const grouped = new Map<string, { id: string; name: string; folder: string; tracks: AudioTrack[] }>();

    for (const track of tracks) {
      const id = normalizeComparable(track.genre || track.folder || 'Musicas');
      const current = grouped.get(id) || { id, name: track.genre || 'Musicas', folder: track.folder || '', tracks: [] };
      current.tracks.push(track);
      grouped.set(id, current);
    }

    const genres = [...grouped.values()]
      .map((genre) => ({
        ...genre,
        tracks: genre.tracks.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return NextResponse.json({ genres, tracks });
  } catch (error: any) {
    console.error('Audio library error:', error);
    return NextResponse.json({ genres: [], tracks: [], error: error.message || 'Nao foi possivel listar as musicas.' });
  }
}

async function listAllTracks(bucket: any): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];

  for (const prefix of MUSIC_PREFIXES) {
    let cursor: string | undefined;
    do {
      const listed = await bucket.list({ prefix, limit: 1000, cursor });
      cursor = listed.cursor;

      for (const object of listed.objects || []) {
        const key = String(object.key || '');
        if (!isAudioKey(key)) continue;
        const { folder, genre } = genreFromKey(key, prefix);
        tracks.push({
          key,
          title: cleanTitle(key),
          genre,
          folder,
          url: `/api/r2-file?key=${encodeURIComponent(key)}`,
        });
      }
    } while (cursor);
  }

  const unique = new Map<string, AudioTrack>();
  tracks.forEach((track) => unique.set(track.key, track));
  return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function genreFromKey(key: string, prefix: string) {
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const folder = rest.split('/')[0] || 'Musicas';
  return { folder, genre: humanize(folder) || 'Musicas' };
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

function cleanTitle(key: string) {
  return humanize((key.split('/').pop() || key).replace(/\.[^.]+$/, '')) || 'Musica';
}

function humanize(value: string) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAudioKey(key: string) {
  const lower = key.toLowerCase();
  return AUDIO_TYPES.some((extension) => lower.endsWith(extension));
}

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}
