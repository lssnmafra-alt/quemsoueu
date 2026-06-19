import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';
import { finishOrAdvance } from './gameProgress';

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

export async function playServerBotTurn(roomId: string, options: { expectedTurnNumber?: number | null; expectedPlayerId?: string } = {}) {
  const expectedTurnNumber = Number.isInteger(options.expectedTurnNumber) ? options.expectedTurnNumber : null;
  const expectedPlayerId = options.expectedPlayerId || '';

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room || room.status !== 'PLAYING') return { ok: false, reason: 'room-not-playing' };
  if (expectedTurnNumber !== null && room.current_turn_number !== expectedTurnNumber) return { ok: false, reason: 'stale-turn' };

  const orderedPlayers = [...(players || [])].sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));
  const activePlayers = orderedPlayers.filter((player: any) => !player.is_eliminated && player.lives > 0);
  const activePlayer = activePlayers.length > 0 ? activePlayers[(room.current_turn_number || 0) % activePlayers.length] : null;

  if (!activePlayer) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return { ok: true, finished: true, reason: 'no-active-player' };
  }

  if (expectedPlayerId && activePlayer.id !== expectedPlayerId) return { ok: false, reason: 'stale-player' };
  if (!activePlayer.is_bot) return { ok: false, reason: 'active-player-is-human' };

  const originalExpiresAt = room.turn_expires_at || null;
  let lockQuery = supabaseGame
    .from('rooms')
    .update({ turn_expires_at: new Date(Date.now() + 12_000).toISOString() })
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0);
  lockQuery = originalExpiresAt ? lockQuery.eq('turn_expires_at', originalExpiresAt) : lockQuery.is('turn_expires_at', null);
  const { data: lockRows, error: lockError } = await lockQuery.select('id').limit(1);
  if (lockError) throw lockError;
  if (!lockRows || lockRows.length === 0) return { ok: false, reason: 'bot-turn-already-handled' };

  const [{ data: deckChars }, { data: liveCards }] = await Promise.all([
    room.deck_id ? supabaseGame.from('characters').select('*').eq('deck_id', room.deck_id) : supabaseGame.from('characters').select('*').is('deck_id', null),
    supabaseGame.from('player_cards').select('id,player_id,character_id,is_dead').eq('room_id', room.id).eq('is_dead', false),
  ]);

  const activePlayerIds = new Set(activePlayers.map((player: any) => player.id));
  const playersById = new Map((players || []).map((player: any) => [player.id, player]));
  const livePlayerCards = (liveCards || []).filter((card: any) => activePlayerIds.has(card.player_id));
  const liveCharacterIds = new Set(livePlayerCards.map((card: any) => card.character_id));
  const chars = (deckChars || []).filter((char: any) => liveCharacterIds.has(char.id));

  if (chars.length === 0 || livePlayerCards.length === 0) {
    const progress = await finishOrAdvance(room);
    await logMatchEvents([{ roomId: room.id, turnNumber: room.current_turn_number || 0, eventType: 'bot_skip', actorPlayerId: activePlayer.id, message: `${activePlayer.nickname} nao tinha carta viva para votar.`, metadata: { reason: 'no-live-card-target', progress } }]);
    return { ok: true, skipped: true, reason: 'no-live-card-target', ...progress };
  }

  const targetChar = chars[Math.floor(Math.random() * chars.length)];
  await supabaseGame.from('room_players').update({ missed_turns: 0 }).eq('id', activePlayer.id);

  const hits = livePlayerCards.filter((card: any) => card.character_id === targetChar.id);
  const hitPlayers = [];
  const eliminatedPlayers: any[] = [];

  if (hits.length > 0) await supabaseGame.from('player_cards').update({ is_dead: true }).in('id', hits.map((hit: any) => hit.id));

  const hitCountByPlayer = new Map<string, number>();
  for (const hit of hits) hitCountByPlayer.set(hit.player_id, (hitCountByPlayer.get(hit.player_id) || 0) + 1);

  for (const [playerId, hitCount] of hitCountByPlayer.entries()) {
    const targetPlayer: any = playersById.get(playerId);
    if (!targetPlayer) continue;
    const previousLives = targetPlayer.lives || 0;
    const newLives = Math.max(0, previousLives - hitCount);
    const updatedPlayer = { ...targetPlayer, lives: newLives, is_eliminated: newLives <= 0 };
    hitPlayers.push(updatedPlayer);
    if (previousLives > 0 && newLives <= 0) eliminatedPlayers.push(updatedPlayer);
    await supabaseGame.from('room_players').update({ lives: newLives, is_eliminated: newLives <= 0 }).eq('id', targetPlayer.id);
  }

  await touchRoomActivity(room.id);
  const hitPlayerIds = [...new Set(hits.map((hit: any) => hit.player_id))];

  await logMatchEvents([
    { roomId: room.id, turnNumber: room.current_turn_number || 0, eventType: hits.length > 0 ? 'vote_hit' : 'vote_miss', actorPlayerId: activePlayer.id, characterId: targetChar.id, message: hits.length > 0 ? `${activePlayer.nickname} acertou ${targetChar.name}.` : `${activePlayer.nickname} errou ${targetChar.name}.`, metadata: { source: 'bot', target_name: targetChar.name, hit_count: hits.length, hit_player_ids: hitPlayerIds, selection: 'random-from-live-cards' } },
    ...eliminatedPlayers.map((player: any) => ({ roomId: room.id, turnNumber: room.current_turn_number || 0, eventType: 'player_eliminated', actorPlayerId: activePlayer.id, targetPlayerId: player.id, characterId: targetChar.id, message: `${activePlayer.nickname} eliminou ${player.nickname} com ${targetChar.name}.`, metadata: { source: 'bot', target_name: targetChar.name, eliminated_player_name: player.nickname } })),
  ]);

  return { ok: true, target: targetChar.name, hits: hits.length, hitPlayerIds, hitPlayers, bot: { selectedBy: 'random', fallbackReason: null } };
}
