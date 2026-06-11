import { NextResponse } from 'next/server';
import { playBotTurn } from '@/lib/botTurn';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await playBotTurn(roomId, {
    expectedTurnNumber: Number.isInteger(body.turnNumber) ? body.turnNumber : null,
    expectedPlayerId: typeof body.playerId === 'string' ? body.playerId : '',
  });

  return NextResponse.json(result);
}
