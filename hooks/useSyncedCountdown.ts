'use client';

/* eslint-disable react-hooks/set-state-in-effect */

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
  tickMs = 1000,
}: SyncedCountdownOptions) {
  const safeFallback = safeSeconds(fallbackSeconds, 0);
  const safeMax = Math.max(0, safeSeconds(maxSeconds, safeFallback));
  const initialSeconds = Math.min(secondsUntil(expiresAt) ?? safeFallback, safeMax);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const expiresAtRef = useRef(expiresAt);

  const resetKey = useMemo(() => `${phaseKey}|${safeFallback}|${safeMax}`, [phaseKey, safeFallback, safeMax]);
  const safeTickMs = useMemo(() => {
    const parsed = Number(tickMs);
    if (!Number.isFinite(parsed)) return 1000;
    return Math.max(1000, Math.floor(parsed));
  }, [tickMs]);

  useEffect(() => {
    const serverSeconds = Math.min(secondsUntil(expiresAt) ?? safeFallback, safeMax);
    expiresAtRef.current = expiresAt;

    if (!enabled) return;

    setSecondsLeft((current) => {
      if (current <= 0 && serverSeconds > 0) return serverSeconds;
      if (serverSeconds > current + 1) return serverSeconds;
      return current;
    });
  }, [enabled, expiresAt, safeFallback, safeMax]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(Math.min(secondsUntil(expiresAtRef.current) ?? safeFallback, safeMax));

    const tick = () => setSecondsLeft((current) => {
      if (current <= 0) return 0;
      return current - 1;
    });

    const timer = window.setInterval(tick, safeTickMs);
    return () => window.clearInterval(timer);
  }, [enabled, resetKey, safeFallback, safeMax, safeTickMs]);

  return {
    secondsLeft,
    formattedTime: formatCountdown(secondsLeft),
    isExpired: secondsLeft <= 0,
  };
}

export { formatCountdown };
