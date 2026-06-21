'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Avatar3DPlayerProps = {
  src?: string;
  eventType: 'defeat' | 'intro' | 'victory';
  label?: string;
  clipCandidates?: string[];
  clipIndex?: number;
  className?: string;
};

let modelViewerScriptPromise: Promise<void> | null = null;

export default function Avatar3DPlayer({ src, eventType, label, clipCandidates = [], clipIndex = 0, className }: Avatar3DPlayerProps) {
  const viewerRef = useRef<any>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [activeClip, setActiveClip] = useState('');
  const [loadError, setLoadError] = useState('');

  const fallbackLabel = useMemo(() => {
    if (eventType === 'victory') return 'Animação de vitória';
    if (eventType === 'defeat') return 'Animação de derrota';
    return 'Animação de entrada';
  }, [eventType]);

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    loadModelViewerScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Não foi possível carregar o leitor 3D.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setModelReady(false);
    setActiveClip('');
    setLoadError('');
  }, [src]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !scriptReady || !src) return;

    const applyAnimation = () => {
      const available = Array.isArray(viewer.availableAnimations) ? viewer.availableAnimations : [];
      const normalized = available.map((name: string) => ({ raw: name, clean: normalizeClipName(name) }));
      const candidates = clipCandidates.map(normalizeClipName);
      const matched = normalized.find((item: any) => candidates.includes(item.clean));
      const byIndex = available[clipIndex] || available[0] || '';
      const nextClip = matched?.raw || byIndex;

      if (nextClip) {
        viewer.animationName = nextClip;
        viewer.setAttribute('animation-name', nextClip);
        setActiveClip(nextClip);
        viewer.play?.();
      }

      setModelReady(true);
      setLoadError('');
    };

    const onError = () => {
      setLoadError('O GLB foi encontrado, mas o navegador não conseguiu renderizar.');
      setModelReady(true);
    };

    viewer.addEventListener('load', applyAnimation);
    viewer.addEventListener('model-visibility', applyAnimation);
    viewer.addEventListener('error', onError);
    const retryTimers = [900, 2400, 4800].map((delay) => window.setTimeout(applyAnimation, delay));

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      viewer.removeEventListener('load', applyAnimation);
      viewer.removeEventListener('model-visibility', applyAnimation);
      viewer.removeEventListener('error', onError);
    };
  }, [clipCandidates, clipIndex, scriptReady, src]);

  if (!src) return null;

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border-4 border-indigo-100 bg-slate-950 shadow-inner', className)}>
      {(!scriptReady || !modelReady) && !loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-300" />
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Carregando 3D</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950 p-5 text-center text-white">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <p className="text-xs font-black uppercase tracking-wider text-amber-100">{loadError}</p>
          <a href={src} target="_blank" rel="noreferrer" className="mt-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-white/20">
            Abrir GLB
          </a>
        </div>
      )}

      {scriptReady ? createElement('model-viewer', {
        ref: viewerRef,
        src,
        alt: label || fallbackLabel,
        autoplay: true,
        'camera-controls': true,
        'disable-zoom': true,
        'interaction-prompt': 'none',
        'shadow-intensity': '1',
        exposure: '1',
        reveal: 'auto',
        loading: 'eager',
        crossorigin: 'anonymous',
        'environment-image': 'neutral',
        style: { width: '100%', height: '100%', minHeight: 260, background: 'linear-gradient(180deg, #eef2ff 0%, #dbeafe 100%)' },
      } as any) : (
        <div className="flex h-full min-h-[260px] items-center justify-center bg-indigo-50 text-indigo-300">
          <Box className="h-12 w-12" />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-2xl border border-white/30 bg-white/70 px-3 py-2 text-left shadow-sm backdrop-blur">
        <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">{fallbackLabel}</p>
        <p className="truncate text-xs font-black text-indigo-950">{activeClip || 'clipe automático'}</p>
      </div>
    </div>
  );
}

function loadModelViewerScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (modelViewerScriptPromise) return modelViewerScriptPromise;

  const sources = [
    'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
    'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js',
  ];

  modelViewerScriptPromise = loadScriptSource(sources, 0);
  return modelViewerScriptPromise;
}

function loadScriptSource(sources: string[], index: number): Promise<void> {
  if (index >= sources.length) return Promise.reject(new Error('model-viewer falhou'));

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = sources[index];
    script.dataset.modelViewer = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      loadScriptSource(sources, index + 1).then(resolve).catch(reject);
    };
    document.head.appendChild(script);
  });
}

function normalizeClipName(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
