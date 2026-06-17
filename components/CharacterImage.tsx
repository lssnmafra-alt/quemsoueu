'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import OfficialFrame, { getOfficialFrameTheme, type OfficialCardTheme } from '@/components/cards/OfficialFrame';
import OfficialName from '@/components/cards/OfficialName';
import type { AvatarConfig } from '@/lib/avatarConfig';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  name: string;
  imageUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  isOfficial?: boolean;
  officialFrameTheme?: OfficialCardTheme;
  alt?: string;
  placeholderClassName?: string;
  hideOfficialName?: boolean;
};

export default function CharacterImage({
  name,
  imageUrl,
  avatarConfig,
  isOfficial = false,
  officialFrameTheme,
  alt,
  className,
  placeholderClassName,
  hideOfficialName = false,
  onError,
  referrerPolicy = 'no-referrer',
  ...props
}: CharacterImageProps) {
  const sources = useMemo(() => {
    const savedImage = sanitizeImageUrl(imageUrl);
    return savedImage ? [savedImage] : [];
  }, [imageUrl]);

  const frameTheme = officialFrameTheme ?? pickOfficialFrameTheme(name);
  const theme = getOfficialFrameTheme(frameTheme);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const src = sources.find((candidate) => !brokenUrls[candidate]);
  const shouldHideOfficialName = hideOfficialName || String(className || '').includes('w-12 h-14');

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
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl',
          theme.border,
          theme.base,
          className,
          placeholderClassName,
        )}
      >
        <div className="absolute inset-[0.22rem] rounded-[0.95rem] bg-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className={cn('h-12 w-12 opacity-45', theme.nameColor)} />
        </div>
        <OfficialFrame theme={frameTheme} />
        {!shouldHideOfficialName && <OfficialName name={name || 'Personagem'} theme={theme} showLabel />}
      </div>
    );
  }

  if (isOfficial) {
    return (
      <div
        className={cn(
          'official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl',
          theme.border,
          theme.base,
          className,
        )}
      >
        <img
          {...props}
          src={src}
          alt={alt ?? name}
          referrerPolicy={referrerPolicy}
          className="absolute inset-[0.22rem] h-[calc(100%-0.44rem)] w-[calc(100%-0.44rem)] rounded-[0.95rem] object-cover object-center"
          onError={handleError}
        />
        <div className="pointer-events-none absolute inset-[0.22rem] rounded-[0.95rem] bg-gradient-to-t from-slate-950/5 via-transparent to-white/5" />
        <OfficialFrame theme={frameTheme} />
        {!shouldHideOfficialName && <OfficialName name={name} theme={theme} />}
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

function pickOfficialFrameTheme(name: string): OfficialCardTheme {
  const normalized = normalizeThemeText(name);

  if (includesAny(normalized, ['bruxa', 'esmeralda', 'floresta', 'mago', 'maga'])) return 'nature';
  if (includesAny(normalized, ['fantasma', 'entidade', 'galatico', 'arcano', 'cosmico'])) return 'arcane';
  if (includesAny(normalized, ['susto', 'medo', 'palhaco', 'acougueiro'])) return 'ruby';
  if (includesAny(normalized, ['mascara', 'obsidiano', 'metal', 'sombra'])) return 'shadow';

  return 'celestial';
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function normalizeThemeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
