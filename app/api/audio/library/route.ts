import { NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MUSIC_SCAN_PREFIXES = [
  'atuem/music/',
  'atuem/Music/',
  'atuem/musica/',
  'atuem/Musica/',
  'atuem/Música/',
  'atuem/musicas/',
  'atuem/Musicas/',
  'atuem/Músicas/',
  'atuem/audio/',
  'atuem/audios/',
  'atuem/atuem/music/',
  'atuem/atuem/Music/',
  'atuem/atuem/musica/',
  'atuem/atuem/Musica/',
  'atuem/atuem/Música/',
  'atuem/atuem/musicas/',
  'atuem/atuem/Musicas/',
  'atuem/atuem/Músicas/',
  'atuem/atuem/audio/',
  'atuem/atuem/audios/',
  'music/',
  'Music/',
  'musica/',
  'Musica/',
  'Música/',
  'musicas/',
  'Musicas/',
  'Músicas/',
  'audio/',
  'audios/',
];

const MUSIC_ROOT_NAMES = ['music', 'musica', 'música', 'musicas', 'músicas', 'audio', 'audios', 'áudio', 'áudios'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];

type AudioTrack = {
  key: string;
  title: string;
  genre: string;
  folder: string;
  url: string;
};

type GenreGroup = { id: string; name: string; folder: string; tracks: AudioTrack[] };

export async function GET() {
  const scanErrors: string[] = [];

  try {
    const { tracks, folders } = await scanMusicLibrary(scanErrors);
    const grouped = new Map<string, GenreGroup>();

    for (const folder of folders) {
      const id = normalizeComparable(folder.genre);
      if (!id) continue;
      grouped.set(id, grouped.get(id) || { id, name: folder.genre, folder: folder.folder, tracks: [] });
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

    return NextResponse.json(
      { genres, tracks, scannedPrefixes: MUSIC_SCAN_PREFIXES, scanErrors, automatic: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    console.error('Audio library error:', error);
    return NextResponse.json(
      { genres: [], tracks: [], scannedPrefixes: MUSIC_SCAN_PREFIXES, scanErrors, automatic: true, error: error.message || 'Nao foi possivel listar as musicas.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

async function scanMusicLibrary(scanErrors: string[]) {
  const tracks: AudioTrack[] = [];
  const folders: { genre: string; folder: string }[] = [];
  const seenKeys = new Set<string>();
  const seenFolders = new Set<string>();

  for (const prefix of MUSIC_SCAN_PREFIXES) {
    let listed: Awaited<ReturnType<typeof listR2Objects>> = [];
    try {
      listed = await listR2Objects(prefix, 10000);
    } catch (error: any) {
      scanErrors.push(`${prefix}: ${error?.message || 'falhou'}`);
      continue;
    }

    for (const object of listed || []) {
      addFolder(object.key, folders, seenFolders);
      addTrack(object.key, tracks, seenKeys, folders, seenFolders);
    }
  }

  return { tracks: tracks.sort((a, b) => a.key.localeCompare(b.key)), folders };
}

function addTrack(rawKey: unknown, tracks: AudioTrack[], seenKeys: Set<string>, folders: { genre: string; folder: string }[], seenFolders: Set<string>) {
  const key = String(rawKey || '');
  if (!isAudioKey(key) || seenKeys.has(key)) return;

  const parsed = parseTrackPath(key);
  if (!parsed.genre) return;

  seenKeys.add(key);
  addKnownFolder(parsed.folder, folders, seenFolders);
  tracks.push({
    key,
    title: cleanTitle(key),
    genre: parsed.genre,
    folder: parsed.folder,
    url: `/api/r2-file?key=${encodeURIComponent(key)}`,
  });
}

function addFolder(rawKey: unknown, folders: { genre: string; folder: string }[], seenFolders: Set<string>) {
  const key = String(rawKey || '');
  if (!key.endsWith('/')) return;
  const parsed = parseTrackPath(`${key}placeholder.mp3`);
  if (!parsed.genre) return;
  addKnownFolder(parsed.folder, folders, seenFolders);
}

function addKnownFolder(folder: string, folders: { genre: string; folder: string }[], seenFolders: Set<string>) {
  const id = normalizeComparable(folder);
  if (!id || seenFolders.has(id)) return;
  seenFolders.add(id);
  folders.push({ genre: humanize(folder), folder });
}

function parseTrackPath(key: string) {
  const parts = key.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  if (!isAudioKey(fileName)) return { genre: '', folder: '' };

  const normalizedParts = parts.map(normalizeComparable);
  const normalizedRoots = MUSIC_ROOT_NAMES.map(normalizeComparable);
  const rootIndex = normalizedParts.findIndex((part) => normalizedRoots.includes(part));
  const genreFolder = rootIndex >= 0 && parts[rootIndex + 1]
    ? parts[rootIndex + 1]
    : parts.length >= 2
      ? parts[parts.length - 2]
      : '';

  if (!genreFolder || normalizedRoots.includes(normalizeComparable(genreFolder))) return { genre: '', folder: '' };
  return { genre: humanize(genreFolder), folder: genreFolder };
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
