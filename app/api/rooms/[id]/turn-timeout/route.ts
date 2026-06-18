import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';
import { touchRoomActivity } from '@/lib/roomLifecycle';
import { playBotTurn } from '@/lib/botTurn';

async function logMatchEvents(events: any[]) {
  const rows = events.filter(Boolean).map((event) => ({
    room_id: event.roomId,
    turn_number: event.turnNumber,
    event_type: event.eventType,
    actor_player_id: event.actorPlayerId || null,
    target_player_id: event.targetPlayerId || null,
    character_id: event.characterId || null,
    message: event.message || null,
    metadata: event.metadata || {},
  }));

  if (rows.length === 0) return;

  try {
    const { error } = await supabaseGame.from('match_events').insert(rows);
    if (error) console.warn('match_events skipped:', error.message);
  } catch (error) {
    console.warn('match_events failed:', error);
  }
}

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

  if (activePlayer.is_bot) {
    const botResult = await playBotTurn(room.id, {
      expectedTurnNumber: room.current_turn_number || 0,
      expectedPlayerId: activePlayer.id,
    });

    if (botResult?.ok && botResult.target) {
      return NextResponse.json({ ok: true, botRecoveredFromTimeout: true, ...botResult });
    }

    if (botResult?.ok && botResult.skipped) {
      return NextResponse.json({ ok: true, botRecoveredFromTimeout: true, ...botResult });
    }
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

  await logMatchEvents([
    {
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: eliminatedByPenalty ? 'timeout_eliminated' : 'timeout_warning',
      targetPlayerId: activePlayer.id,
      message: eliminatedByPenalty
        ? `${activePlayer.nickname} ficou sem votar pela 2ª vez e foi eliminado.`
        : `${activePlayer.nickname} ficou sem votar e recebeu 1 falta.`,
      metadata: {
        player_name: activePlayer.nickname,
        missed_turns: missedTurns,
        lives_after: nextLives,
        eliminated,
      },
    },
    eliminated ? {
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'player_eliminated',
      targetPlayerId: activePlayer.id,
      message: eliminatedByPenalty
        ? `${activePlayer.nickname} foi eliminado por 2 faltas.`
        : `${activePlayer.nickname} foi eliminado por ficar sem vidas no timeout.`,
      metadata: {
        source: 'timeout',
        player_name: activePlayer.nickname,
        missed_turns: missedTurns,
      },
    } : null,
  ]);

  const result = await finishOrAdvance(room, [activePlayer]);

  if (result?.finished) {
    await logMatchEvents([{
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'room_finished',
      message: result.winner ? `Partida encerrada. Campeao: ${result.winner}.` : 'Partida encerrada em empate.',
      metadata: { winner: result.winner || null, reason: result.reason || null },
    }]);
  }

  return NextResponse.json({ ok: true, playerId: activePlayer.id, missedTurns, lives: nextLives, eliminated, ...result });
}
