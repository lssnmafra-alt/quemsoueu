import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarModelPreloader from '@/components/avatar/AvatarModelPreloader';

const STATIC_BEFORE_MS = 900;
const VIDEO_MS = 6000;
const STATIC_AFTER_MS = 900;
const VIDEO_LOAD_TIMEOUT_MS = 12000;

type SequencePhase = 'before' | 'loading' | 'video' | 'after';

type SequencePlayer = {
  id: string;
  nickname: string;
  avatar_url: string;
};

export default function RoomStarting({ room, players }: any) {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequencePhase, setSequencePhase] = useState<SequencePhase>('before');
  const [currentVideoSrc, setCurrentVideoSrc] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const advancingRef = useRef(false);
  const videoCacheRef = useRef(new Map<string, string>());

  const orderedPlayers = useMemo(() => {
    const activePlayers = players.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0);
    const visiblePlayers = activePlayers.length > 0 ? activePlayers : players.filter((p: any) => !p.is_eliminated);
    return [...visiblePlayers].sort((a, b) => (a.play_order || 0) - (b.play_order || 0));
  }, [players]);

  const stablePreloadPlayers = useMemo(() => orderedPlayers.map((player: any) => ({
    id: player.id,
    avatar_url: player.avatar_url,
  })), [orderedPlayers.map((player: any) => `${player.id}:${player.avatar_url || ''}`).join('|')]);

  const focusedPlayer = orderedPlayers[sequenceIndex] || null;
  const focusedPlayerId = String(focusedPlayer?.id || '');
  const focusedNickname = String(focusedPlayer?.nickname || 'Jogador');
  const focusedAvatarUrl = String(focusedPlayer?.avatar_url || '');
  const totalPlayers = orderedPlayers.length || 1;
  const isVideoPhase = sequencePhase === 'video';

  const advanceToPlaying = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    await supabaseGame.from('rooms').update({
      status: 'PLAYING',
      turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
    }).eq('id', room.id).eq('status', 'STARTING');
  }, [room.id, room.vote_time_seconds]);

  useEffect(() => {
    setSequenceIndex(0);
    setSequencePhase('before');
    setCurrentVideoSrc('');
    setVideoStatus('Preparando apresentação...');
    advancingRef.current = false;
    videoCacheRef.current.clear();
  }, [room.id]);

  useEffect(() => {
    if (orderedPlayers.length === 0) {
      void advanceToPlaying();
      return;
    }

    const safeIndex = Math.min(sequenceIndex, orderedPlayers.length - 1);
    if (safeIndex !== sequenceIndex) setSequenceIndex(safeIndex);
  }, [advanceToPlaying, orderedPlayers.length, sequenceIndex]);

  useEffect(() => {
    if (!focusedPlayerId) return;

    const playerSnapshot: SequencePlayer = {
      id: focusedPlayerId,
      nickname: focusedNickname,
      avatar_url: focusedAvatarUrl,
    };

    let cancelled = false;
    let timer: number | undefined;

    const moveNext = () => {
      if (cancelled) return;
      if (sequenceIndex >= orderedPlayers.length - 1) {
        void advanceToPlaying();
        return;
      }

      setSequenceIndex((current) => current + 1);
      setSequencePhase('before');
      setCurrentVideoSrc('');
      setVideoStatus('Preparando próximo jogador...');
    };

    if (sequencePhase === 'before') {
      setCurrentVideoSrc('');
      setVideoStatus(`${playerSnapshot.nickname} na imagem estática`);
      timer = window.setTimeout(() => {
        if (!cancelled) setSequencePhase('loading');
      }, STATIC_BEFORE_MS);
    }

    if (sequencePhase === 'loading') {
      setCurrentVideoSrc('');
      setVideoStatus(`Carregando vídeo de ${playerSnapshot.nickname}...`);
      resolveAndPreloadIntroVideo(playerSnapshot, videoCacheRef.current)
        .then((url) => {
          if (cancelled) return;
          setCurrentVideoSrc(url || '');
          setVideoStatus(url ? `${playerSnapshot.nickname} em vídeo` : `${playerSnapshot.nickname} sem vídeo, usando imagem`);
          setSequencePhase('video');
        })
        .catch(() => {
          if (cancelled) return;
          setCurrentVideoSrc('');
          setVideoStatus(`${playerSnapshot.nickname} sem vídeo, usando imagem`);
          setSequencePhase('video');
        });
    }

    if (sequencePhase === 'video') {
      timer = window.setTimeout(() => {
        if (!cancelled) setSequencePhase('after');
      }, VIDEO_MS);
    }

    if (sequencePhase === 'after') {
      setVideoStatus(`${playerSnapshot.nickname} voltou para imagem estática`);
      timer = window.setTimeout(moveNext, STATIC_AFTER_MS);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [advanceToPlaying, focusedAvatarUrl, focusedNickname, focusedPlayerId, orderedPlayers.length, sequenceIndex, sequencePhase]);

  const gridColumns = useMemo(() => {
    if (orderedPlayers.length <= 4) return 'md:grid-cols-2';
    return 'md:grid-cols-3';
  }, [orderedPlayers.length]);

  const statusText = focusedPlayer
    ? `Jogador ${sequenceIndex + 1}/${totalPlayers} — ${videoStatus || 'apresentando'}`
    : 'Preparando jogadores...';

  return (
    <div className="flex flex-col items-center justify-start md:justify-center min-h-[100dvh] p-3 py-4 md:p-6 bg-[#f5f6ff] font-sans text-indigo-950 party-grid-bg relative overflow-y-auto overflow-x-hidden">
      <AvatarModelPreloader players={stablePreloadPlayers} eventType="intro" />
      <div className="max-w-6xl w-full text-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sequenceIndex}-${sequencePhase}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto mb-4 inline-flex rounded-full border-2 border-indigo-100 bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-indigo-500 shadow-sm"
          >
            {statusText}
          </motion.div>
        </AnimatePresence>

        <h1 className="text-3xl md:text-5xl font-black text-indigo-950 mb-2 font-display">
          A Partida vai Começar!
        </h1>
        <p className="text-xs md:text-sm text-indigo-600 font-bold uppercase tracking-wider mb-5 animate-pulse">
          Imagem estática → vídeo de 6s → imagem estática. Passando jogador por jogador.
        </p>

        <div className={cn('grid grid-cols-1 gap-4 md:gap-5', gridColumns)}>
          {orderedPlayers.map((p, index) => {
            const isFocused = index === sequenceIndex;
            const showVideo = isFocused && isVideoPhase && Boolean(currentVideoSrc);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: isFocused ? 1 : 0.72, scale: isFocused ? 1.04 : 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.08, 0.4), type: 'spring', stiffness: 260, damping: 24 }}
                className={cn(
                  'relative overflow-hidden rounded-3xl border-4 bg-white p-3 text-left shadow-xl transition-all',
                  isFocused ? cn(p.color?.border || 'border-indigo-400', 'ring-4 ring-amber-200 order-first md:order-none') : 'border-indigo-100',
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-2', p.color?.bg || 'bg-indigo-400')} />

                <div className="mb-3 flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 text-lg font-black text-amber-500">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('truncate text-lg font-black font-display', p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {isFocused ? phaseLabel(sequencePhase, currentVideoSrc) : 'Aguardando destaque'}
                      </p>
                    </div>
                  </div>
                  <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('h-14 w-14 shrink-0 rounded-2xl border-2 shadow-sm', p.color?.border || 'border-indigo-200', p.color?.lightBgc || 'bg-slate-50')} />
                </div>

                {showVideo ? (
                  <IntroVideoPlayer src={currentVideoSrc} player={p} />
                ) : (
                  <StaticIntroPanel player={p} isFocused={isFocused} phase={sequencePhase} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StaticIntroPanel({ player, isFocused, phase }: { player: any; isFocused: boolean; phase: SequencePhase }) {
  const label = !isFocused
    ? 'Aguardando destaque'
    : phase === 'loading'
      ? 'Carregando vídeo...'
      : phase === 'after'
        ? 'Imagem estática final'
        : 'Imagem estática';

  return (
    <div className="relative flex h-[220px] md:h-[260px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-indigo-100 bg-white">
      <motion.div
        animate={isFocused ? { scale: [1, 1.04, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
        transition={{ duration: 1.1, repeat: isFocused && phase === 'loading' ? Infinity : 0, ease: 'easeInOut' }}
      >
        <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} primaryColor={player.color?.hex} className="h-32 w-32 rounded-[2rem] border-4 border-white bg-white shadow-lg" />
      </motion.div>
      {isFocused && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-left shadow-sm backdrop-blur">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">{label}</p>
          <p className="truncate text-xs font-black text-indigo-950">{player.nickname}</p>
        </div>
      )}
    </div>
  );
}

function IntroVideoPlayer({ src, player }: { src: string; player: any }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  const forceMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
  };

  const markReady = () => {
    forceMuted();
    setReady(true);
    videoRef.current?.play?.().catch(() => null);
  };

  useEffect(() => {
    forceMuted();
    const timer = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(timer);
  }, [src]);

  return (
    <div className="relative flex h-[220px] md:h-[260px] items-center justify-center overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-inner">
      <div className="relative flex h-full max-h-[260px] aspect-[2/3] items-center justify-center overflow-hidden rounded-2xl bg-white">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          onLoadedMetadata={markReady}
          onVolumeChange={forceMuted}
          onPlay={forceMuted}
          onLoadedData={markReady}
          onCanPlay={markReady}
          className="h-full w-full bg-white object-contain"
        />
      </div>

      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70">
          <div className="rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3 text-xs font-black uppercase text-indigo-500 shadow-sm">
            Carregando vídeo...
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-left shadow-sm backdrop-blur">
        <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">Vídeo de entrada</p>
        <p className="truncate text-xs font-black text-indigo-950">{player.nickname}</p>
      </div>
    </div>
  );
}

async function resolveAndPreloadIntroVideo(player: SequencePlayer, cache: Map<string, string>) {
  const avatarUrl = String(player?.avatar_url || '').trim();
  if (!avatarUrl) return '';

  const cacheKey = `${player.id}:${avatarUrl}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const response = await fetch(`/api/avatar-animation-video?avatarUrl=${encodeURIComponent(avatarUrl)}&eventType=intro`, { cache: 'no-store' });
  const result = await response.json().catch(() => null);
  const url = result?.available ? String(result.videoUrl || result.url || '') : '';

  if (!url) {
    cache.set(cacheKey, '');
    return '';
  }

  await preloadVideoFile(url, VIDEO_LOAD_TIMEOUT_MS);
  cache.set(cacheKey, url);
  return url;
}

async function preloadVideoFile(src: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(src, { cache: 'force-cache', signal: controller.signal });
    if (response.ok) await response.arrayBuffer();
  } catch {
    // Se o navegador nao conseguir pré-carregar, ainda tentamos tocar o vídeo no elemento <video>.
  } finally {
    window.clearTimeout(timeout);
  }
}

function phaseLabel(phase: SequencePhase, currentVideoSrc: string) {
  if (phase === 'before') return 'Imagem estática';
  if (phase === 'loading') return 'Carregando vídeo';
  if (phase === 'video') return currentVideoSrc ? 'Vídeo de 6 segundos' : 'Imagem estática';
  return 'Imagem estática final';
}
