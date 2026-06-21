'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Loader2 } from 'lucide-react';
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

  const fallbackLabel = useMemo(() => {
    if (eventType === 'victory') return 'Animação de vitória';
    if (eventType === 'defeat') return 'Animação de derrota';
    return 'Animação de entrada';
  }, [eventType]);

  useEffect(() => {
    let cancelled = false;
    loadModelViewerScript().then(() => {
      if (!cancelled) setScriptReady(true);
    });
    return () => { cancelled = true; };
  }, []);

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
    };

    viewer.addEventListener('load', applyAnimation);
    viewer.addEventListener('model-visibility', applyAnimation);
    const timer = window.setTimeout(applyAnimation, 700);

    return () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('load', applyAnimation);
      viewer.removeEventListener('model-visibility', applyAnimation);
    };
  }, [clipCandidates, clipIndex, scriptReady, src]);

  if (!src) return null;

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border-4 border-indigo-100 bg-slate-950 shadow-inner', className)}>
      {(!scriptReady || !modelReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-300" />
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Carregando 3D</p>
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

  modelViewerScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-model-viewer="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('model-viewer falhou')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.dataset.modelViewer = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('model-viewer falhou'));
    document.head.appendChild(script);
  });

  return modelViewerScriptPromise;
}

function normalizeClipName(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
