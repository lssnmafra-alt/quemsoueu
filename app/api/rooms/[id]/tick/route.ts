import { NextResponse } from 'next/server';
import { resolveRoomTick } from '@/lib/gameEngine';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await resolveRoomTick(id, { humanJoined: body?.humanJoined === true });
  return NextResponse.json(result);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await resolveRoomTick(id);
  return NextResponse.json(result);
}
