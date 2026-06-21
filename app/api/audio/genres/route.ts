import { NextResponse } from 'next/server';

const DEFAULT_GENRES = ['Disco', 'Kpop', 'Rock', 'Indie', 'Eletronica', 'Pop', 'Funk', 'Rap'];

export async function GET() {
  return NextResponse.json({ genres: DEFAULT_GENRES });
}
