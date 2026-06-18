'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { isOfficialDeckId } from '@/lib/officialDecks';
import LoadingArena from '@/components/LoadingArena';
import CharacterImage from '@/components/CharacterImage';

export default function OfficialDeckGeminiPage() {
  return (
    <Suspense fallback={<LoadingArena label="Carregando gerador Gemini..." />}>
      <OfficialDeckGeminiInner />
    </Suspense>
  );
}

function OfficialDeckGeminiInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') || '';
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [deck, setDeck] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckPrompt, setDeckPrompt] = useState('');
  const [characterPrompts, setCharacterPrompts] = useState<Record<string, string>>({});
  const [generatingDeck, setGeneratingDeck] = useState(false);
  const [generatingCharacterId, setGeneratingCharacterId] = useState('');

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    if (!deckId || !isOfficialDeckId(deckId)) {
      setDeck(null);
      setCharacters([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const [{ data: deckData }, { data: characterData }] = await Promise.all([
        supabaseGame.from('decks').select('*').eq('id', deckId).maybeSingle(),
        supabaseGame.from('characters').select('*').eq('deck_id', deckId).order('name', { ascending: true }),
      ]);

      setDeck(deckData || null);
      setCharacters(characterData || []);
      setLoading(false);
    };

    void load();
  }, [authInitialized, authLoading, user, deckId, router]);

  const generateDeckImage = async () => {
    const prompt = deckPrompt.trim();
    if (!prompt || !deck || generatingDeck) return;

    setGeneratingDeck(true);
    try {
      const response = await fetch('/api/gemini/deck-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, prompt }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Nao foi possivel gerar imagem do deck.');
      setDeck((current: any) => ({ ...current, ...result.deck, cover_url: result.imageUrl }));
      setDeckPrompt('');
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel gerar imagem do deck.');
    } finally {
      setGeneratingDeck(false);
    }
  };

  const generateCharacterImage = async (character: any) => {
    const prompt = String(characterPrompts[character.id] || '').trim();
    if (!prompt || generatingCharacterId) return;

    setGeneratingCharacterId(character.id);
    try {
      const response = await fetch('/api/gemini/character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, prompt }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Nao foi possivel gerar imagem do personagem.');
      setCharacters((current) => current.map((item) => item.id === character.id ? { ...item, ...result.character, image_url: result.imageUrl } : item));
      setCharacterPrompts((current) => ({ ...current, [character.id]: '' }));
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel gerar imagem do personagem.');
    } finally {
      setGeneratingCharacterId('');
    }
  };

  if (!authInitialized || authLoading || loading) return <LoadingArena label="Carregando gerador Gemini..." />;

  if (!deck || !isOfficialDeckId(deckId)) {
    return <div className="min-h-screen bg-[#f5f6ff] p-8 text-center text-rose-600 font-black">Informe um deck oficial valido.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-indigo-950 p-4 md:p-8 party-grid-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white border-4 border-indigo-100 rounded-3xl p-5 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button type="button" onClick={() => router.push(`/decks/${deckId}`)} className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 border-2 border-indigo-100 hover:bg-indigo-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Gerador Gemini</p>
              <h1 className="text-2xl md:text-3xl font-black font-display truncate">{deck.name}</h1>
            </div>
          </div>
          <Sparkles className="w-8 h-8 text-amber-500" />
        </div>

        <div className="bg-white border-4 border-indigo-100 rounded-3xl p-5 md:p-6 shadow-md space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-28 h-36 rounded-2xl bg-slate-50 border-4 border-indigo-50 overflow-hidden flex items-center justify-center shrink-0">
              {deck.cover_url || deck.image_url ? <img src={deck.cover_url || deck.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <ImagePlus className="w-8 h-8 text-indigo-200" />}
            </div>
            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-black uppercase">Imagem do deck</h2>
              <Input value={deckPrompt} onChange={(event) => setDeckPrompt(event.target.value)} placeholder="Prompt da imagem do deck..." className="h-12 border-2 border-slate-200 rounded-xl font-bold" />
              <Button type="button" onClick={generateDeckImage} disabled={generatingDeck || !deckPrompt.trim()} className="h-11 px-5 btn-squishy-indigo text-white font-black uppercase text-xs">
                {generatingDeck ? 'Gerando...' : 'Gerar imagem do deck'}
              </Button>
              <p className="text-[11px] font-bold text-slate-400">Salva em R2: atuem/gemini/</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((character) => (
            <div key={character.id} className="bg-white border-4 border-indigo-100 rounded-3xl p-4 shadow-md space-y-3">
              <div className="flex gap-4">
                <div className="w-24 h-32 rounded-2xl bg-slate-50 border-4 border-indigo-50 overflow-hidden shrink-0">
                  <CharacterImage name={character.name} imageUrl={character.image_url} isOfficial className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black truncate">{character.name}</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">R2: atuem/characters/</p>
                </div>
              </div>
              <Input value={characterPrompts[character.id] || ''} onChange={(event) => setCharacterPrompts((current) => ({ ...current, [character.id]: event.target.value }))} placeholder={`Prompt para ${character.name}...`} className="h-11 border-2 border-slate-200 rounded-xl font-bold" />
              <Button type="button" onClick={() => generateCharacterImage(character)} disabled={generatingCharacterId === character.id || !String(characterPrompts[character.id] || '').trim()} className="h-10 w-full btn-squishy-green text-white font-black uppercase text-xs">
                {generatingCharacterId === character.id ? 'Gerando...' : 'Gerar imagem do personagem'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
