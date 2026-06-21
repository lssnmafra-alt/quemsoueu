import { NextResponse } from 'next/server';
import { getRuntimeEnv, listR2Objects } from '@/lib/r2Storage';

export async function GET() {
  const env = await getRuntimeEnv();
  const status: any = {
    env: {
      R2_BUCKET_NAME: Boolean(env.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME),
      CLOUDFLARE_ACCOUNT_ID: Boolean(env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID),
      R2_ACCOUNT_ID: Boolean(env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID),
      R2_ACCESS_KEY_ID: Boolean(env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID),
      R2_SECRET_ACCESS_KEY: Boolean(env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY),
      R2_PUBLIC_URL: Boolean(env.R2_PUBLIC_URL || process.env.R2_PUBLIC_URL),
    },
    prefixes: {},
  };

  try {
    const avatars = await listR2Objects('atuem/avatar/', 20);
    status.prefixes['atuem/avatar/'] = { count: avatars.length, sample: avatars.slice(0, 5).map((item) => item.key) };
  } catch (error: any) {
    status.prefixes['atuem/avatar/'] = { count: 0, error: error.message || 'erro ao listar avatares' };
  }

  try {
    const music = await listR2Objects('atuem/music/', 20);
    status.prefixes['atuem/music/'] = { count: music.length, sample: music.slice(0, 5).map((item) => item.key) };
  } catch (error: any) {
    status.prefixes['atuem/music/'] = { count: 0, error: error.message || 'erro ao listar musicas' };
  }

  try {
    const animation = await listR2Objects('atuem/Animacao/', 20);
    status.prefixes['atuem/Animacao/'] = { count: animation.length, sample: animation.slice(0, 5).map((item) => item.key) };
  } catch (error: any) {
    status.prefixes['atuem/Animacao/'] = { count: 0, error: error.message || 'erro ao listar animacoes' };
  }

  return NextResponse.json(status);
}
