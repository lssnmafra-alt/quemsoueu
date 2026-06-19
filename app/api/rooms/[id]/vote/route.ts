import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { touchRoomActivity } from '@/lib/roomLifecycle';
import { finishOrAdvance } from '@/lib/gameProgress';

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
  const targetCharId = typeof body.characterId === 'string' ? body.characterId : '';

  if (!expectedPlayerId || !targetCharId) {
    return NextResponse.json({ ok: false, reason: 'missing-player-or-character' }, { status: 400 });
  }

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

  const serverExpiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  if (!serverExpiresMs) {
    return NextResponse.json({ ok: false, reason: 'turn-being-resolved' });
  }

  if (!Number.isFinite(serverExpiresMs) || serverExpiresMs <= Date.now()) {
    return NextResponse.json({ ok: false, reason: 'turn-expired' });
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

  if (activePlayer.id !== expectedPlayerId) {
    return NextResponse.json({ ok: false, reason: 'not-active-player' });
  }

  if (activePlayer.is_bot) {
    return NextResponse.json({ ok: false, reason: 'active-player-is-bot' });
  }

  const originalExpiresAt = room.turn_expires_at || null;
  const lockUntil = new Date(Date.now() + 20_000).toISOString();
  let lockQuery = supabaseGame
    .from('rooms')
    .update({ turn_expires_at: lockUntil })
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0);

  lockQuery = originalExpiresAt ? lockQuery.eq('turn_expires_at', originalExpiresAt) : lockQuery.is('turn_expires_at', null);

  const { data: lockedRows, error: lockError } = await lockQuery.select('id').limit(1);

  if (lockError) throw lockError;
  if (!lockedRows || lockedRows.length === 0) {
    return NextResponse.json({ ok: false, reason: 'turn-already-handled' });
  }

  const restoreTurnLock = async () => {
    await supabaseGame
      .from('rooms')
      .update({ turn_expires_at: originalExpiresAt })
      .eq('id', room.id)
      .eq('status', 'PLAYING')
      .eq('current_turn_number', room.current_turn_number || 0)
      .eq('turn_expires_at', lockUntil);
  };

  const [{ data: deckChars }, { data: liveCards }, { data: freshPlayers }] = await Promise.all([
    room.deck_id
      ? supabaseGame.from('characters').select('*').eq('deck_id', room.deck_id)
      : supabaseGame.from('characters').select('*').is('deck_id', null),
    supabaseGame
      .from('player_cards')
      .select('id,player_id,character_id,is_dead')
      .eq('room_id', room.id)
      .eq('is_dead', false),
    supabaseGame.from('room_players').select('*').eq('room_id', room.id),
  ]);

  const chars = deckChars || [];
  const targetChar = chars.find((char: any) => char.id === targetCharId);
  if (!targetChar) {
    await restoreTurnLock();
    return NextResponse.json({ ok: false, reason: 'character-not-found' }, { status: 400 });
  }

  const latestPlayers = freshPlayers || players || [];
  const latestActivePlayerIds = new Set(
    latestPlayers
      .filter((player: any) => !player.is_eliminated && (player.lives || 0) > 0)
      .map((player: any) => player.id),
  );
  const liveCardsInPlay = (liveCards || []).filter((card: any) => latestActivePlayerIds.has(card.player_id));
  const liveCharacterIds = new Set(liveCardsInPlay.map((card: any) => card.character_id));

  if (!liveCharacterIds.has(targetCharId)) {
    await restoreTurnLock();
    return NextResponse.json({ ok: false, reason: 'character-not-live' }, { status: 400 });
  }

  await supabaseGame.from('room_players').update({ missed_turns: 0 }).eq('id', activePlayer.id);

  const hits = liveCardsInPlay.filter((card: any) => card.character_id === targetCharId);
  const hitCountByPlayer = new Map<string, number>();
  for (const hit of hits) {
    hitCountByPlayer.set(hit.player_id, (hitCountByPlayer.get(hit.player_id) || 0) + 1);
  }

  const playersById = new Map(latestPlayers.map((player: any) => [player.id, player]));
  const hitPlayers: any[] = [];
  const eliminatedPlayers: any[] = [];

  if (hits.length > 0) {
    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .in('id', hits.map((hit: any) => hit.id));

    for (const [playerId, hitCount] of hitCountByPlayer.entries()) {
      const targetPlayer: any = playersById.get(playerId);
      if (!targetPlayer) continue;

      const previousLives = targetPlayer.lives || 0;
      const newLives = Math.max(0, previousLives - hitCount);
      const updatedPlayer = { ...targetPlayer, lives: newLives, is_eliminated: newLives <= 0 };
      hitPlayers.push(updatedPlayer);
      if (previousLives > 0 && newLives <= 0) eliminatedPlayers.push(updatedPlayer);

      await supabaseGame
        .from('room_players')
        .update({ lives: newLives, is_eliminated: newLives <= 0 })
        .eq('id', targetPlayer.id);
    }
  }

  const hitPlayerIds = [...new Set(hits.map((hit: any) => hit.player_id))];
  await logMatchEvents([
    {
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: hits.length > 0 ? 'vote_hit' : 'vote_miss',
      actorPlayerId: activePlayer.id,
      characterId: targetChar.id,
      message: hits.length > 0
        ? `${activePlayer.nickname} acertou ${targetChar.name}.`
        : `${activePlayer.nickname} errou ${targetChar.name}.`,
      metadata: { source: 'human', target_name: targetChar.name, hit_count: hits.length, hit_player_ids: hitPlayerIds },
    },
    ...eliminatedPlayers.map((player: any) => ({
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'player_eliminated',
      actorPlayerId: activePlayer.id,
      targetPlayerId: player.id,
      characterId: targetChar.id,
      message: `${activePlayer.nickname} eliminou ${player.nickname} com ${targetChar.name}.`,
      metadata: { source: 'human', target_name: targetChar.name, eliminated_player_name: player.nickname },
    })),
  ]);

  await touchRoomActivity(room.id);
  const progress = await finishOrAdvance(room, hitPlayers);

  return NextResponse.json({
    ok: true,
    target: targetChar.name,
    targetId: targetChar.id,
    voterId: activePlayer.id,
    voterName: activePlayer.nickname,
    hitPlayerIds,
    hitPlayers,
    hits: hits.length,
    ...progress,
  });
}
