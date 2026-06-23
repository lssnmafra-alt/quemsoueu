'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Crown, Grid2X2, Plus, Search, Trash2 } from 'lucide-react';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { isProjectAdmin } from '@/lib/admin';
import { isOfficialDeckId } from '@/lib/officialDecks';

export default function DecksPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, initialized: authInitialized } = useUserStore();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckSearch, setDeckSearch] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deletingDeckId, setDeletingDeckId] = useState('');

  const isAdminUser = isProjectAdmin(user?.id);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) router.replace('/');
  }, [authInitialized, authLoading, router, user]);

  const fetchDecks = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: visibleDecks } = await supabaseGame
      .from('decks')
      .select('*')
      .or(`is_public.eq.true,creator_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const nextDecks = visibleDecks || [];
    if (!nextDecks.length) {
      setDecks([]);
      setLoading(false);
      return;
    }

    const { data: characters } = await supabaseGame
      .from('characters')
      .select('deck_id')
      .in('deck_id', nextDecks.map((deck: any) => deck.id));

    const counts = new Map<string, number>();
    (characters || []).forEach((character: any) => counts.set(character.deck_id, (counts.get(character.deck_id) || 0) + 1));

    setDecks(nextDecks.map((deck: any) => {
      const official = Boolean(deck.is_official) || deck.creator_id === null || isOfficialDeckId(deck.id);
      return { ...deck, is_official: official, character_count: counts.get(deck.id) || 0 };
    }));
    setLoading(false);
  };

  useEffect(() => {
    if (!authInitialized || authLoading || !user?.id) return;
    void fetchDecks();
  }, [authInitialized, authLoading, user?.id]);

  const filteredDecks = useMemo(() => {
    const query = deckSearch.trim().toLowerCase();
    return decks
      .filter((deck) => !query || String(deck.name || '').toLowerCase().includes(query))
      .sort((a, b) => Number(b.is_official) - Number(a.is_official) || (b.character_count || 0) - (a.character_count || 0));
  }, [deckSearch, decks]);

  const handleCreateDeck = async () => {
    const name = newDeckName.trim();
    if (!user?.id || !name || creatingDeck) return;

    setCreatingDeck(true);
    const { data, error } = await supabaseGame
      .from('decks')
      .insert({ name, creator_id: user.id, is_public: false, cover_url: '' })
      .select()
      .single();
    setCreatingDeck(false);

    if (error) {
      alert('Não foi possível criar o baralho agora.');
      return;
    }

    setNewDeckName('');
    if (data) router.push(`/decks/${data.id}`);
  };

  const handleRemoveDeck = async (deck: any) => {
    if (!user?.id || deletingDeckId) return;
    const canRemove = isAdminUser || (!deck.is_official && deck.creator_id === user.id);
    if (!canRemove) return;
    if (!confirm(`Remover o deck "${deck.name}"?`)) return;

    setDeletingDeckId(deck.id);
    try {
      const response = await fetch(`/api/decks/${deck.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
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
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 party-grid-bg">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" onClick={() => router.push('/')} className="h-12 w-12 rounded-2xl border-2 border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Biblioteca</p>
              <h1 className="font-display text-2xl md:text-3xl font-black text-indigo-950">Decks e personagens</h1>
              <p className="text-xs font-bold text-slate-500">{profile?.nickname || 'Jogador'}, organize seus baralhos separado do lobby.</p>
            </div>
          </div>
          {isAdminUser && <Button onClick={() => router.push('/decks/official/new')} className="h-12 px-5 rounded-2xl bg-amber-50 text-amber-700 border-2 border-amber-100 hover:bg-amber-100 text-xs font-black uppercase"><Crown className="mr-2 h-4 w-4" /> Novo oficial</Button>}
        </header>

        <section className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input value={newDeckName} onChange={(event) => setNewDeckName(event.target.value)} placeholder="NOME DO NOVO DECK..." className="h-12 rounded-xl border-2 border-indigo-100 bg-slate-50 text-sm font-black uppercase text-indigo-950" />
            <Button onClick={handleCreateDeck} disabled={!newDeckName.trim() || creatingDeck} className="h-12 px-8 btn-squishy-yellow text-amber-950 text-xs font-black uppercase"><Plus className="mr-2 h-4 w-4" /> Criar deck</Button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
            <Input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="PESQUISAR DECKS..." className="h-12 rounded-xl border-2 border-indigo-100 bg-slate-50 pl-12 text-sm font-black uppercase text-indigo-950" />
          </div>

          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-black uppercase text-indigo-950">{filteredDecks.length} decks encontrados</h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-center text-xs font-black uppercase text-indigo-400">Carregando decks...</div>
          ) : filteredDecks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">Nenhum deck encontrado.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredDecks.map((deck) => {
                const canRemove = isAdminUser || (!deck.is_official && deck.creator_id === user.id);
                return (
                  <div key={deck.id} className="rounded-2xl border-2 border-indigo-100 bg-white p-4 shadow-sm flex items-center gap-3">
                    <button type="button" onClick={() => router.push(`/decks/${deck.id}`)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-base font-black text-indigo-950">{deck.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase">
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">{deck.character_count || 0} personagens</span>
                        <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-500">{deck.is_public ? 'Público' : 'Privado'}</span>
                        {deck.is_official && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Oficial</span>}
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
      </div>
    </div>
  );
}
