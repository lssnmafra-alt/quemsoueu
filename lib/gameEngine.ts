import { supabaseGame } from './supabase';
import { finishOrAdvance } from './gameProgress';
import { playBotTurn } from './botTurn';
import { finalizeRoomPicking } from './roomPicking';
import { startRoom } from './roomStart';
import { touchRoomActivity } from './roomLifecycle';
import { clampVoteSeconds, nextVoteExpiresAt } from './roomTimers';

const LOBBY_COUNTDOWN_MS = 5_000;
const BOT_THINK_MS = 4_500;
const ADMIN_STALE_MS = 10_000;

type TickOptions = {
  humanJoined?: boolean;
};

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
  return expiresMs - (clampVoteSeconds(room.vote_time_seconds) * 1000);
}

function isBotHostedAutoLobby(room: any, players: any[]) {
  const bots = players.filter((player: any) => player.is_bot);
  if (!room.is_public || bots.length === 0) return false;
  return bots.some((player: any) => player.is_admin || player.user_id === room.admin_id);
}

function getHitPlayerIdsFromEvent(event: any) {
  const ids = event?.metadata?.hit_player_ids;
  return Array.isArray(ids) ? ids.filter((id: unknown) => typeof id === 'string') : [];
}

async function getResolvedVoteEvent(room: any) {
  const { data } = await supabaseGame
    .from('match_events')
    .select('*')
    .eq('room_id', room.id)
    .eq('turn_number', room.current_turn_number || 0)
    .in('event_type', ['vote_hit', 'vote_miss'])
    .order('created_at', { ascending: false })
    .limit(1);

  return data?.[0] || null;
}

async function transferStaleAdmin(roomId: string, players: any[], staleMs = ADMIN_STALE_MS) {
  if (!players || players.length === 0) return null;

  const currentAdmin = players.find((player: any) => player.is_admin);
  if (!currentAdmin || currentAdmin.is_bot) return null;

  const seenAt = currentAdmin.last_seen_at || currentAdmin.joined_at || currentAdmin.created_at;
  const isStale = !seenAt || new Date(seenAt).getTime() < Date.now() - staleMs;
  if (!isStale) return null;

  const freshHumans = players
    .filter((player: any) => player.id !== currentAdmin.id && !player.is_bot)
    .filter((player: any) => {
      const playerSeenAt = player.last_seen_at || player.joined_at || player.created_at;
      return playerSeenAt && new Date(playerSeenAt).getTime() >= Date.now() - staleMs;
    });
  const fallbackCandidates = players.filter((player: any) => player.id !== currentAdmin.id);
  const nextAdmin = freshHumans[0] || fallbackCandidates.find((player: any) => !player.is_bot) || fallbackCandidates.find((player: any) => player.is_bot);
  if (!nextAdmin) return null;

  await supabaseGame.from('room_players').update({ is_admin: false }).eq('room_id', roomId);
  await supabaseGame.from('room_players').update({ is_admin: true }).eq('id', nextAdmin.id);
  await supabaseGame.from('rooms').update({ admin_id: nextAdmin.user_id }).eq('id', roomId);
  return nextAdmin;
}

async function startLobbyCountdown(room: any, action: string): Promise<TickResult> {
  const countdownUntil = new Date(Date.now() + LOBBY_COUNTDOWN_MS).toISOString();
  await supabaseGame
    .from('rooms')
    .update({ turn_expires_at: countdownUntil })
    .eq('id', room.id)
    .eq('status', 'LOBBY');
  await touchRoomActivity(room.id);
  return { ok: true, roomId: room.id, action, countdownUntil };
}

async function resolveLobbyTick(room: any, players: any[], options: TickOptions = {}): Promise<TickResult> {
  const humans = players.filter((player: any) => !player.is_bot);

  if (humans.length === 0) {
    if (room.turn_expires_at) {
      await supabaseGame.from('rooms').update({ turn_expires_at: null }).eq('id', room.id).eq('status', 'LOBBY');
    }
    return { ok: true, roomId: room.id, action: 'lobby-waiting-human' };
  }

  if (!isBotHostedAutoLobby(room, players)) {
    if (room.turn_expires_at) {
      await supabaseGame.from('rooms').update({ turn_expires_at: null }).eq('id', room.id).eq('status', 'LOBBY');
    }
    return { ok: true, roomId: room.id, action: 'manual-lobby-waiting-admin' };
  }

  const now = Date.now();
  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  const validExpires = Number.isFinite(expiresMs) && expiresMs > 0;

  if (!validExpires) {
    return startLobbyCountdown(room, 'lobby-countdown-started');
  }

  if (options.humanJoined && expiresMs > now) {
    return startLobbyCountdown(room, 'lobby-countdown-restarted-human-joined');
  }

  if (expiresMs > now) {
    return { ok: true, roomId: room.id, action: 'lobby-countdown-running', secondsLeft: Math.ceil((expiresMs - now) / 1000) };
  }

  const result = await startRoom(room.id, { requestedDeckId: room.deck_id || null, auto: true });
  if (!result?.ok) {
    await supabaseGame.from('rooms').update({ turn_expires_at: null }).eq('id', room.id).eq('status', 'LOBBY');
    await logMatchEvents([{
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'start_failed',
      message: result?.error || 'Falha ao iniciar a sala.',
      metadata: { result },
    }]);
    return { ok: false, roomId: room.id, action: 'lobby-start-failed', start: result };
  }

  return { ok: true, roomId: room.id, action: 'lobby-started-after-human-entry', start: result };
}

