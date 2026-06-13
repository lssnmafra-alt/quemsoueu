import { supabaseGame } from './supabase';

export const ROOM_INACTIVITY_MS = 60 * 60 * 1000;
export const PLAYER_STALE_MS = 90 * 1000;

export function nextRoomExpiry(now = new Date()) {
  return new Date(now.getTime() + ROOM_INACTIVITY_MS).toISOString();
}

export async function touchRoomActivity(roomId: string) {
  const now = new Date();
  await supabaseGame
    .from('rooms')
    .update({
      last_activity_at: now.toISOString(),
      expires_at: nextRoomExpiry(now),
    })
    .eq('id', roomId);
}

async function deleteRoomScopedData(roomId: string) {
  await supabaseGame.from('messages').delete().eq('room_id', roomId);
  await supabaseGame.from('player_cards').delete().eq('room_id', roomId);
  await supabaseGame.from('room_players').delete().eq('room_id', roomId);
}

export async function closeAndDeleteRoom(roomId: string) {
  await supabaseGame.from('rooms').update({ status: 'CLOSED' }).eq('id', roomId);
  await deleteRoomScopedData(roomId);
  await supabaseGame.from('rooms').delete().eq('id', roomId);
}

export async function closeAndDeleteRooms(roomIds: string[]) {
  const ids = Array.from(new Set(roomIds.filter(Boolean)));
  if (ids.length === 0) return;

  await supabaseGame.from('rooms').update({ status: 'CLOSED' }).in('id', ids);
  await supabaseGame.from('messages').delete().in('room_id', ids);
  await supabaseGame.from('player_cards').delete().in('room_id', ids);
  await supabaseGame.from('room_players').delete().in('room_id', ids);
  await supabaseGame.from('rooms').delete().in('id', ids);
}

export async function transferRoomAdmin(roomId: string, players: any[], previousPlayerId?: string) {
  const candidates = players.filter((player) => player.id !== previousPlayerId);
  const nextAdmin = candidates.find((player) => !player.is_bot) || candidates.find((player) => player.is_bot);

  if (!nextAdmin) return null;

  await supabaseGame.from('room_players').update({ is_admin: false }).eq('room_id', roomId);
  await supabaseGame.from('room_players').update({ is_admin: true }).eq('id', nextAdmin.id);
  await supabaseGame.from('rooms').update({ admin_id: nextAdmin.user_id }).eq('id', roomId);
  return nextAdmin;
}

export async function removePlayerFromRoom(roomId: string, playerId: string) {
  const { data: leavingPlayer } = await supabaseGame
    .from('room_players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  await supabaseGame.from('room_players').delete().eq('id', playerId);

  const { data: remainingPlayers } = await supabaseGame
    .from('room_players')
    .select('*')
    .eq('room_id', roomId);

  if (!remainingPlayers || remainingPlayers.length === 0) {
    await closeAndDeleteRoom(roomId);
    return { deletedRoom: true, remainingPlayers: [] };
  }

  if (leavingPlayer?.is_admin) {
    await transferRoomAdmin(roomId, remainingPlayers, playerId);
  }

  await touchRoomActivity(roomId);
  return { deletedRoom: false, remainingPlayers };
}

export async function cleanupStalePlayers(roomId: string, staleMs = PLAYER_STALE_MS) {
  const staleBefore = Date.now() - staleMs;
  const { data: players } = await supabaseGame
    .from('room_players')
    .select('*')
    .eq('room_id', roomId);

  if (!players || players.length === 0) return { removed: 0, deletedRoom: false };

  const staleHumans = players.filter((player) => {
    if (player.is_bot) return false;
    const seenAt = player.last_seen_at || player.joined_at || player.created_at;
    return !seenAt || new Date(seenAt).getTime() < staleBefore;
  });

  if (staleHumans.length === 0) return { removed: 0, deletedRoom: false };

  await supabaseGame.from('room_players').delete().in('id', staleHumans.map((player) => player.id));

  const { data: remainingPlayers } = await supabaseGame
    .from('room_players')
    .select('*')
    .eq('room_id', roomId);

  if (!remainingPlayers || remainingPlayers.length === 0) {
    await closeAndDeleteRoom(roomId);
    return { removed: staleHumans.length, deletedRoom: true };
  }

  const removedAdmin = staleHumans.some((player) => player.is_admin);
  const adminStillPresent = remainingPlayers.some((player) => player.is_admin);
  if (removedAdmin || !adminStillPresent) {
    await transferRoomAdmin(roomId, remainingPlayers);
  }

  await touchRoomActivity(roomId);
  return { removed: staleHumans.length, deletedRoom: false };
}

export async function cleanupExpiredRooms() {
  const now = new Date().toISOString();
  const { data: rooms } = await supabaseGame
    .from('rooms')
    .select('id, expires_at, last_activity_at, created_at')
    .or(`expires_at.lt.${now},and(expires_at.is.null,created_at.lt.${new Date(Date.now() - ROOM_INACTIVITY_MS).toISOString()})`);

  for (const room of rooms || []) {
    await closeAndDeleteRoom(room.id);
  }

  return rooms?.length || 0;
}
