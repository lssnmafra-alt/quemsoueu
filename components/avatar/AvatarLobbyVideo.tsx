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

function WhiteKeyVideo({ src, label, onError }: { src: string; label: string; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrame = 0;
    let stopped = false;

    const render = () => {
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
          const data = frame.data;

          for (let index = 0; index < data.length; index += 4) {
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const brightness = (red + green + blue) / 3;
            const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

            if (brightness > 226 && spread < 32) {
              data[index + 3] = 0;
            } else if (brightness > 204 && spread < 42) {
              data[index + 3] = Math.max(0, Math.min(255, Math.round((226 - brightness) * 12)));
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch {
          onError();
          return;
        }
      }

      animationFrame = requestAnimationFrame(render);
    };

    const start = () => {
      video.play().catch(() => {});
      render();
    };

    video.addEventListener('loadeddata', start);
    video.addEventListener('play', render);
    video.addEventListener('error', onError);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      video.removeEventListener('loadeddata', start);
      video.removeEventListener('play', render);
      video.removeEventListener('error', onError);
    };
  }, [src, onError]);

  return (
    <>
      <video ref={videoRef} src={src} autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous" className="hidden" aria-hidden="true" />
      <canvas ref={canvasRef} aria-label={label} className="relative z-10 h-full w-full scale-[1.08] object-cover" />
    </>
  );
}

export default function AvatarLobbyVideo({ avatarUrl = '', directVideoUrl = '', eventType, label = 'Avatar', className }: AvatarLobbyVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsHome(window.location.pathname === '/');
  }, []);

  const resolvedEventType: AvatarVideoEventType = eventType || (isHome ? 'home' : 'lobby');
  const useWhiteKey = mounted && resolvedEventType === 'home';
  const imageFallback = useMemo(() => resolveAvatarImageUrl(avatarUrl), [avatarUrl]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    setFailed(false);
    setVideoUrl('');

    if (directVideoUrl && (!useWhiteKey || directVideoUrl.startsWith('/api/'))) {
      setVideoUrl(directVideoUrl);
      return;
    }

    if (!avatarUrl) return;

    async function loadVideo() {
      try {
        const response = await fetch(`/api/avatar-animation-video?eventType=${encodeURIComponent(resolvedEventType)}&avatarUrl=${encodeURIComponent(avatarUrl)}`, { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!cancelled && result?.available && result?.videoUrl) setVideoUrl(result.videoUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void loadVideo();
    return () => { cancelled = true; };
  }, [avatarUrl, directVideoUrl, mounted, resolvedEventType, useWhiteKey]);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', useWhiteKey ? 'bg-transparent' : 'bg-white', className)}>
      {!useWhiteKey && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,1)_0%,rgba(255,255,255,.96)_55%,rgba(226,246,255,.9)_100%)]" />}
      {mounted && videoUrl && !failed ? (
        useWhiteKey ? (
          <WhiteKeyVideo src={videoUrl} label={label} onError={() => setFailed(true)} />
        ) : (
          <video
            key={videoUrl}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setFailed(true)}
            className="relative z-10 h-full w-full scale-[1.08] object-cover mix-blend-normal"
            aria-label={label}
          />
        )
      ) : imageFallback ? (
        <img src={imageFallback} alt={label} referrerPolicy="no-referrer" className="relative z-10 h-full w-full object-cover" />
      ) : (
        <UserRound className="relative z-10 h-20 w-20 text-indigo-400" />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/70" />
    </div>
  );
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
