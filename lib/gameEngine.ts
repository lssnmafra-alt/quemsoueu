import { supabaseGame } from './supabase';
import { finishOrAdvance } from './gameProgress';
import { playBotTurn } from './botTurn';
import { finalizeRoomPicking } from './roomPicking';
import { startRoom } from './roomStart';
import { touchRoomActivity, transferStaleAdmin } from './roomLifecycle';

const MIN_PLAYERS_TO_START = 4;
const LOBBY_COUNTDOWN_MS = 5_000;
const BOT_THINK_MS = 1_500;

type TickResult = {
  ok: boolean;
  roomId: string;
  action: string;
  [key: string]: any;
};

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

function getActivePlayer(room: any, players: any[]) {
  const orderedPlayers = [...(players || [])].sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));
  const activePlayers = orderedPlayers.filter((player: any) => !player.is_eliminated && (player.lives || 0) > 0);
  if (activePlayers.length === 0) return null;
  return activePlayers[(room.current_turn_number || 0) % activePlayers.length];
}

function getServerTurnStartedAt(room: any) {
  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  if (!Number.isFinite(expiresMs) || expiresMs <= 0) return 0;
  return expiresMs - ((room.vote_time_seconds || 30) * 1000);
}

async function resolveLobbyTick(room: any, players: any[]): Promise<TickResult> {
  const humans = players.filter((player: any) => !player.is_bot);

  if (humans.length === 0) {
    if (room.turn_expires_at) {
      await supabaseGame
        .from('rooms')
        .update({ turn_expires_at: null })
        .eq('id', room.id)
        .eq('status', 'LOBBY');
    }
    return { ok: true, roomId: room.id, action: 'lobby-waiting-human' };
  }

  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  if (!expiresMs || !Number.isFinite(expiresMs)) {
    const countdownUntil = new Date(Date.now() + LOBBY_COUNTDOWN_MS).toISOString();
    await supabaseGame
      .from('rooms')
      .update({ turn_expires_at: countdownUntil })
      .eq('id', room.id)
      .eq('status', 'LOBBY');
    await touchRoomActivity(room.id);
    return { ok: true, roomId: room.id, action: 'lobby-countdown-started', countdownUntil };
  }

  if (expiresMs > Date.now()) {
    return { ok: true, roomId: room.id, action: 'lobby-countdown-running', secondsLeft: Math.ceil((expiresMs - Date.now()) / 1000) };
  }

  const result = await startRoom(room.id, { requestedDeckId: room.deck_id || null, auto: true });
  return { ok: Boolean(result.ok), roomId: room.id, action: 'lobby-started-after-human-entry', start: result };
}

async function applyHumanTimeout(room: any, activePlayer: any) {
  const now = Date.now();
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
    return { ok: false, reason: 'timeout-already-handled' };
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
    .update({ missed_turns: missedTurns, lives: nextLives, is_eliminated: eliminated })
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
      metadata: { source: 'timeout', player_name: activePlayer.nickname, missed_turns: missedTurns },
    } : null,
  ]);

  const progress = await finishOrAdvance(room, [activePlayer]);
  return { ok: true, playerId: activePlayer.id, missedTurns, lives: nextLives, eliminated, ...progress };
}

async function resolvePlayingTick(room: any, players: any[]): Promise<TickResult> {
  const activePlayer = getActivePlayer(room, players);
  if (!activePlayer) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id).eq('status', 'PLAYING');
    await touchRoomActivity(room.id);
    return { ok: true, roomId: room.id, action: 'playing-finished-no-active-player' };
  }

  if (activePlayer.is_bot) {
    const startedAt = getServerTurnStartedAt(room);
    if (startedAt && Date.now() - startedAt < BOT_THINK_MS) {
      return { ok: true, roomId: room.id, action: 'bot-thinking', playerId: activePlayer.id };
    }

    const botResult = await playBotTurn(room.id, {
      expectedTurnNumber: room.current_turn_number || 0,
      expectedPlayerId: activePlayer.id,
    });

    if (botResult?.ok && botResult.target) {
      const progress = await finishOrAdvance(room, botResult.hitPlayers || []);
      return { ok: true, roomId: room.id, action: 'bot-voted', result: { ...botResult, ...progress } };
    }

    if (botResult?.ok && botResult.skipped) {
      return { ok: true, roomId: room.id, action: 'bot-skipped', result: botResult };
    }

    return { ok: false, roomId: room.id, action: 'bot-vote-failed', result: botResult };
  }

  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  if (!expiresMs || !Number.isFinite(expiresMs) || expiresMs > Date.now()) {
    return { ok: true, roomId: room.id, action: 'human-turn-running', playerId: activePlayer.id };
  }

  const timeout = await applyHumanTimeout(room, activePlayer);
  return { ok: true, roomId: room.id, action: 'human-timeout-applied', result: timeout };
}

export async function resolveRoomTick(roomId: string): Promise<TickResult> {
  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) return { ok: false, roomId, action: 'room-not-found' };

  await transferStaleAdmin(room.id, players || [], 10_000);

  if (room.status === 'LOBBY') return resolveLobbyTick(room, players || []);

  if (room.status === 'PICKING') {
    const result = await finalizeRoomPicking(room.id, { serverTick: true });
    return { ok: Boolean(result.ok), roomId: room.id, action: result.skipped ? 'picking-waiting' : 'picking-finalized', result };
  }

  if (room.status === 'STARTING') {
    const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
    if (expiresMs && expiresMs > Date.now()) {
      return { ok: true, roomId: room.id, action: 'starting-countdown-running' };
    }

    await supabaseGame
      .from('rooms')
      .update({
        status: 'PLAYING',
        turn_expires_at: new Date(Date.now() + ((room.vote_time_seconds || 30) * 1000)).toISOString(),
      })
      .eq('id', room.id)
      .eq('status', 'STARTING');
    await touchRoomActivity(room.id);
    return { ok: true, roomId: room.id, action: 'starting-to-playing' };
  }

  if (room.status === 'PLAYING') return resolvePlayingTick(room, players || []);

  return { ok: true, roomId: room.id, action: `ignored-${room.status}` };
}

export async function resolveActiveRoomsTick(limit = 25) {
  const { data: rooms } = await supabaseGame
    .from('rooms')
    .select('id,status,updated_at,last_activity_at,created_at')
    .in('status', ['LOBBY', 'PICKING', 'STARTING', 'PLAYING'])
    .order('last_activity_at', { ascending: true })
    .limit(limit);

  const results = [];
  for (const room of rooms || []) {
    try {
      results.push(await resolveRoomTick(room.id));
    } catch (error: any) {
      results.push({ ok: false, roomId: room.id, action: 'tick-error', error: error?.message || String(error) });
    }
  }

  return results;
}
