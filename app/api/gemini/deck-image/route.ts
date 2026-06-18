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
    .replace(/^-+|-+$/g, '') || 'deck';
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function publicErrorMessage(error: any) {
  const message = String(error?.message || 'Nao foi possivel gerar imagem do deck.');

  if (message.includes('R2_PUBLIC_URL')) return 'R2_PUBLIC_URL nao configurado no Cloudflare.';
  if (message.includes('Bucket R2')) return 'Bucket R2 nao configurado no Cloudflare.';
  if (message.includes('401') || message.includes('403')) return 'Chave do Pollinations recusada ou sem permissao.';
  if (message.includes('429')) return 'Limite do Pollinations atingido.';

  return message.slice(0, 700);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!isOfficialDeckId(deckId)) {
      return NextResponse.json({ ok: false, error: 'Deck oficial invalido.' }, { status: 403 });
    }

    if (!prompt) {
      return NextResponse.json({ ok: false, error: 'Prompt obrigatoria.' }, { status: 400 });
    }

    const { data: deck, error: deckError } = await supabaseGame
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single();

    if (deckError || !deck) {
      return NextResponse.json({ ok: false, error: 'Deck nao encontrado.' }, { status: 404 });
    }

    const image = await generateImageWithPollinations(prompt, { width: 1024, height: 1536 });
    const extension = extensionFromContentType(image.contentType);
    const key = `atuem/gemini/${deckId}/${slugify(deck.name || 'deck')}-${Date.now()}.${extension}`;
    const uploaded = await uploadImageToR2({
      key,
      bytes: image.bytes,
      contentType: image.contentType,
    });

    const { data: updatedDeck, error: updateError } = await supabaseGame
      .from('decks')
      .update({ cover_url: uploaded.url })
      .eq('id', deckId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      provider: 'pollinations',
      model: 'flux',
      deck: updatedDeck,
      imageUrl: uploaded.url,
      key: uploaded.key,
    });
  } catch (error: any) {
    const readableError = publicErrorMessage(error);
    console.error('Pollinations deck image error:', readableError, error);
    return NextResponse.json(
      { ok: false, error: readableError },
      { status: 400 },
    );
  }
}
