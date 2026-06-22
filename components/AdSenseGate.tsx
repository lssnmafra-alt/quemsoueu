'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

const ADSENSE_CLIENT = 'ca-pub-4115543805172090';
const ADSENSE_GATE_SLOT = '7846590607';
const LAST_ACTIVITY_KEY = 'quemSouEu:lastPlayerActivityAt';
const HAS_SEEN_AD_KEY = 'quemSouEu:hasSeenAdsenseGate';
const INACTIVE_MS = 60 * 60 * 1000;
const CLOSE_DELAY_SECONDS = 8;
const ACTIVITY_THROTTLE_MS = 5000;

export default function AdSenseGate() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CLOSE_DELAY_SECONDS);
  const [adPushed, setAdPushed] = useState(false);
  const lastWriteRef = useRef(0);

  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_GATE_SLOT || ADSENSE_GATE_SLOT;
  const shouldAvoidPage = useMemo(() => {
    const path = pathname || '';
    return path.startsWith('/room/') || path.startsWith('/api/') || path.startsWith('/decks/');
  }, [pathname]);

  useEffect(() => {
    if (shouldAvoidPage) return;

    const now = Date.now();
    const state = readAdState();
    const firstAccess = !state.hasSeen;
    const returnedAfterInactivity = state.lastActivity > 0 && now - state.lastActivity >= INACTIVE_MS;

    if (firstAccess || returnedAfterInactivity) {
      const timer = window.setTimeout(() => setVisible(true), 650);
      return () => window.clearTimeout(timer);
    }

    writeActivity(now);
  }, [shouldAvoidPage, pathname]);

  useEffect(() => {
    if (shouldAvoidPage) return;

    const checkBeforeWritingActivity = () => {
      if (visible) return;

      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return;

      const state = readAdState();
      const returnedAfterInactivity = state.hasSeen && state.lastActivity > 0 && now - state.lastActivity >= INACTIVE_MS;

      if (returnedAfterInactivity) {
        setVisible(true);
        return;
      }

      writeActivity(now);
      lastWriteRef.current = now;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        writeActivity(Date.now());
        return;
      }
      checkBeforeWritingActivity();
    };

    const events: Array<keyof WindowEventMap> = ['focus', 'click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, checkBeforeWritingActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((event) => window.removeEventListener(event, checkBeforeWritingActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldAvoidPage, visible]);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(CLOSE_DELAY_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !adSlot || adPushed) return;
    const timer = window.setTimeout(() => {
      try {
        const win = window as any;
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
        setAdPushed(true);
      } catch (error) {
        console.warn('AdSense gate push skipped:', error);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [adPushed, adSlot, visible]);

  const close = () => {
    const now = Date.now();
    try {
      localStorage.setItem(HAS_SEEN_AD_KEY, '1');
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {}
    lastWriteRef.current = now;
    setVisible(false);
  };

  if (!visible || shouldAvoidPage) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07051a]/92 px-4 py-6 text-white backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[34px] border border-white/10 bg-white p-4 text-indigo-950 shadow-2xl md:p-5">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300" />

        <div className="mb-4 flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400">Publicidade</p>
            <h2 className="text-xl font-black text-indigo-950">O jogo começa em instantes</h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={secondsLeft > 0}
            className="flex h-11 min-w-11 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-3 text-xs font-black uppercase text-indigo-500 transition disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Fechar anúncio"
          >
            {secondsLeft > 0 ? secondsLeft : <X className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[26px] border-2 border-indigo-50 bg-slate-50 p-3 text-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: 250 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
          <span>Quem Sou Eu?</span>
          <span>{secondsLeft > 0 ? `Fechar em ${secondsLeft}s` : 'Pode fechar'}</span>
        </div>
      </div>
    </div>
  );
}

function readAdState() {
  try {
    return {
      hasSeen: localStorage.getItem(HAS_SEEN_AD_KEY) === '1',
      lastActivity: Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0),
    };
  } catch {
    return { hasSeen: false, lastActivity: 0 };
  }
}

function writeActivity(timestamp: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  } catch {}
}
