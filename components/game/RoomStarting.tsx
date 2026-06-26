import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarModelPreloader from '@/components/avatar/AvatarModelPreloader';

const ARENA_LOADING_MS = 2200;
const ARENA_SHOWCASE_MS = 7600;
const INTRO_VIDEO_LOOKUP_TIMEOUT_MS = 1500;
const INTRO_VIDEO_CACHE_PREFIX = 'quemSouEu:introVideo:';

type ArenaPhase = 'loading' | 'showcase';

type SequencePlayer = {
  id: string;
  nickname: string;
  avatar_url: string;
};

export default function RoomStarting({ room, players }: any) {
  const [arenaPhase, setArenaPhase] = useState<ArenaPhase>('loading');
  const [videoByPlayerId, setVideoByPlayerId] = useState<Record<string, string>>({});
  const advancingRef = useRef(false);

  const orderedPlayers = useMemo(() => {
    const activePlayers = players.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0);
    const visiblePlayers = activePlayers.length > 0 ? activePlayers : players.filter((p: any) => !p.is_eliminated);
    return [...visiblePlayers].sort((a, b) => (a.play_order || 0) - (b.play_order || 0));
  }, [players]);

  const orderedPlayersKey = useMemo(() => orderedPlayers.map((player: any) => `${player.id}:${player.play_order ?? ''}:${player.avatar_url || ''}`).join('|'), [orderedPlayers]);

  const stablePreloadPlayers = useMemo(() => orderedPlayers.map((player: any) => ({
    id: player.id,
    avatar_url: player.avatar_url,
  })), [orderedPlayersKey]);

  const advanceToPlaying = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    await supabaseGame.from('rooms').update({
      status: 'PLAYING',
      turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
    }).eq('id', room.id).eq('status', 'STARTING');
  }, [room.id, room.vote_time_seconds]);

  useEffect(() => {
    setArenaPhase('loading');
    setVideoByPlayerId({});
    advancingRef.current = false;
  }, [room.id]);

  useEffect(() => {
    if (orderedPlayers.length === 0) {
      void advanceToPlaying();
      return;
    }

    let cancelled = false;
    const memoryCache = new Map<string, string>();
    const playerSnapshot = orderedPlayers.map((player: any) => ({ ...player }));

    const primeCachedVideos = () => {
      const cachedVideos: Record<string, string> = {};
      playerSnapshot.forEach((player: any) => {
        const cached = getCachedIntroVideo(String(player.avatar_url || ''));
        if (cached) cachedVideos[player.id] = cached;
      });
      if (Object.keys(cachedVideos).length) setVideoByPlayerId(cachedVideos);
    };

    async function loadAllVideos() {
      const queue = [...playerSnapshot];
      const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length > 0 && !cancelled) {
          const player = queue.shift();
          if (!player) continue;
          const videoUrl = await resolveIntroVideo({
            id: String(player.id || ''),
            nickname: String(player.nickname || 'Jogador'),
            avatar_url: String(player.avatar_url || ''),
          }, memoryCache);
          if (!cancelled && videoUrl) {
            setVideoByPlayerId((current) => current[player.id] === videoUrl ? current : { ...current, [player.id]: videoUrl });
          }
        }
      });
      await Promise.allSettled(workers);
    }

    primeCachedVideos();
    void loadAllVideos();
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setArenaPhase('showcase');
    }, ARENA_LOADING_MS);
    const playTimer = window.setTimeout(() => {
      if (!cancelled) void advanceToPlaying();
    }, ARENA_LOADING_MS + ARENA_SHOWCASE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
      window.clearTimeout(playTimer);
    };
  }, [advanceToPlaying, orderedPlayersKey]);

  const gridColumns = useMemo(() => {
    if (orderedPlayers.length <= 4) return 'grid-cols-2 md:grid-cols-4';
    if (orderedPlayers.length <= 6) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
    return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6';
  }, [orderedPlayers.length]);

  const statusText = arenaPhase === 'loading'
    ? 'Aquecendo entradas, aguarde...'
    : 'Entrando na arena. Todos juntos.';

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <AvatarModelPreloader players={stablePreloadPlayers} eventType="intro" />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col px-4 py-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Preparando partida</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Arena carregando</h1>
            <p className="mt-2 text-sm font-bold text-blue-100">Todos os personagens entram juntos. Nada de lista um por um.</p>
          </div>
          <div className="rounded-2xl border-2 border-cyan-200/30 bg-white/10 px-5 py-3 text-center shadow-xl backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Status</p>
            <p className="text-lg font-black uppercase text-yellow-200">{statusText}</p>
          </div>
        </motion.div>

        <div className="mb-5 rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-cyan-200/20 pb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Galeria da ordem</p>
              <h2 className="text-2xl font-black uppercase italic text-white">{orderedPlayers.length} jogadores prontos</h2>
            </div>
            <span className="rounded-md border border-yellow-300/60 bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase text-slate-950">Entradas animadas</span>
          </div>

          <div className={cn('mt-4 grid gap-4', gridColumns)}>
            {orderedPlayers.map((player: any, index: number) => {
              const videoUrl = videoByPlayerId[player.id] || '';
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 18, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: arenaPhase === 'showcase' ? 1 : 0.98 }}
                  transition={{ delay: Math.min(index * 0.08, 0.5), type: 'spring', stiffness: 240, damping: 24 }}
                  className={cn('relative overflow-hidden rounded-[2rem] border-4 bg-white p-2 text-center shadow-2xl', player.color?.border || 'border-cyan-200/40')}
                >
                  <div className={cn('absolute inset-x-0 top-0 h-2', player.color?.bg || 'bg-cyan-400')} />
                  <div className="relative overflow-hidden rounded-[1.55rem] bg-white">
                    {arenaPhase === 'showcase' && videoUrl ? (
                      <ArenaIntroVideo src={videoUrl} label={player.nickname} avatarUrl={player.avatar_url} primaryColor={player.color?.hex} />
                    ) : (
                      <div className="flex aspect-[3/4] w-full items-center justify-center bg-white">
                        <motion.div animate={arenaPhase === 'loading' ? { scale: [1, 1.04, 1], y: [0, -4, 0] } : { scale: 1 }} transition={{ duration: 1.2, repeat: arenaPhase === 'loading' ? Infinity : 0, ease: 'easeInOut' }}>
                          <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} primaryColor={player.color?.hex} className="h-28 w-28 rounded-[2rem] border-4 border-white bg-white shadow-xl" />
                        </motion.div>
                      </div>
                    )}
                    {arenaPhase === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                        <div className="rounded-2xl border border-indigo-100 bg-white/90 px-3 py-2 text-[10px] font-black uppercase text-indigo-500 shadow-sm">Preparando...</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-2xl bg-[#071a64] px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black uppercase text-white">{player.nickname}</p>
                      <span className="rounded-lg bg-yellow-300 px-2 py-1 text-[10px] font-black text-slate-950">#{index + 1}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wider text-cyan-200">{arenaPhase === 'loading' ? 'Preparando entrada' : videoUrl ? 'Entrada animada' : 'Personagem pronto'}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto inline-flex rounded-full border-2 border-yellow-300/50 bg-yellow-300 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-[0_6px_0_#b45309]">
          {arenaPhase === 'loading' ? 'Preparando entrada dos jogadores...' : 'Entrando no jogo...'}
        </div>
      </div>
    </div>
  );
}

