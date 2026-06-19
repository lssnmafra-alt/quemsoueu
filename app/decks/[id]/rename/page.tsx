'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Layers, Save } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

export default function OfficialDeckRenamePage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [deck, setDeck] = useState<any>(null);
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isOfficialDeck = isOfficialDeckId(deckId);
  const canEditOfficialDeck = TEMP_OFFICIAL_DECK_EDITING_ENABLED && isOfficialDeck;

  useEffect(() => {
    if (!authInitialized || authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    const fetchDeck = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const { data, error: deckError } = await supabaseGame
          .from('decks')
          .select('*')
          .eq('id', deckId)
          .single();

        if (deckError || !data) {
          setDeck(null);
          setDeckName('');
          setError('Deck nao encontrado.');
          return;
        }

        setDeck(data);
        setDeckName(data.name || '');
      } catch (fetchError: any) {
        setDeck(null);
        setDeckName('');
        setError(fetchError.message || 'Nao foi possivel carregar o deck.');
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [authInitialized, authLoading, user, deckId, router]);

  const handleSaveName = async () => {
    if (!canEditOfficialDeck || saving) return;

    const cleanName = deckName.trim();
    setError('');
    setMessage('');

    if (!cleanName) {
      setError('O nome do deck nao pode ficar vazio.');
      return;
    }

    if (cleanName.length > 60) {
      setError('Use um nome com ate 60 caracteres.');
      return;
    }

    if (cleanName === String(deck?.name || '').trim()) {
      setMessage('Esse nome ja esta salvo.');
      return;
    }

    setSaving(true);

    try {
      const isSafeName = await moderateText(cleanName);

      if (!isSafeName) {
        setError('Nome inadequado nao permitido.');
        return;
      }

      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-deck-name',
          deckId,
          name: cleanName,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel salvar o nome do deck.');
      }

      setDeck(result.deck);
      setDeckName(result.deck?.name || cleanName);
      setMessage('Nome do deck oficial salvo.');
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar o nome do deck.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingArena label="Carregando deck oficial..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex items-center justify-center party-grid-bg">
      <div className="w-full max-w-2xl bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/decks/${deckId}`)}
            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-12 h-12 rounded-2xl border-2 border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3px]" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
              <Layers className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight truncate">
                Editar nome do deck oficial
              </h1>
              <p className="text-xs text-slate-500 font-bold truncate">{deck?.name || 'Deck oficial'}</p>
            </div>
          </div>
        </div>

        {!canEditOfficialDeck ? (
          <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">
            Este deck nao esta liberado para edicao oficial manual.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-indigo-700">Nome do deck</label>
              <Input
                value={deckName}
                maxLength={60}
                onChange={(event) => {
                  setDeckName(event.target.value);
                  if (error) setError('');
                  if (message) setMessage('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSaveName();
                  }
                }}
                placeholder="Digite o novo nome do deck oficial..."
                className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
              />
              <p className="text-[11px] text-slate-400 font-bold">Limite: {deckName.trim().length}/60 caracteres.</p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-600">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                {message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSaveName}
                disabled={saving || !deckName.trim()}
                className="h-11 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar nome'}
              </Button>

              <Button
                type="button"
                onClick={() => router.push(`/decks/${deckId}`)}
                className="h-11 px-5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 font-black text-xs uppercase cursor-pointer"
              >
                Voltar ao deck
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
