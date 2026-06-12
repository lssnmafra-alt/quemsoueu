import { NextResponse } from 'next/server';
import { finalizeRoomPicking } from '@/lib/roomPicking';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const result = await finalizeRoomPicking(roomId);

  if (!result.ok) {
    const failure = result as { error?: string; status?: number };
    return NextResponse.json({ error: failure.error }, { status: failure.status || 500 });
  }

  return NextResponse.json(result);
}
