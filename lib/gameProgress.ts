import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

function resolvePlayerId(player: any) {
  if (typeof player === 'string') return player;
  return player?.id || player?.player_id || '';
}

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sameTurnFilter(query: any, room: any) {
  return query
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0);
}

async function finishRoom(room: any) {
  await sameTurnFilter(
    supabaseGame
      .from('rooms')
      .update({ status: 'FINISHED' }),
    room,
  );

  await touchRoomActivity(room.id);
}

export async function advanceTurn(room: any) {
  await sameTurnFilter(
    supabaseGame
      .from('rooms')
      .update({
        current_turn_number: (room.current_turn_number || 0) + 1,
        turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
      }),
    room,
  );

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

    if (wasAlreadyEliminated && (liveCounts.get(player.id) || 0) > 0) {
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

async function startTiebreakPicking(room: any, tiebreakPlayers: any[]) {
  const playersToPick = tiebreakPlayers.filter(Boolean);
  const tiebreakPlayerIds = uniqueIds(playersToPick.map((player: any) => player.id));

  if (tiebreakPlayerIds.length === 0) {
    await finishRoom(room);
    return { finished: true, winner: null, reason: 'no-tiebreak-players' };
  }

  await supabaseGame
    .from('player_cards')
    .update({ is_dead: true })
    .eq('room_id', room.id)
    .in('player_id', tiebreakPlayerIds)
    .eq('is_dead', false);

  await supabaseGame
    .from('room_players')
    .update({ lives: 1, is_eliminated: false, missed_turns: 0 })
    .in('id', tiebreakPlayerIds);

  await sameTurnFilter(
    supabaseGame.from('rooms').update({
      status: 'PICKING',
      turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
    }),
    room,
  );

  await touchRoomActivity(room.id);

  return {
    finished: false,
    tiebreak: true,
    needsPicking: true,
    tiebreakPlayerIds,
  };
}

export async function finishOrAdvance(room: any, tiebreakPlayers: any[] = []) {
  const { players, liveCards, liveCounts } = await syncLivesFromLiveCards(room.id);
  const playersById = new Map((players || []).map((player: any) => [player.id, player]));
  const alive = (players || []).filter((player: any) => !player.is_eliminated && (liveCounts.get(player.id) || 0) > 0);
  const activeHumans = alive.filter((player: any) => !player.is_bot);
  const activeBots = alive.filter((player: any) => player.is_bot);
  const aliveIds = new Set(alive.map((player: any) => player.id));
  const liveCardsFromAlive = (liveCards || []).filter((card: any) => aliveIds.has(card.player_id));
  const distinctLiveCharacters = new Set((liveCardsFromAlive || []).map((card: any) => card.character_id));

  if (activeHumans.length === 0 && activeBots.length > 0) {
    const sortedBots = [...activeBots].sort((a: any, b: any) => (liveCounts.get(b.id) || 0) - (liveCounts.get(a.id) || 0));
    const topBot = sortedBots[0];
    const secondBot = sortedBots[1];

    if (!secondBot || (liveCounts.get(topBot.id) || 0) > (liveCounts.get(secondBot.id) || 0)) {
      await finishRoom(room);
      return { finished: true, winner: topBot?.nickname || null, reason: 'bots-only-life-leader' };
    }
  }

  if (alive.length > 1 && distinctLiveCharacters.size <= 1) {
    const maxLives = Math.max(...alive.map((player: any) => liveCounts.get(player.id) || 0));
    const leaders = alive.filter((player: any) => (liveCounts.get(player.id) || 0) === maxLives);

    // If everybody is stuck with the same remaining character, the player with more lives wins.
    // Only equal-life leaders go to picking tiebreak. This prevents a 1-life player from winning
    // automatically against a 2-life player just because both share the last visible card.
    if (leaders.length === 1) {
      const winner = leaders[0];
      const loserIds = alive.filter((player: any) => player.id !== winner.id).map((player: any) => player.id);

      if (loserIds.length > 0) {
        await supabaseGame
          .from('room_players')
          .update({ lives: 0, is_eliminated: true })
          .in('id', loserIds);

        await supabaseGame
          .from('player_cards')
          .update({ is_dead: true })
          .eq('room_id', room.id)
          .in('player_id', loserIds)
          .eq('is_dead', false);
      }

      await finishRoom(room);
      return { finished: true, winner: winner?.nickname || null, reason: 'shared-card-life-leader' };
    }

    return startTiebreakPicking(room, leaders);
  }

  if (alive.length === 0 || liveCardsFromAlive.length === 0) {
    const explicitTiebreakIds = uniqueIds(tiebreakPlayers.map(resolvePlayerId));
    const fallbackTiebreakIds = (players || [])
      .filter((player: any) => !player.is_eliminated)
      .map((player: any) => player.id);
    const tiebreakIds = explicitTiebreakIds.length > 0 ? explicitTiebreakIds : fallbackTiebreakIds;
    const playersToPick = uniqueIds(tiebreakIds)
      .map((id) => playersById.get(id) || { id })
      .filter(Boolean);

    return startTiebreakPicking(room, playersToPick);
  }

  if (alive.length === 1) {
    await finishRoom(room);
    return { finished: true, winner: alive[0]?.nickname || null };
  }

  await advanceTurn(room);
  return { finished: false };
}
