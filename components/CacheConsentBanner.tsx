'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'quemSouEu:cacheCookiesConsent';

export default function CacheConsentBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(CONSENT_KEY) !== 'accepted');
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      localStorage.setItem(`${CONSENT_KEY}:at`, new Date().toISOString());
    } catch {}
    setVisible(false);
  };

  if (!visible || pathname?.startsWith('/api/')) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-4xl rounded-3xl border-2 border-indigo-100 bg-white p-4 text-indigo-950 shadow-2xl md:bottom-5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-indigo-950">Cookies, cache e anúncios</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
              Usamos cache/localStorage para manter login, perfil, áudio, preferências do jogo e controle de inatividade. Também usamos Google AdSense, que pode usar cookies ou dados para publicidade.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push('/privacidade')} className="h-10 rounded-2xl border-2 border-indigo-100 px-4 text-[11px] font-black uppercase text-indigo-600">
            Ver termos
          </Button>
          <Button type="button" onClick={accept} className="h-10 rounded-2xl btn-squishy-indigo px-5 text-[11px] font-black uppercase text-white">
            Aceitar
          </Button>
          <button type="button" onClick={accept} className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-400 hover:text-rose-500" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
