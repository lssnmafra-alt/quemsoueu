'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, ImageOff, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

export default function OfficialDeckManagerPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [deck, setDeck] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [deckName, setDeckName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [newCharacterName, setNewCharacterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDeck, setSavingDeck] = useState(false);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [deletingCharacterId, setDeletingCharacterId] = useState('');
  const [error, setError] = useState('');

  const isOfficial = isOfficialDeckId(deckId) || deck?.creator_id === null;
  const canManageOfficialDeck = TEMP_OFFICIAL_DECK_EDITING_ENABLED && isOfficial;

  const fetchDeck = async () => {
    setLoading(true);
    setError('');

    try {
      const [{ data: deckData, error: deckError }, { data: characterData, error: characterError }] = await Promise.all([
        supabaseGame.from('decks').select('*').eq('id', deckId).single(),
        supabaseGame.from('characters').select('*').eq('deck_id', deckId).order('created_at', { ascending: true }),
      ]);

      if (deckError || !deckData) {
        throw deckError || new Error('Deck nao encontrado.');
      }

      if (characterError) throw characterError;

      setDeck(deckData);
      setDeckName(deckData.name || '');
      setCoverUrl(deckData.cover_url || deckData.image_url || '');
      setCharacters(characterData || []);
    } catch (fetchError: any) {
      setDeck(null);
      setCharacters([]);
      setError(fetchError.message || 'Nao foi possivel carregar o deck oficial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authInitialized || authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    void fetchDeck();
  }, [authInitialized, authLoading, user, deckId, router]);

  const handleSaveDeck = async () => {
    if (!canManageOfficialDeck || savingDeck) return;

    const cleanName = deckName.trim();
    const cleanCoverUrl = coverUrl.trim();
    setError('');

    if (!cleanName) {
      setError('O nome do deck nao pode ficar vazio.');
      return;
    }

    if (cleanName.length > 60) {
      setError('Use ate 60 caracteres no nome do deck.');
      return;
    }

    setSavingDeck(true);

    try {
      const nameResponse = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-deck-name', deckId, name: cleanName }),
      });
      const nameResult = await nameResponse.json().catch(() => ({}));
      if (!nameResponse.ok) throw new Error(nameResult.error || 'Nao foi possivel salvar o nome.');

      const coverResponse = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-cover', deckId, coverUrl: cleanCoverUrl }),
      });
      const coverResult = await coverResponse.json().catch(() => ({}));
      if (!coverResponse.ok) throw new Error(coverResult.error || 'Nao foi possivel salvar a imagem.');

      setDeck(coverResult.deck || nameResult.deck);
      setDeckName((coverResult.deck || nameResult.deck)?.name || cleanName);
      setCoverUrl((coverResult.deck || nameResult.deck)?.cover_url || cleanCoverUrl);
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar o deck oficial.');
    } finally {
      setSavingDeck(false);
    }
  };

  const handleAddCharacter = async () => {
    if (!canManageOfficialDeck || addingCharacter) return;

    const cleanName = newCharacterName.trim();
    setError('');

    if (!cleanName) {
      setError('Digite o nome do personagem.');
      return;
    }

    if (characters.length >= MAX_CHARACTERS_PER_DECK) {
      setError(`Cada baralho pode ter no maximo ${MAX_CHARACTERS_PER_DECK} personagens.`);
      return;
    }

    setAddingCharacter(true);

    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-character',
          deckId,
          name: cleanName,
          imageUrl: '',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel inserir o personagem oficial.');

      setCharacters((current) => [...current, result.character]);
      setNewCharacterName('');
    } catch (addError: any) {
      setError(addError.message || 'Nao foi possivel inserir o personagem oficial.');
    } finally {
      setAddingCharacter(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!canManageOfficialDeck || deletingCharacterId) return;

    const confirmed = confirm('Deseja realmente excluir este personagem?');
    if (!confirmed) return;

    setDeletingCharacterId(characterId);
    setError('');

    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-character', deckId, characterId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel excluir o personagem.');

      setCharacters((current) => current.filter((character) => character.id !== characterId));
    } catch (deleteError: any) {
      setError(deleteError.message || 'Nao foi possivel excluir o personagem.');
    } finally {
      setDeletingCharacterId('');
    }
  };

  if (!authInitialized || authLoading || loading) {
    return <LoadingArena label="Carregando editor oficial..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex flex-col relative overflow-hidden party-grid-bg">
      <div className="max-w-5xl mx-auto w-full space-y-6 relative z-10">
        <div className="p-5 bg-white border-4 border-indigo-100 flex items-center justify-between gap-4 rounded-3xl shadow-md">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-12 h-12 rounded-2xl border-2 border-slate-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3px]" />
            </Button>

            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight truncate">
                Editor de deck oficial
              </h1>
              <p className="text-xs text-indigo-600 font-extrabold">
                {characters.length}/{MAX_CHARACTERS_PER_DECK} personagens criados
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => router.push(`/decks/${deckId}`)}
            className="h-11 px-4 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-black text-xs uppercase cursor-pointer flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir deck
          </Button>
        </div>

        {!canManageOfficialDeck ? (
          <div className="rounded-3xl border-4 border-rose-100 bg-white p-6 text-sm font-bold text-rose-600 shadow-md">
            Este deck nao esta liberado como deck oficial editavel.
          </div>
        ) : (
          <>
            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Dados do deck</h2>

              <div className="grid md:grid-cols-[160px_1fr] gap-5">
                <div className="w-full h-44 rounded-2xl border-4 border-indigo-50 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-10 h-10 text-indigo-200" />
                  )}
                </div>

                <div className="space-y-3">
                  <Input
                    value={deckName}
                    maxLength={60}
                    onChange={(event) => setDeckName(event.target.value)}
                    placeholder="Nome do deck oficial"
                    className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
                  />

                  <Input
                    value={coverUrl}
                    onChange={(event) => setCoverUrl(event.target.value)}
                    placeholder="URL da imagem do deck"
                    className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveDeck}
                      disabled={savingDeck || !deckName.trim()}
                      className="h-11 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {savingDeck ? 'Salvando...' : 'Salvar deck'}
                    </Button>

                    {coverUrl && (
                      <Button
                        type="button"
                        onClick={() => setCoverUrl('')}
                        className="h-11 px-5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ImageOff className="w-4 h-4" />
                        Limpar imagem
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Adicionar personagem</h2>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newCharacterName}
                  onChange={(event) => setNewCharacterName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleAddCharacter();
                    }
                  }}
                  placeholder="Nome do personagem"
                  className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
                />

                <Button
                  type="button"
                  onClick={handleAddCharacter}
                  disabled={addingCharacter || !newCharacterName.trim() || characters.length >= MAX_CHARACTERS_PER_DECK}
                  className="h-12 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {addingCharacter ? 'Inserindo...' : 'Inserir personagem'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-600">
                {error}
              </div>
            )}

            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Personagens</h2>

              {characters.length === 0 ? (
                <div className="rounded-2xl border-4 border-dashed border-indigo-50 bg-slate-50 p-8 text-center text-sm font-black text-slate-400 uppercase">
                  Ainda nao tem personagens.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {characters.map((character) => (
                    <div key={character.id} className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-indigo-950 truncate">{character.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{character.image_url ? 'Imagem anexada' : 'Sem imagem'}</p>
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        onClick={() => handleDeleteCharacter(character.id)}
                        disabled={deletingCharacterId === character.id}
                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
