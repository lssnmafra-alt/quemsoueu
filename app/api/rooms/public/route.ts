import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { runBotRoomCycle } from '@/lib/botRooms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roomIsJoinable(room: any, players: any[]) {
  const playerCount = players.length;
  const humanCount = players.filter((player: any) => !player.is_bot).length;
  const maxPlayers = room.max_players || 6;
  const botOnly = playerCount > 0 && humanCount === 0;
  const oldBotOnlyShape = botOnly && maxPlayers !== 4;
  const oldBotNickname = players.some((player: any) => player.is_bot && /^bot\s/i.test(String(player.nickname || '')));

  return room.status === 'LOBBY'
    && room.is_public === true
    && playerCount < maxPlayers
    && !oldBotOnlyShape
    && !oldBotNickname;
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
    .limit(20);

  if (roomsError) {
    return NextResponse.json({ rooms: [], error: roomsError.message }, { status: 200 });
  }

  const roomIds = (rooms || []).map((room: any) => room.id);
  const { data: roomPlayers } = roomIds.length > 0
    ? await supabaseGame
      .from('room_players')
      .select('id,room_id,is_bot,nickname')
      .in('room_id', roomIds)
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
      return {
        ...room,
        player_count: players.length,
        human_count: humanCount,
      };
    })
    .filter((room: any) => roomIsJoinable(room, playersByRoom.get(room.id) || []))
    .sort((a: any, b: any) => (b.player_count || 0) - (a.player_count || 0))
    .slice(0, 8);

  return NextResponse.json({ rooms: joinableRooms });
}
