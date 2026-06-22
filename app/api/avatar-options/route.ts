import { NextResponse } from 'next/server';
import { listServerAvatars, R2_AVATAR_PREFIX } from '@/lib/serverAvatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const avatars = await listServerAvatars(500);
    return NextResponse.json({ avatars, prefix: R2_AVATAR_PREFIX }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Avatar options error:', error);
    return NextResponse.json({ avatars: [], prefix: R2_AVATAR_PREFIX, error: error.message || 'Nao foi possivel listar avatares.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
