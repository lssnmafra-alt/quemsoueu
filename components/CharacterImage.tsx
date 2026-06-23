'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import OfficialFrame, { getOfficialFrameTheme, type OfficialCardTheme } from '@/components/cards/OfficialFrame';
import OfficialName from '@/components/cards/OfficialName';
import type { AvatarConfig } from '@/lib/avatarConfig';
import { CARD_RARITY_LABELS, CARD_RARITY_OPTIONS, getCardRarity, getCardRarityFrameUrl, type CardRarity } from '@/lib/cardRarity';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { name: string; imageUrl?: string | null; avatarConfig?: AvatarConfig | null; isOfficial?: boolean; officialFrameTheme?: OfficialCardTheme; alt?: string; placeholderClassName?: string; hideOfficialName?: boolean; showRarityFrame?: boolean; cardRarity?: CardRarity };

const OFFICIAL_FRAME_THEME_OPTIONS: Array<{ value: OfficialCardTheme; label: string }> = [
  { value: 'celestial', label: 'Dourada' }, { value: 'arcane', label: 'Arcano roxo' }, { value: 'nature', label: 'Verde' }, { value: 'ruby', label: 'Vermelha' }, { value: 'shadow', label: 'Sombria' },
];

const RARITY_STYLE: Record<CardRarity, CSSProperties> = {
  comum: { '--rarity-a': '#efe5d0', '--rarity-b': '#9f927e', '--rarity-glow': 'rgba(239,229,208,.34)' } as CSSProperties,
  rara: { '--rarity-a': '#4aaeff', '--rarity-b': '#2452b4', '--rarity-glow': 'rgba(74,174,255,.5)' } as CSSProperties,
  epica: { '--rarity-a': '#b753ff', '--rarity-b': '#5c26aa', '--rarity-glow': 'rgba(183,83,255,.55)' } as CSSProperties,
  lendaria: { '--rarity-a': '#ffcc46', '--rarity-b': '#b06012', '--rarity-glow': 'rgba(255,204,70,.58)' } as CSSProperties,
  mitica: { '--rarity-a': '#ff4289', '--rarity-b': '#aa1853', '--rarity-glow': 'rgba(255,66,137,.58)' } as CSSProperties,
  especial: { '--rarity-a': '#fff09c', '--rarity-b': '#542cb4', '--rarity-glow': 'rgba(120,220,255,.58)' } as CSSProperties,
};

