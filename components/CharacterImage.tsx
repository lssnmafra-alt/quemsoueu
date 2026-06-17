'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import type { AvatarConfig } from '@/lib/avatarConfig';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  name: string;
  imageUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  isOfficial?: boolean;
  alt?: string;
  placeholderClassName?: string;
};

export default function CharacterImage({
  name,
  imageUrl,
  avatarConfig,
  isOfficial = false,
  alt,
  className,
  placeholderClassName,
  onError,
  referrerPolicy = 'no-referrer',
  ...props
}: CharacterImageProps) {
  const sources = useMemo(() => {
    const savedImage = sanitizeImageUrl(imageUrl);
    return savedImage ? [savedImage] : [];
  }, [imageUrl]);

  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const src = sources.find((candidate) => !brokenUrls[candidate]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (src) {
      setBrokenUrls((current) => ({ ...current, [src]: true }));
    }

    onError?.(event);
  };

  if (!src) {
    if (!isOfficial) {
      return <AvatarRenderer config={avatarConfig} name={name} className={className} />;
    }

    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_34%),linear-gradient(135deg,_#020617,_#111827_52%,_#312e81)] flex items-center justify-center shadow-inner',
          className,
          placeholderClassName,
        )}
      >
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-x-3 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-center shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">
            <Sparkles className="h-3 w-3" /> Oficial
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-black uppercase leading-tight text-white">{name || 'Personagem'}</p>
        </div>
        <ImageIcon className="h-12 w-12 text-cyan-100/45" />
      </div>
    );
  }

  if (isOfficial) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 shadow-inner',
          className,
        )}
      >
        <img
          {...props}
          src={src}
          alt={alt ?? name}
          referrerPolicy={referrerPolicy}
          className="absolute inset-0 h-full w-full object-contain p-1"
          onError={handleError}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.10),rgba(2,6,23,0.10)_42%,rgba(2,6,23,0.72))]" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-950/55 px-3 py-2 text-center shadow-xl backdrop-blur-sm">
          <p className="line-clamp-2 text-[11px] font-black uppercase leading-tight tracking-wide text-white drop-shadow sm:text-xs">{name}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt ?? name}
      referrerPolicy={referrerPolicy}
      className={className}
      onError={handleError}
    />
  );
}

function sanitizeImageUrl(value?: string | null) {
  const url = value?.trim();

  if (!url) return undefined;
  if (isBadLocalFallback(url)) return undefined;

  return url;
}

function isBadLocalFallback(url: string) {
  const normalized = url.toLowerCase().trim();

  if (normalized.startsWith('data:image/svg')) return true;
  if (normalized.includes('fallback-svg')) return true;
  if (normalized.includes('source=fallback')) return true;

  if (normalized.includes('/characters/') && normalized.endsWith('.svg')) return true;

  return false;
}
