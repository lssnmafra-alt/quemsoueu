import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isProjectAdmin } from '@/lib/admin';
import { isOfficialDeckId } from '@/lib/officialDecks';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: deckId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';

  if (!UUID_REGEX.test(deckId) || !UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Dados invalidos para excluir o deck.' }, { status: 400 });
  }

  const { data: deck, error: deckError } = await supabaseGame
    .from('decks')
    .select('id,name,creator_id,is_official')
    .eq('id', deckId)
    .maybeSingle();

  if (deckError) return NextResponse.json({ error: deckError.message }, { status: 500 });
  if (!deck) return NextResponse.json({ error: 'Deck nao encontrado.' }, { status: 404 });

  const isOfficial = Boolean(deck.is_official) || deck.creator_id === null || isOfficialDeckId(deck.id);
  const canDelete = isProjectAdmin(userId) || (!isOfficial && deck.creator_id === userId);

  if (!canDelete) {
    return NextResponse.json({ error: 'Apenas o ADM ou o criador pode excluir este deck.' }, { status: 403 });
  }

  const { data: characters, error: charactersError } = await supabaseGame
    .from('characters')
    .select('id')
    .eq('deck_id', deckId);

  if (charactersError) return NextResponse.json({ error: charactersError.message }, { status: 500 });

  const characterIds = (characters || []).map((character: any) => character.id).filter(Boolean);

  if (characterIds.length > 0) {
    await runDelete('player_cards', (query) => query.in('character_id', characterIds));
    await runUpdate('match_events', { character_id: null }, (query) => query.in('character_id', characterIds));
  }

  await runDelete('deck_favorites', (query) => query.eq('deck_id', deckId));
  await runUpdate('rooms', { deck_id: null }, (query) => query.eq('deck_id', deckId));
  await runDelete('characters', (query) => query.eq('deck_id', deckId));
  await runDelete('decks', (query) => query.eq('id', deckId));

  return NextResponse.json({ ok: true, deckId });
}

async function runDelete(table: string, applyFilter: (query: any) => any) {
  const { error } = await applyFilter(supabaseGame.from(table).delete());
  if (error) throw error;
}

async function runUpdate(table: string, values: Record<string, any>, applyFilter: (query: any) => any) {
  const { error } = await applyFilter(supabaseGame.from(table).update(values));
  if (error) throw error;
}
