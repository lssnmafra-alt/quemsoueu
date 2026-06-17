import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';

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

  const result = await finishOrAdvance(room, tiebreakPlayerIds);
  return NextResponse.json({ ok: true, ...result });
}
