'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Lock, Check, ArrowLeft, ShoppingCart, Layers3, Film, Loader2, Pause, Play, ImageOff } from 'lucide-react';
import GameTopNav from '@/components/navigation/GameTopNav';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { avatarSelectionToUrl, normalizeAvatarSelection, type AvatarAnimationMap } from '@/lib/avatars';
import { cn } from '@/lib/utils';

type StoreItem = {
  id: string;
  avatarKey: string;
  displayName: string;
  skinCode: string;
  skinName: string;
  imageKey?: string;
  imageUrl: string;
  rarity: string;
  accessType: string;
  priceCoins: number;
  owned: boolean;
  locked: boolean;
  sortOrder: number;
  animations?: AvatarAnimationMap;
  animationVariants?: Record<string, string[]>;
  isDefaultSkin?: boolean;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
};

type StoreCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  r2Prefix?: string;
  sortOrder: number;
  items: StoreItem[];
  ownedCount: number;
  totalCount: number;
};

const rarityLabel: Record<string, string> = { common: 'COMUM', rare: 'RARO', epic: 'ÉPICO', legendary: 'LENDÁRIO', mythic: 'MÍTICO' };
const animationLabels = [{ key: 'lobby', label: 'Lobby' }, { key: 'victory', label: 'Vitória' }, { key: 'defeat', label: 'Derrota' }] as const;

