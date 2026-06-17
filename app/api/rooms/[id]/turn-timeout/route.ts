import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';
import { touchRoomActivity } from '@/lib/roomLifecycle';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const expectedTurnNumber = Number.isInteger(body.turnNumber) ? body.turnNumber : null;
  const expectedPlayerId = typeof body.playerId === 'string' ? body.playerId : '';

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room || room.status !== 'PLAYING') {
    return NextResponse.json({ ok: false, reason: 'room-not-playing' });
  }

  if (expectedTurnNumber !== null && room.current_turn_number !== expectedTurnNumber) {
    return NextResponse.json({ ok: false, reason: 'stale-turn' });
  }

  const now = Date.now();
  const expiredAt = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;

  if (!expiredAt || expiredAt > now) {
    return NextResponse.json({ ok: false, reason: 'turn-not-expired' });
  }

  const orderedPlayers = [...(players || [])].sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));
  const activePlayers = orderedPlayers.filter((player: any) => !player.is_eliminated && player.lives > 0);
  const activePlayer = activePlayers.length > 0
    ? activePlayers[(room.current_turn_number || 0) % activePlayers.length]
    : null;

  if (!activePlayer) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return NextResponse.json({ ok: true, finished: true, reason: 'no-active-player' });
  }

  if (expectedPlayerId && activePlayer.id !== expectedPlayerId) {
    return NextResponse.json({ ok: false, reason: 'stale-player' });
  }

  // Important: several clients can notice the same expired timer at the same time.
  // This atomic lock lets only one request apply the penalty for this turn.
  const lockUntil = new Date(now + 8_000).toISOString();
  const { data: lockedRows, error: lockError } = await supabaseGame
    .from('rooms')
    .update({ turn_expires_at: lockUntil })
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0)
    .lte('turn_expires_at', new Date(now).toISOString())
    .select('id')
    .limit(1);

  if (lockError) throw lockError;

  if (!lockedRows || lockedRows.length === 0) {
    return NextResponse.json({ ok: false, reason: 'timeout-already-handled' });
  }

  const missedTurns = (activePlayer.missed_turns || 0) + 1;
  const { data: liveCards } = await supabaseGame
    .from('player_cards')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', activePlayer.id)
    .eq('is_dead', false);

  const cards = liveCards || [];
  const eliminatedByPenalty = missedTurns >= 2;

  if (eliminatedByPenalty) {
    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .eq('room_id', room.id)
      .eq('player_id', activePlayer.id)
      .eq('is_dead', false);
  } else if (cards.length > 0) {
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    await supabaseGame.from('player_cards').update({ is_dead: true }).eq('id', randomCard.id);
  }

  const nextLives = eliminatedByPenalty ? 0 : Math.max(0, cards.length - 1);
  const eliminated = eliminatedByPenalty || nextLives <= 0;

  await supabaseGame
    .from('room_players')
    .update({
      missed_turns: missedTurns,
      lives: nextLives,
      is_eliminated: eliminated,
    })
    .eq('id', activePlayer.id);

  const result = await finishOrAdvance(room, [activePlayer]);
  return NextResponse.json({ ok: true, playerId: activePlayer.id, missedTurns, lives: nextLives, eliminated, ...result });
}
