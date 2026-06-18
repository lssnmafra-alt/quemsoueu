'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId } from '@/lib/officialDecks';
import CharacterImage from '@/components/CharacterImage';

function deckIdFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'decks' || !parts[1]) return '';
  return parts[1];
}

export default function GeminiDeckImagePanel() {
  const pathname = usePathname();
  const deckId = useMemo(() => deckIdFromPathname(pathname || ''), [pathname]);
  const isOfficialDeck = isOfficialDeckId(deckId);

  const [open, setOpen] = useState(false);
  const [deck, setDeck] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [deckPrompt, setDeckPrompt] = useState('');
  const [characterPrompts, setCharacterPrompts] = useState<Record<string, string>>({});
  const [generatingDeck, setGeneratingDeck] = useState(false);
  const [generatingCharacterId, setGeneratingCharacterId] = useState('');

  useEffect(() => {
    if (!isOfficialDeck || !deckId || !open) return;

    const load = async () => {
      const [{ data: deckData }, { data: characterData }] = await Promise.all([
        supabaseGame.from('decks').select('*').eq('id', deckId).maybeSingle(),
        supabaseGame.from('characters').select('*').eq('deck_id', deckId).order('name', { ascending: true }),
      ]);

      setDeck(deckData || null);
      setCharacters(characterData || []);
    };

    void load();
  }, [deckId, isOfficialDeck, open]);

  if (!isOfficialDeck) return null;

  const generateDeckImage = async () => {
    const prompt = deckPrompt.trim();
    if (!prompt || generatingDeck) return;

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] flex h-14 items-center gap-2 rounded-2xl border-4 border-indigo-100 bg-white px-4 text-xs font-black uppercase text-indigo-700 shadow-2xl hover:bg-indigo-50"
      >
        <Sparkles className="h-5 w-5 text-amber-500" /> Gerar imagem IA
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-indigo-950/35 p-4 backdrop-blur-sm">
          <div className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-indigo-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-indigo-50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Gerador Gemini dentro do deck</p>
                <h2 className="text-xl font-black text-indigo-950">{deck?.name || 'Deck oficial'}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-indigo-100 bg-white">
                    {deck?.cover_url || deck?.image_url ? (
                      <img src={deck.cover_url || deck.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-indigo-200" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-indigo-950">Imagem do deck</h3>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Salva em atuem/gemini/</p>
                  </div>
                </div>
                <Input
                  value={deckPrompt}
                  onChange={(event) => setDeckPrompt(event.target.value)}
                  placeholder="Digite o prompt da imagem do deck..."
                  className="mb-2 h-11 rounded-xl border-2 border-indigo-100 bg-white text-xs font-bold"
                />
                <Button type="button" onClick={generateDeckImage} disabled={generatingDeck || !deckPrompt.trim()} className="h-10 w-full btn-squishy-indigo text-xs font-black uppercase text-white">
                  {generatingDeck ? 'Gerando...' : 'Gerar imagem do deck'}
                </Button>
              </div>

              <div className="space-y-3">
                {characters.map((character) => (
                  <div key={character.id} className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex gap-3">
                      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-indigo-50 bg-slate-50">
                        <CharacterImage name={character.name} imageUrl={character.image_url} isOfficial className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-indigo-950">{character.name}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Salva em atuem/characters/</p>
                      </div>
                    </div>
                    <Input
                      value={characterPrompts[character.id] || ''}
                      onChange={(event) => setCharacterPrompts((current) => ({ ...current, [character.id]: event.target.value }))}
                      placeholder={`Prompt para ${character.name}...`}
                      className="mb-2 h-10 rounded-xl border-2 border-slate-100 text-xs font-bold"
                    />
                    <Button
                      type="button"
                      onClick={() => generateCharacterImage(character)}
                      disabled={generatingCharacterId === character.id || !String(characterPrompts[character.id] || '').trim()}
                      className="h-9 w-full btn-squishy-green text-[10px] font-black uppercase text-white"
                    >
                      {generatingCharacterId === character.id ? 'Gerando...' : 'Gerar imagem do personagem'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
