import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

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
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
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

  await supabaseGame.from('rooms').update({
    status: 'PICKING',
    turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
  }).eq('id', room.id).eq('status', 'PLAYING');

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
  const aliveIds = new Set(alive.map((player: any) => player.id));
  const liveCardsFromAlive = (liveCards || []).filter((card: any) => aliveIds.has(card.player_id));
  const distinctLiveCharacters = new Set((liveCardsFromAlive || []).map((card: any) => card.character_id));

  if (alive.length > 1 && distinctLiveCharacters.size <= 1) {
    return startTiebreakPicking(room, alive);
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
    const leaderLiveCards = liveCardsFromAlive.filter((card: any) => card.player_id === leader.player.id).length;
    if (leaderLiveCards > 0 && leaderLiveCards >= distinctLiveCharacters.size && distinctLiveCharacters.size > 1) {
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
      await touchRoomActivity(room.id);
      return { finished: true, winner: leader.player.nickname, smartWin: true };
    }
  }

  await advanceTurn(room);
  return { finished: false };
}
