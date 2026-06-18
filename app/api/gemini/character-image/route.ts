import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { generateImageWithGemini } from '@/lib/geminiImage';
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

    const image = await generateImageWithGemini(prompt);
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
      character: updatedCharacter,
      imageUrl: uploaded.url,
      key: uploaded.key,
    });
  } catch (error: any) {
    console.error('Gemini character image error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Nao foi possivel gerar imagem do personagem.' },
      { status: 500 },
    );
  }
}
