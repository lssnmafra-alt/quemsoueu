import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { touchRoomActivity } from '@/lib/roomLifecycle';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) {
    return NextResponse.json({ error: 'Sala nao encontrada.' }, { status: 404 });
  }

  if (room.status !== 'PICKING') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'room-not-picking' });
  }

  const needed = room.chars_per_player || 3;
  const expired = !room.turn_expires_at || new Date(room.turn_expires_at).getTime() <= Date.now();
  const deckQuery = supabaseGame.from('characters').select('*');
  const [{ data: deckChars }, { data: currentCards }] = await Promise.all([
    room.deck_id ? deckQuery.eq('deck_id', room.deck_id) : deckQuery.is('deck_id', null),
    supabaseGame.from('player_cards').select('*').eq('room_id', room.id),
  ]);

  const characters = deckChars || [];
  if (characters.length < needed) {
    return NextResponse.json({ error: `O deck precisa ter pelo menos ${needed} personagens.` }, { status: 400 });
  }

  const cardsByPlayer = new Map<string, any[]>();
  for (const card of currentCards || []) {
    const list = cardsByPlayer.get(card.player_id) || [];
    list.push(card);
    cardsByPlayer.set(card.player_id, list);
  }

  const realPlayers = (players || []).filter((player: any) => !player.is_bot);
  const allReady = realPlayers.length > 0
    ? realPlayers.every((player: any) => (cardsByPlayer.get(player.id)?.length || 0) >= needed)
    : (players || []).every((player: any) => (cardsByPlayer.get(player.id)?.length || 0) >= needed);

  if (!expired && !allReady) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'waiting-for-players' });
  }

  for (const player of players || []) {
    const existingCards = cardsByPlayer.get(player.id) || [];
    const missing = Math.max(0, needed - existingCards.length);
    if (missing > 0) {
      const existingCharacterIds = new Set(existingCards.map((card: any) => card.character_id));
      const available = characters.filter((character: any) => !existingCharacterIds.has(character.id));
      const selected = shuffle(available).slice(0, missing);

      if (selected.length > 0) {
        await supabaseGame.from('player_cards').insert(selected.map((character: any) => ({
          room_id: room.id,
          player_id: player.id,
          character_id: character.id,
        })));
      }
    }

    await supabaseGame
      .from('room_players')
      .update({ lives: needed, is_eliminated: false, missed_turns: 0 })
      .eq('id', player.id);
  }

  const randomizedPlayers = shuffle(players || []);
  for (let i = 0; i < randomizedPlayers.length; i++) {
    await supabaseGame.from('room_players').update({ play_order: i }).eq('id', randomizedPlayers[i].id);
  }

  await supabaseGame.from('rooms').update({
    status: 'STARTING',
    current_turn_number: 0,
    turn_expires_at: new Date(Date.now() + 8000).toISOString(),
  }).eq('id', room.id);

  await touchRoomActivity(room.id);

  return NextResponse.json({
    ok: true,
    randomizedMissingCards: expired && !allReady,
    players: (players || []).length,
  });
}
