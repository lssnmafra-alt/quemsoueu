import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { generateImageWithPollinations } from '@/lib/pollinationsImage';
import { uploadImageToR2 } from '@/lib/r2ImageStorage';

export const dynamic = 'force-dynamic';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character';
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function publicErrorMessage(error: any) {
  const message = String(error?.message || 'Nao foi possivel gerar imagem do personagem.');

  if (message.includes('R2_PUBLIC_URL')) return 'R2_PUBLIC_URL nao configurado no Cloudflare.';
  if (message.includes('Bucket R2')) return 'Bucket R2 nao configurado no Cloudflare.';
  if (message.includes('401') || message.includes('403')) return 'Chave do Pollinations recusada ou sem permissao.';
  if (message.includes('429')) return 'Limite do Pollinations atingido.';

  return message.slice(0, 700);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const characterId = typeof body.characterId === 'string' ? body.characterId.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!characterId) {
      return NextResponse.json({ ok: false, error: 'Personagem obrigatorio.' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ ok: false, error: 'Prompt obrigatoria.' }, { status: 400 });
    }

    const { data: character, error: characterError } = await supabaseGame
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (characterError || !character) {
      return NextResponse.json({ ok: false, error: 'Personagem nao encontrado.' }, { status: 404 });
    }

    if (!isOfficialDeckId(character.deck_id)) {
      return NextResponse.json({ ok: false, error: 'Personagem nao pertence a deck oficial.' }, { status: 403 });
    }

    const image = await generateImageWithPollinations(prompt, { width: 1024, height: 1536 });
    const extension = extensionFromContentType(image.contentType);
    const key = `atuem/characters/${characterId}/${slugify(character.name || 'character')}-${Date.now()}.${extension}`;
    const uploaded = await uploadImageToR2({
      key,
      bytes: image.bytes,
      contentType: image.contentType,
    });

    const { data: updatedCharacter, error: updateError } = await supabaseGame
      .from('characters')
      .update({ image_url: uploaded.url })
      .eq('id', characterId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      provider: 'pollinations',
      model: 'flux',
      character: updatedCharacter,
      imageUrl: uploaded.url,
      key: uploaded.key,
    });
  } catch (error: any) {
    const readableError = publicErrorMessage(error);
    console.error('Pollinations character image error:', readableError, error);
    return NextResponse.json(
      { ok: false, error: readableError },
      { status: 400 },
    );
  }
}
