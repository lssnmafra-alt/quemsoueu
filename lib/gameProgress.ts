import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function resolvePlayerId(player: any) {
  if (typeof player === 'string') return player;
  return player?.id || player?.player_id || '';
}

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export async function advanceTurn(room: any) {
  await supabaseGame
    .from('rooms')
    .update({
      current_turn_number: (room.current_turn_number || 0) + 1,
      turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
    })
    .eq('id', room.id)
    .eq('status', 'PLAYING');
  await touchRoomActivity(room.id);
}

export async function syncLivesFromLiveCards(roomId: string) {
  const [{ data: players }, { data: liveCards }] = await Promise.all([
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
    supabaseGame.from('player_cards').select('*').eq('room_id', roomId).eq('is_dead', false),
  ]);

  const liveCounts = new Map<string, number>();
  for (const card of liveCards || []) {
    liveCounts.set(card.player_id, (liveCounts.get(card.player_id) || 0) + 1);
  }

  const eliminatedPlayerIds = new Set<string>();

  for (const player of players || []) {
    const wasAlreadyEliminated = Boolean(player.is_eliminated);
    const rawLives = liveCounts.get(player.id) || 0;

    if (wasAlreadyEliminated && rawLives > 0) {
      await supabaseGame
        .from('player_cards')
        .update({ is_dead: true })
        .eq('room_id', roomId)
        .eq('player_id', player.id)
        .eq('is_dead', false);
      liveCounts.set(player.id, 0);
      eliminatedPlayerIds.add(player.id);
    }

    const lives = wasAlreadyEliminated ? 0 : liveCounts.get(player.id) || 0;
    const isEliminated = wasAlreadyEliminated || lives <= 0;

    if ((player.lives || 0) !== lives || Boolean(player.is_eliminated) !== isEliminated) {
      await supabaseGame
        .from('room_players')
        .update({ lives, is_eliminated: isEliminated })
        .eq('id', player.id);
    }
  }

  return {
    players: players || [],
    liveCards: (liveCards || []).filter((card: any) => !eliminatedPlayerIds.has(card.player_id)),
    liveCounts,
  };
}

async function getRoomCharacters(room: any) {
  const query = supabaseGame.from('characters').select('*');
  const { data } = room.deck_id
    ? await query.eq('deck_id', room.deck_id)
    : await query.is('deck_id', null);
  return data || [];
}

async function giveFreshTiebreakCards(room: any, tiebreakPlayers: any[]) {
  const playersToContinue = tiebreakPlayers.filter(Boolean);
  if (playersToContinue.length === 0) {
    return { playerIds: [], cardCount: 0 };
  }

  const [{ data: currentCards }, characters] = await Promise.all([
    supabaseGame.from('player_cards').select('*').eq('room_id', room.id),
    getRoomCharacters(room),
  ]);

  if (characters.length === 0) {
    return { playerIds: playersToContinue.map((player: any) => player.id), cardCount: 0 };
  }

  let cardCount = 0;

  for (const player of playersToContinue) {
    const playerCards = (currentCards || []).filter((card: any) => card.player_id === player.id);
    const usedCharacterIds = new Set(playerCards.map((card: any) => card.character_id));
    const preferredPool = characters.filter((character: any) => !usedCharacterIds.has(character.id));
    const pool = preferredPool.length > 0 ? preferredPool : characters;
    const selected = shuffle(pool)[0];

    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .eq('room_id', room.id)
      .eq('player_id', player.id)
      .eq('is_dead', false);

    const { error } = await supabaseGame.from('player_cards').insert({
      room_id: room.id,
      player_id: player.id,
      character_id: selected.id,
      is_dead: false,
    });

    if (error) {
      const reusableCard = playerCards.find((card: any) => card.is_dead !== false) || playerCards[0];
      if (reusableCard) {
        await supabaseGame
          .from('player_cards')
          .update({ character_id: selected.id, is_dead: false })
          .eq('id', reusableCard.id);
      } else {
        continue;
      }
    }

    cardCount += 1;
    await supabaseGame
      .from('room_players')
      .update({ lives: 1, is_eliminated: false, missed_turns: 0 })
      .eq('id', player.id);
  }

  return {
    playerIds: playersToContinue.map((player: any) => player.id),
    cardCount,
  };
}

export async function finishOrAdvance(room: any, tiebreakPlayers: any[] = []) {
  const { players, liveCards, liveCounts } = await syncLivesFromLiveCards(room.id);
  const playersById = new Map((players || []).map((player: any) => [player.id, player]));
  const alive = (players || []).filter((player: any) => !player.is_eliminated && (liveCounts.get(player.id) || 0) > 0);
  const aliveIds = new Set(alive.map((player: any) => player.id));
  const liveCardsFromAlive = (liveCards || []).filter((card: any) => aliveIds.has(card.player_id));

  if (alive.length === 0 || liveCardsFromAlive.length === 0) {
    const explicitTiebreakIds = uniqueIds(tiebreakPlayers.map(resolvePlayerId));
    const fallbackTiebreakIds = (players || [])
      .filter((player: any) => !player.is_eliminated)
      .map((player: any) => player.id);
    const tiebreakIds = explicitTiebreakIds.length > 0 ? explicitTiebreakIds : fallbackTiebreakIds;
    const playersToContinue = uniqueIds(tiebreakIds)
      .map((id) => playersById.get(id))
      .filter(Boolean);

    if (playersToContinue.length === 0) {
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
      await touchRoomActivity(room.id);
      return { finished: true, winner: null, reason: 'no-tiebreak-players' };
    }

    const tiebreak = await giveFreshTiebreakCards(room, playersToContinue);
    await advanceTurn(room);
    return {
      finished: false,
      tiebreak: true,
      tiebreakPlayerIds: tiebreak.playerIds,
      tiebreakCards: tiebreak.cardCount,
    };
  }

  if (alive.length === 1) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return { finished: true, winner: alive[0]?.nickname || null };
  }

  const ranked = alive
    .map((player: any) => ({ player, lives: liveCounts.get(player.id) || 0 }))
    .sort((a, b) => b.lives - a.lives);
  const leader = ranked[0];
  const tiedWithLeader = ranked.filter((item) => item.lives === leader.lives);

  if (tiedWithLeader.length === 1) {
    const distinctLiveCharacters = new Set((liveCardsFromAlive || []).map((card: any) => card.character_id)).size;
    if (leader.lives >= distinctLiveCharacters) {
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
      await touchRoomActivity(room.id);
      return { finished: true, winner: leader.player.nickname, smartWin: true };
    }
  }

  await advanceTurn(room);
  return { finished: false };
}
