'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, ImageOff, ImagePlus, Plus, Save, Trash2, Upload } from 'lucide-react';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { isProjectAdmin } from '@/lib/admin';

function fileNameToCharacterName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Personagem oficial';
}

function hasImage(character: any) {
  return Boolean(String(character?.image_url || character?.imageUrl || '').trim());
}

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
  const [bulkLines, setBulkLines] = useState('');
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [missingImageFiles, setMissingImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDeck, setSavingDeck] = useState(false);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [fillingMissing, setFillingMissing] = useState(false);
  const [deletingCharacterId, setDeletingCharacterId] = useState('');
  const [error, setError] = useState('');

  const isOfficial = isOfficialDeckId(deckId) || Boolean(deck?.is_official) || deck?.creator_id === null;
  const canManageOfficialDeck = isProjectAdmin(user?.id) && isOfficial;
  const availableSlots = Math.max(0, MAX_CHARACTERS_PER_DECK - characters.length);
  const lineNames = bulkLines.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => line.split('|')[0].trim()).filter(Boolean);
  const missingImageCharacters = characters.filter((character) => !hasImage(character));

  const fetchDeck = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: deckData, error: deckError }, { data: characterData, error: characterError }] = await Promise.all([
        supabaseGame.from('decks').select('*').eq('id', deckId).single(),
        supabaseGame.from('characters').select('*').eq('deck_id', deckId).order('created_at', { ascending: true }),
      ]);

      if (deckError || !deckData) throw deckError || new Error('Deck nao encontrado.');
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

  const officialRequest = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/official-decks/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, deckId, userId: user?.id }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Nao foi possivel executar a acao oficial.');
    return result;
  };

  const uploadOfficialImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', 'characters');

    const uploadResponse = await fetch('/api/upload-official-card-image', { method: 'POST', body: formData });
    const uploadResult = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) throw new Error(uploadResult.error || `Falha ao anexar ${file.name}.`);
    return String(uploadResult.url || '').trim();
  };

  const updateCharacterLocally = (updatedCharacter: any) => {
    setCharacters((current) => current.map((character) => (character.id === updatedCharacter.id ? updatedCharacter : character)));
  };

  const handleSaveDeck = async () => {
    if (!canManageOfficialDeck || savingDeck) return;
    const cleanName = deckName.trim();
    const cleanCoverUrl = coverUrl.trim();
    setError('');

    if (!cleanName) {
      setError('O nome do deck nao pode ficar vazio.');
      return;
    }

    setSavingDeck(true);
    try {
      const nameResult = await officialRequest({ action: 'update-deck-name', name: cleanName });
      const coverResult = await officialRequest({ action: 'update-cover', coverUrl: cleanCoverUrl });
      const updatedDeck = coverResult.deck || nameResult.deck;
      setDeck(updatedDeck);
      setDeckName(updatedDeck?.name || cleanName);
      setCoverUrl(updatedDeck?.cover_url || cleanCoverUrl);
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
      const result = await officialRequest({ action: 'add-character', name: cleanName, imageUrl: '' });
      setCharacters((current) => [...current, result.character]);
      setNewCharacterName('');
    } catch (addError: any) {
      setError(addError.message || 'Nao foi possivel inserir o personagem oficial.');
    } finally {
      setAddingCharacter(false);
    }
  };

  const handleBulkImport = async () => {
    if (!canManageOfficialDeck || bulkImporting) return;
    const rows = bulkLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, imageUrl = ''] = line.split('|').map((part) => part.trim());
        return { name, imageUrl };
      })
      .filter((row) => row.name);

    if (!rows.length) {
      setError('Cole pelo menos uma linha com o nome do personagem.');
      return;
    }

    setBulkImporting(true);
    setError('');
    try {
      const selectedRows = rows.slice(0, availableSlots);
      const result = await officialRequest({ action: 'bulk-add-characters', characters: selectedRows });
      const createdCharacters = Array.isArray(result.characters) ? result.characters : [];
      if (createdCharacters.length) {
        setCharacters((current) => [...current, ...createdCharacters]);
        setBulkLines('');
      }
      if (rows.length > selectedRows.length || result.skipped > 0) {
        setError(`Importei ${createdCharacters.length}. O restante passou do limite de ${MAX_CHARACTERS_PER_DECK} personagens.`);
      }
    } catch (bulkError: any) {
      setError(bulkError.message || 'Nao foi possivel importar em massa.');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleBulkImageUpload = async (files?: FileList | null) => {
    if (!canManageOfficialDeck || uploadingBulk || !files?.length) return;
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    if (!selectedFiles.length) {
      setError(`O deck ja atingiu o limite de ${MAX_CHARACTERS_PER_DECK} personagens.`);
      return;
    }

    setUploadingBulk(true);
    setError('');
    try {
      const createdCharacters: any[] = [];
      for (const file of selectedFiles) {
        const imageUrl = await uploadOfficialImage(file);
        const result = await officialRequest({ action: 'add-character', name: fileNameToCharacterName(file.name), imageUrl });
        if (result.character) createdCharacters.push(result.character);
      }
      if (createdCharacters.length) setCharacters((current) => [...current, ...createdCharacters]);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Nao foi possivel anexar imagens em massa.');
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleNameImageLineImport = async () => {
    if (!canManageOfficialDeck || uploadingBulk) return;
    setError('');

    if (!lineNames.length) {
      setError('Escreva um nome por linha.');
      return;
    }

    if (!bulkImageFiles.length) {
      setError('Selecione as imagens na mesma ordem dos nomes.');
      return;
    }

    if (!availableSlots) {
      setError(`O deck ja atingiu o limite de ${MAX_CHARACTERS_PER_DECK} personagens.`);
      return;
    }

    const total = Math.min(lineNames.length, bulkImageFiles.length, availableSlots);
    setUploadingBulk(true);
    try {
      const createdCharacters: any[] = [];
      for (let index = 0; index < total; index += 1) {
        const imageUrl = await uploadOfficialImage(bulkImageFiles[index]);
        const result = await officialRequest({ action: 'add-character', name: lineNames[index], imageUrl });
        if (result.character) createdCharacters.push(result.character);
      }

      if (createdCharacters.length) {
        setCharacters((current) => [...current, ...createdCharacters]);
        setBulkLines('');
        setBulkImageFiles([]);
      }
      if (lineNames.length !== bulkImageFiles.length) {
        setError(`Importei ${createdCharacters.length}. A quantidade de nomes e fotos nao estava igual.`);
      }
    } catch (uploadError: any) {
      setError(uploadError.message || 'Nao foi possivel importar nomes e imagens.');
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleSingleImageUpdate = async (character: any, file?: File | null) => {
    if (!canManageOfficialDeck || fillingMissing || !file) return;
    setFillingMissing(true);
    setError('');
    try {
      const imageUrl = await uploadOfficialImage(file);
      const result = await officialRequest({ action: 'update-character', characterId: character.id, imageUrl });
      if (result.character) updateCharacterLocally(result.character);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Nao foi possivel anexar a imagem.');
    } finally {
      setFillingMissing(false);
    }
  };

  const handleFillMissingImages = async () => {
    if (!canManageOfficialDeck || fillingMissing) return;
    setError('');

    if (!missingImageCharacters.length) {
      setError('Nao ha personagens sem imagem neste deck.');
      return;
    }

    if (!missingImageFiles.length) {
      setError('Selecione as imagens para preencher os personagens sem foto.');
      return;
    }

    const total = Math.min(missingImageCharacters.length, missingImageFiles.length);
    setFillingMissing(true);
    try {
      const updatedCharacters: any[] = [];
      for (let index = 0; index < total; index += 1) {
        const character = missingImageCharacters[index];
        const file = missingImageFiles[index];
        const imageUrl = await uploadOfficialImage(file);
        const result = await officialRequest({ action: 'update-character', characterId: character.id, imageUrl });
        if (result.character) updatedCharacters.push(result.character);
      }

      if (updatedCharacters.length) {
        setCharacters((current) => current.map((character) => updatedCharacters.find((updated) => updated.id === character.id) || character));
        setMissingImageFiles([]);
      }
      if (missingImageFiles.length !== missingImageCharacters.length) {
        setError(`Preenchi ${updatedCharacters.length}. As imagens sao aplicadas na ordem dos personagens sem foto.`);
      }
    } catch (uploadError: any) {
      setError(uploadError.message || 'Nao foi possivel preencher as imagens.');
    } finally {
      setFillingMissing(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!canManageOfficialDeck || deletingCharacterId) return;
    if (!confirm('Deseja realmente excluir este personagem?')) return;

    setDeletingCharacterId(characterId);
    setError('');
    try {
      await officialRequest({ action: 'delete-character', characterId });
      setCharacters((current) => current.filter((character) => character.id !== characterId));
    } catch (deleteError: any) {
      setError(deleteError.message || 'Nao foi possivel excluir o personagem.');
    } finally {
      setDeletingCharacterId('');
    }
  };

  if (!authInitialized || authLoading || loading) return <LoadingArena label="Carregando editor oficial..." />;

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex flex-col relative overflow-hidden party-grid-bg">
      <div className="max-w-5xl mx-auto w-full space-y-6 relative z-10">
        <div className="p-5 bg-white border-4 border-indigo-100 flex items-center justify-between gap-4 rounded-3xl shadow-md">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" onClick={() => router.push('/lobby')} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-12 h-12 rounded-2xl border-2 border-slate-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"><ArrowLeft className="w-5 h-5 stroke-[3px]" /></Button>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight truncate">Editor de deck oficial</h1>
              <p className="text-xs text-indigo-600 font-extrabold">{characters.length}/{MAX_CHARACTERS_PER_DECK} personagens criados</p>
            </div>
          </div>
          <Button type="button" onClick={() => router.push(`/decks/${deckId}`)} className="h-11 px-4 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-black text-xs uppercase cursor-pointer flex items-center gap-2"><ExternalLink className="w-4 h-4" />Abrir deck</Button>
        </div>

        {!canManageOfficialDeck ? (
          <div className="rounded-3xl border-4 border-rose-100 bg-white p-6 text-sm font-bold text-rose-600 shadow-md">Este deck so pode ser editado pelo ADM autorizado do projeto.</div>
        ) : (
          <>
            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Dados do deck</h2>
              <div className="grid md:grid-cols-[160px_1fr] gap-5">
                <div className="w-full h-44 rounded-2xl border-4 border-indigo-50 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {coverUrl ? <img src={coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <ImagePlus className="w-10 h-10 text-indigo-200" />}
                </div>
                <div className="space-y-3">
                  <Input value={deckName} maxLength={60} onChange={(event) => setDeckName(event.target.value)} placeholder="Nome do deck oficial" className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150" />
                  <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="URL da imagem do deck" className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150" />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" onClick={handleSaveDeck} disabled={savingDeck || !deckName.trim()} className="h-11 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><Save className="w-4 h-4" />{savingDeck ? 'Salvando...' : 'Salvar deck'}</Button>
                    {coverUrl && <Button type="button" onClick={() => setCoverUrl('')} className="h-11 px-5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><ImageOff className="w-4 h-4" />Limpar imagem</Button>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Adicionar personagem</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={newCharacterName} onChange={(event) => setNewCharacterName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleAddCharacter(); } }} placeholder="Nome do personagem" className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150" />
                <Button type="button" onClick={handleAddCharacter} disabled={addingCharacter || !newCharacterName.trim() || characters.length >= MAX_CHARACTERS_PER_DECK} className="h-12 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><Plus className="w-4 h-4" />{addingCharacter ? 'Inserindo...' : 'Inserir personagem'}</Button>
              </div>
            </div>

            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide flex items-center gap-2"><Upload className="w-5 h-5 text-indigo-500" /> Importacao em massa</h2>
              <p className="text-xs font-bold text-slate-500">Para criar novos personagens: escreva um nome por linha, selecione as imagens na mesma ordem e clique em Criar nomes + fotos.</p>
              <textarea value={bulkLines} onChange={(event) => setBulkLines(event.target.value)} placeholder={'Bruninho67\nJugaMePlays\nRayan\nSelene'} className="min-h-32 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm font-bold text-indigo-950 outline-none focus:border-indigo-300" />

              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-left"><p className="text-xs font-black uppercase text-amber-700">Criar novos: nome + foto por linha</p><p className="text-[11px] font-bold text-amber-700/80">Nomes: {lineNames.length} • Imagens: {bulkImageFiles.length} • Vagas: {availableSlots}</p></div>
                  <label className="h-11 px-5 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black uppercase"><ImagePlus className="w-4 h-4" />Selecionar fotos<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingBulk || characters.length >= MAX_CHARACTERS_PER_DECK} onChange={(event) => { setBulkImageFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /></label>
                </div>
                {bulkImageFiles.length > 0 && <div className="max-h-24 overflow-y-auto rounded-xl bg-white/70 p-2 text-left text-[11px] font-bold text-amber-800">{bulkImageFiles.map((file, index) => <p key={`${file.name}-${index}`} className="truncate">{index + 1}. {lineNames[index] || 'sem nome'} → {file.name}</p>)}</div>}
                <Button type="button" onClick={handleNameImageLineImport} disabled={uploadingBulk || !bulkLines.trim() || bulkImageFiles.length === 0 || characters.length >= MAX_CHARACTERS_PER_DECK} className="h-12 w-full btn-squishy-yellow text-amber-950 font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><Upload className="w-4 h-4" />{uploadingBulk ? 'Criando...' : 'Criar nomes + fotos'}</Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={handleBulkImport} disabled={bulkImporting || !bulkLines.trim() || characters.length >= MAX_CHARACTERS_PER_DECK} className="h-11 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><FileText className="w-4 h-4" />{bulkImporting ? 'Importando...' : 'Importar texto/URLs'}</Button>
                <label className="h-11 px-5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black uppercase"><ImagePlus className="w-4 h-4" />{uploadingBulk ? 'Anexando...' : 'So imagens / nome do arquivo'}<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingBulk || characters.length >= MAX_CHARACTERS_PER_DECK} onChange={(event) => { const files = event.target.files; event.target.value = ''; void handleBulkImageUpload(files); }} /></label>
              </div>
            </div>

            <div className="bg-white border-4 border-emerald-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-emerald-900 uppercase tracking-wide flex items-center gap-2"><ImagePlus className="w-5 h-5 text-emerald-500" /> Preencher personagens sem foto</h2>
              <p className="text-xs font-bold text-slate-500">Selecione imagens em massa para aplicar nos personagens que ja existem e estao sem imagem. A ordem sera: primeira foto no primeiro sem imagem, segunda foto no segundo, e assim por diante.</p>
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-left"><p className="text-xs font-black uppercase text-emerald-700">Sem imagem: {missingImageCharacters.length}</p><p className="text-[11px] font-bold text-emerald-700/80">Fotos selecionadas: {missingImageFiles.length}</p></div>
                  <label className="h-11 px-5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black uppercase"><ImagePlus className="w-4 h-4" />Selecionar fotos<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" disabled={fillingMissing || missingImageCharacters.length === 0} onChange={(event) => { setMissingImageFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /></label>
                </div>
                {missingImageFiles.length > 0 && <div className="max-h-28 overflow-y-auto rounded-xl bg-white/70 p-2 text-left text-[11px] font-bold text-emerald-800">{missingImageFiles.map((file, index) => <p key={`${file.name}-${index}`} className="truncate">{index + 1}. {missingImageCharacters[index]?.name || 'sem personagem'} → {file.name}</p>)}</div>}
                <Button type="button" onClick={handleFillMissingImages} disabled={fillingMissing || missingImageFiles.length === 0 || missingImageCharacters.length === 0} className="h-12 w-full btn-squishy-green text-white font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><Upload className="w-4 h-4" />{fillingMissing ? 'Anexando...' : 'Anexar nos sem foto'}</Button>
              </div>
            </div>

            {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-600">{error}</div>}

            <div className="bg-white border-4 border-indigo-100 rounded-3xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">Personagens do deck</h2>
              {characters.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-center text-sm font-bold text-indigo-400">Nenhum personagem oficial cadastrado.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {characters.map((character) => (
                    <div key={character.id} className="rounded-2xl border-2 border-indigo-50 bg-white p-3 shadow-sm flex items-center gap-3">
                      <div className="h-16 w-16 rounded-xl border-2 border-indigo-50 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">{hasImage(character) ? <img src={character.image_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <ImageOff className="w-6 h-6 text-indigo-200" />}</div>
                      <div className="min-w-0 flex-1 text-left"><p className="font-black text-indigo-950 truncate">{character.name}</p><p className="text-[10px] font-bold uppercase text-slate-400 truncate">{character.image_url || 'sem imagem'}</p>{!hasImage(character) && <label className="mt-2 inline-flex h-8 px-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer items-center justify-center gap-1.5 text-[10px] font-black uppercase"><ImagePlus className="w-3.5 h-3.5" />Anexar foto<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={fillingMissing} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void handleSingleImageUpdate(character, file); }} /></label>}</div>
                      <button type="button" disabled={deletingCharacterId === character.id} onClick={() => void handleDeleteCharacter(character.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 flex items-center justify-center disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
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
