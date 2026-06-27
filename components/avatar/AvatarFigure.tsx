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

export default function AvatarFigure({ avatarUrl, selection, label, className, imageClassName }: AvatarFigureProps) {
  const selected = selection || selectionFromAvatarUrl(avatarUrl);
  const source = selected?.imageUrl || (avatarUrl && !avatarUrl.startsWith('avatar:') ? safePublicUrl(avatarUrl) : '');

  if (!source) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-white to-indigo-100',
          className,
        )}
        aria-label={label || selected?.displayName || 'Jogador'}
        role="img"
      >
        <div className="absolute inset-x-[24%] bottom-[18%] h-[34%] rounded-t-full bg-indigo-300/80" />
        <div className="absolute left-1/2 top-[22%] h-[32%] w-[32%] -translate-x-1/2 rounded-full bg-indigo-500/80 shadow-inner" />
        <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/70" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200', className)}>
      <img
        src={safePublicUrl(source) || source}
        alt={label || selected?.displayName || 'Avatar'}
        referrerPolicy="no-referrer"
        className={cn('w-full h-full object-contain', imageClassName)}
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
