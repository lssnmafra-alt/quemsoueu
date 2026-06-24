'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { moderateText } from '@/app/actions/moderate';
import { motion } from 'motion/react';
import { BookOpen, Gamepad2, Play, Smile, Sparkles, UserRound, Users } from 'lucide-react';
import GameTopNav from '@/components/navigation/GameTopNav';
import AvatarLobbyVideo from '@/components/avatar/AvatarLobbyVideo';

function profileNeedsSetup(profile: any) {
  if (!profile) return true;
  return !String(profile.nickname || '').trim();
}

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loginGuest, loading: authLoading, initialized: authInitialized } = useUserStore();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authInitialized || authLoading || !user) return;
    if (profileNeedsSetup(profile)) router.push('/profile');
  }, [authInitialized, authLoading, router, user, profile]);

  const handleGuestLogin = async () => {
    const cleanNickname = nickname.trim().replace(/\s+/g, ' ');

    if (!cleanNickname) {
      setError('Digite um apelido para entrar no jogo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isSafe = await moderateText(cleanNickname);
      if (!isSafe) {
        setError('Use outro apelido. Evite termos ofensivos, palavras reservadas ou nomes genéricos como teste.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Moderation failed, proceeding anyway.', err);
    }

    try {
      await loginGuest(cleanNickname);
      router.push('/lobby');
    } catch (loginError: any) {
      setError(loginError.message || 'Nao foi possivel entrar com esse apelido.');
    } finally {
      setLoading(false);
    }
  };

  const loggedInReady = Boolean(user && !profileNeedsSetup(profile));
  const playerName = profile?.nickname || user?.email?.split('@')[0] || 'Jogador';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06134a] text-white font-sans">
      {loggedInReady && <GameTopNav profile={profile} />}
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-85" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05124a]/95 via-[#0b4fb8]/45 to-[#070b2d]/85" />
      <div className="absolute inset-0 party-grid-bg opacity-20" />

      <motion.div animate={{ y: [0, -15, 0], rotate: [4, 8, 4] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} className="absolute left-[6%] top-[28%] z-10 hidden h-56 w-40 rotate-[-7deg] flex-col items-center justify-between rounded-2xl border-4 border-amber-400 bg-amber-300/90 p-4 shadow-2xl xl:flex">
        <span className="text-xs font-bold tracking-wider text-amber-900 font-mono">DIVERSAO</span>
        <Sparkles className="h-12 w-12 text-amber-900" />
        <span className="text-[10px] font-semibold text-amber-800 font-mono">QUEM SOU EU?</span>
      </motion.div>

      <motion.div animate={{ y: [0, 15, 0], rotate: [-8, -4, -8] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }} className="absolute bottom-[18%] right-[7%] z-10 hidden h-56 w-40 rotate-[8deg] flex-col items-center justify-between rounded-2xl border-4 border-rose-400 bg-rose-300/90 p-4 shadow-2xl xl:flex">
        <span className="text-xs font-bold tracking-wider text-rose-900 font-mono">PALPITE</span>
        <Smile className="h-12 w-12 text-rose-900" />
        <span className="text-[10px] font-semibold text-rose-800 font-mono">E UM PERSONAGEM?</span>
      </motion.div>

      <main className="home-lobby-main relative z-20 mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-3 pb-6 pt-16 sm:px-4 sm:pb-8 sm:pt-24 md:px-8">
        {loggedInReady ? (
          <section className="home-lobby-section grid w-full items-end gap-4 sm:gap-8 lg:grid-cols-[1fr_420px]">
            <div className="home-lobby-avatar hidden min-h-[620px] items-end justify-center lg:flex">
              <div className="relative flex flex-col items-center">
                <div className="absolute bottom-0 h-10 w-80 rounded-full bg-cyan-300/45 blur-xl" />
                <div className="relative flex h-[560px] w-[360px] flex-col items-center justify-end overflow-hidden rounded-[3.2rem] border-4 border-cyan-200/35 bg-white shadow-[0_35px_100px_rgba(6,182,212,.35)]">
                  <div className="absolute inset-x-6 top-6 bottom-28 overflow-hidden rounded-[2.6rem] border-4 border-white bg-white shadow-inner">
                    <AvatarLobbyVideo avatarUrl={profile?.avatar_url} label={playerName} className="h-full w-full rounded-[2.3rem]" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-24 h-32 bg-gradient-to-t from-white via-white/90 to-transparent" />
                  <div className="relative z-20 mb-6 w-[82%] rounded-3xl border-2 border-cyan-100 bg-[#071a64] px-5 py-4 text-center shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Preparando</p>
                    <h1 className="mt-1 truncate text-3xl font-black uppercase text-white font-display">{playerName}</h1>
                    <div className="mt-3 rounded-full border border-cyan-200/40 bg-cyan-300/20 px-5 py-2 text-xs font-black uppercase text-cyan-50">Lobby animation</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-lobby-panel rounded-2xl border-4 border-cyan-200/30 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur-xl sm:rounded-3xl sm:p-5 md:p-7">
              <div className="home-lobby-info mb-3 rounded-xl border border-white/15 bg-white/10 p-3 sm:mb-5 sm:rounded-2xl sm:p-4">
                <p className="home-lobby-eyebrow text-[0.65rem] font-black uppercase tracking-[0.22em] text-cyan-200 sm:text-xs">Central do jogador</p>
                <h2 className="home-lobby-title mt-1 text-xl font-black uppercase text-white font-display sm:text-3xl md:text-4xl">Escolha o modo</h2>
                <p className="home-lobby-subtitle mt-1 text-xs font-bold text-blue-100 sm:text-sm">Lobby separado, menus rápidos e personagem animado.</p>
              </div>

              <div className="home-lobby-mobile-title hidden">
                <p>Central do jogador</p>
                <h2>Escolha o modo</h2>
              </div>

              <div className="home-lobby-actions grid gap-2 sm:gap-3">
                <Button onClick={() => router.push('/lobby')} className="home-lobby-play h-14 justify-between rounded-lg border-0 bg-yellow-300 px-4 text-lg font-black uppercase italic text-slate-950 shadow-[0_6px_0_#b45309] hover:bg-yellow-200 sm:h-20 sm:rounded-none sm:px-6 sm:text-2xl sm:shadow-[0_8px_0_#b45309]">
                  Encontrar partidas <Play className="h-5 w-5 fill-current sm:h-7 sm:w-7" />
                </Button>
                <div className="home-lobby-secondary grid grid-cols-2 gap-2 sm:gap-3">
                  <Button type="button" onClick={() => router.push('/profile')} className="home-lobby-small-action h-12 rounded-lg border-2 border-white/20 bg-blue-500/80 text-[0.65rem] font-black uppercase text-white hover:bg-blue-400 sm:h-16 sm:rounded-none sm:text-xs"><UserRound className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" /> Perfil</Button>
                  <Button type="button" onClick={() => router.push('/friends')} className="home-lobby-small-action h-12 rounded-lg border-2 border-white/20 bg-blue-500/80 text-[0.65rem] font-black uppercase text-white hover:bg-blue-400 sm:h-16 sm:rounded-none sm:text-xs"><Users className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" /> Amigos</Button>
                </div>
                <Button type="button" onClick={() => router.push('/decks')} className="home-lobby-decks h-12 rounded-lg border-2 border-amber-200/70 bg-amber-500/90 text-[0.65rem] font-black uppercase text-amber-950 hover:bg-amber-400 sm:h-16 sm:rounded-none sm:text-sm"><BookOpen className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" /> Biblioteca de decks</Button>
              </div>
            </div>
          </section>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="w-full max-w-md rounded-2xl border-4 border-white/40 bg-white/95 p-4 text-[#1e1b4b] shadow-2xl backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
            <div className="mb-4 flex flex-col items-center text-center sm:mb-6">
              <motion.img src="/api/branding/logo" alt="Quem Sou Eu?" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="mb-2 w-full max-w-[280px] drop-shadow-xl sm:max-w-[320px]" />
              <div className="sr-only"><Gamepad2 className="h-8 w-8" />Quem Sou Eu?</div>
              <p className="px-3 text-xs font-black uppercase tracking-wide text-indigo-700/90 sm:px-4 sm:text-sm">O divertido jogo de cartas e adivinhacao social!</p>
            </div>
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 sm:rounded-2xl sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="mb-1.5 block text-center text-[11px] font-black uppercase tracking-wider text-indigo-950 sm:mb-2 sm:text-[12px]">Qual o seu nome no jogo?</label>
                  <Input placeholder="DIGITE SEU APELIDO..." value={nickname} maxLength={16} onChange={(e) => { setNickname(e.target.value); if (error) setError(''); }} className="h-12 rounded-lg border-2 border-indigo-200 bg-white text-center text-base font-bold text-indigo-950 shadow-inner placeholder:text-slate-350 focus:border-indigo-500 focus-visible:ring-indigo-100 sm:h-14 sm:rounded-xl sm:text-xl" />
                  {error && <p className="mt-1.5 text-center text-xs font-semibold text-rose-500 sm:mt-2.5">{error}</p>}
                </div>
                <Button onClick={handleGuestLogin} disabled={loading || !nickname.trim()} className="flex h-12 w-full items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-white btn-squishy-indigo cursor-pointer sm:h-14 sm:text-base">
                  {loading ? 'Entrando...' : 'Jogar Rápido'}
                  {!loading && <Play className="h-3.5 w-3.5 fill-white sm:h-4 sm:w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 py-2.5 sm:gap-3 sm:py-4"><div className="h-0.5 flex-1 bg-slate-200" /><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">ou entre com</span><div className="h-0.5 flex-1 bg-slate-200" /></div>
              <GoogleLoginButton redirectTo="/" />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
