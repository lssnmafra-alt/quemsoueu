import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';

export async function POST(req: NextRequest) {
  try {
    if (!TEMP_OFFICIAL_DECK_EDITING_ENABLED) {
      return NextResponse.json({ error: 'Edicao oficial desativada.' }, { status: 403 });
    }

    const body = await req.json();
    const deckId = String(body.deckId || '');
    const action = String(body.action || '');

    if (!isOfficialDeckId(deckId)) {
      return NextResponse.json({ error: 'Deck oficial invalido.' }, { status: 403 });
    }

    if (action === 'add-character') {
      const { count, error: countError } = await supabaseGame
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId);

      if (countError) throw countError;

      if ((count || 0) >= MAX_CHARACTERS_PER_DECK) {
        return NextResponse.json(
          { error: `Cada baralho pode ter no maximo ${MAX_CHARACTERS_PER_DECK} personagens.` },
          { status: 400 },
        );
      }

      const name = String(body.name || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatorio.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('characters')
        .insert({
          deck_id: deckId,
          name,
          image_url: String(body.imageUrl || ''),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ character: data });
    }

    if (action === 'delete-character') {
      const characterId = String(body.characterId || '');

      if (!characterId) {
        return NextResponse.json({ error: 'Card obrigatorio.' }, { status: 400 });
      }

      const { error } = await supabaseGame
        .from('characters')
        .delete()
        .eq('id', characterId)
        .eq('deck_id', deckId);

      if (error) throw error;

      return NextResponse.json({ ok: true, characterId });
    }

    if (action === 'update-character') {
      const characterId = String(body.characterId || '');
      const updates: Record<string, string> = {};

      if (typeof body.name === 'string') {
        updates.name = body.name.trim();
      }

      if (typeof body.imageUrl === 'string') {
        updates.image_url = body.imageUrl.trim();
      }

      if (!characterId) {
        return NextResponse.json({ error: 'Card obrigatorio.' }, { status: 400 });
      }

      if (!updates.name && !('image_url' in updates)) {
        return NextResponse.json({ error: 'Nada para salvar.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('characters')
        .update(updates)
        .eq('id', characterId)
        .eq('deck_id', deckId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ character: data });
    }

    if (action === 'update-cover') {
      const coverUrl = String(body.coverUrl || '').trim();

      const { data, error } = await supabaseGame
        .from('decks')
        .update({ cover_url: coverUrl })
        .eq('id', deckId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ deck: data });
    }

    return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Official deck edit error:', error);

    return NextResponse.json(
      { error: error.message || 'Erro ao editar deck oficial.' },
      { status: 500 },
    );
  }
}
