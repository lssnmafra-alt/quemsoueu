import { NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MUSIC_PREFIXES = [
  'atuem/music/',
  'atuem/atuem/music/',
  'atuem/Music/',
  'atuem/musica/',
  'atuem/atuem/musica/',
  'atuem/Musica/',
  'atuem/Música/',
  'atuem/musicas/',
  'atuem/atuem/musicas/',
  'atuem/Musicas/',
  'atuem/Músicas/',
  'atuem/audio/',
  'atuem/atuem/audio/',
  'atuem/audios/',
  'music/',
  'Music/',
  'musica/',
  'Musica/',
  'música/',
  'musicas/',
  'Musicas/',
  'Músicas/',
  'audio/',
  'audios/',
];
const MUSIC_SCAN_PREFIXES = ['atuem/', 'music/', 'Music/', 'musica/', 'musicas/', 'audio/', 'audios/'];
const MUSIC_FOLDER_NAMES = ['music', 'musica', 'música', 'musicas', 'músicas', 'audio', 'audios', 'áudio', 'áudios'];
const DEFAULT_MUSIC_FOLDERS = ['Disco', 'Eletrônica', 'Indie', 'K-pop', 'Rock'];
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

    for (const folder of DEFAULT_MUSIC_FOLDERS) {
      const id = normalizeComparable(folder);
      grouped.set(id, { id, name: humanize(folder), folder, tracks: [] });
    }

    for (const track of tracks) {
      const id = normalizeComparable(track.genre || track.folder || 'Musicas');
      const current = grouped.get(id) || { id, name: track.genre || 'Musicas', folder: track.folder || '', tracks: [] };
      current.tracks.push(track);
      grouped.set(id, current);
    }

    const genres = [...grouped.values()]
      .map((genre) => ({ ...genre, tracks: genre.tracks.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return NextResponse.json({ genres, tracks, prefixes: MUSIC_PREFIXES, scanPrefixes: MUSIC_SCAN_PREFIXES, defaultFolders: DEFAULT_MUSIC_FOLDERS }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Audio library error:', error);
    return NextResponse.json({ genres: [], tracks: [], prefixes: MUSIC_PREFIXES, scanPrefixes: MUSIC_SCAN_PREFIXES, defaultFolders: DEFAULT_MUSIC_FOLDERS, error: error.message || 'Nao foi possivel listar as musicas.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

async function listAllTracks(): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];
  const seenKeys = new Set<string>();

  for (const prefix of MUSIC_PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    for (const object of listed || []) addTrack(object.key, tracks, seenKeys);
  }

  for (const prefix of MUSIC_SCAN_PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    for (const object of listed || []) addTrack(object.key, tracks, seenKeys);
  }

  return tracks.sort((a, b) => a.key.localeCompare(b.key));
}

function addTrack(rawKey: unknown, tracks: AudioTrack[], seenKeys: Set<string>) {
  const key = String(rawKey || '');
  if (!isAudioKey(key) || seenKeys.has(key) || !isMusicKey(key)) return;
  seenKeys.add(key);
  const { folder, genre } = genreFromKey(key);
  tracks.push({ key, title: cleanTitle(key), genre, folder, url: `/api/r2-file?key=${encodeURIComponent(key)}` });
}

function isMusicKey(key: string) {
  const parts = key.split('/').filter(Boolean).map((part) => normalizeComparable(part));
  return parts.some((part) => MUSIC_FOLDER_NAMES.map(normalizeComparable).includes(part));
}

function genreFromKey(key: string) {
  const parts = key.split('/').filter(Boolean);
  const musicIndex = parts.findIndex((part) => MUSIC_FOLDER_NAMES.map(normalizeComparable).includes(normalizeComparable(part)));
  const folder = musicIndex >= 0 && parts[musicIndex + 1] ? parts[musicIndex + 1] : parts.length > 1 ? parts[parts.length - 2] : 'Musicas';
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
