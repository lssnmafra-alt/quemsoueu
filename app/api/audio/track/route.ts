import { NextRequest, NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

const MUSIC_PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/', 'atuem/Música/'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];
const DEFAULT_GENRES = ['Disco', 'K-pop', 'Rock'];

type Track = { key: string; genre: string };

export async function GET(req: NextRequest) {
  try {
    const mood = req.nextUrl.searchParams.get('mood') || 'lobby-theme';
    const genresFromQuery = req.nextUrl.searchParams.getAll('genre').map(cleanFolderName).filter(Boolean);
    const genres = genresFromQuery.length > 0 ? genresFromQuery : DEFAULT_GENRES;
    const excludedKeys = new Set(req.nextUrl.searchParams.getAll('exclude').map((key) => decodeURIComponent(key)).filter(isSafeKey));

    const allTracks = (await listAllTracks()).filter((track) => !excludedKeys.has(track.key));
    const matchedTracks = findTracksForGenres(allTracks, genres);
    const tracks = genresFromQuery.length > 0 ? matchedTracks : (matchedTracks.length > 0 ? matchedTracks : allTracks);

    if (tracks.length > 0) {
      const track = tracks[pickIndex(`${mood}:${genres.join('|')}:${excludedKeys.size}:${Date.now()}`, tracks.length)];
      return NextResponse.json({
        key: track.key,
        url: `/api/r2-file?key=${encodeURIComponent(track.key)}`,
        genre: track.genre || genres[0],
        title: cleanTitle(track.key),
        mood,
        proxied: true,
        selectedGenres: genres,
        matchedCount: tracks.length,
      });
    }

    return NextResponse.json({
      url: '',
      reason: 'nenhuma-musica-encontrada-para-os-generos-selecionados',
      searchedGenres: genres,
      availableGenres: [...new Set(allTracks.map((track) => track.genre))],
      excluded: [...excludedKeys],
      searchedPrefixes: MUSIC_PREFIXES,
    });
  } catch (error: any) {
    console.error('Audio track error:', error);
    return NextResponse.json({ url: '', error: error.message || 'Nao foi possivel carregar musica.' });
  }
}

async function listAllTracks(): Promise<Track[]> {
  const tracks: Track[] = [];

  for (const prefix of MUSIC_PREFIXES) {
    const listed = await listR2Objects(prefix, 5000);
    for (const object of listed || []) {
      const key = String(object.key || '');
      if (!isAudioKey(key)) continue;
      tracks.push({ key, genre: genreFromKey(key, prefix) });
    }
  }

  const unique = new Map<string, Track>();
  tracks.forEach((track) => unique.set(track.key, track));
  return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function findTracksForGenres(tracks: Track[], genres: string[]) {
  const wanted = new Set(genres.flatMap((genre) => genreAliases(genre)));
  return tracks.filter((track) => {
    const genreKey = normalizeComparable(track.genre);
    const folderKey = normalizeComparable(track.key.split('/').slice(-2, -1)[0] || track.genre);
    return wanted.has(genreKey) || wanted.has(folderKey) || wanted.has(normalizeComparable(track.key));
  });
}

function genreFromKey(key: string, prefix: string) {
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const firstFolder = rest.split('/')[0];
  if (firstFolder && firstFolder !== rest) return humanize(firstFolder);
  return 'Musicas';
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
  if (clean === 'eletronic' || clean === 'electronic' || clean === 'eletronica' || clean === 'eletronico') aliases.add('eletronic').add('electronic').add('eletronica');
  if (clean === 'rock') aliases.add('rock');
  if (clean === 'disco') aliases.add('disco');
  if (clean === 'indie') aliases.add('indie');
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
