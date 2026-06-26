'use client';

import { useEffect, useMemo, useState } from 'react';

type ChromaState = { available: boolean; hexColor: string; label: string; avatarKey: string };

export default function useAvatarChromaKey(avatarUrl: string) {
  const avatarKey = useMemo(() => resolveAvatarKey(avatarUrl), [avatarUrl]);
  const [state, setState] = useState<ChromaState>({ available: false, hexColor: '', label: '', avatarKey: '' });

  useEffect(() => {
    if (!avatarKey && !avatarUrl) {
      setState({ available: false, hexColor: '', label: '', avatarKey: '' });
      return;
    }
    let cancelled = false;
    fetch(`/api/avatar-chroma-key?avatarKey=${encodeURIComponent(avatarKey)}&avatarUrl=${encodeURIComponent(avatarUrl)}`, { cache: 'force-cache' })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        setState({ available: Boolean(result.available && result.hexColor), hexColor: String(result.hexColor || ''), label: String(result.label || ''), avatarKey: String(result.avatarKey || avatarKey) });
      })
      .catch(() => {
        if (!cancelled) setState({ available: false, hexColor: '', label: '', avatarKey });
      });
    return () => { cancelled = true; };
  }, [avatarKey, avatarUrl]);

  return state;
}

function resolveAvatarKey(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('avatar:')) {
    try {
      const parsed = JSON.parse(decodeURIComponent(value.slice(7)));
      return String(parsed.avatarKey || parsed.avatarId || parsed.displayName || parsed.animationSlug?.split('/')?.[0] || '').replace(/:\s*skin.*$/i, '').replace(/:skin.*$/i, '').trim();
    } catch { return ''; }
  }
  try {
    const decoded = decodeURIComponent(value);
    const part = decoded.split('/').pop() || '';
    return part.replace(/\.[^.]+$/, '').trim();
  } catch {
    return value.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  }
}
