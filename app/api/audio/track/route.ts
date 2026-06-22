import { NextRequest, NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

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
  '',
];

const MUSIC_ROOT_NAMES = ['music', 'musica', 'música', 'musicas', 'músicas', 'audio', 'audios', 'áudio', 'áudios', 'sound', 'sounds', 'song', 'songs'];
const IGNORED_PARENT_FOLDERS = ['avatar', 'avatares', 'animacao', 'animação', 'animacoes', 'animações', 'loading', 'logo', 'branding', 'cover', 'capa'];
const AUDIO_TYPES = ['.mp3', '.mpeg', '.mpga', '.ogg', '.oga', '.wav', '.wave', '.m4a', '.aac', '.flac', '.webm', '.mp4'];

type Track = { key: string; genre: string; title: string };

export async function GET(req: NextRequest) {
  const scanErrors: string[] = [];

  try {
    const mood = req.nextUrl.searchParams.get('mood') || 'lobby-theme';
    const genres = req.nextUrl.searchParams.getAll('genre').map(cleanFolderName).filter(Boolean);
    const excludedKeys = new Set(req.nextUrl.searchParams.getAll('exclude').map((key) => decodeURIComponent(key)).filter(isSafeKey));

    const allTracks = (await listAllTracks(scanErrors)).filter((track) => !excludedKeys.has(track.key));
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
        totalTracks: allTracks.length,
        fallbackToAnyGenre: matchedTracks.length === 0 && genres.length > 0,
        scanErrors,
      });
    }

    return NextResponse.json({
      url: '',
      reason: 'nenhuma-musica-encontrada-no-r2',
      searchedGenres: genres,
      availableGenres: [...new Set(allTracks.map((track) => track.genre))],
      excluded: [...excludedKeys],
      totalTracks: allTracks.length,
      scannedPrefixes: MUSIC_SCAN_PREFIXES,
      scanErrors,
    });
  } catch (error: any) {
    console.error('Audio track error:', error);
    return NextResponse.json({ url: '', error: error.message || 'Nao foi possivel carregar musica.', scanErrors });
  }
}

async function listAllTracks(scanErrors: string[]): Promise<Track[]> {
  const tracks: Track[] = [];
  const seenKeys = new Set<string>();

  for (const prefix of MUSIC_SCAN_PREFIXES) {
    let listed: Awaited<ReturnType<typeof listR2Objects>> = [];
    try {
      listed = await listR2Objects(prefix, 10000);
    } catch (error: any) {
      scanErrors.push(`${prefix || '(raiz)'}: ${error?.message || 'falhou'}`);
      continue;
    }

    for (const object of listed || []) addTrack(object.key, tracks, seenKeys);
  }

  return tracks.sort((a, b) => a.key.localeCompare(b.key));
}

function addTrack(rawKey: unknown, tracks: Track[], seenKeys: Set<string>) {
  const key = String(rawKey || '');
  if (!isAudioKey(key) || seenKeys.has(key) || isIgnoredAudioKey(key)) return;

  const parsed = parseTrackPath(key);
  if (!parsed.genre) return;

  seenKeys.add(key);
  tracks.push({ key, genre: parsed.genre, title: cleanTitle(key) });
}

function parseTrackPath(key: string) {
  const parts = key.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  if (!isAudioKey(fileName)) return { genre: '', folder: '' };

  const normalizedParts = parts.map(normalizeComparable);
  const normalizedRoots = MUSIC_ROOT_NAMES.map(normalizeComparable);
  const rootIndex = normalizedParts.findIndex((part) => normalizedRoots.includes(part));
  const directGenreFolder = rootIndex >= 0 && parts[rootIndex + 1] ? parts[rootIndex + 1] : '';
  const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : '';
  const genreFolder = directGenreFolder || parentFolder;

  if (!genreFolder) return { genre: '', folder: '' };
  if (normalizedRoots.includes(normalizeComparable(genreFolder))) return { genre: '', folder: '' };
  if (IGNORED_PARENT_FOLDERS.map(normalizeComparable).includes(normalizeComparable(genreFolder))) return { genre: '', folder: '' };

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
  const lower = key.toLowerCase().trim();
  return AUDIO_TYPES.some((extension) => lower.endsWith(extension));
}

function isIgnoredAudioKey(key: string) {
  const ignored = IGNORED_PARENT_FOLDERS.map(normalizeComparable);
  const normalizedParts = key.split('/').filter(Boolean).map(normalizeComparable);
  return normalizedParts.some((part) => ignored.includes(part));
}

function isSafeKey(key: string) {
  return Boolean(key && !key.includes('..') && !key.startsWith('/') && !key.includes('\\'));
}

function genreAliases(genre: string) {
  const clean = normalizeComparable(genre);
  const aliases = new Set([clean]);
  if (clean === 'kpop' || clean === 'k pop') aliases.add('kpop');
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
