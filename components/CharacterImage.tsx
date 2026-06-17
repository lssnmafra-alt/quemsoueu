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
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] border-slate-900 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_34%),linear-gradient(135deg,_#020617,_#111827_52%,_#312e81)] flex items-center justify-center shadow-inner',
          className,
          placeholderClassName,
        )}
      >
        <div className="absolute inset-1 rounded-[1rem] border border-white/10" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-x-2 bottom-2 z-10 flex min-h-[3.2rem] items-center justify-center rounded-2xl border border-white/15 bg-slate-950/78 px-3 py-2 text-center shadow-2xl backdrop-blur-md">
          <div className="min-w-0">
            <div className="mb-0.5 flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100">
              <Sparkles className="h-3 w-3 shrink-0" /> Oficial
            </div>
            <p className="text-balance break-words text-[clamp(0.58rem,2.65vw,0.82rem)] font-black uppercase leading-[1.05] tracking-[0.02em] text-white">{name || 'Personagem'}</p>
          </div>
        </div>
        <ImageIcon className="h-12 w-12 text-cyan-100/45" />
      </div>
    );
  }

  if (isOfficial) {
    return (
      <div
        className={cn(
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] border-slate-900 bg-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.22),inset_0_0_0_2px_rgba(255,255,255,0.09)]',
          className,
        )}
      >
        <img
          src={src}
          alt=""
          aria-hidden="true"
          referrerPolicy={referrerPolicy}
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-md"
          onError={handleError}
        />
        <div className="absolute inset-0 bg-slate-950/32" />
        <img
          {...props}
          src={src}
          alt={alt ?? name}
          referrerPolicy={referrerPolicy}
          className="absolute inset-0 h-full w-full object-contain"
          onError={handleError}
        />
        <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] ring-1 ring-white/15" />
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex min-h-[3.05rem] items-center justify-center rounded-2xl border border-white/15 bg-slate-950/82 px-3 py-2 text-center shadow-xl backdrop-blur-sm">
          <p className="text-balance break-words text-[clamp(0.58rem,2.65vw,0.8rem)] font-black uppercase leading-[1.05] tracking-[0.02em] text-white drop-shadow">{name}</p>
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
