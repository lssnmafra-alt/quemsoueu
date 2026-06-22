import { NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MUSIC_PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];

type AudioTrack = {
  key: string;
  title: string;
  genre: string;
  folder: string;
  url: string;
};

export async function GET() {
  try {
    const tracks = await listAllTracks();
    const grouped = new Map<string, { id: string; name: string; folder: string; tracks: AudioTrack[] }>();

    for (const track of tracks) {
      const id = normalizeComparable(track.genre || track.folder || 'Musicas');
      const current = grouped.get(id) || { id, name: track.genre || 'Musicas', folder: track.folder || '', tracks: [] };
      current.tracks.push(track);
      grouped.set(id, current);
    }

    const genres = [...grouped.values()]
      .map((genre) => ({ ...genre, tracks: genre.tracks.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return NextResponse.json({ genres, tracks, prefixes: MUSIC_PREFIXES }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Audio library error:', error);
    return NextResponse.json({ genres: [], tracks: [], prefixes: MUSIC_PREFIXES, error: error.message || 'Nao foi possivel listar as musicas.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

async function listAllTracks(): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];

  for (const prefix of MUSIC_PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    for (const object of listed || []) {
      const key = String(object.key || '');
      if (!isAudioKey(key)) continue;
      const { folder, genre } = genreFromKey(key, prefix);
      tracks.push({ key, title: cleanTitle(key), genre, folder, url: `/api/r2-file?key=${encodeURIComponent(key)}` });
    }
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

function cleanTitle(key: string) {
  return humanize((key.split('/').pop() || key).replace(/\.[^.]+$/, '')) || 'Musica';
}

function humanize(value: string) {
  return String(value || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isAudioKey(key: string) {
  const lower = key.toLowerCase();
  return AUDIO_TYPES.some((extension) => lower.endsWith(extension));
}

function normalizeComparable(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}
