import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';
import { touchRoomActivity } from '@/lib/roomLifecycle';

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

  if (hits.length > 0) {
    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .in('id', hits.map((hit: any) => hit.id));

    for (const [playerId, hitCount] of hitCountByPlayer.entries()) {
      const targetPlayer: any = playersById.get(playerId);
      if (!targetPlayer) continue;

      const newLives = Math.max(0, (targetPlayer.lives || 0) - hitCount);
      const updatedPlayer = { ...targetPlayer, lives: newLives, is_eliminated: newLives <= 0 };
      hitPlayers.push(updatedPlayer);

      await supabaseGame
        .from('room_players')
        .update({ lives: newLives, is_eliminated: newLives <= 0 })
        .eq('id', targetPlayer.id);
    }
  }

  await touchRoomActivity(room.id);
  const progress = await finishOrAdvance(room, hitPlayers);
  const hitPlayerIds = [...new Set(hits.map((hit: any) => hit.player_id))];

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
