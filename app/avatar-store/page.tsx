'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Lock, Check, ArrowLeft, ShoppingCart } from 'lucide-react';
import GameTopNav from '@/components/navigation/GameTopNav';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { avatarSelectionToUrl, normalizeAvatarSelection } from '@/lib/avatars';
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
  const [coins, setCoins] = useState(0);
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

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0], [items, selectedId]);
  const equippedAvatarUrl = profile?.avatar_url || '';

  async function loadStore() {
    if (!user?.id) return;
    setLoadingStore(true);
    setNotice('');
    const response = await fetch(`/api/avatar-store/catalog?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({ items: [] }));
    const nextItems = Array.isArray(result.items) ? result.items : [];
    setItems(nextItems);
    setCoins(Number(result.wallet?.coins || 0));
    setSelectedId((current) => current || nextItems[0]?.id || '');
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
        body: JSON.stringify({ userId: user.id, skinId: item.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível comprar.');
      if (result.wallet) setCoins(Number(result.wallet.coins || 0));
      setNotice('Skin desbloqueada.');
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

        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const active = selected?.id === item.id;
                const equipped = equippedAvatarUrl.includes(encodeURIComponent(item.avatarKey)) || equippedAvatarUrl.includes(item.avatarKey);
                return (
                  <button key={`${item.id}-${item.skinCode}`} type="button" onClick={() => setSelectedId(item.id)} className={cn('relative overflow-hidden rounded-3xl border-4 bg-white text-left shadow-xl transition-all hover:-translate-y-1', active ? 'border-yellow-300 ring-4 ring-yellow-300/25' : 'border-white/15')}>
                    <div className="relative aspect-[3/4] overflow-hidden bg-red-800">
                      <img src={item.imageUrl} alt={item.displayName} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-12">
                        <p className="truncate text-xl font-black text-white font-display">{item.displayName}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase text-yellow-200">{rarityLabel[item.rarity] || item.rarity}</span>
                          {equipped ? <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-emerald-950">EQUIPADO</span> : item.locked ? <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white"><Lock className="h-3 w-3" /> {item.priceCoins}</span> : <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-slate-950">LIBERADO</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl border-4 border-cyan-200/25 bg-white p-5 text-slate-950 shadow-2xl lg:sticky lg:top-24 lg:h-fit">
            {selected ? (
              <>
                <div className="mb-4 overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-50">
                  <AvatarFigure selection={normalizeAvatarSelection({ avatarId: selected.avatarKey, imageUrl: selected.imageUrl, imageKey: selected.imageKey, animationSlug: `${selected.avatarKey}/${selected.skinCode}`, skinCode: selected.skinCode, skinName: selected.skinName, accessType: selected.accessType as any, displayName: selected.displayName })} className="aspect-[3/4] w-full border-0 rounded-none" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{rarityLabel[selected.rarity] || selected.rarity} • {selected.skinName}</p>
                <h2 className="text-3xl font-black uppercase text-slate-950 font-display">{selected.displayName}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">Ícone, lobby e animações do jogo ficam amarrados a essa skin.</p>
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
