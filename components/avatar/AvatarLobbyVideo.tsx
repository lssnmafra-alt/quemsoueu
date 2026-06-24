'use client';

import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvatarLobbyVideoProps = {
  avatarUrl?: string;
  directVideoUrl?: string;
  label?: string;
  className?: string;
};

export default function AvatarLobbyVideo({ avatarUrl = '', directVideoUrl = '', label = 'Avatar', className }: AvatarLobbyVideoProps) {
  const [videoUrl, setVideoUrl] = useState(directVideoUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVideoUrl(directVideoUrl);
    setFailed(false);

    if (directVideoUrl) return;
    if (!avatarUrl) return;

    async function loadVideo() {
      try {
        const response = await fetch(`/api/avatar-animation-video?eventType=intro&avatarUrl=${encodeURIComponent(avatarUrl)}`, { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!cancelled && result?.available && result?.videoUrl) setVideoUrl(result.videoUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void loadVideo();
    return () => { cancelled = true; };
  }, [avatarUrl, directVideoUrl]);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-white', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,1)_0%,rgba(255,255,255,.96)_55%,rgba(226,246,255,.9)_100%)]" />
      {videoUrl && !failed ? (
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
      ) : avatarUrl ? (
        <img src={avatarUrl} alt={label} referrerPolicy="no-referrer" className="relative z-10 h-full w-full object-cover" />
      ) : (
        <UserRound className="relative z-10 h-20 w-20 text-indigo-400" />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/70" />
    </div>
  );
}
