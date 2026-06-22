import { NextRequest, NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

const MUSIC_ROOT_PREFIXES = ['', 'atuem/', 'atuem/atuem/', 'music/', 'Music/', 'musica/', 'Musica/', 'Música/'];
const KNOWN_MUSIC_ROOTS = ['music', 'musica', 'música', 'musicas', 'músicas', 'audio', 'audios', 'áudio', 'áudios'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];

type Track = { key: string; genre: string; title: string };

export async function GET(req: NextRequest) {
  try {
    const mood = req.nextUrl.searchParams.get('mood') || 'lobby-theme';
    const genres = req.nextUrl.searchParams.getAll('genre').map(cleanFolderName).filter(Boolean);
    const excludedKeys = new Set(req.nextUrl.searchParams.getAll('exclude').map((key) => decodeURIComponent(key)).filter(isSafeKey));

    const allTracks = (await listAllTracks()).filter((track) => !excludedKeys.has(track.key));
    const matchedTracks = genres.length ? findTracksForGenres(allTracks, genres) : allTracks;
    const tracks = matchedTracks.length > 0 ? matchedTracks : allTracks;

    if (tracks.length > 0) {
      const track = tracks[pickIndex(`${mood}:${genres.join('|')}:${excludedKeys.size}:${Date.now()}`, tracks.length)];
      return NextResponse.json({
        key: track.key,
        url: `/api/r2-file?key=${encodeURIComponent(track.key)}`,
        genre: track.genre,
        title: track.title,
        mood,
        proxied: true,
        selectedGenres: genres,
        matchedCount: matchedTracks.length,
        fallbackToAnyGenre: matchedTracks.length === 0 && genres.length > 0,
      });
    }

    return NextResponse.json({
      url: '',
      reason: 'nenhuma-musica-encontrada-no-r2',
      searchedGenres: genres,
      availableGenres: [...new Set(allTracks.map((track) => track.genre))],
      excluded: [...excludedKeys],
      scannedPrefixes: MUSIC_ROOT_PREFIXES,
    });
  } catch (error: any) {
    console.error('Audio track error:', error);
    return NextResponse.json({ url: '', error: error.message || 'Nao foi possivel carregar musica.' });
  }
}

async function listAllTracks(): Promise<Track[]> {
  const tracks: Track[] = [];
  const seenKeys = new Set<string>();

  for (const prefix of MUSIC_ROOT_PREFIXES) {
    const listed = await listR2Objects(prefix, 10000);
    for (const object of listed || []) addTrack(object.key, tracks, seenKeys);
  }

  return tracks.sort((a, b) => a.key.localeCompare(b.key));
}

function addTrack(rawKey: unknown, tracks: Track[], seenKeys: Set<string>) {
  const key = String(rawKey || '');
  if (!isAudioKey(key) || seenKeys.has(key)) return;

  const parsed = parseTrackPath(key);
  if (!parsed.genre) return;

  seenKeys.add(key);
  tracks.push({ key, genre: parsed.genre, title: cleanTitle(key) });
}

function parseTrackPath(key: string) {
  const parts = key.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  if (!isAudioKey(fileName)) return { genre: '', folder: '' };

  const normalizedRoots = KNOWN_MUSIC_ROOTS.map(normalizeComparable);
  const rootIndex = parts.map(normalizeComparable).findIndex((part) => normalizedRoots.includes(part));
  const genreFolder = rootIndex >= 0 && parts[rootIndex + 1]
    ? parts[rootIndex + 1]
    : parts.length >= 2
      ? parts[parts.length - 2]
      : '';

  if (!genreFolder || normalizedRoots.includes(normalizeComparable(genreFolder))) return { genre: '', folder: '' };
  return { genre: humanize(genreFolder), folder: genreFolder };
}

function findTracksForGenres(tracks: Track[], genres: string[]) {
  const wanted = new Set(genres.flatMap((genre) => genreAliases(genre)));
  return tracks.filter((track) => wanted.has(normalizeComparable(track.genre)) || wanted.has(normalizeComparable(track.key)));
}

function cleanFolderName(value: string) {
  return value.split('/').join('').split('..').join('').trim();
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

function isSafeKey(key: string) {
  return Boolean(key && !key.includes('..') && !key.startsWith('/') && !key.includes('\\'));
}

function genreAliases(genre: string) {
  const clean = normalizeComparable(genre);
  const aliases = new Set([clean]);
  if (clean === 'kpop' || clean === 'k pop') aliases.add('kpop').add('kpop').add('kpop');
  if (clean === 'eletronic' || clean === 'electronic' || clean === 'eletronica' || clean === 'eletronico') aliases.add('eletronic').add('electronic').add('eletronica').add('eletronico');
  return [...aliases];
}

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

function pickIndex(seed: string, length: number) {
  const sum = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);
  return length > 0 ? sum % length : 0;
}
