'use client';

import { useEffect } from 'react';

type AvatarModelPreloaderProps = {
  players: any[];
  max?: number;
};

const loadedUrls = new Set<string>();

export default function AvatarModelPreloader({ players, max = 12 }: AvatarModelPreloaderProps) {
  useEffect(() => {
    let cancelled = false;
    const controllers: AbortController[] = [];
    const avatarUrls = players
      .map((player) => String(player?.avatar_url || '').trim())
      .filter((url) => url && !url.startsWith('avatar:'))
      .slice(0, max);

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
        if (!url || cancelled || loadedUrls.has(url)) return;

        loadedUrls.add(url);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      } catch {
        return;
      }
    };

    avatarUrls.forEach((avatarUrl, index) => {
      window.setTimeout(() => {
        if (!cancelled) void loadOne(avatarUrl);
      }, index * 350);
    });

    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
    };
  }, [players, max]);

  return null;
}
