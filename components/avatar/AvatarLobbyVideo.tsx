'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvatarVideoEventType = 'home' | 'lobby' | 'intro' | 'victory' | 'defeat';

type AvatarLobbyVideoProps = {
  avatarUrl?: string;
  directVideoUrl?: string;
  eventType?: AvatarVideoEventType;
  label?: string;
  className?: string;
};

const resolvedVideoCache = new Map<string, string>();
const SESSION_CACHE_KEY = 'qse:avatar-video-cache:v7';

function readSessionCache() {
  if (typeof window === 'undefined') return {} as Record<string, string>;
  try { return JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || '{}') as Record<string, string>; }
  catch { return {}; }
}

function writeSessionCache(cache: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function isUsableVideoUrl(url: string) {
  const value = String(url || '').trim();
  return Boolean(value) && !/\.mp4(?:[?#]|$)/i.test(value);
}

function rememberVideo(cacheKey: string, url: string) {
  if (!isUsableVideoUrl(url)) return;
  resolvedVideoCache.set(cacheKey, url);
  const cache = readSessionCache();
  cache[cacheKey] = url;
  writeSessionCache(cache);
}

function cachedVideo(cacheKey: string) {
  const cached = resolvedVideoCache.get(cacheKey) || readSessionCache()[cacheKey] || '';
  return isUsableVideoUrl(cached) ? cached : '';
}

function FastAvatarVideo({ src, label, onReady, onError }: { src: string; label: string; onReady: () => void; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => video.play().catch(() => null);
    const timers = [0, 60, 160, 360, 800].map((delay) => window.setTimeout(play, delay));
    const loadTimer = window.setTimeout(() => {
      if (video.readyState < 2) onError();
    }, 2200);

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.preload = 'auto';
    video.load();
    play();

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(loadTimer);
    };
  }, [src, onError]);

  return (
    <video
      key={src}
      ref={videoRef}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      onLoadedMetadata={onReady}
      onLoadedData={onReady}
      onCanPlay={onReady}
      onPlaying={onReady}
      onError={onError}
      className="h-full w-full object-cover"
      aria-label={label}
    />
  );
}

export default function AvatarLobbyVideo({ avatarUrl = '', directVideoUrl = '', eventType, label = 'Avatar', className }: AvatarLobbyVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsHome(window.location.pathname === '/');
  }, []);

  const isHomeEvent = eventType === 'home' || (mounted && isHome && !eventType);
  const resolvedEventType: AvatarVideoEventType = isHomeEvent ? 'home' : eventType || 'lobby';
  const imageFallback = useMemo(() => resolveAvatarImageUrl(avatarUrl), [avatarUrl]);
  const canShowImageFallback = Boolean(imageFallback && !imageFailed);
  const shouldHideFallback = Boolean(mounted && videoUrl && !failed && videoReady);

  useEffect(() => {
    setImageFailed(false);
  }, [imageFallback]);

  useEffect(() => {
    if (!mounted || !videoUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = videoUrl;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [mounted, videoUrl]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    setFailed(false);
    setVideoReady(false);
    setVideoUrl('');

    if (directVideoUrl && isUsableVideoUrl(directVideoUrl)) {
      setVideoUrl(directVideoUrl);
      return;
    }

    if (!avatarUrl) return;

    async function loadVideo() {
      const eventTypes = getEventFallbacks(resolvedEventType);
      for (const nextEventType of eventTypes) {
        const cacheKey = `${nextEventType}:${avatarUrl}`;
        const cached = cachedVideo(cacheKey);
        if (cached) {
          if (!cancelled) setVideoUrl(cached);
          return;
        }

        try {
          const response = await fetch(`/api/avatar-animation-video?eventType=${encodeURIComponent(nextEventType)}&avatarUrl=${encodeURIComponent(avatarUrl)}&v=7`, { cache: 'no-store' });
          const result = await response.json().catch(() => ({}));
          const proxy = result?.available && result?.videoUrl ? String(result.videoUrl) : '';
          const fallback = result?.available && result?.fallbackUrl ? String(result.fallbackUrl) : '';
          const nextUrl = [proxy, fallback].find(isUsableVideoUrl) || '';
          if (nextUrl) {
            rememberVideo(cacheKey, nextUrl);
            if (!cancelled) setVideoUrl(nextUrl);
            return;
          }
        } catch {}
      }

      if (!cancelled) setFailed(true);
    }

    void loadVideo();
    return () => { cancelled = true; };
  }, [avatarUrl, directVideoUrl, mounted, resolvedEventType]);

  const fallbackContent = canShowImageFallback ? (
    <img
      src={imageFallback}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setImageFailed(true)}
      className={cn(
        'absolute inset-0 h-full w-full object-cover transition-opacity duration-100',
        shouldHideFallback ? 'opacity-0' : 'opacity-100',
      )}
      suppressHydrationWarning
    />
  ) : (
    <div className={cn('relative z-10 flex h-full w-full items-center justify-center transition-opacity duration-100', shouldHideFallback ? 'opacity-0' : 'opacity-100')}>
      <UserRound className="h-20 w-20 text-indigo-300" aria-label={label} />
    </div>
  );

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-transparent', className)} suppressHydrationWarning>
      {fallbackContent}
      {mounted && videoUrl && !failed && (
        <div className={cn('absolute inset-0 z-20 transition-opacity duration-75', videoReady ? 'opacity-100' : 'opacity-0')}>
          <FastAvatarVideo src={videoUrl} label={label} onReady={() => setVideoReady(true)} onError={() => setFailed(true)} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] ring-1 ring-inset ring-white/70" />
    </div>
  );
}

function getEventFallbacks(eventType: AvatarVideoEventType): AvatarVideoEventType[] {
  if (eventType === 'home') return ['home', 'lobby', 'intro'];
  if (eventType === 'lobby') return ['lobby', 'home', 'intro'];
  if (eventType === 'intro') return ['intro', 'lobby', 'home'];
  return [eventType];
}

function resolveAvatarImageUrl(avatarUrl: string) {
  if (!avatarUrl) return '';
  if (!avatarUrl.startsWith('avatar:')) return avatarUrl;
  try {
    const parsed = JSON.parse(decodeURIComponent(avatarUrl.slice(7)));
    return String(parsed.imageUrl || '').trim();
  } catch {
    return '';
  }
}
