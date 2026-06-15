import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

export async function POST(req: NextRequest) {
  try {
    if (!TEMP_OFFICIAL_DECK_EDITING_ENABLED) {
      return NextResponse.json({ error: 'Anexo de imagens oficiais desativado.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Selecione uma imagem para anexar.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use uma imagem PNG, JPG ou WebP.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'A imagem deve ter no maximo 5MB.' }, { status: 400 });
    }

    const env = await getRuntimeEnv();
    const bucket = getR2Bucket(env);
    const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 nao configurado para anexar imagens.' }, { status: 500 });
    }

    if (!publicBaseUrl) {
      return NextResponse.json({ error: 'R2_PUBLIC_URL nao configurado.' }, { status: 500 });
    }

    const extension = extensionFromMime(file.type);
    const key = `characters/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const bytes = await file.arrayBuffer();

    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return NextResponse.json({
      key,
      url: `${publicBaseUrl.replace(/\/+$/, '')}/${key}`,
    });
  } catch (error: any) {
    console.error('Official card image upload error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel anexar a imagem.' }, { status: 500 });
  }
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
    if (bucket && typeof bucket.put === 'function') return bucket;
  }

  return null;
}

function getStringEnv(env: Record<string, any>, key: string) {
  const value = env[key] ?? process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function extensionFromMime(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
