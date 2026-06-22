import { NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MUSIC_ROOT_PREFIXES = ['', 'atuem/', 'atuem/atuem/', 'music/', 'Music/', 'musica/', 'Musica/', 'Música/'];
const KNOWN_MUSIC_ROOTS = ['music', 'musica', 'música', 'musicas', 'músicas', 'audio', 'audios', 'áudio', 'áudios'];
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

    return NextResponse.json(
      { genres, tracks, scannedPrefixes: MUSIC_ROOT_PREFIXES, automatic: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    console.error('Audio library error:', error);
    return NextResponse.json(
      { genres: [], tracks: [], scannedPrefixes: MUSIC_ROOT_PREFIXES, automatic: true, error: error.message || 'Nao foi possivel listar as musicas.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

async function listAllTracks(): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];
  const seenKeys = new Set<string>();

  for (const prefix of MUSIC_ROOT_PREFIXES) {
    const listed = await listR2Objects(prefix, 10000);
    for (const object of listed || []) addTrack(object.key, tracks, seenKeys);
  }

  return tracks.sort((a, b) => a.key.localeCompare(b.key));
}

function addTrack(rawKey: unknown, tracks: AudioTrack[], seenKeys: Set<string>) {
  const key = String(rawKey || '');
  if (!isAudioKey(key) || seenKeys.has(key)) return;

  const parsed = parseTrackPath(key);
  if (!parsed.genre) return;

  seenKeys.add(key);
  tracks.push({
    key,
    title: cleanTitle(key),
    genre: parsed.genre,
    folder: parsed.folder,
    url: `/api/r2-file?key=${encodeURIComponent(key)}`,
  });
}

function parseTrackPath(key: string) {
  const parts = key.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  if (!isAudioKey(fileName)) return { genre: '', folder: '' };

  const normalizedParts = parts.map(normalizeComparable);
  const rootIndex = normalizedParts.findIndex((part) => KNOWN_MUSIC_ROOTS.map(normalizeComparable).includes(part));
  const genreFolder = rootIndex >= 0 && parts[rootIndex + 1]
    ? parts[rootIndex + 1]
    : parts.length >= 2
      ? parts[parts.length - 2]
      : '';

  if (!genreFolder || isGenericFolder(genreFolder)) return { genre: '', folder: '' };
  return { genre: humanize(genreFolder), folder: genreFolder };
}

function isGenericFolder(value: string) {
  return KNOWN_MUSIC_ROOTS.map(normalizeComparable).includes(normalizeComparable(value));
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
