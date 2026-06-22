'use client';

import { useEffect, useMemo, useState } from 'react';

type LoadingArenaProps = {
  label?: string;
};

const GAMEPLAY_TIPS = [
  'Apenas um sobrevive.',
  'Você precisa adivinhar as cartas dos adversários.',
  'Eles também vão tentar adivinhar suas cartas.',
  'Observe os palpites antes de votar.',
  'Proteja suas cartas e ataque no momento certo.',
  'Na dúvida, leia o comportamento da mesa.',
  'Cada erro pode custar uma vida.',
  'No fim, o jogo vira pressão total.',
];

const LOADING_STEPS = [
  'Salvando preferências locais...',
  'Preparando sua mesa...',
  'Carregando imagens do jogo...',
  'Ajustando áudio e perfil...',
  'Sincronizando sala...',
  'Entrando no Quem Sou Eu...',
];

export default function LoadingArena({ label = 'Carregando Quem Sou Eu...' }: LoadingArenaProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState('');

  const currentTip = useMemo(() => GAMEPLAY_TIPS[tipIndex % GAMEPLAY_TIPS.length], [tipIndex]);
  const currentStep = useMemo(() => LOADING_STEPS[stepIndex % LOADING_STEPS.length], [stepIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('quemSouEu:lastLoadingAt', new Date().toISOString());
      localStorage.setItem('quemSouEu:loadingBranding', JSON.stringify({ logo: '/api/branding/logo', loading: '/api/branding/loading' }));
    } catch {
      // Mantem a tela fluida mesmo se o navegador bloquear localStorage.
    }

    const tipTimer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % GAMEPLAY_TIPS.length);
    }, 2600);

    const stepTimer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % LOADING_STEPS.length);
    }, 1450);

    const dotsTimer = window.setInterval(() => {
      setDots((current) => (current.length >= 3 ? '' : `${current}.`));
    }, 420);

    return () => {
      window.clearInterval(tipTimer);
      window.clearInterval(stepTimer);
      window.clearInterval(dotsTimer);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#120824] text-white">
      <div
        className="absolute inset-0 scale-[1.03] bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(18,8,36,0.60) 0%, rgba(32,10,58,0.76) 50%, rgba(9,6,22,0.94) 100%), url('/api/branding/loading')",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.16),_transparent_38%)]" />
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl text-center">
          <img
            src="/api/branding/logo"
            alt="Quem Sou Eu?"
            className="mx-auto mb-8 h-auto w-full max-w-[360px] object-contain drop-shadow-[0_10px_34px_rgba(0,0,0,0.6)]"
          />

          <div className="mx-auto max-w-2xl rounded-[30px] border border-white/10 bg-black/24 px-5 py-6 shadow-2xl backdrop-blur-md md:px-8 md:py-8">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/90">
              Dica de sobrevivência
            </p>
            <p key={currentTip} className="loading-tip text-2xl font-black leading-tight text-white drop-shadow md:text-4xl">
              {currentTip}
            </p>
            <p className="mx-auto mt-4 max-w-md text-xs font-bold uppercase tracking-[0.18em] text-white/65">
              {label}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 z-20 w-[min(320px,calc(100vw-2.5rem))] rounded-2xl border border-white/10 bg-black/35 p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/90">Carregando{dots}</span>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
        </div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/65">{currentStep}</p>
        <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <div className="loading-shine h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300" />
        </div>
      </div>

      <style jsx>{`
        .loading-shine {
          animation: loading-shine 1.55s ease-in-out infinite;
          width: 35%;
        }

        .loading-tip {
          animation: loading-tip 0.42s ease-out both;
          font-family: var(--font-quicksand), var(--font-sans), system-ui, sans-serif;
          letter-spacing: -0.04em;
        }

        @keyframes loading-shine {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(110%);
          }
          100% {
            transform: translateX(310%);
          }
        }

        @keyframes loading-tip {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
