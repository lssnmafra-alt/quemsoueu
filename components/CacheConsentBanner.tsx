'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'quemSouEu:cacheCookiesConsent';

function hasConsentDecision() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'dismissed';
  } catch {
    return false;
  }
}

export default function CacheConsentBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasConsentDecision());
  }, []);

  const closeWithDecision = (value: 'accepted' | 'dismissed') => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      localStorage.setItem(`${CONSENT_KEY}:at`, new Date().toISOString());
    } catch {}
    setVisible(false);
  };

  if (!visible || pathname?.startsWith('/api/')) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-3xl rounded-2xl border-2 border-indigo-100 bg-white/96 p-3 text-indigo-950 shadow-xl backdrop-blur md:bottom-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-950">Cookies, cache e anúncios</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500 md:text-xs">
              Usamos localStorage para login, perfil, áudio e preferências. Você pode continuar sem aceitar cookies de anúncios.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push('/privacidade')} className="h-10 rounded-2xl border-2 border-indigo-100 px-4 text-[11px] font-black uppercase text-indigo-600">
            Ver termos
          </Button>
          <Button type="button" variant="outline" onClick={() => closeWithDecision('dismissed')} className="h-10 rounded-2xl border-2 border-slate-200 px-4 text-[11px] font-black uppercase text-slate-600">
            Continuar sem aceitar
          </Button>
          <Button type="button" onClick={() => closeWithDecision('accepted')} className="h-10 rounded-2xl btn-squishy-indigo px-5 text-[11px] font-black uppercase text-white">
            Aceitar
          </Button>
          <button type="button" onClick={() => closeWithDecision('dismissed')} className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-400 hover:text-rose-500" aria-label="Fechar aviso sem aceitar cookies de anúncios">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
