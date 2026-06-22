import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, putR2Object } from '@/lib/r2Storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(req: NextRequest) {
  try {
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

    const scope = formData.get('scope') === 'decks' ? 'decks' : 'characters';
    const extension = extensionFromMime(file.type);
    const key = `${scope}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const bytes = await file.arrayBuffer();

    await putR2Object(key, bytes, file.type);

    return NextResponse.json({
      key,
      url: await getPublicR2Url(key),
    });
  } catch (error: any) {
    console.error('Card image upload error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel anexar a imagem.' }, { status: 500 });
  }
}

function extensionFromMime(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
