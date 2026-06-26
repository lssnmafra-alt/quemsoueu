'use client';

import { useEffect } from 'react';

type AvatarModelPreloaderProps = {
  players: any[];
  max?: number;
  eventType?: 'intro' | 'victory' | 'defeat';
  onProgress?: (progress: { total: number; done: number; loaded: number; unavailable: number; failed: number }) => void;
  onDone?: () => void;
};

const loadedUrls = new Set<string>();
const resolvedUrlCache = new Map<string, string[]>();

export default function AvatarModelPreloader({ players, max = 12, eventType = 'intro', onProgress, onDone }: AvatarModelPreloaderProps) {
  useEffect(() => {
    let cancelled = false;
    const controllers: AbortController[] = [];
    const avatarUrls = [...new Set(players
      .map((player) => String(player?.avatar_url || '').trim())
      .filter(Boolean))]
      .slice(0, max);

    const total = avatarUrls.length;
    const progress = { total, done: 0, loaded: 0, unavailable: 0, failed: 0 };

    const emit = () => {
      if (!cancelled) onProgress?.({ ...progress });
    };

    if (total === 0) {
      emit();
      onDone?.();
      return () => { cancelled = true; };
    }

    emit();

    const resolveAnimationUrls = async (avatarUrl: string, controller: AbortController) => {
      const cacheKey = `${eventType}:${avatarUrl}`;
      if (resolvedUrlCache.has(cacheKey)) return resolvedUrlCache.get(cacheKey) || [];

      const videoResponse = await fetch(`/api/avatar-animation-video?avatarUrl=${encodeURIComponent(avatarUrl)}&eventType=${eventType}&v=central`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const video = await videoResponse.json().catch(() => null);
      const urls = [video?.videoUrl || video?.url, video?.fallbackUrl]
        .map((url) => String(url || '').trim())
        .filter(Boolean);
      resolvedUrlCache.set(cacheKey, urls);
      return urls;
    };

    const loadOne = async (avatarUrl: string) => {
      const controller = new AbortController();
      controllers.push(controller);

      try {
        const urls = await resolveAnimationUrls(avatarUrl, controller);
        if (!urls.length || cancelled) {
          progress.unavailable += 1;
          return;
        }

        for (const url of urls) {
          if (!loadedUrls.has(url)) {
            await warmVideoStart(url, controller);
            loadedUrls.add(url);
          }
        }

        progress.loaded += 1;
      } catch {
        progress.failed += 1;
      } finally {
        progress.done += 1;
        emit();
      }
    };

    const run = async () => {
      const queue = [...avatarUrls];
      const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
        while (queue.length > 0 && !cancelled) {
          const next = queue.shift();
          if (next) await loadOne(next);
        }
      });

      await Promise.all(workers);
      if (!cancelled) onDone?.();
    };

    void run();

    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
    };
  }, [players, max, eventType, onProgress, onDone]);

  return null;
}

async function warmVideoStart(url: string, controller: AbortController) {
  const response = await fetch(url, {
    cache: 'force-cache',
    signal: controller.signal,
    headers: { Range: 'bytes=0-65535' },
  }).catch(() => null);

  if (response?.ok || response?.status === 206) return;

  await new Promise<void>((resolve) => {
    const video = document.createElement('video');
    const done = () => resolve();
    const timeout = window.setTimeout(done, 1200);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      done();
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      done();
    };
    video.src = url;
  });
}
