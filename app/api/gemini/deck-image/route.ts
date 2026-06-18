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
    .replace(/^-+|-+$/g, '') || 'deck';
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function publicErrorMessage(error: any) {
  const message = String(error?.message || 'Nao foi possivel gerar imagem do deck.');

  if (message.includes('GEMINI_API_KEY')) return 'GEMINI_API_KEY nao configurada no Cloudflare.';
  if (message.includes('R2_PUBLIC_URL')) return 'R2_PUBLIC_URL nao configurado no Cloudflare.';
  if (message.includes('Bucket R2')) return 'Bucket R2 nao configurado no Cloudflare.';
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) return 'A chave GEMINI_API_KEY e invalida.';
  if (message.includes('quota') || message.includes('Quota') || message.includes('RESOURCE_EXHAUSTED')) return 'A cota do Gemini acabou ou o billing nao esta liberado.';
  if (message.includes('model') || message.includes('Model') || message.includes('not found')) return `Modelo Gemini indisponivel para essa chave. Detalhe: ${message.slice(0, 500)}`;

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

    const image = await generateImageWithGemini(prompt);
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
      deck: updatedDeck,
      imageUrl: uploaded.url,
      key: uploaded.key,
    });
  } catch (error: any) {
    const readableError = publicErrorMessage(error);
    console.error('Gemini official deck image error:', readableError, error);
    return NextResponse.json(
      { ok: false, error: readableError },
      { status: 400 },
    );
  }
}