export default function AvatarStorePage() {
  const router = useRouter();
  const { user, profile, loading, initialized, setSessionUser } = useUserStore();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [coins, setCoins] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingStore, setLoadingStore] = useState(true);

  useEffect(() => {
    if (!initialized || loading) return;
    if (!user?.id) {
      router.push('/');
      return;
    }
    void loadStore();
  }, [initialized, loading, user?.id]);

  const selectedCategory = useMemo(() => categories.find((category) => category.id === selectedCategoryId) || categories[0], [categories, selectedCategoryId]);
  const categoryItems = selectedCategory?.items || [];
  const ownedItems = useMemo(() => categoryItems.filter((item) => !item.locked), [categoryItems]);
  const lockedItems = useMemo(() => categoryItems.filter((item) => item.locked), [categoryItems]);
  const selected = useMemo(() => categoryItems.find((item) => item.id === selectedId) || categoryItems[0] || items[0], [categoryItems, selectedId, items]);
  const characterSkins = useMemo(() => selected ? categoryItems.filter((item) => sameCharacter(item, selected)) : [], [categoryItems, selected]);
  const equippedAvatarUrl = profile?.avatar_url || '';

  async function loadStore() {
    if (!user?.id) return;
    setLoadingStore(true);
    setNotice('');
    const response = await fetch(`/api/avatar-store/catalog?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({ items: [], categories: [] }));
    const nextItems = Array.isArray(result.items) ? result.items : [];
    const nextCategories = buildCategories(nextItems, Array.isArray(result.categories) ? result.categories : []);
    setItems(nextItems);
    setCategories(nextCategories);
    setCoins(Number(result.wallet?.coins || 0));
    setSelectedCategoryId((current) => current || nextCategories[0]?.id || '');
    setSelectedId((current) => current || nextCategories[0]?.items?.[0]?.id || nextItems[0]?.id || '');
    setLoadingStore(false);
  }

  async function buy(item: StoreItem) {
    if (!user?.id || busyId) return;
    setBusyId(item.id);
    setNotice('');
    try {
      const response = await fetch('/api/avatar-store/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, skinId: item.id, avatarKey: item.avatarKey, displayName: item.displayName, skinCode: item.skinCode, skinName: item.skinName, imageKey: item.imageKey, priceCoins: item.priceCoins, sortOrder: item.sortOrder, isDefaultSkin: Boolean(item.isDefaultSkin), categoryId: item.categoryId, categorySlug: item.categorySlug, categoryName: item.categoryName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível comprar.');
      if (result.wallet) setCoins(Number(result.wallet.coins || 0));
      setNotice(result.alreadyOwned ? 'Skin já era sua.' : 'Skin desbloqueada.');
      await loadStore();
    } catch (error: any) {
      setNotice(error.message || 'Não foi possível comprar.');
    } finally {
      setBusyId('');
    }
  }

  async function equip(item: StoreItem) {
    if (!user?.id || busyId) return;
    if (item.locked) {
      await buy(item);
      return;
    }
    setBusyId(item.id);
    setNotice('');
    try {
      let response = await fetch('/api/avatar-store/equip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, skinId: item.id }) });
      let result = await response.json().catch(() => ({}));
      if (!response.ok && !isUuid(item.id)) {
        const avatarUrl = avatarSelectionToUrl(normalizeAvatarSelection({ avatarId: item.avatarKey, imageUrl: item.imageUrl, imageKey: item.imageKey, animationSlug: `${item.avatarKey}/${item.skinCode}`, animations: item.animations || defaultAnimationMap(item), skinCode: item.skinCode, skinName: item.skinName, accessType: item.accessType as any, displayName: item.displayName }));
        response = await fetch('/api/player-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, id: user.id, avatar_url: avatarUrl, nickname: profile?.nickname || user.email?.split('@')[0] || 'Jogador', profile_completed: true, is_guest: Boolean(profile?.is_guest || user.email?.includes('@guest.com')) }) });
        result = await response.json().catch(() => ({}));
      }
      if (!response.ok) throw new Error(result.error || 'Não foi possível equipar.');
      const nextProfile = result.profile || { ...profile, avatar_url: result.avatarUrl };
      setSessionUser(user, nextProfile);
      setNotice('Avatar equipado.');
    } catch (error: any) {
      setNotice(error.message || 'Não foi possível equipar.');
    } finally {
      setBusyId('');
    }
  }

  if (!initialized || loading || loadingStore) return <LoadingArena label="Carregando loja..." />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071a64] text-white">
      <GameTopNav profile={profile} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/65 to-[#05091f]/95" />
      <main className="relative z-10 mx-auto max-w-[1500px] px-4 pb-8 pt-20 md:px-8 md:pt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <button type="button" onClick={() => router.push('/')} className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-100 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Loja de personagens</p>
            <h1 className="text-4xl font-black uppercase italic text-white md:text-5xl font-display">Avatar Store</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border-4 border-yellow-300 bg-yellow-300 px-5 py-3 text-slate-950 shadow-[0_6px_0_#b45309]"><Coins className="h-5 w-5" /><span className="text-xl font-black">{coins}</span></div>
        </div>
        {notice && <div className="mb-4 rounded-2xl border-2 border-cyan-200/30 bg-white/10 px-4 py-3 text-sm font-black uppercase text-cyan-50">{notice}</div>}
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_360px] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-3 shadow-2xl backdrop-blur-xl lg:sticky lg:top-24 lg:h-fit">
            <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100">Categorias</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {categories.map((category) => {
                const active = selectedCategory?.id === category.id;
                const cover = category.items[0];
                return (
                  <button key={category.id} type="button" onClick={() => { setSelectedCategoryId(category.id); setSelectedId(category.items[0]?.id || ''); }} className={cn('relative overflow-hidden rounded-2xl border-4 bg-white text-left transition-all hover:-translate-y-1', active ? 'border-yellow-300 ring-4 ring-yellow-300/20' : 'border-white/15')}>
                    <div className="relative aspect-[5/3] overflow-hidden bg-red-800">
                      <SafeStoreImage src={cover?.imageUrl || ''} alt={category.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full bg-gradient-to-br from-red-700 to-red-950" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-3 pt-10"><p className="truncate text-base font-black uppercase text-white">{category.name}</p><p className="text-[10px] font-black text-yellow-200">{category.ownedCount}/{category.totalCount} liberados</p></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100">Categoria</p><h2 className="text-2xl font-black uppercase italic text-white md:text-3xl font-display">{selectedCategory?.name || 'Loja'}</h2></div><div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black uppercase text-cyan-100"><Layers3 className="mr-1 inline h-4 w-4" /> {categoryItems.length}</div></div>
            {categoryItems.length === 0 ? <div className="rounded-3xl border-2 border-dashed border-cyan-200/25 bg-white/10 p-8 text-center text-xs font-black uppercase text-cyan-100">Nenhum item ativo nesta categoria.</div> : <div className="space-y-5"><ItemGrid title="Já liberados" items={ownedItems} selectedId={selected?.id || ''} equippedAvatarUrl={equippedAvatarUrl} onSelect={setSelectedId} /><ItemGrid title="Disponíveis para comprar" items={lockedItems} selectedId={selected?.id || ''} equippedAvatarUrl={equippedAvatarUrl} onSelect={setSelectedId} /></div>}
          </section>
          <aside className="rounded-3xl border-4 border-cyan-200/25 bg-white p-4 text-slate-950 shadow-2xl lg:sticky lg:top-24 lg:h-fit">
            {selected ? (
              <>
                <div className="mb-3 overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-[240px] max-h-[30vh] min-h-[210px] items-center justify-center overflow-hidden rounded-2xl bg-slate-100 xl:h-[280px]">
                    <AvatarFigure selection={selectionForItem(selected)} className="h-full w-auto max-w-full border-0 rounded-none" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{selected.categoryName || selectedCategory?.name} • {rarityLabel[selected.rarity] || selected.rarity} • {selected.skinName}</p>
                <h2 className="text-2xl font-black uppercase text-slate-950 md:text-3xl font-display">{selected.displayName}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Veja as skins e animações deste personagem.</p>
                <div className="mt-3 rounded-3xl bg-slate-100 p-3"><p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Skins deste personagem</p><div className="grid grid-cols-3 gap-2">{characterSkins.map((skin) => { const active = skin.id === selected.id; const equipped = isEquipped(equippedAvatarUrl, skin); return <button key={`${skin.id}-${skin.skinCode}`} type="button" onClick={() => setSelectedId(skin.id)} className={cn('relative overflow-hidden rounded-2xl border-2 bg-white text-left transition', active ? 'border-yellow-400 ring-2 ring-yellow-300/40' : 'border-white hover:border-slate-300')}><div className="aspect-square overflow-hidden bg-slate-200"><SafeStoreImage src={skin.imageUrl} alt={skin.skinName} className="h-full w-full object-cover" fallbackClassName="h-full w-full bg-gradient-to-br from-slate-100 to-slate-300" /></div><div className="p-2"><p className="truncate text-[10px] font-black uppercase text-slate-950">{skin.skinName}</p><p className="truncate text-[9px] font-black uppercase text-slate-500">{equipped ? 'Equipado' : skin.locked ? `${skin.priceCoins} moedas` : 'Liberado'}</p></div></button>; })}</div></div>
                <div className="mt-3 rounded-3xl bg-slate-100 p-3"><p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><Film className="h-4 w-4" /> Animações desta skin</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{animationLabels.map((animation) => { const animationKey = selected.animations?.[animation.key] || defaultAnimationMap(selected)[animation.key] || ''; return <AnimationPreview key={animation.key} label={animation.label} animationKey={animationKey} />; })}</div></div>
                <Button type="button" disabled={busyId === selected.id} onClick={() => equip(selected)} className="mt-4 h-13 w-full rounded-none bg-yellow-300 text-slate-950 text-sm font-black uppercase shadow-[0_6px_0_#b45309] hover:bg-yellow-200">{busyId === selected.id ? 'Aguarde...' : selected.locked ? <><ShoppingCart className="mr-2 h-5 w-5" /> Comprar {selected.priceCoins}</> : <><Check className="mr-2 h-5 w-5" /> Equipar</>}</Button>
              </>
            ) : <div className="py-12 text-center text-sm font-bold text-slate-500">Nenhuma skin cadastrada.</div>}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ItemGrid({ title, items, selectedId, equippedAvatarUrl, onSelect }: { title: string; items: StoreItem[]; selectedId: string; equippedAvatarUrl: string; onSelect: (id: string) => void }) {
  if (items.length === 0) return null;
  return <div><p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">{title}</p><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{items.map((item) => { const active = selectedId === item.id; const equipped = isEquipped(equippedAvatarUrl, item); return <button key={`${item.id}-${item.skinCode}`} type="button" onClick={() => onSelect(item.id)} className={cn('relative overflow-hidden rounded-2xl border-4 bg-white text-left shadow-xl transition-all hover:-translate-y-1', active ? 'border-yellow-300 ring-4 ring-yellow-300/25' : 'border-white/15')}><div className="relative aspect-[3/4] overflow-hidden bg-red-800"><SafeStoreImage src={item.imageUrl} alt={`${item.displayName} ${item.skinName}`} className="h-full w-full object-cover" fallbackClassName="h-full w-full bg-gradient-to-br from-red-700 via-indigo-800 to-slate-950" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 pt-10"><p className="truncate text-base font-black text-white font-display">{item.displayName}</p><p className="truncate text-[11px] font-black text-white/90">{item.skinName}</p><div className="mt-1 flex items-center justify-between gap-1"><span className="text-[9px] font-black uppercase text-yellow-200">{rarityLabel[item.rarity] || item.rarity}</span>{equipped ? <span className="rounded-full bg-emerald-400 px-2 py-1 text-[9px] font-black text-emerald-950">EQUIPADO</span> : item.locked ? <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[9px] font-black text-white"><Lock className="h-3 w-3" /> {item.priceCoins}</span> : <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-slate-950">LIBERADO</span>}</div></div></div></button>; })}</div></div>;
}

function SafeStoreImage({ src, alt, className, fallbackClassName }: { src?: string; alt: string; className?: string; fallbackClassName?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center text-white/75', fallbackClassName, className)} role="img" aria-label={alt}>
        <ImageOff className="h-10 w-10 drop-shadow" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function AnimationPreview({ label, animationKey }: { label: string; animationKey: string }) {
  const src = animationUrl(animationKey);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(Boolean(src));
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setLoading(Boolean(src));
    setFailed(false);
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    if (!playing) return;
    window.dispatchEvent(new CustomEvent('qse:avatar-chroma-refresh'));
  }, [playing, src]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || !src || failed) return;
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => {
        setFailed(true);
        setLoading(false);
      });
      return;
    }
    video.pause();
    setPlaying(false);
  }

  return (
    <button
      type="button"
      onClick={togglePlayback}
      disabled={!src || failed}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 disabled:cursor-default disabled:hover:translate-y-0"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {playing ? 'Pausar' : 'Tocar'}
        </span>
      </div>
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-indigo-100 via-sky-50 to-yellow-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.85),transparent_48%)]" />
        {src && !failed ? (
          <video
            ref={videoRef}
            src={src}
            muted
            loop
            playsInline
            preload="metadata"
            controls={false}
            onLoadedData={() => setLoading(false)}
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
              setPlaying(false);
            }}
            onPause={() => setPlaying(false)}
            onPlay={() => {
              setPlaying(true);
              window.dispatchEvent(new CustomEvent('qse:avatar-chroma-refresh'));
            }}
            data-qse-disable-chroma={playing ? undefined : '1'}
            className={cn('relative z-10 h-full w-full object-contain transition-opacity', loading ? 'opacity-0' : 'opacity-100')}
          />
        ) : null}
        {loading && !failed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}
        {(!src || failed) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
            Animação indisponível
          </div>
        )}
      </div>
      <p className="truncate px-3 py-2 text-[8px] font-bold text-slate-400">{fileName(animationKey) || 'sem arquivo'}</p>
    </button>
  );
}

function selectionForItem(item: StoreItem) { return normalizeAvatarSelection({ avatarId: item.avatarKey, imageUrl: item.imageUrl, imageKey: item.imageKey, animationSlug: `${item.avatarKey}/${item.skinCode}`, animations: item.animations || defaultAnimationMap(item), skinCode: item.skinCode, skinName: item.skinName, accessType: item.accessType as any, displayName: item.displayName }); }
function defaultAnimationMap(item: StoreItem): AvatarAnimationMap { const imageBase = item.imageKey ? item.imageKey.replace(/\.[^.]+$/, '') : `atuem/avatar/${item.categoryName || 'Padrao'}/${item.avatarKey}/${item.skinCode}`; return { home: `${imageBase}-A.webm`, intro: `${imageBase}-A.webm`, lobby: `${imageBase}-1.webm`, victory: `${imageBase}-2.webm`, defeat: `${imageBase}-3.webm` }; }
function buildCategories(items: StoreItem[], rawCategories: any[]): StoreCategory[] { const byCategory = new Map<string, StoreItem[]>(); for (const item of items) { const keys = [item.categoryId, item.categorySlug, item.categoryName].filter(Boolean).map(String); for (const key of keys) byCategory.set(key, [...(byCategory.get(key) || []), item]); } const categories = rawCategories.map((category: any) => { const categoryItems = byCategory.get(String(category.id)) || byCategory.get(String(category.slug)) || byCategory.get(String(category.name)) || []; return { id: String(category.id || category.slug), slug: String(category.slug || category.id), name: String(category.name || category.slug || 'Categoria'), description: String(category.description || ''), r2Prefix: String(category.r2Prefix || ''), sortOrder: Number(category.sortOrder || 0), items: sortItems(categoryItems), ownedCount: categoryItems.filter((item) => !item.locked).length, totalCount: categoryItems.length }; }).filter((category: StoreCategory) => category.totalCount > 0); if (categories.length) return categories.sort((a: StoreCategory, b: StoreCategory) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)); return groupCategoriesFromItems(items); }
function groupCategoriesFromItems(items: StoreItem[]): StoreCategory[] { const map = new Map<string, StoreItem[]>(); for (const item of items) { const key = item.categorySlug || item.categoryName || 'geral'; map.set(key, [...(map.get(key) || []), item]); } return [...map.entries()].map(([id, categoryItems]) => ({ id, slug: id, name: categoryItems[0]?.categoryName || prettyCategoryName(id), sortOrder: 0, items: sortItems(categoryItems), ownedCount: categoryItems.filter((item) => !item.locked).length, totalCount: categoryItems.length })); }
function sameCharacter(item: StoreItem, selected: StoreItem) { return normalizeKey(item.avatarKey) === normalizeKey(selected.avatarKey) && String(item.categoryId || item.categorySlug) === String(selected.categoryId || selected.categorySlug); }
function sortItems(items: StoreItem[]) { return [...items].sort((a, b) => Number(!a.isDefaultSkin) - Number(!b.isDefaultSkin) || a.displayName.localeCompare(b.displayName) || a.sortOrder - b.sortOrder); }
function prettyCategoryName(value: string) { return String(value || 'Categoria').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function isEquipped(avatarUrl: string, item: StoreItem) { try { const parsed = avatarUrl.startsWith('avatar:') ? JSON.parse(decodeURIComponent(avatarUrl.slice(7))) : null; return parsed?.avatarId === item.avatarKey && parsed?.skinCode === item.skinCode; } catch { return avatarUrl.includes(item.imageKey || item.avatarKey); } }
function animationUrl(key: string) { if (!key) return ''; const filename = fileName(key) || 'animation.webm'; return `/api/r2-animation/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}`; }
function fileName(key: string) { return String(key || '').split('/').pop() || ''; }
function isUuid(value: string) { return value.length === 36 && value.includes('-'); }
function normalizeKey(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase(); }
