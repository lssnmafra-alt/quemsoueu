'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Copy, ImagePlus, Sparkles, X } from 'lucide-react';
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
  const [generatedDeckUrl, setGeneratedDeckUrl] = useState('');
  const [generatedCharacterUrls, setGeneratedCharacterUrls] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [savingNameId, setSavingNameId] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
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
      setEditingNames(Object.fromEntries((characterData || []).map((character: any) => [character.id, character.name || ''])));
      setGeneratedDeckUrl(deckData?.cover_url || deckData?.image_url || '');
      setGeneratedCharacterUrls(
        Object.fromEntries((characterData || []).map((character: any) => [character.id, character.image_url || ''])),
      );
    };

    void load();
  }, [deckId, isOfficialDeck, open]);

  if (!isOfficialDeck) return null;

  const copyUrl = async (key: string, url: string) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1400);
    } catch {
      window.prompt('Copie a URL da imagem:', url);
    }
  };

  const requestCharacterImage = async (character: any, prompt: string) => {
    const response = await fetch('/api/gemini/character-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: character.id, prompt }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Nao foi possivel gerar imagem do personagem.');
    return result;
  };

  const saveCharacterName = async (character: any) => {
    const nextName = String(editingNames[character.id] || '').trim();
    if (!nextName || nextName === character.name || savingNameId) return;

    setSavingNameId(character.id);
    try {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-character',
          deckId,
          characterId: character.id,
          name: nextName,
          imageUrl: generatedCharacterUrls[character.id] || character.image_url || '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar o nome.');

      setCharacters((current) => current.map((item) => item.id === character.id ? { ...item, ...result.character, name: nextName } : item));
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel salvar o nome.');
      setEditingNames((current) => ({ ...current, [character.id]: character.name || '' }));
    } finally {
      setSavingNameId('');
    }
  };

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
      setGeneratedDeckUrl(result.imageUrl || '');
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel gerar imagem do deck.');
    } finally {
      setGeneratingDeck(false);
    }
  };

  const generateCharacterImage = async (character: any) => {
    const prompt = String(characterPrompts[character.id] || '').trim();
    if (!prompt || generatingCharacterId || batchRunning) return;

    setGeneratingCharacterId(character.id);
    try {
      const result = await requestCharacterImage(character, prompt);
      setCharacters((current) => current.map((item) => item.id === character.id ? { ...item, ...result.character, image_url: result.imageUrl } : item));
      setGeneratedCharacterUrls((current) => ({ ...current, [character.id]: result.imageUrl || '' }));
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel gerar imagem do personagem.');
    } finally {
      setGeneratingCharacterId('');
    }
  };

  const generateBatchImages = async () => {
    if (batchRunning || generatingCharacterId) return;

    const queued = characters.filter((character) => String(characterPrompts[character.id] || '').trim());
    if (queued.length === 0) {
      alert('Preencha pelo menos um prompt de personagem para gerar em lote.');
      return;
    }

    setBatchRunning(true);
    setBatchStatus(`0/${queued.length}`);

    for (let index = 0; index < queued.length; index += 1) {
      const character = queued[index];
      const prompt = String(characterPrompts[character.id] || '').trim();
      setGeneratingCharacterId(character.id);
      setBatchStatus(`${index + 1}/${queued.length} - ${character.name}`);

      try {
        const result = await requestCharacterImage(character, prompt);
        setCharacters((current) => current.map((item) => item.id === character.id ? { ...item, ...result.character, image_url: result.imageUrl } : item));
        setGeneratedCharacterUrls((current) => ({ ...current, [character.id]: result.imageUrl || '' }));
      } catch (error: any) {
        setBatchStatus(`Erro em ${character.name}: ${error.message || 'falhou'}`);
        break;
      }
    }

    setGeneratingCharacterId('');
    setBatchRunning(false);
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
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Gerador IA Flux dentro do deck</p>
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
                  {generatingDeck ? 'Gerando...' : generatedDeckUrl ? 'Refazer imagem do deck' : 'Gerar imagem do deck'}
                </Button>

                {generatedDeckUrl && (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-2">
                    <p className="mb-1 text-[10px] font-black uppercase text-indigo-500">URL da imagem gerada</p>
                    <div className="flex gap-2">
                      <input readOnly value={generatedDeckUrl} className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-600" />
                      <button type="button" onClick={() => copyUrl('deck', generatedDeckUrl)} className="rounded-lg bg-indigo-50 px-3 text-indigo-700 border border-indigo-100">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {copiedKey === 'deck' && <p className="mt-1 text-[10px] font-black uppercase text-emerald-600">Copiado!</p>}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-3">
                <Button
                  type="button"
                  onClick={generateBatchImages}
                  disabled={batchRunning || Boolean(generatingCharacterId) || characters.every((character) => !String(characterPrompts[character.id] || '').trim())}
                  className="h-11 w-full btn-squishy-green text-xs font-black uppercase text-white"
                >
                  {batchRunning ? `Gerando em lote ${batchStatus}` : 'Gerar em lote os prompts preenchidos'}
                </Button>
                <p className="mt-2 text-[10px] font-bold uppercase text-emerald-700">Gera uma imagem por vez, automaticamente, ate terminar a fila.</p>
              </div>

              <div className="space-y-3">
                {characters.map((character) => {
                  const generatedUrl = generatedCharacterUrls[character.id] || character.image_url || '';

                  return (
                    <div key={character.id} className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-sm">
                      <div className="mb-3 flex gap-3">
                        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-indigo-50 bg-slate-50">
                          <CharacterImage name={character.name} imageUrl={character.image_url} isOfficial className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <Input
                            value={editingNames[character.id] ?? character.name ?? ''}
                            onChange={(event) => setEditingNames((current) => ({ ...current, [character.id]: event.target.value }))}
                            onBlur={() => saveCharacterName(character)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.currentTarget.blur();
                              if (event.key === 'Escape') setEditingNames((current) => ({ ...current, [character.id]: character.name || '' }));
                            }}
                            className="h-9 rounded-xl border-2 border-indigo-50 bg-white px-2 text-sm font-black text-indigo-950"
                            placeholder="Nome do personagem"
                          />
                          <p className="text-[10px] font-bold uppercase text-slate-400">{savingNameId === character.id ? 'Salvando nome...' : 'Clique no nome para editar'} · salva em atuem/characters/</p>
                        </div>
                      </div>
                      <Input
                        value={characterPrompts[character.id] || ''}
                        onChange={(event) => setCharacterPrompts((current) => ({ ...current, [character.id]: event.target.value }))}
                        placeholder={`Prompt para ${editingNames[character.id] || character.name}...`}
                        className="mb-2 h-10 rounded-xl border-2 border-slate-100 text-xs font-bold"
                      />
                      <Button
                        type="button"
                        onClick={() => generateCharacterImage(character)}
                        disabled={batchRunning || generatingCharacterId === character.id || !String(characterPrompts[character.id] || '').trim()}
                        className="h-9 w-full btn-squishy-green text-[10px] font-black uppercase text-white"
                      >
                        {generatingCharacterId === character.id ? 'Gerando...' : generatedUrl ? 'Refazer imagem do personagem' : 'Gerar imagem do personagem'}
                      </Button>

                      {generatedUrl && (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                          <p className="mb-1 text-[10px] font-black uppercase text-indigo-500">URL da imagem gerada</p>
                          <div className="flex gap-2">
                            <input readOnly value={generatedUrl} className="min-w-0 flex-1 rounded-lg border border-white bg-white px-2 py-2 text-[11px] font-bold text-slate-600" />
                            <button type="button" onClick={() => copyUrl(character.id, generatedUrl)} className="rounded-lg bg-indigo-50 px-3 text-indigo-700 border border-indigo-100">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          {copiedKey === character.id && <p className="mt-1 text-[10px] font-black uppercase text-emerald-600">Copiado!</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
