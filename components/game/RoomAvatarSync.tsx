'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';

function roomIdFromPath(pathname: string) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts[0] !== 'room' || !parts[1]) return '';
  return parts[1];
}

function safeAvatarUrl(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('avatar:')) return text;
  if (text.startsWith('/api/r2-file?key=')) return text;
  if (text.startsWith('http')) return text;
  return '';
}

export default function RoomAvatarSync() {
  const pathname = usePathname() || '';
  const roomId = roomIdFromPath(pathname);
  const { user, profile, initialized, loading } = useUserStore();

  useEffect(() => {
    if (!initialized || loading || !user?.id || !roomId) return;

    const avatarUrl = safeAvatarUrl(profile?.avatar_url);
    const avatarSetId = profile?.avatar_animation_set_id || null;
    if (!avatarUrl && !avatarSetId) return;

    let cancelled = false;

    async function syncAvatar() {
      if (cancelled) return;

      const updates: Record<string, any> = {};
      if (avatarUrl) updates.avatar_url = avatarUrl;
      if (avatarSetId) updates.avatar_animation_set_id = avatarSetId;
      if (profile?.nickname) updates.nickname = profile.nickname;
      if (profile?.emoji) updates.emoji = profile.emoji;

      if (Object.keys(updates).length === 0) return;

      await supabaseGame
        .from('room_players')
        .update(updates)
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    }

    void syncAvatar();
    const timer = window.setInterval(syncAvatar, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initialized, loading, user?.id, roomId, profile?.avatar_url, profile?.avatar_animation_set_id, profile?.nickname, profile?.emoji]);

  return null;
}
