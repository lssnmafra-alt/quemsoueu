// lib/colors.ts
export const PLAYER_COLORS = [
  { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-600', lightBgc: 'bg-red-50', hex: '#ef4444' },
  { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-600', lightBgc: 'bg-blue-50', hex: '#3b82f6' },
  { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-600', lightBgc: 'bg-emerald-50', hex: '#10b981' },
  { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-600', lightBgc: 'bg-amber-50', hex: '#f59e0b' },
  { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-600', lightBgc: 'bg-purple-50', hex: '#8b5cf6' },
  { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-600', lightBgc: 'bg-orange-50', hex: '#f97316' },
  { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-600', lightBgc: 'bg-cyan-50', hex: '#06b6d4' },
  { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-600', lightBgc: 'bg-pink-50', hex: '#ec4899' },
];

function hashString(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getStablePlayerKey(player: any) {
  // Do not derive color from the current player list position.
  // The list changes when bots join, players leave, duplicate rows are removed,
  // or realtime events arrive in a different order. That made colors swap mid-room.
  return String(player?.id || player?.user_id || player?.nickname || 'player');
}

export function getPlayerColors(players: any[]) {
  const map: Record<string, typeof PLAYER_COLORS[0]> = {};

  for (const player of players || []) {
    const key = getStablePlayerKey(player);
    const idx = hashString(key) % PLAYER_COLORS.length;
    map[player.id] = PLAYER_COLORS[idx];
  }

  return map;
}
