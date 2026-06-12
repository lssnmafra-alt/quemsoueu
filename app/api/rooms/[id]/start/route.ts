import { NextResponse } from 'next/server';
import { startRoom } from '@/lib/roomStart';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const requestedDeckId = typeof body.deckId === 'string' && body.deckId ? body.deckId : null;
  const desiredBots = Number.isInteger(body.desiredBots) ? body.desiredBots : undefined;
  const auto = Boolean(body.auto);

  const result = await startRoom(roomId, { requestedDeckId, desiredBots, auto });
  if (!result.ok) {
    const failure = result as { error?: string; status?: number };
    return NextResponse.json({ error: failure.error }, { status: failure.status || 500 });
  }

  return NextResponse.json(result);
}
