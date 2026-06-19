'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, Plus } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

export default function NewOfficialDeckPage() {
  const router = useRouter();
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authInitialized || authLoading) return;

    if (!user) {
      router.push('/');
    }
  }, [authInitialized, authLoading, router, user]);

  const handleCreateOfficialDeck = async () => {
    if (creating || !TEMP_OFFICIAL_DECK_EDITING_ENABLED) return;

    const cleanName = name.trim();
    const cleanCoverUrl = coverUrl.trim();
    setError('');

    if (!cleanName) {
      setError('Digite o nome do deck oficial.');
      return;
    }

    if (cleanName.length > 60) {
      setError('Use ate 60 caracteres no nome.');
      return;
    }

    setCreating(true);

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
          action: 'create-official-deck',
          name: cleanName,
          coverUrl: cleanCoverUrl,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel criar o deck oficial.');
      }

      if (!result.deck?.id) {
        throw new Error('Deck criado sem ID valido.');
      }

      router.push(`/decks/${result.deck.id}`);
    } catch (createError: any) {
      setError(createError.message || 'Nao foi possivel criar o deck oficial.');
    } finally {
      setCreating(false);
    }
  };

  if (!authInitialized || authLoading) {
    return <LoadingArena label="Carregando criador oficial..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex items-center justify-center party-grid-bg">
      <div className="w-full max-w-2xl bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-12 h-12 rounded-2xl border-2 border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3px]" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
              <Crown className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight truncate">
                Criar deck oficial
              </h1>
              <p className="text-xs text-slate-500 font-bold truncate">Novo baralho oficial editavel</p>
            </div>
          </div>
        </div>

        {!TEMP_OFFICIAL_DECK_EDITING_ENABLED ? (
          <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">
            Criacao oficial desativada no momento.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-indigo-700">Nome do deck oficial</label>
              <Input
                value={name}
                maxLength={60}
                disabled={creating}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreateOfficialDeck();
                  }
                }}
                placeholder="Ex: Heróis de Cinema 2"
                className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
              />
              <p className="text-[11px] text-slate-400 font-bold">Limite: {name.trim().length}/60 caracteres.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-indigo-700">Imagem do deck opcional</label>
              <Input
                value={coverUrl}
                disabled={creating}
                onChange={(event) => setCoverUrl(event.target.value)}
                placeholder="Cole uma URL de imagem ou deixe vazio"
                className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-600">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateOfficialDeck}
              disabled={creating || !name.trim()}
              className="w-full h-12 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Criando...' : 'Criar deck oficial'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
