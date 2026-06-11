'use client';

import { cn } from '@/lib/utils';
import {
  avatarToDataUri,
  AvatarSelection,
  AvatarState,
  DEFAULT_AVATAR_SELECTION,
  normalizeAvatarSelection,
  selectionFromAvatarUrl,
} from '@/lib/avatars';

type AvatarFigureProps = {
  avatarUrl?: string | null;
  selection?: Partial<AvatarSelection> | null;
  state?: AvatarState;
  label?: string;
  className?: string;
  imageClassName?: string;
};

export default function AvatarFigure({ avatarUrl, selection, state = 'idle', label, className, imageClassName }: AvatarFigureProps) {
  const selected = selectionFromAvatarUrl(avatarUrl) || normalizeAvatarSelection(selection || DEFAULT_AVATAR_SELECTION);
  const source = avatarUrl && !avatarUrl.startsWith('avatar:') ? avatarUrl : avatarToDataUri(selected, state);

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200', className)}>
      <img
        src={source}
        alt={label || 'Avatar'}
        referrerPolicy="no-referrer"
        className={cn('w-full h-full object-cover', imageClassName)}
      />
    </div>
  );
}
