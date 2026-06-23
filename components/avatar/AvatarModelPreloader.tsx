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

    const resolveAnimationUrl = async (avatarUrl: string, controller: AbortController) => {
      const videoResponse = await fetch(`/api/avatar-animation-video?avatarUrl=${encodeURIComponent(avatarUrl)}&eventType=${eventType}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const video = await videoResponse.json().catch(() => null);
      if (video?.available && (video.videoUrl || video.url)) return String(video.videoUrl || video.url);
      return '';
    };

    const loadOne = async (avatarUrl: string) => {
      const controller = new AbortController();
      controllers.push(controller);

      try {
        const url = await resolveAnimationUrl(avatarUrl, controller);
        if (!url || cancelled) {
          progress.unavailable += 1;
          return;
        }

        if (!loadedUrls.has(url)) {
          const mediaResponse = await fetch(url, {
            cache: 'force-cache',
            signal: controller.signal,
          });
          if (!mediaResponse.ok) throw new Error(`Animacao ${mediaResponse.status}`);
          await mediaResponse.arrayBuffer();
          loadedUrls.add(url);
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
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
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
