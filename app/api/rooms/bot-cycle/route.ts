import { NextResponse } from 'next/server';
import { runBotRoomCycle } from '@/lib/botRooms';

export async function POST() {
  const result = await runBotRoomCycle();
  return NextResponse.json(result);
}
