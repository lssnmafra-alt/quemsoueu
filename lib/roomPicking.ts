import { supabaseGame } from './supabase';
import { nextRoomExpiry, touchRoomActivity } from './roomLifecycle';

const INTRO_STATIC_BEFORE_SECONDS = 1;
const INTRO_VIDEO_SECONDS = 6;
const INTRO_STATIC_AFTER_SECONDS = 1;
const INTRO_LOAD_GRACE_SECONDS = 12;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function openingDurationMs(playerCount: number) {
  const perPlayerSeconds = INTRO_STATIC_BEFORE_SECONDS + INTRO_VIDEO_SECONDS + INTRO_STATIC_AFTER_SECONDS + INTRO_LOAD_GRACE_SECONDS;
  const safeSeconds = 8 + Math.max(1, playerCount) * perPlayerSeconds;
  return Math.max(60_000, Math.min(300_000, safeSeconds * 1000));
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

function findDuplicateLiveCards(cards: any[], activePlayerIds: Set<string>) {
  const byCharacter = new Map<string, any[]>();
  for (const card of cards || []) {
    if (card.is_dead || !activePlayerIds.has(card.player_id) || !card.character_id) continue;
    const list = byCharacter.get(card.character_id) || [];
    list.push(card);
    byCharacter.set(card.character_id, list);
  }

  return [...byCharacter.values()].filter((list) => list.length > 1).flat();
}

async function logDuplicateRepick(room: any, duplicateCards: any[], expired: boolean) {
  try {
    await supabaseGame.from('match_events').insert({
      room_id: room.id,
      turn_number: room.current_turn_number || 0,
      event_type: expired ? 'duplicate_cards_auto_repicked' : 'duplicate_cards_repick_required',
      metadata: {
        duplicate_card_ids: duplicateCards.map((card: any) => card.id),
        duplicate_player_ids: [...new Set(duplicateCards.map((card: any) => card.player_id))],
        expired,
      },
    });
  } catch (error) {
    console.warn('match_events duplicate repick skipped:', error);
  }
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
  const activePlayerIds = new Set(activePlayers.map((player: any) => player.id));
  const tiebreakPicking = await isTiebreakPicking(room);
  const needed = resolvePickingNeed(room, tiebreakPicking);

  if (activePlayers.length === 0) {
    return { ok: true, skipped: true, reason: 'no-active-picking-players' };
  }

  const liveCardsByPlayer = new Map<string, any[]>();
  const allCardsByPlayer = new Map<string, any[]>();
  const usedCharacterIdsInRoom = new Set<string>();
  for (const card of cards) {
    if (card.character_id && !card.is_dead) usedCharacterIdsInRoom.add(card.character_id);

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

  const duplicateCards = findDuplicateLiveCards(cards, activePlayerIds);
  const duplicateRepickPlayerIds = new Set<string>();
  if (duplicateCards.length > 0) {
    duplicateCards.forEach((card: any) => duplicateRepickPlayerIds.add(card.player_id));
    await supabaseGame.from('player_cards').update({ is_dead: true }).in('id', duplicateCards.map((card: any) => card.id));
    await logDuplicateRepick(room, duplicateCards, expired);

    if (!expired) {
      return {
        ok: true,
        skipped: true,
        duplicatePick: true,
        reason: 'duplicate-live-characters-repick-required',
        message: 'Dois ou mais jogadores escolheram o mesmo personagem. Esses jogadores precisam escolher novamente.',
        duplicatePlayerIds: [...duplicateRepickPlayerIds],
      };
    }
  }

  const characters = await fetchDeckCharacters(room);
  if (characters.length < needed) {
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${needed} personagens para ${needed} vida(s) por jogador.` };
  }

  const randomizedPlayers = shuffle(activePlayers);
  const playOrderByPlayerId = new Map(randomizedPlayers.map((player: any, index) => [player.id, index]));
  const transitionNow = new Date();
  const startingUntil = new Date(Date.now() + openingDurationMs(activePlayers.length)).toISOString();

  const { data: lockedRoom, error: lockError } = await supabaseGame
    .from('rooms')
    .update({
      status: 'STARTING',
      current_turn_number: 0,
      turn_expires_at: startingUntil,
      last_activity_at: transitionNow.toISOString(),
      expires_at: nextRoomExpiry(transitionNow),
    })
    .eq('id', room.id)
    .eq('status', 'PICKING')
    .select('id')
    .maybeSingle();

  if (lockError) {
    return { ok: false, status: 500, error: lockError.message || 'Nao foi possivel finalizar a escolha.' };
  }

  if (!lockedRoom) {
    return { ok: true, skipped: true, reason: 'picking-already-finalized' };
  }

  for (const player of activePlayers) {
    const shouldForceRepick = duplicateRepickPlayerIds.has(player.id);
    const existingLiveCards = shouldForceRepick ? [] : liveCardsByPlayer.get(player.id) || [];
    const keptLiveCards = existingLiveCards.slice(0, needed);
    const extras = shouldForceRepick ? [] : existingLiveCards.slice(needed);
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
      const freshPreferred = characters.filter((character: any) => !usedCharacterIdsInRoom.has(character.id) && !liveCharacterIdsForPlayer.has(character.id));
      const preferred = characters.filter((character: any) => !liveCharacterIdsForPlayer.has(character.id));
      const pool = freshPreferred.length >= missing ? freshPreferred : preferred.length >= missing ? preferred : characters;
      const selected = shuffle(pool).slice(0, missing);

      if (selected.length < missing) {
        continue;
      }

      selected.forEach((character: any) => {
        liveCharacterIdsForPlayer.add(character.id);
        usedCharacterIdsInRoom.add(character.id);
      });

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

  await touchRoomActivity(room.id);

  return {
    ok: true,
    needed,
    randomizedMissingCards: expired && !allReady,
    autoSelectedBotCards: realPlayers.length === 0,
    duplicateCardsAutoResolved: expired && duplicateCards.length > 0,
    repeatedCardsAllowed: false,
    avoidsReusingEliminatedCharacters: true,
    players: activePlayers.length,
    locked: true,
    startingDurationMs: openingDurationMs(activePlayers.length),
  };
}
