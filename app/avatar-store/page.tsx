'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Lock, Check, ArrowLeft, ShoppingCart, Shirt, Layers3 } from 'lucide-react';
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

const rarityLabel: Record<string, string> = {
  common: 'COMUM',
  rare: 'RARO',
  epic: 'ÉPICO',
  legendary: 'LENDÁRIO',
  mythic: 'MÍTICO',
};

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
        body: JSON.stringify({
          userId: user.id,
          skinId: item.id,
          avatarKey: item.avatarKey,
          displayName: item.displayName,
          skinCode: item.skinCode,
          skinName: item.skinName,
          imageKey: item.imageKey,
          priceCoins: item.priceCoins,
          sortOrder: item.sortOrder,
          isDefaultSkin: Boolean(item.isDefaultSkin),
        }),
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
      let response = await fetch('/api/avatar-store/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, skinId: item.id }),
      });
      let result = await response.json().catch(() => ({}));

      if (!response.ok && !isUuid(item.id)) {
        const avatarUrl = avatarSelectionToUrl(normalizeAvatarSelection({
          avatarId: item.avatarKey,
          imageUrl: item.imageUrl,
          imageKey: item.imageKey,
          animationSlug: `${item.avatarKey}/${item.skinCode}`,
          animations: item.animations || defaultAnimationMap(item),
          skinCode: item.skinCode,
          skinName: item.skinName,
          accessType: item.accessType as any,
          displayName: item.displayName,
        }));

        response = await fetch('/api/player-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profile, id: user.id, avatar_url: avatarUrl, nickname: profile?.nickname || user.email?.split('@')[0] || 'Jogador', profile_completed: true, is_guest: Boolean(profile?.is_guest || user.email?.includes('@guest.com')) }),
        });
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

      <main className="relative z-10 mx-auto max-w-[1500px] px-4 pb-10 pt-24 md:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <button type="button" onClick={() => router.push('/')} className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-100 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Loja de personagens</p>
            <h1 className="text-4xl font-black uppercase italic text-white md:text-6xl font-display">Avatar Store</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border-4 border-yellow-300 bg-yellow-300 px-5 py-3 text-slate-950 shadow-[0_6px_0_#b45309]">
            <Coins className="h-5 w-5" />
            <span className="text-xl font-black">{coins}</span>
          </div>
        </div>

        {notice && <div className="mb-4 rounded-2xl border-2 border-cyan-200/30 bg-white/10 px-4 py-3 text-sm font-black uppercase text-cyan-50">{notice}</div>}

        <div className="grid gap-5 lg:grid-cols-[280px_1fr_420px]">
          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-3 shadow-2xl backdrop-blur-xl lg:sticky lg:top-24 lg:h-fit">
            <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100">Categorias</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {categories.map((category) => {
                const active = selectedCategory?.id === category.id;
                const cover = category.items[0];
                return (
                  <button key={category.id} type="button" onClick={() => { setSelectedCategoryId(category.id); setSelectedId(category.items[0]?.id || ''); }} className={cn('relative overflow-hidden rounded-2xl border-4 bg-white text-left transition-all hover:-translate-y-1', active ? 'border-yellow-300 ring-4 ring-yellow-300/20' : 'border-white/15')}>
                    <div className="relative aspect-square overflow-hidden bg-red-800 lg:aspect-[5/3]">
                      {cover?.imageUrl ? <img src={cover.imageUrl} alt={category.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-red-700 to-red-950" />}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-3 pt-10">
                        <p className="truncate text-base font-black uppercase text-white">{category.name}</p>
                        <p className="text-[10px] font-black text-yellow-200">{category.ownedCount}/{category.totalCount} liberados</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100">Categoria</p>
                <h2 className="text-3xl font-black uppercase italic text-white font-display">{selectedCategory?.name || 'Loja'}</h2>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black uppercase text-cyan-100"><Layers3 className="mr-1 inline h-4 w-4" /> {categoryItems.length}</div>
            </div>

            {categoryItems.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-cyan-200/25 bg-white/10 p-8 text-center text-xs font-black uppercase text-cyan-100">Nenhum item ativo nesta categoria.</div>
            ) : (
              <div className="space-y-6">
                <ItemGrid title="Já liberados" items={ownedItems} selectedId={selected?.id || ''} equippedAvatarUrl={equippedAvatarUrl} onSelect={setSelectedId} />
                <ItemGrid title="Disponíveis para comprar" items={lockedItems} selectedId={selected?.id || ''} equippedAvatarUrl={equippedAvatarUrl} onSelect={setSelectedId} />
              </div>
            )}
          </section>

          <aside className="rounded-3xl border-4 border-cyan-200/25 bg-white p-5 text-slate-950 shadow-2xl lg:sticky lg:top-24 lg:h-fit">
            {selected ? (
              <>
                <div className="mb-4 overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-50">
                  <AvatarFigure selection={selectionForItem(selected)} className="aspect-[3/4] w-full border-0 rounded-none" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{selected.categoryName || selectedCategory?.name} • {rarityLabel[selected.rarity] || selected.rarity} • {selected.skinName}</p>
                <h2 className="text-3xl font-black uppercase text-slate-950 font-display">{selected.displayName}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">Esta skin controla a imagem e as animações usadas na home, lobby, sala e final da partida.</p>
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-xs font-black uppercase text-slate-500">
                  Lobby: {selected.animations?.lobby ? 'ok' : 'padrão'} • Vitória: {selected.animations?.victory ? 'ok' : 'padrão'} • Derrota: {selected.animations?.defeat ? 'ok' : 'padrão'}
                </div>
                <Button type="button" disabled={busyId === selected.id} onClick={() => equip(selected)} className="mt-5 h-14 w-full rounded-none bg-yellow-300 text-slate-950 text-sm font-black uppercase shadow-[0_6px_0_#b45309] hover:bg-yellow-200">
                  {busyId === selected.id ? 'Aguarde...' : selected.locked ? <><ShoppingCart className="mr-2 h-5 w-5" /> Comprar {selected.priceCoins}</> : <><Check className="mr-2 h-5 w-5" /> Equipar</>}
                </Button>
              </>
            ) : (
              <div className="py-12 text-center text-sm font-bold text-slate-500">Nenhuma skin cadastrada.</div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ItemGrid({ title, items, selectedId, equippedAvatarUrl, onSelect }: { title: string; items: StoreItem[]; selectedId: string; equippedAvatarUrl: string; onSelect: (id: string) => void }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">{title}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const active = selectedId === item.id;
          const equipped = isEquipped(equippedAvatarUrl, item);
          return (
            <button key={`${item.id}-${item.skinCode}`} type="button" onClick={() => onSelect(item.id)} className={cn('relative overflow-hidden rounded-3xl border-4 bg-white text-left shadow-xl transition-all hover:-translate-y-1', active ? 'border-yellow-300 ring-4 ring-yellow-300/25' : 'border-white/15')}>
              <div className="relative aspect-[3/4] overflow-hidden bg-red-800">
                {item.imageUrl ? <img src={item.imageUrl} alt={`${item.displayName} ${item.skinName}`} className="h-full w-full object-cover" /> : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-12">
                  <p className="truncate text-lg font-black text-white font-display">{item.displayName}</p>
                  <p className="truncate text-xs font-black text-white/90">{item.skinName}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-yellow-200">{rarityLabel[item.rarity] || item.rarity}</span>
                    {equipped ? <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-emerald-950">EQUIPADO</span> : item.locked ? <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white"><Lock className="h-3 w-3" /> {item.priceCoins}</span> : <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-slate-950">LIBERADO</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function selectionForItem(item: StoreItem) {
  return normalizeAvatarSelection({
    avatarId: item.avatarKey,
    imageUrl: item.imageUrl,
    imageKey: item.imageKey,
    animationSlug: `${item.avatarKey}/${item.skinCode}`,
    animations: item.animations || defaultAnimationMap(item),
    skinCode: item.skinCode,
    skinName: item.skinName,
    accessType: item.accessType as any,
    displayName: item.displayName,
  });
}

function defaultAnimationMap(item: StoreItem): AvatarAnimationMap {
  const imageBase = item.imageKey ? item.imageKey.replace(/\.[^.]+$/, '') : `atuem/avatar/${item.categoryName || 'Padrao'}/${item.avatarKey}/${item.skinCode}`;
  return {
    home: `${imageBase}-A.mp4`,
    intro: `${imageBase}-A.mp4`,
    lobby: `${imageBase}-1.mp4`,
    victory: `${imageBase}-2.mp4`,
    defeat: `${imageBase}-3.mp4`,
  };
}

function buildCategories(items: StoreItem[], rawCategories: any[]): StoreCategory[] {
  const byCategory = new Map<string, StoreItem[]>();
  for (const item of items) {
    const key = item.categoryId || item.categorySlug || 'geral';
    byCategory.set(key, [...(byCategory.get(key) || []), item]);
  }

  const categories = rawCategories.map((category: any) => {
    const categoryItems = byCategory.get(String(category.id)) || byCategory.get(String(category.slug)) || [];
    return {
      id: String(category.id || category.slug),
      slug: String(category.slug || category.id),
      name: String(category.name || category.slug || 'Categoria'),
      description: String(category.description || ''),
      r2Prefix: String(category.r2Prefix || ''),
      sortOrder: Number(category.sortOrder || 0),
      items: sortItems(categoryItems),
      ownedCount: categoryItems.filter((item) => !item.locked).length,
      totalCount: categoryItems.length,
    };
  }).filter((category: StoreCategory) => category.totalCount > 0);

  if (categories.length) return categories.sort((a: StoreCategory, b: StoreCategory) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return groupCategoriesFromItems(items);
}

function groupCategoriesFromItems(items: StoreItem[]): StoreCategory[] {
  const map = new Map<string, StoreItem[]>();
  for (const item of items) {
    const key = item.categorySlug || item.categoryName || 'geral';
    map.set(key, [...(map.get(key) || []), item]);
  }

  return [...map.entries()].map(([id, categoryItems]) => ({
    id,
    slug: id,
    name: categoryItems[0]?.categoryName || prettyCategoryName(id),
    sortOrder: 0,
    items: sortItems(categoryItems),
    ownedCount: categoryItems.filter((item) => !item.locked).length,
    totalCount: categoryItems.length,
  }));
}

function sortItems(items: StoreItem[]) {
  return [...items].sort((a, b) => Number(!a.isDefaultSkin) - Number(!b.isDefaultSkin) || a.displayName.localeCompare(b.displayName) || a.sortOrder - b.sortOrder);
}

function prettyCategoryName(value: string) {
  return String(value || 'Categoria').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEquipped(avatarUrl: string, item: StoreItem) {
  try {
    const parsed = avatarUrl.startsWith('avatar:') ? JSON.parse(decodeURIComponent(avatarUrl.slice(7))) : null;
    return parsed?.avatarId === item.avatarKey && parsed?.skinCode === item.skinCode;
  } catch {
    return avatarUrl.includes(item.imageKey || item.avatarKey);
  }
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}
