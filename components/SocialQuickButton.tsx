'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { useUserStore } from '@/lib/store';

export default function SocialQuickButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized, loading } = useUserStore();

  const shouldShow = initialized && !loading && Boolean(user) && pathname !== '/' && !pathname?.startsWith('/room/') && !pathname?.startsWith('/friends');
  if (!shouldShow) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/friends')}
      className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-white text-indigo-600 shadow-xl transition-transform hover:scale-105 active:scale-95"
      aria-label="Abrir amigos"
      title="Amigos"
    >
      <Users className="h-6 w-6" />
    </button>
  );
}
