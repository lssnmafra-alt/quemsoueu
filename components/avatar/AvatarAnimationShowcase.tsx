'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Sparkles } from 'lucide-react';
import Avatar3DPlayer from './Avatar3DPlayer';
import AvatarFigure from './AvatarFigure';
import { cn } from '@/lib/utils';

type AnimationEventType = 'defeat' | 'intro' | 'victory';

type AvatarAnimationShowcaseProps = {
  player?: any;
  eventType: AnimationEventType;
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
};

type AnimationModel = {
  available: boolean;
  url?: string;
  directUrl?: string;
  proxyUrl?: string;
  key?: string;
  slug?: string;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  orientation?: string;
  clipCandidates?: Record<AnimationEventType, string[]>;
  clipIndex?: Record<AnimationEventType, number>;
  expectedKeys?: string[];
};

const DEFAULT_CLIP_CANDIDATES: Record<AnimationEventType, string[]> = {
  defeat: ['NlaTrack', 'perdeu', 'Perdeu', 'derrota', 'Derrota', 'defeat', 'Defeat', 'Animation 1', 'Animação 1', 'Animacao 1'],
  intro: ['NlaTrack.001', 'entrada', 'Entrada', 'inicio', 'Inicio', 'intro', 'Intro', 'start', 'Start', 'Animation 2', 'Animação 2', 'Animacao 2'],
  victory: ['NlaTrack.002', 'venceu', 'Venceu', 'vitoria', 'Vitoria', 'victory', 'Victory', 'win', 'Win', 'Animation 3', 'Animação 3', 'Animacao 3'],
};

const DEFAULT_CLIP_INDEX: Record<AnimationEventType, number> = { defeat: 0, intro: 1, victory: 2 };

export default function AvatarAnimationShowcase({ player, eventType, title, subtitle, className, compact = false }: AvatarAnimationShowcaseProps) {
  const [model, setModel] = useState<AnimationModel | null>(null);
  const [loading, setLoading] = useState(false);

  const avatarUrl = player?.avatar_url || '';
  const avatarSlug = useMemo(() => slugFromAvatarUrl(avatarUrl), [avatarUrl]);

  useEffect(() => {
    if (!avatarSlug) {
      setModel(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/avatar-animation-model?slug=${encodeURIComponent(avatarSlug)}&avatarUrl=${encodeURIComponent(avatarUrl)}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        const apiModel = result?.available && result?.url ? result : null;
        setModel(apiModel ? normalizeModel(apiModel) : null);
      })
      .catch(() => {
        if (!cancelled) setModel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [avatarSlug, avatarUrl]);

  const resolvedTitle = useMemo(() => {
    if (title) return title;
    if (eventType === 'victory') return 'Animação de vitória';
    if (eventType === 'defeat') return 'Animação de derrota';
    return 'Animação de entrada';
  }, [eventType, title]);

  const resolvedSubtitle = subtitle || player?.nickname || 'Personagem';
  const candidates = model?.clipCandidates?.[eventType] || DEFAULT_CLIP_CANDIDATES[eventType];
  const clipIndex = model?.clipIndex?.[eventType] ?? DEFAULT_CLIP_INDEX[eventType];
  const primarySrc = model?.url || model?.proxyUrl || '';
  const fallbackSrc = model?.directUrl && model.directUrl !== primarySrc ? model.directUrl : undefined;

  return (
    <div className={cn('rounded-3xl border-4 border-indigo-100 bg-white p-4 shadow-xl', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-left">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Leitor 3D
          </p>
          <h3 className="truncate text-lg font-black text-indigo-950 font-display">{resolvedTitle}</h3>
          <p className="truncate text-xs font-bold text-slate-500">{resolvedSubtitle}</p>
        </div>
        {player?.avatar_url && <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} className="h-12 w-12 shrink-0 rounded-2xl border-2 border-indigo-100" />}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/50 text-xs font-black uppercase text-indigo-400">
          Procurando GLB...
        </div>
      ) : model?.available && primarySrc ? (
        <Avatar3DPlayer
          src={primarySrc}
          fallbackSrc={fallbackSrc}
          eventType={eventType}
          label={resolvedTitle}
          clipCandidates={candidates}
          clipIndex={clipIndex}
          cameraOrbit={model.cameraOrbit}
          cameraTarget={model.cameraTarget}
          fieldOfView={model.fieldOfView}
          orientation={model.orientation}
          className={compact ? 'h-[260px]' : 'h-[360px]'}
        />
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <Box className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-black text-slate-600">GLB ainda não encontrado para este avatar.</p>
          <p className="mt-1 max-w-sm text-xs font-bold text-slate-400">
            Use o mesmo nome do PNG em atuem/Animacao, por exemplo {avatarSlug || 'Avatar'}.glb.
          </p>
        </div>
      )}
    </div>
  );
}

function normalizeModel(model: AnimationModel): AnimationModel {
  return {
    ...model,
    cameraOrbit: model.cameraOrbit || '180deg 75deg 115%',
    cameraTarget: model.cameraTarget || 'auto auto auto',
    fieldOfView: model.fieldOfView || '30deg',
    orientation: model.orientation || '0deg 0deg 0deg',
    clipCandidates: model.clipCandidates || DEFAULT_CLIP_CANDIDATES,
    clipIndex: model.clipIndex || DEFAULT_CLIP_INDEX,
  };
}

function slugFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('avatar:')) {
    try {
      const parsed = JSON.parse(decodeURIComponent(value.slice(7)));
      return cleanSlug(parsed.avatarId || '');
    } catch {
      return '';
    }
  }

  const decoded = decodeURIComponent(value);
  const marker = '/atuem/avatar/';
  const directMarker = 'atuem/avatar/';
  const index = decoded.indexOf(marker);
  const directIndex = decoded.indexOf(directMarker);
  const part = index >= 0
    ? decoded.slice(index + marker.length)
    : directIndex >= 0
      ? decoded.slice(directIndex + directMarker.length)
      : decoded.split('/').pop() || '';

  return cleanSlug(part.replace(/\.[^.]+$/, ''));
}

function cleanSlug(value: string) {
  return String(value || '')
    .split('..').join('')
    .split('\\').join('/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\.[^.]+$/, '')
    .trim();
}
