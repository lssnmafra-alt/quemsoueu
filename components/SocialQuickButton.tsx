'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SocialQuickButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, initialized, loading } = useUserStore();

  const playerId = user?.id || profile?.id;
  const isLobby = pathname === '/lobby';
  const shouldShow = initialized && !loading && Boolean(playerId) && pathname !== '/' && !pathname?.startsWith('/room/') && !pathname?.startsWith('/friends');
  if (!shouldShow) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/friends')}
      className={cn(
        'fixed right-4 z-50 flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-indigo-100 bg-white px-4 text-indigo-600 shadow-xl transition-transform hover:scale-105 active:scale-95',
        isLobby ? 'top-4' : 'bottom-24',
      )}
      aria-label="Abrir amigos"
      title="Amigos"
    >
      <Users className="h-6 w-6" />
      <span className="text-xs font-black uppercase tracking-wide">Amigos</span>
    </button>
  );
}
