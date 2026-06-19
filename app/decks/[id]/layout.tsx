'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

export default function DeckRouteLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const deckId = params.id as string;
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [isOpen, setIsOpen] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [originalDeckName, setOriginalDeckName] = useState('');
  const [isDatabaseOfficialDeck, setIsDatabaseOfficialDeck] = useState(false);
  const [loadingDeckName, setLoadingDeckName] = useState(false);
  const [savingDeckName, setSavingDeckName] = useState(false);
  const [error, setError] = useState('');

  const isStaticOfficialDeck = isOfficialDeckId(deckId);
  const isDeckRoute = pathname === `/decks/${deckId}`;
  const canInspectOfficialDeck = Boolean(
    user && authInitialized && !authLoading && TEMP_OFFICIAL_DECK_EDITING_ENABLED && isDeckRoute && deckId,
  );
  const canEditOfficialDeck = Boolean(canInspectOfficialDeck && (isStaticOfficialDeck || isDatabaseOfficialDeck));

  useEffect(() => {
    if (!canInspectOfficialDeck) return;

    const fetchDeckName = async () => {
      setLoadingDeckName(true);

      try {
        const { data, error: deckError } = await supabaseGame
          .from('decks')
          .select('name, creator_id')
          .eq('id', deckId)
          .single();

        if (deckError) throw deckError;

        const name = String(data?.name || '');
        setDeckName(name);
        setOriginalDeckName(name);
        setIsDatabaseOfficialDeck(data?.creator_id === null);
      } catch (fetchError: any) {
        setIsDatabaseOfficialDeck(false);
        setError(fetchError.message || 'Nao foi possivel carregar o nome do deck.');
      } finally {
        setLoadingDeckName(false);
      }
    };

    void fetchDeckName();
  }, [canInspectOfficialDeck, deckId]);

  const handleSaveDeckName = async () => {
    if (!canEditOfficialDeck || savingDeckName) return;

    const cleanName = deckName.trim();
    setError('');

    if (!cleanName) {
      setError('O nome do deck nao pode ficar vazio.');
      return;
    }

    if (cleanName.length > 60) {
      setError('Use ate 60 caracteres.');
      return;
    }

    if (cleanName === originalDeckName.trim()) {
      setIsOpen(false);
      return;
    }

    setSavingDeckName(true);

    try {
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

      setOriginalDeckName(result.deck?.name || cleanName);
      setDeckName(result.deck?.name || cleanName);
      setIsOpen(false);
      window.location.reload();
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar o nome do deck.');
    } finally {
      setSavingDeckName(false);
    }
  };

  return (
    <>
      {children}

      {canEditOfficialDeck && (
        <div className="fixed left-4 bottom-24 z-[80] sm:left-6 sm:bottom-6">
          {!isOpen ? (
            <Button
              type="button"
              onClick={() => setIsOpen(true)}
              className="h-14 px-4 rounded-2xl bg-white text-indigo-700 border-4 border-indigo-100 shadow-lg hover:bg-indigo-50 font-black text-xs uppercase cursor-pointer flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Editar nome
            </Button>
          ) : (
            <div className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl bg-white border-4 border-indigo-100 shadow-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-indigo-500">Deck oficial</p>
                  <h2 className="text-lg font-black text-indigo-950 leading-tight">Editar nome</h2>
                </div>

                <Button
                  type="button"
                  size="icon"
                  onClick={() => {
                    setDeckName(originalDeckName);
                    setError('');
                    setIsOpen(false);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={deckName}
                maxLength={60}
                disabled={loadingDeckName || savingDeckName}
                onChange={(event) => {
                  setDeckName(event.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSaveDeckName();
                  }
                }}
                placeholder="Nome do deck oficial..."
                className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
              />

              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

              <Button
                type="button"
                onClick={handleSaveDeckName}
                disabled={loadingDeckName || savingDeckName || !deckName.trim()}
                className="w-full h-11 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingDeckName ? 'Salvando...' : 'Salvar nome'}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
