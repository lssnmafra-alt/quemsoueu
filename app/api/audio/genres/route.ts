import { NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';

const PREFIXES = ['atuem/music/', 'atuem/atuem/music/', 'atuem/Music/', 'atuem/Musica/', 'atuem/Música/'];
const DEFAULT_GENRES = ['Disco', 'Kpop', 'Rock', 'Indie', 'Eletronica', 'Pop', 'Funk', 'Rap'];

export async function GET() {
  try {
    const folders = new Set<string>();

    for (const prefix of PREFIXES) {
      const listed = await listR2Objects(prefix, 1000);
      for (const object of listed) {
        const rest = object.key.startsWith(prefix) ? object.key.slice(prefix.length) : object.key;
        const folder = rest.split('/')[0];
        if (folder && folder !== rest) folders.add(folder);
      }
    }

    const genres = Array.from(folders)
      .map(humanizeGenre)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return NextResponse.json({ genres: genres.length ? genres : DEFAULT_GENRES });
  } catch (error: any) {
    console.error('Audio genres error:', error);
    return NextResponse.json({ genres: DEFAULT_GENRES, error: error.message || 'Nao foi possivel listar generos.' });
  }
}

function humanizeGenre(value: string) {
  return value.split('_').join(' ').split('-').join(' ').trim();
}
