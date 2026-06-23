'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type SyncedCountdownOptions = {
  expiresAt?: string | null;
  fallbackSeconds: number;
  maxSeconds: number;
  enabled?: boolean;
  phaseKey?: string;
  tickMs?: number;
};

function safeSeconds(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function secondsUntil(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return null;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function useSyncedCountdown({
  expiresAt,
  fallbackSeconds,
  maxSeconds,
  enabled = true,
  phaseKey = '',
  tickMs = 250,
}: SyncedCountdownOptions) {
  const safeFallback = safeSeconds(fallbackSeconds, 0);
  const safeMax = Math.max(0, safeSeconds(maxSeconds, safeFallback));
  const initialSeconds = Math.min(secondsUntil(expiresAt) ?? safeFallback, safeMax);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const anchorRef = useRef({ key: '', startedAt: 0, startSeconds: initialSeconds });

  const key = useMemo(() => `${phaseKey}|${expiresAt || 'no-expiry'}|${safeFallback}|${safeMax}`, [expiresAt, phaseKey, safeFallback, safeMax]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(0);
      return;
    }

    const serverSeconds = Math.min(secondsUntil(expiresAt) ?? safeFallback, safeMax);
    anchorRef.current = {
      key,
      startedAt: Date.now(),
      startSeconds: serverSeconds,
    };
    setSecondsLeft(serverSeconds);

    const tick = () => {
      const anchor = anchorRef.current;
      const elapsedSeconds = Math.floor((Date.now() - anchor.startedAt) / 1000);
      const localSeconds = Math.max(0, anchor.startSeconds - elapsedSeconds);
      const authoritativeSeconds = secondsUntil(expiresAt);

      if (authoritativeSeconds === 0) {
        setSecondsLeft(0);
        return;
      }

      const cappedAuthoritative = authoritativeSeconds === null ? safeMax : Math.min(authoritativeSeconds, safeMax);
      const nextSeconds = Math.min(localSeconds, cappedAuthoritative);
      setSecondsLeft((current) => (current === nextSeconds ? current : nextSeconds));
    };

    tick();
    const timer = window.setInterval(tick, tickMs);
    return () => window.clearInterval(timer);
  }, [enabled, expiresAt, key, safeFallback, safeMax, tickMs]);

  return {
    secondsLeft,
    formattedTime: formatCountdown(secondsLeft),
    isExpired: secondsLeft <= 0,
  };
}

export { formatCountdown };
