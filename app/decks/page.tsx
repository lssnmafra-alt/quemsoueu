'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Crown, Grid2X2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { isProjectAdmin } from '@/lib/admin';
import { isOfficialDeckId } from '@/lib/officialDecks';
import GameTopNav from '@/components/navigation/GameTopNav';

const sanitizeDeckImageUrl = (value?: string | null) => {
  const url = String(value || '').trim();
  if (!url) return '';

  if (url.includes('image.pollinations.ai') && url.includes('fallback')) return '';

  return url;
};

export default function DecksPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, initialized: authInitialized } = useUserStore();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckSearch, setDeckSearch] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deletingDeckId, setDeletingDeckId] = useState('');
  const [notice, setNotice] = useState('');

  const isAdminUser = isProjectAdmin(user?.id);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) router.replace('/');
  }, [authInitialized, authLoading, router, user]);

  const fetchDecks = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: visibleDecks } = await supabaseGame.from('decks').select('*').or(`is_public.eq.true,creator_id.eq.${user.id}`).order('created_at', { ascending: false });
    const nextDecks = visibleDecks || [];
    if (!nextDecks.length) {
      setDecks([]);
      setLoading(false);
      return;
    }

    const { data: characters } = await supabaseGame.from('characters').select('deck_id').in('deck_id', nextDecks.map((deck: any) => deck.id));
    const counts = new Map<string, number>();
    (characters || []).forEach((character: any) => counts.set(character.deck_id, (counts.get(character.deck_id) || 0) + 1));

    setDecks(nextDecks.map((deck: any) => {
      const official = Boolean(deck.is_official) || deck.creator_id === null || isOfficialDeckId(deck.id);
      return {
        ...deck,
        cover_url: sanitizeDeckImageUrl(deck.cover_url || deck.image_url),
        is_official: official,
        character_count: counts.get(deck.id) || 0,
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    if (!authInitialized || authLoading || !user?.id) return;
    void fetchDecks();
  }, [authInitialized, authLoading, user?.id]);

  const filteredDecks = useMemo(() => {
    const query = deckSearch.trim().toLowerCase();
    return decks.filter((deck) => !query || String(deck.name || '').toLowerCase().includes(query)).sort((a, b) => Number(b.is_official) - Number(a.is_official) || (b.character_count || 0) - (a.character_count || 0));
  }, [deckSearch, decks]);

  const handleCreateDeck = async () => {
    const name = newDeckName.trim();
    if (!user?.id || !name || creatingDeck) return;

    setCreatingDeck(true);
    setNotice('Criando deck...');

    try {
      const { data, error } = await supabaseGame.from('decks').insert({ name, creator_id: user.id, is_public: false, cover_url: '' }).select().single();

      if (error) throw error;

      setNewDeckName('');
      setNotice('Deck criado. Abrindo editor...');
      if (data) router.push(`/decks/${data.id}`);
    } catch (error: any) {
      setNotice('Não foi possível criar o deck agora. Tente novamente.');
      alert(error.message || 'Não foi possível criar o baralho agora.');
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleRemoveDeck = async (deck: any) => {
    if (!user?.id || deletingDeckId) return;
    const canRemove = isAdminUser || (!deck.is_official && deck.creator_id === user.id);
    if (!canRemove) return;
    if (!confirm(`Remover o deck "${deck.name}"?`)) return;

    setDeletingDeckId(deck.id);
    try {
      const response = await fetch(`/api/decks/${deck.id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível remover o deck.');
      setDecks((current) => current.filter((item) => item.id !== deck.id));
    } catch (error: any) {
      alert(error.message || 'Não foi possível remover o deck.');
    } finally {
      setDeletingDeckId('');
    }
  };

  if (!authInitialized || authLoading || !user) return <LoadingArena label="Abrindo biblioteca de decks..." />;

  return (
    <div className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={profile} isAdmin={isAdminUser} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-8 pt-28 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Biblioteca</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Decks</h1>
            <p className="mt-2 text-sm font-bold text-blue-100">Crie, organize e escolha seus baralhos fora do lobby.</p>
          </div>
          {isAdminUser && <Button onClick={() => router.push('/decks/official/new')} className="h-14 rounded-none border-2 border-amber-200/70 bg-amber-400 px-6 text-xs font-black uppercase text-amber-950 shadow-[0_6px_0_#b45309] hover:bg-amber-300"><Crown className="mr-2 h-4 w-4" /> Novo oficial</Button>}
        </header>

        <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-6">
          {notice && <div className="mb-4 rounded-2xl border-2 border-cyan-200/20 bg-white/10 px-4 py-3 text-xs font-black uppercase text-cyan-100">{notice}</div>}

          <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-2xl border-2 border-yellow-200/30 bg-yellow-300/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-100">
                <Plus className="h-4 w-4" /> Criar deck
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  value={newDeckName}
                  onChange={(event) => { setNewDeckName(event.target.value); if (notice) setNotice(''); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateDeck(); }}
                  placeholder="NOME DO NOVO DECK..."
                  className="h-14 rounded-none border-2 border-yellow-200/30 bg-white/10 text-sm font-black uppercase text-white placeholder:text-blue-100/70 focus-visible:ring-yellow-300"
                />
                <Button onClick={handleCreateDeck} disabled={!newDeckName.trim() || creatingDeck} className="h-14 rounded-none bg-yellow-300 px-8 text-xs font-black uppercase text-slate-950 shadow-[0_6px_0_#b45309] hover:bg-yellow-200 disabled:opacity-60">
                  {creatingDeck ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando</> : <><Plus className="mr-2 h-4 w-4" /> Criar</>}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                <Search className="h-4 w-4" /> Pesquisar decks existentes
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-200" />
                <Input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="DIGITE PARA FILTRAR A LISTA..." className="h-14 rounded-none border-2 border-cyan-200/30 bg-white/10 pl-12 text-sm font-black uppercase text-white placeholder:text-blue-100/70 focus-visible:ring-yellow-300" />
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 border-b border-cyan-200/20 pb-3">
            <BookOpen className="h-5 w-5 text-cyan-200" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100">{filteredDecks.length} decks encontrados</h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-8 text-center text-xs font-black uppercase text-cyan-100">Carregando decks...</div>
          ) : filteredDecks.length === 0 ? (
            <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-8 text-center text-sm font-bold text-blue-100">Nenhum deck encontrado.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDecks.map((deck) => {
                const canRemove = isAdminUser || (!deck.is_official && deck.creator_id === user.id);
                const deckCoverUrl = sanitizeDeckImageUrl(deck.cover_url || deck.image_url);
                return (
                  <div key={deck.id} className="flex items-center gap-3 rounded-2xl border-2 border-cyan-200/20 bg-white/95 p-4 text-[#1e1b4b] shadow-xl transition hover:-translate-y-1 hover:border-yellow-300">
                    <button type="button" onClick={() => router.push(`/decks/${deck.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-indigo-100 bg-indigo-50 shadow-sm">
                        {deckCoverUrl ? (
                          <img
                            src={deckCoverUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-indigo-300">
                            <BookOpen className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-black font-display">{deck.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase">
                          <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">{deck.character_count || 0} personagens</span>
                          <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-500">{deck.is_public ? 'Público' : 'Privado'}</span>
                          {deck.is_official && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Oficial</span>}
                        </div>
                      </div>
                    </button>
                    <Button type="button" variant="outline" onClick={() => router.push(`/decks/${deck.id}`)} className="h-10 w-10 rounded-xl border-indigo-100 p-0"><Grid2X2 className="h-4 w-4" /></Button>
                    {canRemove && <Button type="button" variant="outline" disabled={deletingDeckId === deck.id} onClick={() => handleRemoveDeck(deck)} className="h-10 w-10 rounded-xl border-rose-100 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
