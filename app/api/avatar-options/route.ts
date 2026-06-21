import { NextResponse } from 'next/server';
import { listServerAvatars, R2_AVATAR_PREFIX } from '@/lib/serverAvatars';

export async function GET() {
  try {
    const avatars = await listServerAvatars(100);
    return NextResponse.json({ avatars, prefix: R2_AVATAR_PREFIX });
  } catch (error: any) {
    console.error('Avatar options error:', error);
    return NextResponse.json({ avatars: [], prefix: R2_AVATAR_PREFIX, error: error.message || 'Nao foi possivel listar avatares.' }, { status: 200 });
  }
}
