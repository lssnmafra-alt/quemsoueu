'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseAuth } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { moderateText } from '@/app/actions/moderate';
import { motion } from 'motion/react';
import { Mail, Play, Sparkles, Smile, Gamepad2 } from 'lucide-react';

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
    router.push(profileNeedsSetup(profile) ? '/profile?next=/lobby' : '/lobby');
  }, [authInitialized, authLoading, router, user, profile]);

  const handleGoogleLogin = async () => {
    await supabaseAuth.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile?next=/lobby`,
      },
    });
  };

  const handleGuestLogin = async () => {
    if (!nickname.trim()) {
      setError('Escolha um apelido!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isSafe = await moderateText(nickname);
      if (!isSafe) {
        setError('Esse apelido contém palavras impróprias!');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Moderation failed, proceeding anyway.', err);
    }

    await loginGuest(nickname);
    router.push('/profile?next=/lobby');
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-[#090a1d] flex flex-col items-center justify-center overflow-hidden font-sans p-4">
      <div className="absolute inset-0 bg-[url('/branding/cover.svg')] bg-cover bg-center opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-indigo-950/20 to-black/70" />
      <div className="absolute inset-0 party-grid-bg opacity-30" />

      <motion.div
        animate={{ y: [0, -15, 0], rotate: [4, 8, 4] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        className="absolute top-1/4 left-[8%] w-40 h-56 bg-amber-300/90 border-4 border-amber-400 shadow-xl rounded-2xl hidden xl:flex flex-col items-center justify-between p-4"
      >
        <span className="text-xs font-bold text-amber-900 tracking-wider font-mono">DIVERSAO</span>
        <Sparkles className="w-12 h-12 text-amber-900" />
        <span className="text-[10px] text-amber-800 font-semibold font-mono">QUEM SOU EU?</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 15, 0], rotate: [-8, -4, -8] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/4 right-[8%] w-40 h-56 bg-rose-300/90 border-4 border-rose-400 shadow-xl rounded-2xl hidden xl:flex flex-col items-center justify-between p-4"
      >
        <span className="text-xs font-bold text-rose-900 tracking-wider font-mono">PALPITE</span>
        <Smile className="w-12 h-12 text-rose-900" />
        <span className="text-[10px] text-rose-800 font-semibold font-mono">E UM PERSONAGEM?</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md bg-white/95 border-4 border-white/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center backdrop-blur"
      >
        <div className="text-center mb-6 relative select-none flex flex-col items-center">
          <motion.img
            src="/branding/logo.svg"
            alt="Quem Sou Eu?"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-2 w-full max-w-[320px] drop-shadow-xl"
          />
          <div className="sr-only">
            <Gamepad2 className="w-8 h-8" />
            Quem Sou Eu?
          </div>
          <p className="text-indigo-700/90 font-black text-sm px-4 uppercase tracking-wide">
            O divertido jogo de cartas e adivinhacao social!
          </p>
        </div>

        <div className="w-full space-y-5">
          <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl">
            <div className="space-y-4">
              <div>
                <label className="text-[12px] uppercase font-black tracking-wider text-indigo-950 block mb-2 text-center">
                  Qual o seu nome no jogo?
                </label>

                <Input
                  placeholder="DIGITE SEU APELIDO..."
                  value={nickname}
                  maxLength={16}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-white border-2 border-indigo-200 focus:border-indigo-500 h-14 rounded-xl text-center text-xl font-bold text-indigo-950 placeholder:text-slate-350 transition-all shadow-inner focus-visible:ring-indigo-100"
                />
                {error && (
                  <p className="text-xs font-semibold text-rose-500 text-center mt-2.5">
                    {error}
                  </p>
                )}
              </div>

              <Button
                onClick={handleGuestLogin}
                disabled={loading || !nickname.trim()}
                className="w-full h-14 text-base font-black tracking-wider uppercase text-white btn-squishy-indigo cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Entrando...' : 'Jogar Agora!'}
                {!loading && <Play className="w-4 h-4 fill-white" />}
              </Button>
            </div>

            <div className="flex items-center gap-3 py-4">
              <div className="flex-1 h-0.5 bg-slate-200"></div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ou entre com</span>
              <div className="flex-1 h-0.5 bg-slate-200"></div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-12 bg-white border-2 border-slate-200 hover:border-indigo-400 text-slate-700 font-bold tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-indigo-50 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>Entrar com Google</span>
            </Button>
          </div>

          <div className="flex justify-center gap-4 text-xs font-semibold text-white/85 font-mono drop-shadow">
            <span className="flex items-center gap-1">
              <Smile className="w-4 h-4 text-emerald-300" /> Multiplayer
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-300" /> 100% Amigável
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
