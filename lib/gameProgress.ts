import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

export async function advanceTurn(room: any) {
  await supabaseGame
    .from('rooms')
    .update({
      current_turn_number: (room.current_turn_number || 0) + 1,
      turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
    })
    .eq('id', room.id);
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

  for (const player of players || []) {
    const lives = liveCounts.get(player.id) || 0;
    if ((player.lives || 0) !== lives || Boolean(player.is_eliminated) !== (lives <= 0)) {
      await supabaseGame
        .from('room_players')
        .update({ lives, is_eliminated: lives <= 0 })
        .eq('id', player.id);
    }
  }

  return {
    players: players || [],
    liveCards: liveCards || [],
    liveCounts,
  };
}

export async function finishOrAdvance(room: any, tiebreakPlayers: any[] = []) {
  const { players, liveCards, liveCounts } = await syncLivesFromLiveCards(room.id);
  const alive = (players || []).filter((player: any) => (liveCounts.get(player.id) || 0) > 0);

  if (alive.length === 0 || liveCards.length === 0) {
    const playersToRevive = tiebreakPlayers.length > 0 ? tiebreakPlayers : players || [];
    for (const player of playersToRevive) {
      await supabaseGame.from('room_players').update({ lives: 1, is_eliminated: false }).eq('id', player.id);
    }
    await supabaseGame.from('player_cards').update({ is_dead: false }).eq('room_id', room.id);
    await advanceTurn(room);
    return { finished: false, tiebreak: true };
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
    const distinctLiveCharacters = new Set((liveCards || []).map((card: any) => card.character_id)).size;
    if (leader.lives >= distinctLiveCharacters) {
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
      await touchRoomActivity(room.id);
      return { finished: true, winner: leader.player.nickname, smartWin: true };
    }
  }

  await advanceTurn(room);
  return { finished: false };
}
