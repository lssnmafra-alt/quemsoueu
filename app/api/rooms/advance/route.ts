import { NextResponse } from 'next/server';
import { resolveActiveRoomsTick } from '@/lib/gameEngine';

export async function POST() {
  const result = await resolveActiveRoomsTick(30);
  return NextResponse.json(result);
}
