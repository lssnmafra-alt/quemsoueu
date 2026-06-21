import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MUSIC_PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/', 'atuem/Música/'];
const AUDIO_TYPES = ['.mp3', '.ogg', '.wav', '.m4a'];
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
const DEFAULT_GENRES = ['Disco', 'Kpop', 'Rock'];

export async function GET(req: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);
    const mood = req.nextUrl.searchParams.get('mood') || 'lobby-theme';
    const genresFromQuery = req.nextUrl.searchParams.getAll('genre').map(cleanFolderName).filter(Boolean);
    const genres = genresFromQuery.length > 0 ? genresFromQuery : DEFAULT_GENRES;

    if (!bucket) {
      return NextResponse.json({ url: '', reason: 'bucket-r2-nao-configurado' });
    }

    const allTracks = await listAllTracks(bucket);
    const matchedTracks = findTracksForGenres(allTracks, genres);
    const tracks = matchedTracks.length > 0 ? matchedTracks : allTracks;

    if (tracks.length > 0) {
      const track = tracks[pickIndex(`${mood}:${genres.join('|')}`, tracks.length)];
      return NextResponse.json({
        key: track.key,
        url: `/api/r2-file?key=${encodeURIComponent(track.key)}`,
        genre: track.genre || genres[0],
        title: cleanTitle(track.key),
        mood,
        proxied: true,
      });
    }

    return NextResponse.json({ url: '', reason: 'nenhuma-musica-encontrada', searchedGenres: genres, searchedPrefixes: MUSIC_PREFIXES });
  } catch (error: any) {
    console.error('Audio track error:', error);
    return NextResponse.json({ url: '', error: error.message || 'Nao foi possivel carregar musica.' });
  }
}

async function listAllTracks(bucket: any) {
  const tracks: Array<{ key: string; genre: string }> = [];

  for (const prefix of MUSIC_PREFIXES) {
    try {
      const listed = await bucket.list({ prefix, limit: 300 });
      for (const object of listed.objects || []) {
        const key = String(object.key || '');
        if (!isAudioKey(key)) continue;
        tracks.push({ key, genre: genreFromKey(key, prefix) });
      }
    } catch {}
  }

  const unique = new Map<string, { key: string; genre: string }>();
  tracks.forEach((track) => unique.set(track.key, track));
  return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function findTracksForGenres(tracks: Array<{ key: string; genre: string }>, genres: string[]) {
  const wanted = new Set(genres.flatMap((genre) => genreAliases(genre)));
  return tracks.filter((track) => wanted.has(normalizeComparable(track.genre)) || wanted.has(normalizeComparable(track.key)));
}

function genreFromKey(key: string, prefix: string) {
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const firstFolder = rest.split('/')[0];
  if (firstFolder && firstFolder !== rest) return humanize(firstFolder);
  return 'Musicas';
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

function genreAliases(genre: string) {
  const clean = normalizeComparable(genre);
  const aliases = new Set([clean]);
  if (clean === 'kpop' || clean === 'k pop') aliases.add('kpop').add('kpop');
  if (clean === 'eletronica' || clean === 'eletrônica') aliases.add('eletronica');
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
