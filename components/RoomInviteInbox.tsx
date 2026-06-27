'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Gamepad2, X } from 'lucide-react';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';

type RoomInvite = {
  id: string;
  room_id: string;
  sender_profile_id: string;
  sender?: { id: string; nickname?: string; avatar_url?: string } | null;
  room?: { id: string; code?: string; status?: string } | null;
};

export default function RoomInviteInbox() {
  const router = useRouter();
  const { user, profile, initialized, loading } = useUserStore();
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [hidden, setHidden] = useState(false);

  const userId = user?.id || profile?.id;

  useEffect(() => {
    if (!initialized || loading || !userId) return;
    let cancelled = false;

    const loadInvites = async () => {
      const response = await fetch(`/api/social/room-invites?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) : {};
      if (cancelled) return;
      setInvites(Array.isArray(result.invites) ? result.invites : []);
      if (Array.isArray(result.invites) && result.invites.length > 0) setHidden(false);
    };

    void loadInvites();
    const timer = window.setInterval(loadInvites, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initialized, loading, userId]);

  if (!initialized || loading || !userId || hidden || invites.length === 0) return null;

  const invite = invites[0];
  const senderName = invite.sender?.nickname || 'Um amigo';
  const roomCode = invite.room?.code || 'sala';

  return (
    <aside className="fixed left-4 bottom-24 z-50 w-[min(340px,calc(100vw-2rem))] rounded-3xl border-2 border-amber-100 bg-white p-4 text-indigo-950 shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Convite de amigo</p>
            <p className="truncate text-sm font-black text-indigo-950">{senderName} chamou você</p>
          </div>
        </div>
        <button type="button" onClick={() => setHidden(true)} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-slate-400 hover:text-rose-500">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 p-3 border border-indigo-100">
        <AvatarFigure avatarUrl={invite.sender?.avatar_url} label={senderName} className="h-12 w-12 rounded-2xl border-2 border-white bg-white" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500">Sala #{roomCode}</p>
          <p className="truncate text-sm font-black text-indigo-950">Quem Sou Eu?</p>
        </div>
      </div>

      <Button type="button" onClick={() => router.push(`/invite/${invite.id}`)} className="mt-3 h-11 w-full rounded-2xl btn-squishy-indigo text-xs font-black uppercase text-white flex items-center justify-center gap-2">
        <Gamepad2 className="h-4 w-4" /> Entrar na sala
      </Button>
    </aside>
  );
}
