import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function finalizeRoomPicking(roomId: string) {
  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) {
    return { ok: false, status: 404, error: 'Sala nao encontrada.' };
  }

  if (room.status !== 'PICKING') {
    return { ok: true, skipped: true, reason: 'room-not-picking' };
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
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${needed} personagens.` };
  }

  const cardsByPlayer = new Map<string, any[]>();
  for (const card of currentCards || []) {
    const list = cardsByPlayer.get(card.player_id) || [];
    list.push(card);
    cardsByPlayer.set(card.player_id, list);
  }

  const allPlayers = players || [];
  const realPlayers = allPlayers.filter((player: any) => !player.is_bot);
  const allReady = realPlayers.length > 0
    ? realPlayers.every((player: any) => (cardsByPlayer.get(player.id)?.length || 0) >= needed)
    : allPlayers.length > 0;

  if (!expired && !allReady) {
    return { ok: true, skipped: true, reason: 'waiting-for-players' };
  }

  for (const player of allPlayers) {
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

  const randomizedPlayers = shuffle(allPlayers);
  for (let i = 0; i < randomizedPlayers.length; i++) {
    await supabaseGame.from('room_players').update({ play_order: i }).eq('id', randomizedPlayers[i].id);
  }

  await supabaseGame.from('rooms').update({
    status: 'STARTING',
    current_turn_number: 0,
    turn_expires_at: new Date(Date.now() + 8000).toISOString(),
  }).eq('id', room.id);

  await touchRoomActivity(room.id);

  return {
    ok: true,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    players: allPlayers.length,
  };
}
