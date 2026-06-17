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
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] border-amber-300 bg-slate-900 flex items-center justify-center shadow-xl',
          className,
          placeholderClassName,
        )}
      >
        <div className="absolute inset-1 rounded-[1rem] border border-amber-100/60" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex min-h-[2.45rem] items-end justify-center px-2 pb-1.5 text-center">
          <div className="min-w-0">
            <div className="mb-0.5 flex items-center justify-center gap-1.5 text-[7px] font-black uppercase tracking-[0.14em] text-amber-100 drop-shadow-lg">
              <Sparkles className="h-2.5 w-2.5 shrink-0" /> Oficial
            </div>
            <p className="text-balance break-words text-[clamp(0.58rem,2.65vw,0.82rem)] font-black uppercase leading-[1.03] tracking-[0.02em] text-white drop-shadow-lg">{name || 'Personagem'}</p>
          </div>
        </div>
        <ImageIcon className="h-12 w-12 text-amber-100/45" />
      </div>
    );
  }

  if (isOfficial) {
    return (
      <div
        className={cn(
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] border-amber-300 bg-slate-900 shadow-xl',
          className,
        )}
      >
        <img
          {...props}
          src={src}
          alt={alt ?? name}
          referrerPolicy={referrerPolicy}
          className="absolute inset-[0.38rem] h-[calc(100%-0.76rem)] w-[calc(100%-0.76rem)] rounded-[0.95rem] object-contain"
          onError={handleError}
        />
        <div className="pointer-events-none absolute inset-[0.38rem] rounded-[0.95rem] bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-1 rounded-[1rem] border border-amber-100/70" />
        <div className="pointer-events-none absolute inset-2 rounded-[0.82rem] border border-slate-900/30" />
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex min-h-[2.35rem] items-end justify-center px-2 pb-1.5 text-center">
          <p className="text-balance break-words text-[clamp(0.58rem,2.65vw,0.82rem)] font-black uppercase leading-[1.03] tracking-[0.02em] text-white drop-shadow-lg">{name}</p>
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
