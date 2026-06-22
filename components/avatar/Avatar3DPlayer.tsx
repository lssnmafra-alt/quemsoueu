'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Avatar3DPlayerProps = {
  src?: string;
  fallbackSrc?: string;
  eventType: 'defeat' | 'intro' | 'victory';
  label?: string;
  clipCandidates?: string[];
  clipIndex?: number;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  orientation?: string;
  autoRotate?: boolean;
  className?: string;
};

let modelViewerScriptPromise: Promise<void> | null = null;

export default function Avatar3DPlayer({
  src,
  fallbackSrc,
  eventType,
  label,
  clipCandidates = [],
  clipIndex = 0,
  cameraOrbit = '180deg 75deg 115%',
  cameraTarget = 'auto auto auto',
  fieldOfView = '30deg',
  orientation = '0deg 0deg 0deg',
  autoRotate = true,
  className,
}: Avatar3DPlayerProps) {
  const viewerRef = useRef<any>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [activeClip, setActiveClip] = useState('');
  const [loadError, setLoadError] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);

  const sources = useMemo(() => {
    const unique = [src, fallbackSrc].filter(Boolean) as string[];
    return [...new Set(unique)];
  }, [src, fallbackSrc]);
  const currentSrc = sources[sourceIndex] || sources[0] || '';

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
    setSourceIndex(0);
    setModelReady(false);
    setActiveClip('');
    setLoadError('');
  }, [src, fallbackSrc, cameraOrbit, cameraTarget, fieldOfView, orientation]);

  useEffect(() => {
    setModelReady(false);
    setActiveClip('');
    setLoadError('');
  }, [currentSrc]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !scriptReady || !currentSrc) return;

    const applyView = () => {
      viewer.cameraOrbit = cameraOrbit;
      viewer.cameraTarget = cameraTarget;
      viewer.fieldOfView = fieldOfView;
      viewer.orientation = orientation;
      viewer.setAttribute('camera-orbit', cameraOrbit);
      viewer.setAttribute('camera-target', cameraTarget);
      viewer.setAttribute('field-of-view', fieldOfView);
      viewer.setAttribute('orientation', orientation);
      if (autoRotate) {
        viewer.setAttribute('auto-rotate', '');
        viewer.setAttribute('auto-rotate-delay', '0');
        viewer.setAttribute('rotation-per-second', '45deg');
      } else {
        viewer.removeAttribute('auto-rotate');
      }
      viewer.jumpCameraToGoal?.();
    };

    const applyAnimation = () => {
      applyView();
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
      } else {
        setActiveClip('modelo estático');
      }

      setModelReady(true);
      setLoadError('');
    };

    const tryNextSource = () => {
      if (sourceIndex + 1 < sources.length) {
        setSourceIndex((current) => current + 1);
        return true;
      }
      return false;
    };

    const onError = () => {
      if (tryNextSource()) return;
      setLoadError('O GLB foi encontrado, mas o navegador não conseguiu renderizar.');
      setModelReady(true);
    };

    applyView();
    viewer.addEventListener('load', applyAnimation);
    viewer.addEventListener('model-visibility', applyAnimation);
    viewer.addEventListener('error', onError);
    const retryTimers = [900, 2400, 4800].map((delay) => window.setTimeout(applyAnimation, delay));
    const failTimer = window.setTimeout(() => {
      if (!viewerRef.current || modelReady) return;
      if (tryNextSource()) return;
      setLoadError('O GLB demorou demais para carregar no navegador.');
      setModelReady(true);
    }, 15000);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(failTimer);
      viewer.removeEventListener('load', applyAnimation);
      viewer.removeEventListener('model-visibility', applyAnimation);
      viewer.removeEventListener('error', onError);
    };
  }, [autoRotate, cameraOrbit, cameraTarget, clipCandidates, clipIndex, currentSrc, fieldOfView, modelReady, orientation, scriptReady, sourceIndex, sources]);

  if (!currentSrc) return null;

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border-4 border-indigo-100 bg-slate-950 shadow-inner', className)}>
      {(!scriptReady || !modelReady) && !loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-300" />
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Carregando 3D</p>
          {sources.length > 1 && <p className="text-[9px] font-black uppercase tracking-wider text-indigo-200">Fonte {sourceIndex + 1}/{sources.length}</p>}
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950 p-5 text-center text-white">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <p className="text-xs font-black uppercase tracking-wider text-amber-100">{loadError}</p>
          <a href={currentSrc} target="_blank" rel="noreferrer" className="mt-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-white/20">
            Abrir GLB
          </a>
        </div>
      )}

      {scriptReady ? createElement('model-viewer', {
        key: `${currentSrc}:${cameraOrbit}:${orientation}`,
        ref: viewerRef,
        src: currentSrc,
        alt: label || fallbackLabel,
        autoplay: true,
        'camera-controls': true,
        'disable-zoom': true,
        'interaction-prompt': 'none',
        'shadow-intensity': '1',
        exposure: '1',
        reveal: 'auto',
        loading: 'eager',
        'environment-image': 'neutral',
        'camera-orbit': cameraOrbit,
        'camera-target': cameraTarget,
        'field-of-view': fieldOfView,
        orientation,
        ...(autoRotate ? { 'auto-rotate': true, 'auto-rotate-delay': '0', 'rotation-per-second': '45deg' } : {}),
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
