'use client';

import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
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

const OFFICIAL_FRAME_THEME_OPTIONS: Array<{ value: OfficialCardTheme; label: string }> = [
  { value: 'celestial', label: 'Dourada' },
  { value: 'arcane', label: 'Arcano roxo' },
  { value: 'nature', label: 'Verde' },
  { value: 'ruby', label: 'Vermelha' },
  { value: 'shadow', label: 'Sombria' },
];

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

  const storedOfficialFrameTheme = getStoredOfficialFrameTheme(avatarConfig);
  const [manualFrameTheme, setManualFrameTheme] = useState<OfficialCardTheme | undefined>(storedOfficialFrameTheme);
  const [officialDeckEditorId, setOfficialDeckEditorId] = useState('');
  const [savingFrameTheme, setSavingFrameTheme] = useState(false);
  const frameTheme = officialFrameTheme ?? manualFrameTheme ?? pickOfficialFrameTheme(name);
  const theme = getOfficialFrameTheme(frameTheme);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const src = sources.find((candidate) => !brokenUrls[candidate]);
  const shouldHideOfficialName = hideOfficialName || String(className || '').includes('w-12 h-14');
  const showOfficialFrameThemePicker = Boolean(isOfficial && officialDeckEditorId && !shouldHideOfficialName);

  useEffect(() => {
    setManualFrameTheme(storedOfficialFrameTheme);
  }, [storedOfficialFrameTheme, name]);

  useEffect(() => {
    if (!isOfficial || typeof window === 'undefined') {
      setOfficialDeckEditorId('');
      return;
    }

    const match = window.location.pathname.match(/^\/decks\/([0-9a-f-]{36})(?:\/)?$/i);
    setOfficialDeckEditorId(match?.[1] || '');
  }, [isOfficial]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (src) {
      setBrokenUrls((current) => ({ ...current, [src]: true }));
    }

    onError?.(event);
  };

  const handleOfficialFrameThemeChange = async (nextTheme: OfficialCardTheme) => {
    if (!officialDeckEditorId || savingFrameTheme) return;

    const previousTheme = frameTheme;
    setManualFrameTheme(nextTheme);
    setSavingFrameTheme(true);

    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-frame-theme',
          deckId: officialDeckEditorId,
          name,
          imageUrl: sanitizeImageUrl(imageUrl) || '',
          frameTheme: nextTheme,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel salvar a cor da moldura.');
      }
    } catch (error: any) {
      setManualFrameTheme(previousTheme);
      alert(error.message || 'Nao foi possivel salvar a cor da moldura.');
    } finally {
      setSavingFrameTheme(false);
    }
  };

  const officialFrameThemePicker = showOfficialFrameThemePicker ? (
    <label className="absolute left-2 top-2 z-30 rounded-xl border border-white/25 bg-slate-950/75 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg backdrop-blur">
      <span className="mb-0.5 block opacity-70">Moldura</span>
      <select
        value={frameTheme}
        disabled={savingFrameTheme}
        onChange={(event) => handleOfficialFrameThemeChange(event.target.value as OfficialCardTheme)}
        className="pointer-events-auto w-full cursor-pointer rounded-lg border border-white/15 bg-white/95 px-1 py-0.5 text-[10px] font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {OFFICIAL_FRAME_THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ) : null;

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
        {officialFrameThemePicker}
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
        {officialFrameThemePicker}
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

function getStoredOfficialFrameTheme(avatarConfig?: AvatarConfig | null): OfficialCardTheme | undefined {
  const theme = (avatarConfig as any)?.officialFrameTheme;

  return isOfficialFrameTheme(theme) ? theme : undefined;
}

function isOfficialFrameTheme(value: unknown): value is OfficialCardTheme {
  return OFFICIAL_FRAME_THEME_OPTIONS.some((option) => option.value === value);
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
