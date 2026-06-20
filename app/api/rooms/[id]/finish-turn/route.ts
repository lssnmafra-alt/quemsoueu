import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';

async function applyVoteDamage(room: any) {
  const { data: events } = await supabaseGame
    .from('match_events')
    .select('id,event_type,character_id,metadata')
    .eq('room_id', room.id)
    .eq('turn_number', room.current_turn_number || 0)
    .in('event_type', ['vote_hit', 'vote_miss'])
    .order('created_at', { ascending: false })
    .limit(1);

  const event = events?.[0];
  if (!event || event.event_type !== 'vote_hit') return;

  const metadata = event.metadata || {};
  const hitPlayerIds = Array.isArray(metadata.hit_player_ids)
    ? metadata.hit_player_ids.filter((id: unknown) => typeof id === 'string')
    : [];

  if (!event.character_id || hitPlayerIds.length === 0) return;

  const { data: hitCards } = await supabaseGame
    .from('player_cards')
    .select('id,player_id')
    .eq('room_id', room.id)
    .eq('character_id', event.character_id)
    .eq('is_dead', false)
    .in('player_id', hitPlayerIds);

  const cards = hitCards || [];
  if (cards.length === 0) return;

  await supabaseGame.from('player_cards').update({ is_dead: true }).in('id', cards.map((card: any) => card.id));

  const hitCountByPlayer = new Map<string, number>();
  for (const card of cards) {
    hitCountByPlayer.set(card.player_id, (hitCountByPlayer.get(card.player_id) || 0) + 1);
  }

  const { data: players } = await supabaseGame
    .from('room_players')
    .select('id,lives,is_eliminated')
    .in('id', [...hitCountByPlayer.keys()]);

  for (const player of players || []) {
    if (player.is_eliminated) continue;
    const newLives = Math.max(0, (player.lives || 0) - (hitCountByPlayer.get(player.id) || 0));
    await supabaseGame
      .from('room_players')
      .update({ lives: newLives, is_eliminated: newLives <= 0 })
      .eq('id', player.id);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const expectedTurnNumber = Number.isInteger(body.turnNumber) ? body.turnNumber : null;
  const tiebreakPlayerIds = Array.isArray(body.tiebreakPlayerIds)
    ? body.tiebreakPlayerIds.filter((id: unknown) => typeof id === 'string')
    : [];

  const { data: room } = await supabaseGame
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (!room || room.status !== 'PLAYING') {
    return NextResponse.json({ ok: false, reason: 'room-not-playing' });
  }

  if (expectedTurnNumber !== null && room.current_turn_number !== expectedTurnNumber) {
    return NextResponse.json({ ok: false, reason: 'stale-turn' });
  }

  await applyVoteDamage(room);

  const result = await finishOrAdvance(room, tiebreakPlayerIds);
  return NextResponse.json({ ok: true, ...result });
}
