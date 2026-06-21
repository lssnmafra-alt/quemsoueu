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
  key?: string;
  slug?: string;
  clipCandidates?: Record<AnimationEventType, string[]>;
  clipIndex?: Record<AnimationEventType, number>;
  expectedKeys?: string[];
};

export default function AvatarAnimationShowcase({ player, eventType, title, subtitle, className, compact = false }: AvatarAnimationShowcaseProps) {
  const [model, setModel] = useState<AnimationModel | null>(null);
  const [loading, setLoading] = useState(false);

  const avatarUrl = player?.avatar_url || '';

  useEffect(() => {
    if (!avatarUrl) {
      setModel(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/avatar-animation-model?avatarUrl=${encodeURIComponent(avatarUrl)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setModel(result);
      })
      .catch(() => {
        if (!cancelled) setModel({ available: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [avatarUrl]);

  const resolvedTitle = useMemo(() => {
    if (title) return title;
    if (eventType === 'victory') return 'Animação de vitória';
    if (eventType === 'defeat') return 'Animação de derrota';
    return 'Animação de entrada';
  }, [eventType, title]);

  const resolvedSubtitle = subtitle || player?.nickname || 'Personagem';
  const candidates = model?.clipCandidates?.[eventType] || [];
  const clipIndex = model?.clipIndex?.[eventType] ?? 0;

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
      ) : model?.available && model.url ? (
        <Avatar3DPlayer
          src={model.url}
          eventType={eventType}
          label={resolvedTitle}
          clipCandidates={candidates}
          clipIndex={clipIndex}
          className={compact ? 'h-[260px]' : 'h-[360px]'}
        />
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <Box className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-black text-slate-600">GLB ainda não encontrado para este avatar.</p>
          <p className="mt-1 max-w-sm text-xs font-bold text-slate-400">
            Salve o arquivo como personagem.glb na pasta do mesmo nome do avatar.
          </p>
        </div>
      )}
    </div>
  );
}
