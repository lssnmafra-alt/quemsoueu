'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/lib/store';
import { isProjectAdmin } from '@/lib/admin';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import OfficialFrame, { getOfficialFrameTheme, type OfficialCardTheme } from '@/components/cards/OfficialFrame';
import OfficialName from '@/components/cards/OfficialName';
import type { AvatarConfig } from '@/lib/avatarConfig';
import { CARD_RARITY_LABELS, CARD_RARITY_OPTIONS, getCardRarity, getCardRarityFrameUrl, type CardRarity } from '@/lib/cardRarity';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  name: string;
  imageUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  isOfficial?: boolean;
  officialFrameTheme?: OfficialCardTheme;
  alt?: string;
  placeholderClassName?: string;
  hideOfficialName?: boolean;
  showRarityFrame?: boolean;
  cardRarity?: CardRarity;
};

const OFFICIAL_FRAME_THEME_OPTIONS: Array<{ value: OfficialCardTheme; label: string }> = [
  { value: 'celestial', label: 'Dourada' },
  { value: 'arcane', label: 'Arcano roxo' },
  { value: 'nature', label: 'Verde' },
  { value: 'ruby', label: 'Vermelha' },
  { value: 'shadow', label: 'Sombria' },
];

const COMMON_CHARACTER_EMOJIS = ['\u{1F600}', '\u{1F60E}', '\u{1F920}', '\u{1F9D9}', '\u{1F9B8}', '\u{1F575}\uFE0F', '\u{1F916}', '\u{1F47B}', '\u{1F438}', '\u{1F98A}', '\u{1F43C}', '\u{1F432}', '\u2B50', '\u{1F525}', '\u26A1', '\u{1F3AE}'];

const RARITY_STYLE: Record<CardRarity, CSSProperties> = {
  comum: { '--rarity-a': '#efe5d0', '--rarity-b': '#9f927e', '--rarity-glow': 'rgba(239,229,208,.34)' } as CSSProperties,
  rara: { '--rarity-a': '#4aaeff', '--rarity-b': '#2452b4', '--rarity-glow': 'rgba(74,174,255,.5)' } as CSSProperties,
  epica: { '--rarity-a': '#b753ff', '--rarity-b': '#5c26aa', '--rarity-glow': 'rgba(183,83,255,.55)' } as CSSProperties,
  lendaria: { '--rarity-a': '#ffcc46', '--rarity-b': '#b06012', '--rarity-glow': 'rgba(255,204,70,.58)' } as CSSProperties,
  mitica: { '--rarity-a': '#ff4289', '--rarity-b': '#aa1853', '--rarity-glow': 'rgba(255,66,137,.58)' } as CSSProperties,
  especial: { '--rarity-a': '#fff09c', '--rarity-b': '#542cb4', '--rarity-glow': 'rgba(120,220,255,.58)' } as CSSProperties,
};

