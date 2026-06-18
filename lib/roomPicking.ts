import { supabaseGame } from './supabase';
import { nextRoomExpiry, touchRoomActivity } from './roomLifecycle';

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
  const [{ data: room }, { data: players }, { data: currentCards }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
    supabaseGame.from('player_cards').select('*').eq('room_id', roomId),
  ]);

  if (!room) {
    return { ok: false, status: 404, error: 'Sala nao encontrada.' };
  }

  if (room.status !== 'PICKING') {
    return { ok: true, skipped: true, reason: 'room-not-picking' };
  }

  const expired = !room.turn_expires_at || new Date(room.turn_expires_at).getTime() <= Date.now();
  const allPlayers = players || [];
  const cards = currentCards || [];
  const activePlayers = allPlayers.filter((player: any) => !player.is_eliminated);
  const needed = resolvePickingNeed(room, activePlayers, cards);

  if (activePlayers.length === 0) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return { ok: true, finished: true, reason: 'no-active-picking-players' };
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

  const needsAssignments = activePlayers.some((player: any) => (liveCardsByPlayer.get(player.id)?.length || 0) < needed);
  let characters: any[] = [];
  if (needsAssignments) {
    const deckQuery = supabaseGame.from('characters').select('*');
    const { data: deckChars } = room.deck_id ? await deckQuery.eq('deck_id', room.deck_id) : await deckQuery.is('deck_id', null);
    characters = deckChars || [];
    if (characters.length < needed) {
      return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${needed} personagens.` };
    }
  }

  const assignedCharacterIds = new Set<string>();
  const randomizedPlayers = shuffle(activePlayers);
  const playOrderByPlayerId = new Map(randomizedPlayers.map((player: any, index: number) => [player.id, index]));

  const transitionNow = new Date();
  const transitionRoom = () => supabaseGame.from('rooms').update({
    status: 'STARTING',
    current_turn_number: 0,
    turn_expires_at: new Date(Date.now() + 5000).toISOString(),
    last_activity_at: transitionNow.toISOString(),
    expires_at: nextRoomExpiry(transitionNow),
  }).eq('id', room.id).eq('status', 'PICKING');
  await Promise.all(activePlayers.map(async (player: any) => {
    const existingLiveCards = liveCardsByPlayer.get(player.id) || [];
    const missing = Math.max(0, needed - existingLiveCards.length);
    const playerUpdatePromise = (async () => {
      await supabaseGame
        .from('room_players')
        .update({
          lives: needed,
          is_eliminated: false,
          missed_turns: 0,
          play_order: playOrderByPlayerId.get(player.id),
        })
        .eq('id', player.id);
    })();

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
      selected.forEach((character: any) => assignedCharacterIds.add(character.id));

      const reusableCards = allPlayerCards.filter((card: any) => card.is_dead).slice(0, selected.length);
      const failedReusableCharacters: any[] = [];
      await Promise.all(reusableCards.map(async (reusableCard: any, index: number) => {
        const character = selected[index];
        const { error } = await supabaseGame
          .from('player_cards')
          .update({ character_id: character.id, is_dead: false })
          .eq('id', reusableCard.id);
        if (error) failedReusableCharacters.push(character);
      }));

      const charactersToInsert = [...selected.slice(reusableCards.length), ...failedReusableCharacters];
      if (charactersToInsert.length > 0) {
        await supabaseGame.from('player_cards').insert(charactersToInsert.map((character: any) => ({
          room_id: room.id,
          player_id: player.id,
          character_id: character.id,
          is_dead: false,
        })));
      }
    }

    await playerUpdatePromise;
  }));

  await transitionRoom();
  await touchRoomActivity(room.id);

  return {
    ok: true,
    needed,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    players: activePlayers.length,
  };
}
