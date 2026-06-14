'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getKnownCharacterCard } from '@/lib/knownCharacterCards';
import { getKnownCharacterAvatar } from '@/lib/characterAvatars';

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
    const savedImage = sanitizeSavedImageUrl(imageUrl);
    const officialCard = getKnownCharacterCard(name) || undefined;
    const legacyAvatar = getKnownCharacterAvatar(name) || undefined;

    return [savedImage, officialCard, legacyAvatar].filter((src, index, list): src is string => {
      return Boolean(src) && list.indexOf(src) === index;
    });
  }, [name, imageUrl]);

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
        <ImageIcon className="w-5 h-5 text-slate-400" />
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

function sanitizeSavedImageUrl(value?: string | null) {
  const url = value?.trim();

  if (!url) return undefined;
  if (isBadGeneratedFallback(url)) return undefined;

  return url;
}

function isBadGeneratedFallback(url: string) {
  const normalized = url.toLowerCase();

  return (
    normalized.startsWith('data:image/svg') ||
    normalized.includes('fallback-svg') ||
    normalized.includes('source=fallback') ||
    normalized.includes('generic') ||
    normalized.includes('placeholder')
  );
}
