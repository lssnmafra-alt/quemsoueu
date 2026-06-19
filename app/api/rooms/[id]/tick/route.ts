import { NextResponse } from 'next/server';
import { resolveRoomTick } from '@/lib/gameEngine';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await resolveRoomTick(id);
  return NextResponse.json(result);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await resolveRoomTick(id);
  return NextResponse.json(result);
}