function ArenaIntroVideo({ src, label, avatarUrl, primaryColor }: { src: string; label: string; avatarUrl: string; primaryColor?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setReady(false);
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    const timers = [0, 80, 220, 520, 900].map((delay) => window.setTimeout(() => video.play?.().catch(() => null), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [src]);

  return (
    <div className="relative aspect-[3/4] w-full bg-white">
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <AvatarFigure avatarUrl={avatarUrl} label={label} primaryColor={primaryColor} className="h-32 w-32 rounded-[2rem] border-4 border-white bg-white shadow-xl" />
        </div>
      )}
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
        onCanPlay={() => setReady(true)}
        onPlaying={() => setReady(true)}
        className={cn('h-full w-full bg-white object-cover transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
        aria-label={label}
      />
    </div>
  );
}

async function resolveIntroVideo(player: SequencePlayer, cache: Map<string, string>) {
  const avatarUrl = String(player?.avatar_url || '').trim();
  if (!avatarUrl) return '';

  const cacheKey = `${player.id}:${avatarUrl}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const browserCached = getCachedIntroVideo(avatarUrl);
  if (browserCached) {
    cache.set(cacheKey, browserCached);
    return browserCached;
  }

  const result = await fetchJsonWithTimeout(
    `/api/avatar-animation-video?avatarUrl=${encodeURIComponent(avatarUrl)}&eventType=intro`,
    INTRO_VIDEO_LOOKUP_TIMEOUT_MS,
  );
  const url = result?.available ? String(result.videoUrl || result.url || '') : '';
  if (url) setCachedIntroVideo(avatarUrl, url);

  cache.set(cacheKey, url);
  return url;
}

function getCachedIntroVideo(avatarUrl: string) {
  if (typeof window === 'undefined' || !avatarUrl) return '';
  try {
    return sessionStorage.getItem(`${INTRO_VIDEO_CACHE_PREFIX}${avatarUrl}`) || localStorage.getItem(`${INTRO_VIDEO_CACHE_PREFIX}${avatarUrl}`) || '';
  } catch {
    return '';
  }
}

function setCachedIntroVideo(avatarUrl: string, url: string) {
  if (typeof window === 'undefined' || !avatarUrl || !url) return;
  try {
    sessionStorage.setItem(`${INTRO_VIDEO_CACHE_PREFIX}${avatarUrl}`, url);
    localStorage.setItem(`${INTRO_VIDEO_CACHE_PREFIX}${avatarUrl}`, url);
  } catch {}
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'force-cache', signal: controller.signal });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
