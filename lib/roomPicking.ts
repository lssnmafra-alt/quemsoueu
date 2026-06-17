import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function resolvePickingNeed(room: any, players: any[], currentCards: any[]) {
  const activePlayers = players.filter((player: any) => !player.is_eliminated);
  const hasHistoricalCards = currentCards.length > 0;
  const activeLives = activePlayers.map((player: any) => player.lives || 0);
  const isTiebreak = hasHistoricalCards && activePlayers.length > 1 && activeLives.every((lives: number) => lives <= 1);

  return isTiebreak ? 1 : room.chars_per_player || 3;
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

  const expired = !room.turn_expires_at || new Date(room.turn_expires_at).getTime() <= Date.now();
  const deckQuery = supabaseGame.from('characters').select('*');
  const [{ data: deckChars }, { data: currentCards }] = await Promise.all([
    room.deck_id ? deckQuery.eq('deck_id', room.deck_id) : deckQuery.is('deck_id', null),
    supabaseGame.from('player_cards').select('*').eq('room_id', room.id),
  ]);

  const allPlayers = players || [];
  const cards = currentCards || [];
  const activePlayers = allPlayers.filter((player: any) => !player.is_eliminated);
  const needed = resolvePickingNeed(room, activePlayers, cards);
  const characters = deckChars || [];

  if (activePlayers.length === 0) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return { ok: true, finished: true, reason: 'no-active-picking-players' };
  }

  if (characters.length < needed) {
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${needed} personagens.` };
  }

  const liveCardsByPlayer = new Map<string, any[]>();
  const allCardsByPlayer = new Map<string, any[]>();
  for (const card of cards) {
    const allList = allCardsByPlayer.get(card.player_id) || [];
    allList.push(card);
    allCardsByPlayer.set(card.player_id, allList);

    if (card.is_dead) continue;
    const liveList = liveCardsByPlayer.get(card.player_id) || [];
    liveList.push(card);
    liveCardsByPlayer.set(card.player_id, liveList);
  }

  const realPlayers = activePlayers.filter((player: any) => !player.is_bot);
  const allReady = realPlayers.length > 0
    ? realPlayers.every((player: any) => (liveCardsByPlayer.get(player.id)?.length || 0) >= needed)
    : activePlayers.length > 0;

  if (!expired && !allReady) {
    return { ok: true, skipped: true, reason: 'waiting-for-players' };
  }

  const assignedCharacterIds = new Set<string>();

  for (const player of activePlayers) {
    const existingLiveCards = liveCardsByPlayer.get(player.id) || [];
    const missing = Math.max(0, needed - existingLiveCards.length);

    if (existingLiveCards.length > needed) {
      const extras = existingLiveCards.slice(needed);
      await supabaseGame.from('player_cards').update({ is_dead: true }).in('id', extras.map((card: any) => card.id));
    }

    if (missing > 0) {
      const allPlayerCards = allCardsByPlayer.get(player.id) || [];
      const existingCharacterIds = new Set(allPlayerCards.map((card: any) => card.character_id));
      const preferred = characters.filter((character: any) => !existingCharacterIds.has(character.id) && !assignedCharacterIds.has(character.id));
      const fallbackFresh = characters.filter((character: any) => !existingCharacterIds.has(character.id));
      const pool = preferred.length > 0 ? preferred : fallbackFresh.length > 0 ? fallbackFresh : characters;
      const selected = shuffle(pool).slice(0, missing);

      for (const character of selected) {
        const reusableCard = allPlayerCards.find((card: any) => card.is_dead);
        if (reusableCard) {
          const { error } = await supabaseGame
            .from('player_cards')
            .update({ character_id: character.id, is_dead: false })
            .eq('id', reusableCard.id);

          if (!error) {
            reusableCard.is_dead = false;
            reusableCard.character_id = character.id;
            assignedCharacterIds.add(character.id);
            continue;
          }
        }

        const { error } = await supabaseGame.from('player_cards').insert({
          room_id: room.id,
          player_id: player.id,
          character_id: character.id,
          is_dead: false,
        });

        if (!error) {
          assignedCharacterIds.add(character.id);
        }
      }
    }

    await supabaseGame
      .from('room_players')
      .update({ lives: needed, is_eliminated: false, missed_turns: 0 })
      .eq('id', player.id);
  }

  const randomizedPlayers = shuffle(activePlayers);
  for (let i = 0; i < randomizedPlayers.length; i++) {
    await supabaseGame.from('room_players').update({ play_order: i }).eq('id', randomizedPlayers[i].id);
  }

  await supabaseGame.from('rooms').update({
    status: 'STARTING',
    current_turn_number: 0,
    turn_expires_at: new Date(Date.now() + 4000).toISOString(),
  }).eq('id', room.id).eq('status', 'PICKING');

  await touchRoomActivity(room.id);

  return {
    ok: true,
    needed,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    players: activePlayers.length,
  };
}
