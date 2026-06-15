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
          'relative overflow-hidden rounded-2xl border border-white/20 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_34%),linear-gradient(135deg,_#020617,_#111827_52%,_#312e81)] flex items-center justify-center shadow-inner',
          className,
          placeholderClassName,
        )}
      >
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-200/30 bg-white/10 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <ImageIcon className="h-7 w-7 text-cyan-100" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
              <Sparkles className="h-3 w-3" /> Oficial
            </div>
            <p className="mt-1 max-w-[150px] truncate text-xs font-black uppercase text-white">{name || 'Personagem'}</p>
          </div>
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
