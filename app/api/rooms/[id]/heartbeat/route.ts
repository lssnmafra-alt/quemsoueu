import { NextResponse } from 'next/server';
import { cleanupStalePlayers, touchRoomActivity } from '@/lib/roomLifecycle';
import { supabaseGame } from '@/lib/supabase';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  const userId = typeof body.userId === 'string' ? body.userId : '';

  await cleanupStalePlayers(roomId);

  if (!playerId || !userId) {
    return NextResponse.json({ error: 'playerId and userId are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: player, error } = await supabaseGame
    .from('room_players')
    .update({ last_seen_at: now, connection_status: 'online' })
    .eq('id', playerId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!player) {
    return NextResponse.json({ error: 'player not found' }, { status: 404 });
  }

  await touchRoomActivity(roomId);
  return NextResponse.json({ ok: true, lastSeenAt: now });
}
