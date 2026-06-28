'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Coins,
  Gamepad2,
  Home,
  LogOut,
  Shield,
  ShoppingBag,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GameTopNavProps = {
  profile?: any;
  isAdmin?: boolean;
  onLogout?: () => void;
};

const tabs = [
  { label: 'Início', href: '/', icon: Home, match: (path: string) => path === '/' },
  { label: 'Jogar', href: '/lobby', icon: Gamepad2, match: (path: string) => path === '/lobby' },
  { label: 'Loja', href: '/avatar-store', icon: ShoppingBag, match: (path: string) => path.startsWith('/avatar-store') },
  { label: 'Decks', href: '/decks', icon: BookOpen, match: (path: string) => path.startsWith('/decks') },
  { label: 'Amigos', href: '/friends', icon: Users, match: (path: string) => path.startsWith('/friends') },
  { label: 'Perfil', href: '/profile', icon: UserRound, match: (path: string) => path.startsWith('/profile') },
];

export default function GameTopNav({ profile, isAdmin = false, onLogout }: GameTopNavProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const nickname = profile?.nickname || 'Jogador';
  const avatarImageUrl = resolveAvatarImageUrl(profile?.avatar_url);
  const [coins, setCoins] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarImageUrl]);

  useEffect(() => {
    const userId = String(profile?.id || '').trim();

    if (!userId) return;

    let cancelled = false;

    fetch(`/api/avatar-store/wallet?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setCoins(Number(result.wallet?.coins || 0));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  return (
    <nav className="qse-game-top-nav fixed left-0 right-0 top-0 z-[100] border-b-4 border-indigo-950/40 bg-[#071a64]/95 text-white shadow-[0_12px_40px_rgba(15,23,42,.35)] backdrop-blur-xl">
      <div className="qse-game-top-nav-inner mx-auto flex h-[74px] max-w-[1500px] items-center justify-between gap-3 px-3 md:px-6">
        <div className="qse-game-top-nav-tabs flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain pr-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="qse-game-top-nav-home mr-2 flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border-2 border-cyan-300/40 bg-cyan-400/20 text-cyan-100 shadow-inner transition hover:bg-cyan-300/30"
            title="Voltar para o início"
            aria-label="Voltar para o início"
          >
            <Home className="h-5 w-5" />
          </button>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.match(pathname);

            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => router.push(tab.href)}
                className={cn(
                  'qse-game-top-nav-tab relative flex h-full min-w-fit shrink-0 items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wide transition-all md:px-5 md:text-xs',
                  active
                    ? 'bg-white text-[#071a64] shadow-[inset_0_-5px_0_#facc15]'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="qse-game-top-nav-user flex shrink-0 items-center gap-2">
          {isAdmin && (
            <span className="hidden items-center gap-1 rounded-md border border-amber-300/50 bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase text-amber-950 shadow md:flex">
              <Shield className="h-3.5 w-3.5" /> ADM
            </span>
          )}

          <div className="hidden items-center gap-1 rounded-md border border-cyan-300/50 bg-blue-700 px-3 py-1.5 text-xs font-black text-cyan-50 shadow md:flex">
            <Coins className="h-4 w-4 text-cyan-200" /> {coins}
          </div>

          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="qse-game-top-nav-profile flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 p-1.5 pr-3 transition hover:bg-white/20"
          >
            <span
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-cyan-200 bg-white text-indigo-700 leading-none shadow-inner"
              aria-hidden="true"
            >
              {avatarImageUrl && !avatarFailed ? (
                <img src={avatarImageUrl} alt="" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </span>

            <span className="hidden max-w-[150px] truncate text-left text-xs font-black uppercase leading-tight md:block">
              {nickname}
            </span>
          </button>

          {onLogout && (
            <Button
              type="button"
              variant="ghost"
              onClick={onLogout}
              className="h-10 rounded-xl border border-white/15 px-3 text-white hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

function resolveAvatarImageUrl(avatarUrl: unknown) {
  const value = String(avatarUrl || '').trim();

  if (!value) return '';
  if (!value.startsWith('avatar:')) return value;

  try {
    const parsed = JSON.parse(decodeURIComponent(value.slice(7)));
    return String(parsed.imageUrl || '').trim();
  } catch {
    return '';
  }
}
