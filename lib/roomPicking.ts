import { supabaseGame } from './supabase';
import { nextRoomExpiry, touchRoomActivity } from './roomLifecycle';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function openingDurationMs(playerCount: number) {
  return Math.max(8000, Math.min(22000, (2 + Math.max(1, playerCount) * 2) * 1000));
}

async function isTiebreakPicking(room: any) {
  const { data } = await supabaseGame
    .from('match_events')
    .select('id')
    .eq('room_id', room.id)
    .eq('turn_number', room.current_turn_number || 0)
    .in('event_type', ['tiebreak_started', 'tiebreak_restarted_same_card'])
    .limit(1);

  return Boolean(data?.length);
}

function resolvePickingNeed(room: any, tiebreakPicking: boolean) {
  return tiebreakPicking ? 1 : Math.max(1, Number(room.chars_per_player || 3));
}

async function fetchDeckCharacters(room: any) {
  const deckQuery = supabaseGame.from('characters').select('*');
  const { data } = room.deck_id ? await deckQuery.eq('deck_id', room.deck_id) : await deckQuery.is('deck_id', null);
  return data || [];
}

export async function finalizeRoomPicking(roomId: string, _options: { serverTick?: boolean } = {}) {
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
  const tiebreakPicking = await isTiebreakPicking(room);
  const needed = resolvePickingNeed(room, tiebreakPicking);

  if (activePlayers.length === 0) {
    return { ok: true, skipped: true, reason: 'no-active-picking-players' };
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

  const characters = await fetchDeckCharacters(room);
  if (characters.length < needed) {
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${needed} personagens para ${needed} vida(s) por jogador.` };
  }

  const randomizedPlayers = shuffle(activePlayers);
  const playOrderByPlayerId = new Map(randomizedPlayers.map((player: any, index) => [player.id, index]));

  const transitionNow = new Date();
  const transitionRoom = () => supabaseGame.from('rooms').update({
    status: 'STARTING',
    current_turn_number: 0,
    turn_expires_at: new Date(Date.now() + openingDurationMs(activePlayers.length)).toISOString(),
    last_activity_at: transitionNow.toISOString(),
    expires_at: nextRoomExpiry(transitionNow),
  }).eq('id', room.id).eq('status', 'PICKING');

  for (const player of activePlayers) {
    const existingLiveCards = liveCardsByPlayer.get(player.id) || [];
    const keptLiveCards = existingLiveCards.slice(0, needed);
    const extras = existingLiveCards.slice(needed);
    const missing = Math.max(0, needed - keptLiveCards.length);

    await supabaseGame
      .from('room_players')
      .update({
        lives: needed,
        is_eliminated: false,
        missed_turns: 0,
        play_order: playOrderByPlayerId.get(player.id),
      })
      .eq('id', player.id);

    if (extras.length > 0) {
      await supabaseGame.from('player_cards').update({ is_dead: true }).in('id', extras.map((card: any) => card.id));
    }

    if (missing > 0) {
      const allPlayerCards = allCardsByPlayer.get(player.id) || [];
      const liveCharacterIdsForPlayer = new Set(keptLiveCards.map((card: any) => card.character_id).filter(Boolean));
      const preferred = characters.filter((character: any) => !liveCharacterIdsForPlayer.has(character.id));
      const pool = preferred.length >= missing ? preferred : characters;
      const selected = shuffle(pool).slice(0, missing);

      if (selected.length < missing) {
        return { ok: false, status: 400, error: 'Nao ha personagens suficientes para completar a escolha.' };
      }

      selected.forEach((character: any) => liveCharacterIdsForPlayer.add(character.id));

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
  }

  await transitionRoom();
  await touchRoomActivity(room.id);

  return {
    ok: true,
    needed,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    repeatedCardsAllowed: true,
    players: activePlayers.length,
  };
}
