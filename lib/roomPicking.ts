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
  return tiebreakPicking ? 1 : room.chars_per_player || 3;
}

async function fetchDeckCharacters(room: any) {
  const deckQuery = supabaseGame.from('characters').select('*');
  const { data } = room.deck_id ? await deckQuery.eq('deck_id', room.deck_id) : await deckQuery.is('deck_id', null);
  return data || [];
}

async function logPickingEvent(room: any, eventType: string, metadata: any) {
  try {
    await supabaseGame.from('match_events').insert({
      room_id: room.id,
      turn_number: room.current_turn_number || 0,
      event_type: eventType,
      metadata,
    });
  } catch (error) {
    console.warn(`match_events ${eventType} skipped:`, error);
  }
}

function duplicateLivePicks(cards: any[]) {
  const byCharacter = new Map<string, any[]>();
  for (const card of cards || []) {
    if (!card.character_id || !card.player_id) continue;
    const list = byCharacter.get(card.character_id) || [];
    list.push(card);
    byCharacter.set(card.character_id, list);
  }

  return [...byCharacter.entries()]
    .filter(([, list]) => new Set(list.map((card) => card.player_id)).size > 1)
    .map(([characterId, list]) => ({ characterId, cards: list }));
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

  let characters = await fetchDeckCharacters(room);
  const totalNeeded = needed * activePlayers.length;
  if (characters.length < totalNeeded) {
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${totalNeeded} personagens únicos para ${activePlayers.length} participantes.` };
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

  const assignedCharacterIds = new Set<string>();
  for (const liveCards of liveCardsByPlayer.values()) {
    for (const card of liveCards.slice(0, needed)) {
      if (card.character_id) assignedCharacterIds.add(card.character_id);
    }
  }

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
      const existingCharacterIds = new Set(allPlayerCards.map((card: any) => card.character_id));
      const preferred = characters.filter((character: any) => !existingCharacterIds.has(character.id) && !assignedCharacterIds.has(character.id));
      const fallback = characters.filter((character: any) => !assignedCharacterIds.has(character.id));
      const pool = preferred.length >= missing ? preferred : fallback;
      const selected = shuffle(pool).slice(0, missing);

      if (selected.length < missing) {
        return { ok: false, status: 400, error: 'Nao ha personagens únicos suficientes para completar a escolha.' };
      }

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
  }

  const activePlayerIds = activePlayers.map((player: any) => player.id);
  const { data: freshLiveCards } = activePlayerIds.length > 0
    ? await supabaseGame
      .from('player_cards')
      .select('id,player_id,character_id')
      .eq('room_id', room.id)
      .eq('is_dead', false)
      .in('player_id', activePlayerIds)
    : { data: [] };

  const duplicates = duplicateLivePicks(freshLiveCards || []);
  if (duplicates.length > 0) {
    const duplicateCardIds = duplicates.flatMap((item) => item.cards.map((card: any) => card.id));
    const duplicatePlayerIds = [...new Set(duplicates.flatMap((item) => item.cards.map((card: any) => card.player_id)))] as string[];

    await logPickingEvent(room, 'picking_restarted_duplicate_card', {
      player_ids: duplicatePlayerIds,
      character_ids: duplicates.map((item) => item.characterId),
      reason: tiebreakPicking ? 'duplicate-card-in-tiebreak' : 'duplicate-card-in-initial-picking',
    });

    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .in('id', duplicateCardIds);

    await supabaseGame.from('rooms').update({
      status: 'PICKING',
      turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
      last_activity_at: transitionNow.toISOString(),
      expires_at: nextRoomExpiry(transitionNow),
    }).eq('id', room.id).eq('status', 'PICKING');

    await touchRoomActivity(room.id);

    return {
      ok: true,
      skipped: true,
      duplicatePick: true,
      tiebreak: tiebreakPicking,
      needed,
      players: duplicatePlayerIds.length,
      message: 'Personagem repetido detectado. Os jogadores afetados precisam escolher novamente.',
    };
  }

  await transitionRoom();
  await touchRoomActivity(room.id);

  return {
    ok: true,
    needed,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    repeatedCardsAllowed: false,
    players: activePlayers.length,
  };
}
