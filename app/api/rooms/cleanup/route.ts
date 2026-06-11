import { NextResponse } from 'next/server';
import { cleanupExpiredRooms } from '@/lib/roomLifecycle';

export async function GET() {
  const deletedRooms = await cleanupExpiredRooms();
  return NextResponse.json({ deletedRooms });
}

export async function POST() {
  const deletedRooms = await cleanupExpiredRooms();
  return NextResponse.json({ deletedRooms });
}
