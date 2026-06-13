'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCharacterDisplayImageUrl, getKnownCharacterAvatar } from '@/lib/characterAvatars';

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
  const primarySrc = useMemo(() => getCharacterDisplayImageUrl(name, imageUrl), [name, imageUrl]);
  const fallbackSrc = useMemo(() => getKnownCharacterAvatar(name), [name]);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const src = primarySrc && !brokenUrls[primarySrc]
    ? primarySrc
    : fallbackSrc && !brokenUrls[fallbackSrc]
      ? fallbackSrc
      : undefined;

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (src) setBrokenUrls((current) => ({ ...current, [src]: true }));
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
