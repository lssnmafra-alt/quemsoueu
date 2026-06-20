import { NextResponse } from 'next/server';
import { resolveRoomTick } from '@/lib/gameEngine';
import { supabaseGame } from '@/lib/supabase';

const LOBBY_COUNTDOWN_MS = 5_000;
const LOBBY_COUNTDOWN_REPAIR_GRACE_MS = 2_000;

async function repairLobbyCountdownIfNeeded(roomId: string) {
  const { data: room } = await supabaseGame
    .from('rooms')
    .select('id,status,turn_expires_at')
    .eq('id', roomId)
    .maybeSingle();

  if (!room || room.status !== 'LOBBY' || !room.turn_expires_at) return;

  const expiresMs = new Date(room.turn_expires_at).getTime();
  if (!Number.isFinite(expiresMs)) return;

  if (expiresMs > Date.now() + LOBBY_COUNTDOWN_MS + LOBBY_COUNTDOWN_REPAIR_GRACE_MS) {
    await supabaseGame
      .from('rooms')
      .update({
        turn_expires_at: new Date(Date.now() + LOBBY_COUNTDOWN_MS).toISOString(),
      })
      .eq('id', roomId)
      .eq('status', 'LOBBY');
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  await repairLobbyCountdownIfNeeded(id);

  const result = await resolveRoomTick(id, {
    humanJoined: body?.humanJoined === true,
  });

  return NextResponse.json(result);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await repairLobbyCountdownIfNeeded(id);

  const result = await resolveRoomTick(id);
  return NextResponse.json(result);
}
