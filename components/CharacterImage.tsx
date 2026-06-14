'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  name: string;
  imageUrl?: string | null;
  alt?: string;
  placeholderClassName?: string;
};

export default function CharacterImage({
  name,
  imageUrl,
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
    return (
      <div className={cn('bg-slate-100 flex items-center justify-center', className, placeholderClassName)}>
        <ImageIcon className="w-6 h-6 text-slate-400" />
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
  const normalized = url.toLowerCase();

  return (
    normalized.startsWith('data:image/svg') ||
    normalized.includes('fallback-svg') ||
    normalized.includes('source=fallback') ||
    normalized.includes('placeholder') ||
    normalized.includes('generic') ||
    normalized.startsWith('/official-cards/') ||
    normalized.startsWith('/standard-cards/') ||
    normalized.includes('/official-cards/') ||
    normalized.includes('/standard-cards/') ||
    (normalized.includes('/characters/') && normalized.endsWith('.svg'))
  );
}