export default function CharacterImage({ name, imageUrl, avatarConfig, isOfficial = false, officialFrameTheme, alt, className, placeholderClassName, hideOfficialName = false, showRarityFrame = false, cardRarity, onError, referrerPolicy = 'no-referrer', ...props }: CharacterImageProps) {
  const { user } = useUserStore();
  const requesterId = String(user?.id || '').trim();
  const isAdmin = isProjectAdmin(requesterId);
  const sources = useMemo(() => {
    const savedImage = sanitizeImageUrl(imageUrl);
    return savedImage ? [savedImage] : [];
  }, [imageUrl]);

  const storedOfficialFrameTheme = getStoredOfficialFrameTheme(avatarConfig);
  const storedCardRarity = getCardRarity(cardRarity ?? avatarConfig);
  const [manualFrameTheme, setManualFrameTheme] = useState<OfficialCardTheme | undefined>(storedOfficialFrameTheme);
  const [manualCardRarity, setManualCardRarity] = useState<CardRarity>(storedCardRarity);
  const [officialDeckEditorId, setOfficialDeckEditorId] = useState('');
  const [savingFrameTheme, setSavingFrameTheme] = useState(false);
  const [savingRarity, setSavingRarity] = useState(false);
  const frameTheme = officialFrameTheme ?? manualFrameTheme ?? pickOfficialFrameTheme(name);
  const theme = getOfficialFrameTheme(frameTheme);
  const rarity = manualCardRarity;
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const [brokenFrame, setBrokenFrame] = useState(false);
  const src = sources.find((candidate) => !brokenUrls[candidate]);
  const classText = String(className || '');
  const shouldHideOfficialName = hideOfficialName || classText.includes('w-12 h-14');
  const looksLikeFullCard = classText.includes('w-full') && classText.includes('h-full');
  const shouldUseRarityFrame = Boolean(isOfficial && (showRarityFrame || (!shouldHideOfficialName && looksLikeFullCard)));
  const showOfficialFrameThemePicker = Boolean(isAdmin && isOfficial && officialDeckEditorId && !shouldHideOfficialName && !shouldUseRarityFrame);
  const showRarityPicker = Boolean(isAdmin && officialDeckEditorId && !shouldHideOfficialName && shouldUseRarityFrame);
  const showRarityBadge = rarity !== 'comum' && !shouldHideOfficialName;

  useEffect(() => { setManualFrameTheme(storedOfficialFrameTheme); }, [storedOfficialFrameTheme, name]);
  useEffect(() => { setManualCardRarity(storedCardRarity); setBrokenFrame(false); }, [storedCardRarity, name]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      setOfficialDeckEditorId('');
      return;
    }
    const match = window.location.pathname.match(/^\/decks\/([0-9a-f-]{36})(?:\/)?$/i);
    setOfficialDeckEditorId(match?.[1] || '');
  }, []);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (src) setBrokenUrls((current) => ({ ...current, [src]: true }));
    onError?.(event);
  };

  const handleOfficialFrameThemeChange = async (nextTheme: OfficialCardTheme) => {
    if (!officialDeckEditorId || savingFrameTheme || !isAdmin) return;
    const previousTheme = frameTheme;
    setManualFrameTheme(nextTheme);
    setSavingFrameTheme(true);
    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-frame-theme', deckId: officialDeckEditorId, userId: requesterId, name, imageUrl: sanitizeImageUrl(imageUrl) || '', frameTheme: nextTheme }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar a cor da moldura.');
    } catch (error: any) {
      setManualFrameTheme(previousTheme);
      alert(error.message || 'Nao foi possivel salvar a cor da moldura.');
    } finally {
      setSavingFrameTheme(false);
    }
  };

  const handleCardRarityChange = async (nextRarity: CardRarity) => {
    if (!officialDeckEditorId || savingRarity || !isAdmin) return;
    const previousRarity = rarity;
    setManualCardRarity(nextRarity);
    setSavingRarity(true);
    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-rarity', deckId: officialDeckEditorId, userId: requesterId, name, imageUrl: sanitizeImageUrl(imageUrl) || '', rarity: nextRarity }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar a raridade.');
    } catch (error: any) {
      setManualCardRarity(previousRarity);
      alert(error.message || 'Nao foi possivel salvar a raridade.');
    } finally {
      setSavingRarity(false);
    }
  };

  const officialFrameThemePicker = showOfficialFrameThemePicker ? (
    <label className="absolute left-2 top-2 z-30 rounded-xl border border-white/25 bg-slate-950/75 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg backdrop-blur">
      <span className="mb-0.5 block opacity-70">Moldura</span>
      <select value={frameTheme} disabled={savingFrameTheme} onChange={(event) => handleOfficialFrameThemeChange(event.target.value as OfficialCardTheme)} className="pointer-events-auto w-full cursor-pointer rounded-lg border border-white/15 bg-white/95 px-1 py-0.5 text-[10px] font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60">
        {OFFICIAL_FRAME_THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  ) : null;

  const rarityPicker = showRarityPicker ? (
    <label className="absolute left-2 top-2 z-50 rounded-xl border border-white/25 bg-slate-950/82 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg backdrop-blur">
      <span className="mb-0.5 block opacity-70">Cor</span>
      <select value={rarity} disabled={savingRarity} onChange={(event) => handleCardRarityChange(event.target.value as CardRarity)} className="pointer-events-auto w-full cursor-pointer rounded-lg border border-white/15 bg-white/95 px-1 py-0.5 text-[10px] font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60">
        {CARD_RARITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  ) : null;

  if (!isOfficial) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-yellow-50 p-3 text-center shadow-inner', className, placeholderClassName)} title={name}>
        <span className="mb-2 text-4xl leading-none drop-shadow-sm" aria-hidden="true">{emojiForName(name)}</span>
        <span className="line-clamp-4 text-sm font-black uppercase leading-tight text-indigo-950">{name || 'Personagem'}</span>
      </div>
    );
  }

  const renderRarityFrame = (children: ReactNode) => (
    <div className={cn('qse-rarity-card relative aspect-[2/3] overflow-visible', className)} data-rarity={rarity} style={RARITY_STYLE[rarity]} title={`${name} - ${CARD_RARITY_LABELS[rarity]}`}>
      <div className="absolute inset-[7.5%_9%_14.5%_9%] z-10 overflow-hidden rounded-[0.82rem] bg-slate-950 shadow-[0_0_18px_var(--rarity-glow)]">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-[7.5%_9%_14.5%_9%] z-20 rounded-[0.82rem] bg-gradient-to-t from-slate-950/10 via-transparent to-white/5" />
      {!brokenFrame ? (
        <img src={getCardRarityFrameUrl(rarity)} alt="" aria-hidden="true" onError={() => setBrokenFrame(true)} className="pointer-events-none absolute inset-0 z-30 h-full w-full object-fill drop-shadow-[0_10px_14px_rgba(0,0,0,.24)]" referrerPolicy="no-referrer" />
      ) : (
        <div className="pointer-events-none absolute inset-0 z-30 rounded-[1.25rem] border-[0.45rem] border-[color:var(--rarity-a)] shadow-[0_0_18px_var(--rarity-glow),inset_0_0_0_2px_rgba(255,255,255,.6)]" />
      )}
      {showRarityBadge && <span className="pointer-events-none absolute left-[17%] right-[17%] top-[7.5%] z-40 truncate rounded-full bg-slate-950/72 px-2 py-0.5 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-lg">{CARD_RARITY_LABELS[rarity]}</span>}
      {!shouldHideOfficialName && <span className="qse-rarity-card-name pointer-events-none absolute left-[18%] right-[18%] bottom-[7.6%] z-40 truncate rounded-[0.42rem] bg-[linear-gradient(180deg,rgba(73,22,91,.98),rgba(43,12,65,.98))] px-1 py-[0.08rem] text-center text-[clamp(.5rem,.72vw,.64rem)] font-black leading-[0.82rem] text-[#fff7d6] shadow-[0_4px_10px_rgba(0,0,0,.28)]">{name}</span>}
      {rarityPicker}
    </div>
  );

  if (shouldUseRarityFrame) {
    if (!src) return renderRarityFrame(<AvatarRenderer config={avatarConfig} name={name} className="h-full w-full object-cover" />);
    return renderRarityFrame(<img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className="h-full w-full object-cover object-center" onError={handleError} />);
  }

  if (!src) {
    return (
      <div className={cn('official-card-preview relative aspect-[2/3] overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl', theme.border, theme.base, className, placeholderClassName)}>
        <div className="absolute inset-[0.22rem] rounded-[0.95rem] bg-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className={cn('h-12 w-12 opacity-45', theme.nameColor)} /></div>
        <OfficialFrame theme={frameTheme} />
        {!shouldHideOfficialName && <OfficialName name={name || 'Personagem'} theme={theme} showLabel />}
        {officialFrameThemePicker}
      </div>
    );
  }

  if (isOfficial) {
    return (
      <div className={cn('official-card-preview relative aspect-[2/3] overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl', theme.border, theme.base, className)}>
        <img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className="absolute inset-[0.22rem] h-[calc(100%-0.44rem)] w-[calc(100%-0.44rem)] rounded-[0.95rem] object-cover object-center" onError={handleError} />
        <div className="pointer-events-none absolute inset-[0.22rem] rounded-[0.95rem] bg-gradient-to-t from-slate-950/5 via-transparent to-white/5" />
        <OfficialFrame theme={frameTheme} />
        {!shouldHideOfficialName && <OfficialName name={name} theme={theme} />}
        {officialFrameThemePicker}
      </div>
    );
  }

  return <img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className={className} onError={handleError} />;
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
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function emojiForName(name: string) {
  const normalized = normalizeThemeText(name);
  if (/(bruxa|mago|feitic|wizard|witch)/.test(normalized)) return '\u{1F9D9}';
  if (/(robo|bot|cyber|android)/.test(normalized)) return '\u{1F916}';
  if (/(fantasma|ghost|assombra)/.test(normalized)) return '\u{1F47B}';
  if (/(heroi|hero|super)/.test(normalized)) return '\u{1F9B8}';
  if (/(rei|rainha|king|queen)/.test(normalized)) return '\u{1F451}';
  if (/(monstro|monster|fera|drag)/.test(normalized)) return '\u{1F432}';
  const hash = normalized.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return COMMON_CHARACTER_EMOJIS[hash % COMMON_CHARACTER_EMOJIS.length];
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
