'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseGame } from '@/lib/supabase';

type AvatarVideoEventType = 'home' | 'lobby' | 'intro' | 'victory' | 'defeat';
type ChromaKeyId = 'branco' | 'roxo' | 'verde' | 'azul' | 'vermelho';

type AvatarLobbyVideoProps = {
  avatarUrl?: string;
  directVideoUrl?: string;
  eventType?: AvatarVideoEventType;
  label?: string;
  className?: string;
};

const CHROMA_KEYS: Record<ChromaKeyId, { rgb: [number, number, number]; tolerance: number; spill: number }> = {
  branco: { rgb: [255, 255, 255], tolerance: 54, spill: 42 },
  roxo: { rgb: [124, 58, 237], tolerance: 78, spill: 44 },
  verde: { rgb: [0, 255, 0], tolerance: 92, spill: 48 },
  azul: { rgb: [0, 107, 255], tolerance: 86, spill: 46 },
  vermelho: { rgb: [255, 0, 51], tolerance: 86, spill: 46 },
};

const resolvedVideoCache = new Map<string, string>();

function colorDistance(red: number, green: number, blue: number, target: [number, number, number]) {
  const dr = red - target[0];
  const dg = green - target[1];
  const db = blue - target[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isChromaPixel(red: number, green: number, blue: number, chromaKeyId: ChromaKeyId) {
  const key = CHROMA_KEYS[chromaKeyId] || CHROMA_KEYS.branco;

  if (chromaKeyId === 'branco') {
    const brightness = (red + green + blue) / 3;
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    const almostWhite = brightness > 218 && spread < 46;
    const paleStudio = red > 198 && green > 206 && blue > 210 && spread < 58;
    return almostWhite || paleStudio || colorDistance(red, green, blue, key.rgb) <= key.tolerance;
  }

  return colorDistance(red, green, blue, key.rgb) <= key.tolerance;
}

function isNearChromaPixel(red: number, green: number, blue: number, chromaKeyId: ChromaKeyId) {
  const key = CHROMA_KEYS[chromaKeyId] || CHROMA_KEYS.branco;
  if (chromaKeyId === 'branco') {
    const brightness = (red + green + blue) / 3;
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    return brightness > 204 && spread < 68;
  }

  return colorDistance(red, green, blue, key.rgb) <= key.tolerance + key.spill;
}

function removeConnectedBackground(frame: ImageData, chromaKeyId: ChromaKeyId) {
  const { width, height, data } = frame;
  if (!width || !height) return;

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    const index = pixel * 4;
    if (!isChromaPixel(data[index], data[index + 1], data[index + 2], chromaKeyId)) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let pixel = 0; pixel < total; pixel += 1) {
    if (!visited[pixel]) continue;
    const index = pixel * 4;
    data[index + 3] = 0;
  }

  for (let pixel = 0; pixel < total; pixel += 1) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const index = pixel * 4;
    if (data[index + 3] === 0) continue;

    const touchesRemoved = (
      (x > 0 && visited[pixel - 1]) ||
      (x < width - 1 && visited[pixel + 1]) ||
      (y > 0 && visited[pixel - width]) ||
      (y < height - 1 && visited[pixel + width])
    );

    if (touchesRemoved && isNearChromaPixel(data[index], data[index + 1], data[index + 2], chromaKeyId)) {
      data[index + 3] = Math.min(data[index + 3], 55);
    }
  }
}

function KeyedVideo({ src, label, chromaKeyId, onError, onReady }: { src: string; label: string; chromaKeyId: ChromaKeyId; onError: () => void; onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrame = 0;
    let stopped = false;
    let firstFrameRendered = false;

    const paint = () => {
      if (stopped) return;

      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          removeConnectedBackground(frame, chromaKeyId);
          ctx.putImageData(frame, 0, 0);
          if (!firstFrameRendered) {
            firstFrameRendered = true;
            readyRef.current = true;
            onReady();
          }
        } catch {
          onError();
          return;
        }
      }

      animationFrame = requestAnimationFrame(paint);
    };

    const start = () => {
      video.play().catch(() => null);
      paint();
    };

    const timers = [0, 120, 360, 800, 1400].map((delay) => window.setTimeout(start, delay));
    video.addEventListener('loadedmetadata', start);
    video.addEventListener('loadeddata', start);
    video.addEventListener('canplay', start);
    video.addEventListener('playing', start);
    video.addEventListener('error', onError);
    video.load();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      video.removeEventListener('loadedmetadata', start);
      video.removeEventListener('loadeddata', start);
      video.removeEventListener('canplay', start);
      video.removeEventListener('playing', start);
      video.removeEventListener('error', onError);
    };
  }, [src, chromaKeyId, onError, onReady]);

  return (
    <>
      <video ref={videoRef} src={src} autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous" className="pointer-events-none absolute h-px w-px opacity-0" aria-hidden="true" />
      <canvas ref={canvasRef} aria-label={label} className="relative z-10 h-full w-full scale-[1.08] object-cover" />
    </>
  );
}

