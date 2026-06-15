import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_GAME || process.env.SUPABASE_URL_GAME || process.env.SUPABASE_GAME_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME ||
    process.env.SUPABASE_ANON_KEY_GAME ||
    process.env.SUPABASE_GAME_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY_GAME ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured.');
  }

  return createClient(url, key);
}

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

    const supabase = getAdminClient();

    if (action === 'add-character') {
      const { count } = await supabase
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId);

      if ((count || 0) >= MAX_CHARACTERS_PER_DECK) {
        return NextResponse.json({ error: `Cada baralho pode ter no maximo ${MAX_CHARACTERS_PER_DECK} personagens.` }, { status: 400 });
      }

      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Nome obrigatorio.' }, { status: 400 });

      const { data, error } = await supabase
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
      return NextResponse.json(
        { error: 'Exclusao de cards oficiais desativada. Edite/anexe imagem nos cards existentes.' },
        { status: 403 },
      );
    }

    if (action === 'update-character') {
      const characterId = String(body.characterId || '');
      const updates: Record<string, string> = {};
      if (typeof body.name === 'string') updates.name = body.name.trim();
      if (typeof body.imageUrl === 'string') updates.image_url = body.imageUrl.trim();

      if (!updates.name && !('image_url' in updates)) {
        return NextResponse.json({ error: 'Nada para salvar.' }, { status: 400 });
      }

      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    return NextResponse.json({ error: error.message || 'Erro ao editar deck oficial.' }, { status: 500 });
  }
}
