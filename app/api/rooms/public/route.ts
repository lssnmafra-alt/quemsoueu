import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { runBotRoomCycle } from '@/lib/botRooms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roomIsJoinable(room: any, players: any[]) {
  const playerCount = players.length;
  const maxPlayers = room.max_players || 6;
  const oldBotNickname = players.some((player: any) => player.is_bot && /^bot\s/i.test(String(player.nickname || '')));
  const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
  const countdownExpired = Number.isFinite(expiresMs) && expiresMs > 0 && expiresMs <= Date.now();

  return room.status === 'LOBBY'
    && room.is_public === true
    && playerCount < maxPlayers
    && !oldBotNickname
    && !countdownExpired;
}

export async function GET() {
  try {
    await runBotRoomCycle();
  } catch (error) {
    console.warn('public rooms bot cycle failed:', error);
  }

  const { data: rooms, error: roomsError } = await supabaseGame
    .from('rooms')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'LOBBY')
    .order('created_at', { ascending: false })
    .limit(30);

  if (roomsError) {
    return NextResponse.json({ rooms: [], error: roomsError.message }, { status: 200 });
  }

  const roomIds = (rooms || []).map((room: any) => room.id);
  const { data: roomPlayers } = roomIds.length > 0
    ? await supabaseGame.from('room_players').select('id,room_id,is_bot,nickname').in('room_id', roomIds)
    : { data: [] };

  const playersByRoom = new Map<string, any[]>();
  (roomPlayers || []).forEach((player: any) => {
    const list = playersByRoom.get(player.room_id) || [];
    list.push(player);
    playersByRoom.set(player.room_id, list);
  });

  const joinableRooms = (rooms || [])
    .map((room: any) => {
      const players = playersByRoom.get(room.id) || [];
      const humanCount = players.filter((player: any) => !player.is_bot).length;
      const expiresMs = room.turn_expires_at ? new Date(room.turn_expires_at).getTime() : 0;
      const startsInSeconds = Number.isFinite(expiresMs) && expiresMs > Date.now()
        ? Math.ceil((expiresMs - Date.now()) / 1000)
        : null;
      return {
        ...room,
        player_count: players.length,
        human_count: humanCount,
        starts_in_seconds: startsInSeconds,
      };
    })
    .filter((room: any) => roomIsJoinable(room, playersByRoom.get(room.id) || []))
    .sort((a: any, b: any) => (b.player_count || 0) - (a.player_count || 0) || (b.max_players || 0) - (a.max_players || 0))
    .slice(0, 8);

  return NextResponse.json({ rooms: joinableRooms });
}
