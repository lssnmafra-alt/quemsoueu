'use client';

import { useEffect } from 'react';

type AvatarModelPreloaderProps = {
  players: any[];
  max?: number;
  onProgress?: (progress: { total: number; done: number; loaded: number; unavailable: number; failed: number }) => void;
  onDone?: () => void;
};

const loadedUrls = new Set<string>();

export default function AvatarModelPreloader({ players, max = 12, onProgress, onDone }: AvatarModelPreloaderProps) {
  useEffect(() => {
    let cancelled = false;
    const controllers: AbortController[] = [];
    const avatarUrls = [...new Set(players
      .map((player) => String(player?.avatar_url || '').trim())
      .filter((url) => url && !url.startsWith('avatar:')))]
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

    const loadOne = async (avatarUrl: string) => {
      const controller = new AbortController();
      controllers.push(controller);

      try {
        const response = await fetch(`/api/avatar-animation-model?avatarUrl=${encodeURIComponent(avatarUrl)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const model = await response.json().catch(() => null);
        const url = String(model?.url || model?.proxyUrl || '');

        if (!url || !model?.available) {
          progress.unavailable += 1;
          return;
        }

        if (!loadedUrls.has(url)) {
          const modelResponse = await fetch(url, {
            cache: 'force-cache',
            signal: controller.signal,
          });
          if (!modelResponse.ok) throw new Error(`GLB ${modelResponse.status}`);
          await modelResponse.arrayBuffer();
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
  }, [players, max, onProgress, onDone]);

  return null;
}