export default function CharacterImage({ name, imageUrl, avatarConfig, isOfficial = false, officialFrameTheme, alt, className, placeholderClassName, hideOfficialName = false, showRarityFrame = false, cardRarity, onError, referrerPolicy = 'no-referrer', ...props }: CharacterImageProps) {
  const sources = useMemo(() => { const savedImage = sanitizeImageUrl(imageUrl); return savedImage ? [savedImage] : []; }, [imageUrl]);
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
  const looksLikeFullCardImage = classText.includes('h-full') && classText.includes('w-full');
  const shouldUseRarityFrame = showRarityFrame || looksLikeFullCardImage || (isOfficial && !shouldHideOfficialName);
  const showOfficialFrameThemePicker = Boolean(isOfficial && officialDeckEditorId && !shouldHideOfficialName && !shouldUseRarityFrame);
  const showRarityPicker = Boolean(isOfficial && officialDeckEditorId && !shouldHideOfficialName && shouldUseRarityFrame);
  const showRarityBadge = rarity !== 'comum' && !shouldHideOfficialName;

  useEffect(() => { setManualFrameTheme(storedOfficialFrameTheme); }, [storedOfficialFrameTheme, name]);
  useEffect(() => { setManualCardRarity(storedCardRarity); setBrokenFrame(false); }, [storedCardRarity, name]);
  useEffect(() => { if (!isOfficial || typeof window === 'undefined') { setOfficialDeckEditorId(''); return; } const match = window.location.pathname.match(/^\/decks\/([0-9a-f-]{36})(?:\/)?$/i); setOfficialDeckEditorId(match?.[1] || ''); }, [isOfficial]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => { if (src) setBrokenUrls((current) => ({ ...current, [src]: true })); onError?.(event); };

  const handleOfficialFrameThemeChange = async (nextTheme: OfficialCardTheme) => {
    if (!officialDeckEditorId || savingFrameTheme) return;
    const previousTheme = frameTheme;
    setManualFrameTheme(nextTheme);
    setSavingFrameTheme(true);
    try {
      const response = await fetch('/api/official-decks/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-frame-theme', deckId: officialDeckEditorId, name, imageUrl: sanitizeImageUrl(imageUrl) || '', frameTheme: nextTheme }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar a cor da moldura.');
    } catch (error: any) { setManualFrameTheme(previousTheme); alert(error.message || 'Nao foi possivel salvar a cor da moldura.'); } finally { setSavingFrameTheme(false); }
  };

  const handleCardRarityChange = async (nextRarity: CardRarity) => {
    if (!officialDeckEditorId || savingRarity) return;
    const previousRarity = rarity;
    setManualCardRarity(nextRarity);
    setSavingRarity(true);
    try {
      const response = await fetch('/api/official-decks/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-rarity', deckId: officialDeckEditorId, name, imageUrl: sanitizeImageUrl(imageUrl) || '', rarity: nextRarity }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar a raridade.');
    } catch (error: any) { setManualCardRarity(previousRarity); alert(error.message || 'Nao foi possivel salvar a raridade.'); } finally { setSavingRarity(false); }
  };

  const officialFrameThemePicker = showOfficialFrameThemePicker ? <label className="absolute left-2 top-2 z-30 rounded-xl border border-white/25 bg-slate-950/75 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg backdrop-blur"><span className="mb-0.5 block opacity-70">Moldura</span><select value={frameTheme} disabled={savingFrameTheme} onChange={(event) => handleOfficialFrameThemeChange(event.target.value as OfficialCardTheme)} className="pointer-events-auto w-full cursor-pointer rounded-lg border border-white/15 bg-white/95 px-1 py-0.5 text-[10px] font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60">{OFFICIAL_FRAME_THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null;
  const rarityPicker = showRarityPicker ? <label className="absolute left-2 top-2 z-30 rounded-xl border border-white/25 bg-slate-950/75 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg backdrop-blur"><span className="mb-0.5 block opacity-70">Raridade</span><select value={rarity} disabled={savingRarity} onChange={(event) => handleCardRarityChange(event.target.value as CardRarity)} className="pointer-events-auto w-full cursor-pointer rounded-lg border border-white/15 bg-white/95 px-1 py-0.5 text-[10px] font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60">{CARD_RARITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null;

  const renderRarityFrame = (children: ReactNode) => <div className={cn('qse-rarity-card relative overflow-visible', className)} data-rarity={rarity} style={RARITY_STYLE[rarity]} title={`${name} - ${CARD_RARITY_LABELS[rarity]}`}><div className="absolute inset-[3.5%] z-0 rounded-[1.25rem] bg-[linear-gradient(180deg,var(--rarity-a),var(--rarity-b))] shadow-[0_0_18px_var(--rarity-glow)]" /><div className="absolute inset-[7%_7%_15%_7%] z-10 overflow-hidden rounded-[1rem] bg-slate-950">{children}</div>{!brokenFrame && <img src={getCardRarityFrameUrl(rarity)} alt="" aria-hidden="true" onError={() => setBrokenFrame(true)} className="pointer-events-none absolute inset-[-7%] z-20 h-[114%] w-[114%] object-fill drop-shadow-xl" referrerPolicy="no-referrer" />}{showRarityBadge && <span className="pointer-events-none absolute left-[17%] right-[17%] top-[7.8%] z-30 truncate rounded-full bg-slate-950/72 px-2 py-0.5 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-lg">{CARD_RARITY_LABELS[rarity]}</span>}{rarityPicker}</div>;

  if (shouldUseRarityFrame) {
    if (!src) return renderRarityFrame(<AvatarRenderer config={avatarConfig} name={name} className="h-full w-full object-cover" />);
    return renderRarityFrame(<img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className="h-full w-full object-cover object-center" onError={handleError} />);
  }

  if (!src) {
    if (!isOfficial) return <AvatarRenderer config={avatarConfig} name={name} className={className} />;
    return <div className={cn('official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl', theme.border, theme.base, className, placeholderClassName)}><div className="absolute inset-[0.22rem] rounded-[0.95rem] bg-slate-900" /><div className="absolute inset-0 flex items-center justify-center"><ImageIcon className={cn('h-12 w-12 opacity-45', theme.nameColor)} /></div><OfficialFrame theme={frameTheme} />{!shouldHideOfficialName && <OfficialName name={name || 'Personagem'} theme={theme} showLabel />}{officialFrameThemePicker}</div>;
  }

  if (isOfficial) return <div className={cn('official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl', theme.border, theme.base, className)}><img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className="absolute inset-[0.22rem] h-[calc(100%-0.44rem)] w-[calc(100%-0.44rem)] rounded-[0.95rem] object-cover object-center" onError={handleError} /><div className="pointer-events-none absolute inset-[0.22rem] rounded-[0.95rem] bg-gradient-to-t from-slate-950/5 via-transparent to-white/5" /><OfficialFrame theme={frameTheme} />{!shouldHideOfficialName && <OfficialName name={name} theme={theme} />}{officialFrameThemePicker}</div>;
  return <img {...props} src={src} alt={alt ?? name} referrerPolicy={referrerPolicy} className={className} onError={handleError} />;
}

function pickOfficialFrameTheme(name: string): OfficialCardTheme { const normalized = normalizeThemeText(name); if (includesAny(normalized, ['bruxa', 'esmeralda', 'floresta', 'mago', 'maga'])) return 'nature'; if (includesAny(normalized, ['fantasma', 'entidade', 'galatico', 'arcano', 'cosmico'])) return 'arcane'; if (includesAny(normalized, ['susto', 'medo', 'palhaco', 'acougueiro'])) return 'ruby'; if (includesAny(normalized, ['mascara', 'obsidiano', 'metal', 'sombra'])) return 'shadow'; return 'celestial'; }
function includesAny(value: string, terms: string[]) { return terms.some((term) => value.includes(term)); }
function normalizeThemeText(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function getStoredOfficialFrameTheme(avatarConfig?: AvatarConfig | null): OfficialCardTheme | undefined { const theme = (avatarConfig as any)?.officialFrameTheme; return isOfficialFrameTheme(theme) ? theme : undefined; }
function isOfficialFrameTheme(value: unknown): value is OfficialCardTheme { return OFFICIAL_FRAME_THEME_OPTIONS.some((option) => option.value === value); }
function sanitizeImageUrl(value?: string | null) { const url = value?.trim(); if (!url) return undefined; if (isBadLocalFallback(url)) return undefined; return url; }
function isBadLocalFallback(url: string) { const normalized = url.toLowerCase().trim(); if (normalized.startsWith('data:image/svg')) return true; if (normalized.includes('fallback-svg')) return true; if (normalized.includes('source=fallback')) return true; if (normalized.includes('/characters/') && normalized.endsWith('.svg')) return true; return false; }