async function finishResolvedVoteIfReady(room: any, voteEvent: any, now = Date.now()): Promise<TickResult | null> {
  if (!voteEvent) return null;

  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  const waitingForReveal = Number.isFinite(expiresMs) && expiresMs > now;
  if (waitingForReveal) {
    return {
      ok: true,
      roomId: room.id,
      action: 'turn-result-revealing',
      secondsLeft: Math.ceil((expiresMs - now) / 1000),
      eventType: voteEvent.event_type,
    };
  }

  const hitPlayerIds = getHitPlayerIdsFromEvent(voteEvent);
  const progress = await finishOrAdvance(room, hitPlayerIds);
  return { ok: true, roomId: room.id, action: 'turn-result-finalized-after-reveal', result: progress };
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
  if (!lockedRows || lockedRows.length === 0) return { ok: false, reason: 'timeout-already-handled' };

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
    await supabaseGame.from('player_cards').update({ is_dead: true }).eq('room_id', room.id).eq('player_id', activePlayer.id).eq('is_dead', false);
  } else if (cards.length > 0) {
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    await supabaseGame.from('player_cards').update({ is_dead: true }).eq('id', randomCard.id);
  }

  const nextLives = eliminatedByPenalty ? 0 : Math.max(0, cards.length - 1);
  const eliminated = eliminatedByPenalty || nextLives <= 0;

  await supabaseGame.from('room_players').update({ missed_turns: missedTurns, lives: nextLives, is_eliminated: eliminated }).eq('id', activePlayer.id);

  await logMatchEvents([
    { roomId: room.id, turnNumber: room.current_turn_number || 0, eventType: eliminatedByPenalty ? 'timeout_eliminated' : 'timeout_warning', targetPlayerId: activePlayer.id, message: eliminatedByPenalty ? `${activePlayer.nickname} ficou sem votar pela 2ª vez e foi eliminado.` : `${activePlayer.nickname} ficou sem votar e recebeu 1 falta.`, metadata: { player_name: activePlayer.nickname, missed_turns: missedTurns, lives_after: nextLives, eliminated } },
    eliminated ? { roomId: room.id, turnNumber: room.current_turn_number || 0, eventType: 'player_eliminated', targetPlayerId: activePlayer.id, message: eliminatedByPenalty ? `${activePlayer.nickname} foi eliminado por 2 faltas.` : `${activePlayer.nickname} foi eliminado por ficar sem vidas no timeout.`, metadata: { source: 'timeout', player_name: activePlayer.nickname, missed_turns: missedTurns } } : null,
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

  const voteEvent = await getResolvedVoteEvent(room);
  const resolvedVote = await finishResolvedVoteIfReady(room, voteEvent);
  if (resolvedVote) return resolvedVote;

  if (activePlayer.is_bot) {
    const startedAt = getServerTurnStartedAt(room);
    if (startedAt && Date.now() - startedAt < BOT_THINK_MS) return { ok: true, roomId: room.id, action: 'bot-thinking', playerId: activePlayer.id };

    const botResult: any = await playBotTurn(room.id, { expectedTurnNumber: room.current_turn_number || 0, expectedPlayerId: activePlayer.id });

    if (botResult?.ok && botResult.target) {
      return { ok: true, roomId: room.id, action: 'bot-voted-awaiting-reveal', result: botResult };
    }

    if (botResult?.ok && botResult.skipped) return { ok: true, roomId: room.id, action: 'bot-skipped', result: botResult };
    return { ok: false, roomId: room.id, action: 'bot-vote-failed', result: botResult };
  }

  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  if (!expiresMs || !Number.isFinite(expiresMs) || expiresMs > Date.now()) return { ok: true, roomId: room.id, action: 'human-turn-running', playerId: activePlayer.id };

  const timeout = await applyHumanTimeout(room, activePlayer);
  return { ok: true, roomId: room.id, action: 'human-timeout-applied', result: timeout };
}

export async function resolveRoomTick(roomId: string, options: TickOptions = {}): Promise<TickResult> {
  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) return { ok: false, roomId, action: 'room-not-found' };

  await transferStaleAdmin(room.id, players || [], ADMIN_STALE_MS);

  if (room.status === 'LOBBY') return resolveLobbyTick(room, players || [], options);

  if (room.status === 'PICKING') {
    const result = await finalizeRoomPicking(room.id, { serverTick: true });
    return { ok: Boolean(result.ok), roomId: room.id, action: result.skipped ? 'picking-waiting' : 'picking-finalized', result };
  }

  if (room.status === 'STARTING') {
    const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
    if (expiresMs && expiresMs > Date.now()) return { ok: true, roomId: room.id, action: 'starting-countdown-running' };

    await supabaseGame
      .from('rooms')
      .update({
        status: 'PLAYING',
        vote_time_seconds: clampVoteSeconds(room.vote_time_seconds),
        turn_expires_at: nextVoteExpiresAt(room.vote_time_seconds),
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
