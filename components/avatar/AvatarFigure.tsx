'use client';

import { cn } from '@/lib/utils';
import {
  AvatarSelection,
  AvatarState,
  selectionFromAvatarUrl,
} from '@/lib/avatars';

type AvatarFigureProps = {
  avatarUrl?: string | null;
  selection?: Partial<AvatarSelection> | null;
  state?: AvatarState;
  label?: string;
  className?: string;
  imageClassName?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

export default function AvatarFigure({ avatarUrl, label, className, imageClassName }: AvatarFigureProps) {
  const selected = selectionFromAvatarUrl(avatarUrl);
  const source = selected?.imageUrl || (avatarUrl && !avatarUrl.startsWith('avatar:') ? safePublicUrl(avatarUrl) : '');

  if (!source) {
    const fallback = String(label || 'Jogador').trim().charAt(0).toUpperCase() || 'J';
    return (
      <div className={cn('relative flex items-center justify-center overflow-hidden rounded-xl bg-white text-lg font-black text-indigo-900 border border-slate-200', className)}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200', className)}>
      <img
        src={source}
        alt={label || selected?.displayName || 'Avatar'}
        referrerPolicy="no-referrer"
        className={cn('w-full h-full object-cover', imageClassName)}
      />
    </div>
  );
}

function safePublicUrl(url: string) {
  try {
    if (url.startsWith('/')) return url;
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((part) => encodeURIComponent(decodeURIComponent(part)))
      .join('/');
    return parsed.toString();
  } catch {
    return '';
  }
}
