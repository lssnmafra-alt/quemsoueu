// lib/colors.ts
export const PLAYER_COLORS = [
  { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-600', lightBgc: 'bg-red-50', hex: '#ef4444' },
  { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-600', lightBgc: 'bg-blue-50', hex: '#3b82f6' },
  { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-600', lightBgc: 'bg-emerald-50', hex: '#10b981' },
  { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-600', lightBgc: 'bg-amber-50', hex: '#f59e0b' },
  { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-600', lightBgc: 'bg-purple-50', hex: '#8b5cf6' },
  { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-600', lightBgc: 'bg-orange-50', hex: '#f97316' },
  { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-600', lightBgc: 'bg-cyan-50', hex: '#06b6d4' },
  { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-600', lightBgc: 'bg-pink-50', hex: '#ec4899' }
];

export function getPlayerColors(players: any[]) {
  const map: Record<string, typeof PLAYER_COLORS[0]> = {};
  const sorted = [...(players || [])].sort((a,b) => (a.created_at || "").localeCompare(b.created_at || ""));
  
  sorted.forEach((p, index) => {
    const idx = index % PLAYER_COLORS.length;
    map[p.id] = PLAYER_COLORS[idx];
  });
  
  return map;
}
