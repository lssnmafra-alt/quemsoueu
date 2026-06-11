// lib/colors.ts
import { selectionFromAvatarUrl } from './avatars';

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
  const used = new Set<number>();
  
  // Sort players by created_at to ensure stable color assignment based on join order
  const sorted = [...(players || [])].sort((a,b) => (a.created_at || "").localeCompare(b.created_at || ""));
  
  sorted.forEach(p => {
    const avatarSelection = selectionFromAvatarUrl(p.avatar_url);
    let idx = avatarSelection
      ? nearestPlayerColorIndex(avatarSelection.primaryColor)
      : (p.id || "").split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % PLAYER_COLORS.length;
    
    // Find next available color if collided
    while (!avatarSelection && used.has(idx) && used.size < PLAYER_COLORS.length) {
      idx = (idx + 1) % PLAYER_COLORS.length;
    }
    
    map[p.id] = PLAYER_COLORS[idx];
    used.add(idx);
  });
  
  return map;
}

function nearestPlayerColorIndex(hex: string) {
  const target = hexToRgb(hex);
  if (!target) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  PLAYER_COLORS.forEach((color, index) => {
    const rgb = hexToRgb(color.hex);
    if (!rgb) return;
    const distance =
      Math.pow(target.r - rgb.r, 2) +
      Math.pow(target.g - rgb.g, 2) +
      Math.pow(target.b - rgb.b, 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}
