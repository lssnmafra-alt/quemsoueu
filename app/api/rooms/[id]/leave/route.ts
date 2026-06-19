import { NextResponse } from 'next/server';
import { removePlayerFromRoom } from '@/lib/roomLifecycle';
import { supabaseGame } from '@/lib/supabase';
import { finishOrAdvance } from '@/lib/gameProgress';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  const result = await removePlayerFromRoom(roomId, playerId);

  if (!result.deletedRoom) {
    const { data: room } = await supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle();
    if (room?.status === 'PLAYING') {
      const progress = await finishOrAdvance(room);
      return NextResponse.json({ ...result, progress });
    }
  }

  return NextResponse.json(result);
}