export default function AvatarLobbyVideo({ avatarUrl = '', directVideoUrl = '', eventType, label = 'Avatar', className }: AvatarLobbyVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [chromaKeyId, setChromaKeyId] = useState<ChromaKeyId>('branco');

  useEffect(() => {
    setMounted(true);
    setIsHome(window.location.pathname === '/');
  }, []);

  const isHomeEvent = eventType === 'home' || (mounted && isHome && !eventType);
  const resolvedEventType: AvatarVideoEventType = isHomeEvent ? 'home' : eventType || 'lobby';
  const imageFallback = useMemo(() => resolveAvatarImageUrl(avatarUrl), [avatarUrl]);
  const avatarKey = useMemo(() => resolveAvatarKey(avatarUrl), [avatarUrl]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setChromaKeyId('branco');

    async function loadChromaKey() {
      if (!avatarKey) return;
      const { data } = await supabaseGame
        .from('avatar_chroma_keys')
        .select('chroma_key_id')
        .eq('avatar_key', avatarKey)
        .maybeSingle();

      const nextKey = String(data?.chroma_key_id || 'branco') as ChromaKeyId;
      if (!cancelled && isChromaKeyId(nextKey)) setChromaKeyId(nextKey);
    }

    void loadChromaKey();
    return () => { cancelled = true; };
  }, [avatarKey, mounted]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    setFailed(false);
    setVideoReady(false);
    setVideoUrl('');

    if (directVideoUrl && directVideoUrl.startsWith('/api/')) {
      setVideoUrl(directVideoUrl);
      return;
    }

    if (!avatarUrl) return;

    async function loadVideo() {
      const eventTypes = getEventFallbacks(resolvedEventType);
      for (const nextEventType of eventTypes) {
        const cacheKey = `${nextEventType}:${avatarUrl}`;
        const cached = resolvedVideoCache.get(cacheKey);
        if (cached) {
          if (!cancelled) setVideoUrl(cached);
          return;
        }

        try {
          const response = await fetch(`/api/avatar-animation-video?eventType=${encodeURIComponent(nextEventType)}&avatarUrl=${encodeURIComponent(avatarUrl)}&v=2`, { cache: 'force-cache' });
          const result = await response.json().catch(() => ({}));
          const nextUrl = result?.available && result?.videoUrl ? String(result.videoUrl) : '';
          if (nextUrl) {
            resolvedVideoCache.set(cacheKey, nextUrl);
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

  const handleVideoError = useCallback(() => {
    setFailed(true);
    setVideoReady(false);
  }, []);

  const fallbackContent = imageFallback ? (
    <img src={imageFallback} alt={label} referrerPolicy="no-referrer" className="relative z-10 h-full w-full object-cover" suppressHydrationWarning />
  ) : (
    <UserRound className="relative z-10 h-20 w-20 text-indigo-400" />
  );

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-transparent', className)} suppressHydrationWarning>
      {fallbackContent}
      {mounted && videoUrl && !failed && (
        <div className={cn('absolute inset-0 z-20 transition-opacity duration-200', videoReady ? 'opacity-100' : 'opacity-0')}>
          <KeyedVideo src={videoUrl} label={label} chromaKeyId={chromaKeyId} onError={handleVideoError} onReady={() => setVideoReady(true)} />
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

function resolveAvatarKey(avatarUrl: string) {
  if (!avatarUrl) return '';

  if (avatarUrl.startsWith('avatar:')) {
    try {
      const parsed = JSON.parse(decodeURIComponent(avatarUrl.slice(7)));
      const animationSlug = String(parsed.animationSlug || '').split('/')[0].trim();
      if (animationSlug) return animationSlug;
      const avatarId = String(parsed.avatarId || '').split(':')[0].trim();
      if (avatarId) return avatarId;
      const imageKey = String(parsed.imageKey || '').split('/').pop()?.replace(/\.[^.]+$/, '').trim() || '';
      return imageKey;
    } catch {
      return '';
    }
  }

  try {
    const decoded = decodeURIComponent(avatarUrl);
    return decoded.split('/').pop()?.replace(/\.[^.]+$/, '').trim() || '';
  } catch {
    return avatarUrl.split('/').pop()?.replace(/\.[^.]+$/, '').trim() || '';
  }
}

function isChromaKeyId(value: string): value is ChromaKeyId {
  return value === 'branco' || value === 'roxo' || value === 'verde' || value === 'azul' || value === 'vermelho';
}
