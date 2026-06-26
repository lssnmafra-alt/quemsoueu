'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
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

type AnimationVideo = {
  available: boolean;
  mediaType?: 'video';
  url?: string;
  videoUrl?: string;
  key?: string;
  slug?: string;
  eventType?: AnimationEventType;
};

export default function AvatarAnimationShowcase({ player, eventType, title, subtitle, className, compact = false }: AvatarAnimationShowcaseProps) {
  const [video, setVideo] = useState<AnimationVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTimedOut, setSearchTimedOut] = useState(false);

  const avatarUrl = player?.avatar_url || '';
  const avatarSlug = useMemo(() => slugFromAvatarUrl(avatarUrl), [avatarUrl]);

  useEffect(() => {
    if (!avatarSlug) {
      setVideo(null);
      setLoading(false);
      setSearchTimedOut(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!cancelled) setSearchTimedOut(true);
    }, 1200);

    const loadAnimation = async () => {
      setLoading(true);
      setSearchTimedOut(false);
      setVideo(null);

      try {
        const response = await fetch(`/api/avatar-animation-video?slug=${encodeURIComponent(avatarSlug)}&avatarUrl=${encodeURIComponent(avatarUrl)}&eventType=${eventType}`, { cache: 'force-cache', signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!cancelled) setVideo(result?.available && (result.videoUrl || result.url) ? result : null);
      } catch {
        if (!cancelled) setVideo(null);
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    };

    void loadAnimation();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [avatarSlug, avatarUrl, eventType]);

  const resolvedTitle = useMemo(() => {
    if (title) return title;
    if (eventType === 'victory') return 'Animação de vitória';
    if (eventType === 'defeat') return 'Animação de derrota';
    return 'Animação de entrada';
  }, [eventType, title]);

  const resolvedSubtitle = subtitle || player?.nickname || 'Personagem';
  const videoSrc = video?.videoUrl || video?.url || '';

  return (
    <div className={cn('rounded-3xl border-4 border-indigo-100 bg-white p-4 shadow-xl', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-left">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Animação
          </p>
          <h3 className="truncate text-lg font-black text-indigo-950 font-display">{resolvedTitle}</h3>
          <p className="truncate text-xs font-bold text-slate-500">{resolvedSubtitle}</p>
        </div>
        {player?.avatar_url && <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} className="h-12 w-12 shrink-0 rounded-2xl border-2 border-indigo-100" />}
      </div>

      {loading && !searchTimedOut ? (
        <FallbackAvatarAnimation player={player} eventType={eventType} label="Preparando vídeo..." muted />
      ) : videoSrc ? (
        <AvatarVideoPlayer src={videoSrc} player={player} eventType={eventType} className={compact ? 'h-[260px]' : 'h-[360px]'} />
      ) : (
        <FallbackAvatarAnimation player={player} eventType={eventType} label="Animação 2D automática" />
      )}
    </div>
  );
}

function AvatarVideoPlayer({ src, player, eventType, className }: { src: string; player?: any; eventType: AnimationEventType; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const label = eventType === 'victory' ? 'Vídeo de vitória' : eventType === 'defeat' ? 'Vídeo de derrota' : 'Vídeo de entrada';
  const poster = resolvePoster(player?.avatar_url);

  const forceMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
  };

  const startFast = () => {
    const video = videoRef.current;
    forceMuted();
    setReady(true);
    video?.play?.().catch(() => null);
  };

  useEffect(() => {
    const video = videoRef.current;
    forceMuted();
    if (video) {
      video.preload = 'metadata';
      video.load();
      video.play?.().catch(() => null);
    }
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, [src]);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden rounded-3xl border-4 border-indigo-100 bg-white shadow-inner', className)}>
      <div className="relative flex h-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-2xl bg-white">
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          onLoadedMetadata={startFast}
          onVolumeChange={forceMuted}
          onPlay={forceMuted}
          onLoadedData={startFast}
          onCanPlay={startFast}
          className="h-full w-full bg-white object-contain"
        />
      </div>
      {!ready && <FallbackAvatarAnimation player={player} eventType={eventType} label="Carregando vídeo..." muted />}
      {ready && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-left shadow-sm backdrop-blur">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">{label}</p>
          <p className="truncate text-xs font-black text-indigo-950">{player?.nickname || 'Avatar do jogador'}</p>
        </div>
      )}
    </div>
  );
}

function FallbackAvatarAnimation({ player, eventType, label, muted = false }: { player?: any; eventType: AnimationEventType; label: string; muted?: boolean }) {
  const yMovement = eventType === 'victory' ? [-4, -18, -4] : eventType === 'defeat' ? [0, 14, 0] : [0, -8, 0];
  const rotateMovement = eventType === 'defeat' ? [0, -6, 4, 0] : [-3, 3, -3];

  return (
    <div className="relative flex h-[260px] min-h-[220px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-indigo-100 bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.75, y: 18 }}
        animate={{ opacity: 1, scale: [0.92, 1.08, 1], y: yMovement, rotate: rotateMovement }}
        transition={{ duration: muted ? 1.2 : 2, repeat: muted ? Infinity : 0, repeatType: 'mirror', ease: 'easeInOut' }}
        className="relative z-10"
      >
        {player?.avatar_url ? (
          <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} className="h-36 w-36 rounded-[2rem] border-4 border-white bg-white shadow-2xl" />
        ) : (
          <Box className="h-20 w-20 text-indigo-200" />
        )}
      </motion.div>
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-left shadow-sm backdrop-blur">
        <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">{label}</p>
        <p className="truncate text-xs font-black text-indigo-950">{player?.nickname || 'Avatar do jogador'}</p>
      </div>
    </div>
  );
}

function resolvePoster(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';
  if (!value.startsWith('avatar:')) return value;
  try {
    const parsed = JSON.parse(decodeURIComponent(value.slice(7)));
    return String(parsed.imageUrl || '').trim();
  } catch {
    return '';
  }
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
