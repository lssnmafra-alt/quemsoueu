import { NextResponse } from 'next/server';
import { removePlayerFromRoom } from '@/lib/roomLifecycle';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  const result = await removePlayerFromRoom(roomId, playerId);
  return NextResponse.json(result);
}
