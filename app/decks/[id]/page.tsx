'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Globe, ImageOff, ImagePlus, Layers, Lock, Plus, Star, StarOff, Trash, Trash2 } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import CharacterImage from '@/components/CharacterImage';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';
import { DEFAULT_AVATAR_CONFIG, randomAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

type CharacterDraft = { name: string; imageUrl: string; avatarConfig: AvatarConfig };

const PLAYER_DECK_EMOJIS = ['😀', '😎', '🤠', '🧙', '🦸', '🕵️', '🤖', '👻', '🐸', '🦊', '🐼', '🐲', '⭐', '🔥', '⚡', '🎮'];

const COMMON_EMOJI_OPTIONS = [
  '\u{1F600}', '\u{1F60E}', '\u{1F913}', '\u{1F9D0}', '\u{1F607}', '\u{1F608}', '\u{1F451}', '\u{1F9D9}\u200D\u2642\uFE0F', '\u{1F9D9}\u200D\u2640\uFE0F', '\u{1F9B8}\u200D\u2642\uFE0F', '\u{1F9B8}\u200D\u2640\uFE0F', '\u{1F575}\uFE0F', '\u{1F46E}\u200D\u2642\uFE0F', '\u{1F46E}\u200D\u2640\uFE0F', '\u{1F468}\u200D\u{1F680}', '\u{1F469}\u200D\u{1F680}', '\u{1F468}\u200D\u{1F3A4}', '\u{1F469}\u200D\u{1F3A4}', '\u{1F468}\u200D\u{1F373}', '\u{1F469}\u200D\u{1F373}', '\u{1F468}\u200D\u{1F3EB}', '\u{1F469}\u200D\u{1F3EB}',
  '\u{1F436}', '\u{1F431}', '\u{1F98A}', '\u{1F43B}', '\u{1F43C}', '\u{1F981}', '\u{1F42F}', '\u{1F435}', '\u{1F438}', '\u{1F427}', '\u{1F989}', '\u{1F43A}', '\u{1F432}', '\u{1F996}', '\u{1F995}', '\u{1F984}',
  '\u{1F47B}', '\u{1F916}', '\u{1F47D}', '\u{1F480}', '\u{1F383}', '\u{1F9DB}\u200D\u2642\uFE0F', '\u{1F9DB}\u200D\u2640\uFE0F', '\u{1F9DF}\u200D\u2642\uFE0F', '\u{1F9DF}\u200D\u2640\uFE0F', '\u{1F9DE}\u200D\u2642\uFE0F', '\u{1F9DE}\u200D\u2640\uFE0F', '\u{1F9DA}\u200D\u2642\uFE0F', '\u{1F9DA}\u200D\u2640\uFE0F', '\u26A1', '\u{1F525}', '\u2744\uFE0F', '\u{1F319}', '\u2B50', '\u{1F48E}', '\u{1F3AD}', '\u{1F3A9}', '\u{1FA84}', '\u{1F5E1}\uFE0F', '\u{1F6E1}\uFE0F',
  '\u{1F355}', '\u{1F354}', '\u{1F35F}', '\u{1F369}', '\u{1F36D}', '\u{1F36B}', '\u{1F9C1}', '\u{1F353}', '\u{1F349}', '\u{1F34C}', '\u{1F9C3}', '\u{1F3AE}', '\u{1F3B2}', '\u{1F3AF}', '\u{1F3C6}', '\u26BD', '\u{1F3C0}',
];

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [deck, setDeck] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [deckImage, setDeckImage] = useState('');
  const [updatingDeck, setUpdatingDeck] = useState(false);
  const [uploadingDeckImage, setUploadingDeckImage] = useState(false);
  const [charName, setCharName] = useState('');
  const [selectedCommonEmoji, setSelectedCommonEmoji] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorChart, setErrorChart] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState('');
  const [uploadingCharacterId, setUploadingCharacterId] = useState('');
  const [deletingCharacterId, setDeletingCharacterId] = useState('');
  const [characterDrafts, setCharacterDrafts] = useState<Record<string, CharacterDraft>>({});

  const isCreator = deck?.creator_id === user?.id;
  const isTemporaryOfficialEditor = TEMP_OFFICIAL_DECK_EDITING_ENABLED && isOfficialDeckId(deckId);
  const isOfficialDeck = Boolean(deck?.is_official) || isOfficialDeckId(deckId) || deck?.creator_id === null;
  const canEditDeck = isCreator || isTemporaryOfficialEditor;
  const canCreateCharacters = isCreator || isTemporaryOfficialEditor;
  const canDeleteCharacters = canEditDeck;
  const canUseImages = canEditDeck && isTemporaryOfficialEditor;

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    void fetchDeck();
  }, [authInitialized, authLoading, user?.id, deckId]);

  const displayCharacters = useMemo(() => (
    characters.map((char) => isOfficialDeck ? char : { ...char, image_url: '', avatar_config: char.avatar_config || DEFAULT_AVATAR_CONFIG })
  ), [characters, isOfficialDeck]);

  async function fetchDeck() {
    setLoading(true);
    try {
      const { data: dData, error: deckError } = await supabaseGame.from('decks').select('*').eq('id', deckId).single();
      if (deckError || !dData) {
        setDeck(null);
        setCharacters([]);
        setCharacterDrafts({});
        setIsFavorited(false);
        setDeckImage('');
        return;
      }

      const { data: cData } = await supabaseGame.from('characters').select('*').eq('deck_id', deckId);
      const official = Boolean(dData.is_official) || dData.creator_id === null || isOfficialDeckId(deckId);

      let isFav = false;
      if (user?.id) {
        const { data: favData } = await supabaseGame.from('deck_favorites').select('*').eq('user_id', user.id).eq('deck_id', deckId).maybeSingle();
        isFav = Boolean(favData);
      }

      let creatorNickname = 'Criador Anônimo';
      if (dData.creator_id) {
        const { data: creatorData } = await supabaseGame.from('profiles').select('nickname').eq('id', dData.creator_id).maybeSingle();
        if (creatorData?.nickname) creatorNickname = creatorData.nickname;
      }

      const sanitizedCharacters = (cData || []).map((char: any) => ({
        ...char,
        image_url: official ? sanitizeStoredCharacterImageUrl(char.image_url) : '',
        avatar_config: char.avatar_config || DEFAULT_AVATAR_CONFIG,
      }));

      setDeck({ ...dData, is_official: official, creator_nickname: creatorNickname, cover_url: official ? sanitizeStoredCharacterImageUrl(dData.cover_url || dData.image_url) : '' });
      setDeckImage(official ? sanitizeStoredCharacterImageUrl(dData.cover_url || dData.image_url) : '');
      setCharacters(sanitizedCharacters);
      setCharacterDrafts(Object.fromEntries(sanitizedCharacters.map((char: any) => [char.id, { name: char.name || '', imageUrl: official ? char.image_url || '' : '', avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG }])));
      setIsFavorited(isFav);
    } catch (error) {
      console.error('Failed to fetch deck', error);
      setDeck(null);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!user?.id) return;
    if (isFavorited) {
      await supabaseGame.from('deck_favorites').delete().eq('user_id', user.id).eq('deck_id', deckId);
      setIsFavorited(false);
    } else {
      await supabaseGame.from('deck_favorites').insert({ user_id: user.id, deck_id: deckId });
      setIsFavorited(true);
    }
  }

  async function handleAddChar() {
    if (!canCreateCharacters) {
      setErrorChart('Você não pode editar este baralho.');
      return;
    }

    const cleanName = charName.trim();
    if (!cleanName || adding) return;

    if (characters.length >= MAX_CHARACTERS_PER_DECK) {
      setErrorChart(`Cada baralho pode ter no máximo ${MAX_CHARACTERS_PER_DECK} personagens.`);
      return;
    }

    setAdding(true);
    setErrorChart('');

    try {
      const isSafeName = await moderateText(cleanName);
      if (!isSafeName) {
        setErrorChart('Nomes inadequados não são permitidos.');
        return;
      }

      const commonAvatarConfig = selectedCommonEmoji
        ? { ...randomAvatarConfig(), commonEmoji: selectedCommonEmoji }
        : randomAvatarConfig();

      const data = isTemporaryOfficialEditor
        ? await fetch('/api/official-decks/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add-character', deckId, name: cleanName, imageUrl: '' }),
          }).then(async (res) => {
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Não foi possível inserir o personagem oficial.');
            return result.character;
          })
        : (await supabaseGame.from('characters').insert({ deck_id: deckId, name: cleanName, image_url: '', avatar_config: commonAvatarConfig }).select().single()).data;

      if (data) {
        const nextCharacter = { ...data, image_url: isTemporaryOfficialEditor ? sanitizeStoredCharacterImageUrl(data.image_url) : '', avatar_config: data.avatar_config || DEFAULT_AVATAR_CONFIG };
        setCharacters((current) => [...current, nextCharacter]);
        setCharacterDrafts((current) => ({ ...current, [nextCharacter.id]: { name: nextCharacter.name || '', imageUrl: nextCharacter.image_url || '', avatarConfig: nextCharacter.avatar_config || DEFAULT_AVATAR_CONFIG } }));
        setCharName('');
        setSelectedCommonEmoji('');
      }
    } catch (error: any) {
      setErrorChart(error.message || 'Não foi possível inserir o personagem.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteChar(id: string) {
    if (!canDeleteCharacters || deletingCharacterId) return;
    if (!confirm('Deseja realmente excluir este personagem?')) return;
    setDeletingCharacterId(id);
    try {
      if (isTemporaryOfficialEditor) {
        const response = await fetch('/api/official-decks/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-character', deckId, characterId: id }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível excluir o personagem oficial.');
      } else {
        const { error } = await supabaseGame.from('characters').delete().eq('id', id).eq('deck_id', deckId);
        if (error) throw error;
      }
      setCharacters((current) => current.filter((char) => char.id !== id));
      setCharacterDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (error: any) {
      alert(error.message || 'Não foi possível excluir o personagem.');
    } finally {
      setDeletingCharacterId('');
    }
  }

  async function togglePublish() {
    if (!isCreator) return;
    if (!deck.is_public && characters.length < 5) {
      alert('Seu baralho precisa conter pelo menos 5 personagens antes de ser publicado globalmente.');
      return;
    }
    const newStatus = !deck.is_public;
    await supabaseGame.from('decks').update({ is_public: newStatus }).eq('id', deckId).eq('creator_id', user?.id);
    setDeck({ ...deck, is_public: newStatus });
  }

  async function saveDeckImageUrl(imageUrl: string) {
    if (!canUseImages) return;
    const cleanImageUrl = imageUrl.trim() ? sanitizeGeneratedImageUrl(imageUrl.trim()) : '';
    if (imageUrl.trim() && !cleanImageUrl) throw new Error('Essa URL de imagem é inválida ou é um fallback antigo ruim.');
    const response = await fetch('/api/official-decks/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-cover', deckId, coverUrl: cleanImageUrl }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a imagem do deck.');
    const sanitizedCoverUrl = sanitizeStoredCharacterImageUrl(result.deck?.cover_url || result.deck?.image_url);
    setDeck((current: any) => ({ ...current, ...(result.deck || {}), cover_url: sanitizedCoverUrl }));
    setDeckImage(sanitizedCoverUrl);
  }

  async function handleUpdateDeckImage() {
    if (!canUseImages) return;
    setUpdatingDeck(true);
    try { await saveDeckImageUrl(deckImage); } catch (error: any) { alert(error.message || 'Não foi possível salvar a imagem do deck.'); } finally { setUpdatingDeck(false); }
  }

  async function handleAttachDeckImage(file?: File) {
    if (!canUseImages || !file) return;
    setUploadingDeckImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', 'decks');
      const uploadResponse = await fetch('/api/upload-official-card-image', { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Não foi possível anexar a imagem do deck.');
      await saveDeckImageUrl(String(uploadResult.url || '').trim());
    } catch (error: any) {
      alert(error.message || 'Não foi possível anexar a imagem do deck.');
    } finally {
      setUploadingDeckImage(false);
    }
  }

  async function handleRemoveDeckImage() {
    if (!canUseImages) return;
    setUpdatingDeck(true);
    try { await saveDeckImageUrl(''); } catch (error: any) { alert(error.message || 'Não foi possível remover a imagem do deck.'); } finally { setUpdatingDeck(false); }
  }

  async function handleSaveCharacter(char: any) {
    if (!canEditDeck) return;
    const draft = characterDrafts[char.id] || { name: char.name || '', imageUrl: char.image_url || '', avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG };
    const cleanName = draft.name.trim();
    if (!cleanName) {
      alert('O nome do personagem não pode ficar vazio.');
      return;
    }

    setEditingCharacterId(char.id);
    try {
      const cleanImageUrl = canUseImages && draft.imageUrl.trim() ? sanitizeGeneratedImageUrl(draft.imageUrl.trim()) : '';
      if (canUseImages && draft.imageUrl.trim() && !cleanImageUrl) throw new Error('Essa URL de imagem é inválida ou é um fallback antigo ruim.');

      const updated = isTemporaryOfficialEditor
        ? await fetch('/api/official-decks/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update-character', deckId, characterId: char.id, name: cleanName, imageUrl: cleanImageUrl }),
          }).then(async (res) => {
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Não foi possível salvar o personagem.');
            return result.character;
          })
        : (await supabaseGame.from('characters').update({ name: cleanName, image_url: '', avatar_config: draft.avatarConfig || char.avatar_config || DEFAULT_AVATAR_CONFIG }).eq('id', char.id).eq('deck_id', deckId).select().single()).data;

      if (!updated) throw new Error('Não foi possível salvar o personagem.');
      const sanitizedCharacter = { ...updated, image_url: canUseImages ? sanitizeStoredCharacterImageUrl(updated.image_url) : '', avatar_config: updated.avatar_config || draft.avatarConfig || DEFAULT_AVATAR_CONFIG };
      setCharacters((current) => current.map((item) => (item.id === char.id ? sanitizedCharacter : item)));
      setCharacterDrafts((current) => ({ ...current, [sanitizedCharacter.id]: { name: sanitizedCharacter.name || '', imageUrl: sanitizedCharacter.image_url || '', avatarConfig: sanitizedCharacter.avatar_config || DEFAULT_AVATAR_CONFIG } }));
    } catch (error: any) {
      alert(error.message || 'Não foi possível salvar o personagem.');
    } finally {
      setEditingCharacterId('');
    }
  }

  async function handleAttachCharacterImage(char: any, file?: File) {
    if (!canUseImages || !file) return;
    setUploadingCharacterId(char.id);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', 'characters');
      const uploadResponse = await fetch('/api/upload-official-card-image', { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Não foi possível anexar a imagem.');
      const imageUrl = String(uploadResult.url || '').trim();
      const draft = characterDrafts[char.id] || { name: char.name || '', imageUrl: char.image_url || '', avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG };
      setCharacterDrafts((current) => ({ ...current, [char.id]: { ...draft, imageUrl } }));
      await handleSaveCharacter({ ...char, image_url: imageUrl });
    } catch (error: any) {
      alert(error.message || 'Não foi possível anexar a imagem.');
    } finally {
      setUploadingCharacterId('');
    }
  }

  async function handleRemoveCharacterImage(char: any) {
    if (!canUseImages) return;
    const draft = characterDrafts[char.id] || { name: char.name || '', imageUrl: '', avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG };
    setCharacterDrafts((current) => ({ ...current, [char.id]: { ...draft, imageUrl: '' } }));
    await handleSaveCharacter({ ...char, image_url: '' });
  }

  async function handleDeleteDeck() {
    if (!isCreator) return;
    if (confirm('Deseja realmente apagar este baralho permanentemente?')) {
      await supabaseGame.from('decks').delete().eq('id', deckId).eq('creator_id', user?.id);
      router.push('/decks');
    }
  }

  if (loading) return <LoadingArena label="Carregando dados do baralho..." />;
  if (!deck) return <div className="flex min-h-screen items-center justify-center bg-[#f5f6ff] p-8 text-sm font-bold text-rose-500">Baralho não encontrado.</div>;

  const deckCover = sanitizeStoredCharacterImageUrl(deck.cover_url || deck.image_url);

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex flex-col relative overflow-hidden party-grid-bg">
      <div className="max-w-[1400px] mx-auto w-full space-y-6 relative z-10 flex-1 flex flex-col">
        <header className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/decks')} className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-200 text-indigo-600 hover:bg-indigo-50"><ArrowLeft className="h-5 w-5 stroke-[3px]" /></Button>
              <div className="hidden h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm md:flex">
                {isOfficialDeck && deckCover ? <img src={deckCover} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <Layers className="h-5 w-5" />}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase', isOfficialDeck ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600')}>{isOfficialDeck ? 'Deck oficial' : 'Deck com emojis'}</span>
                  <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{deck.is_public ? 'Público' : 'Privado'}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight">{deck.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-extrabold text-indigo-600"><span>{characters.length}/{MAX_CHARACTERS_PER_DECK} personagens criados</span><span className="text-slate-500">Dono: <strong>{deck.creator_nickname}</strong></span></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!canEditDeck && deck.is_public && <Button variant="outline" size="icon" onClick={toggleFavorite} className={cn('h-12 w-12 rounded-2xl border-2', isFavorited ? 'border-amber-200 bg-amber-50 text-amber-500' : 'border-slate-200 bg-white text-slate-400')}>{isFavorited ? <Star className="h-5 w-5 fill-current" /> : <StarOff className="h-5 w-5" />}</Button>}
              {isCreator && <Button onClick={togglePublish} className={cn('h-12 rounded-2xl border-2 px-5 text-xs font-black uppercase', deck.is_public ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}>{deck.is_public ? <Globe className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{deck.is_public ? 'Baralho público' : 'Baralho privado'}</Button>}
              {isCreator && <Button variant="destructive" size="icon" onClick={handleDeleteDeck} className="h-12 w-12 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash className="h-5 w-5" /></Button>}
            </div>
          </div>
        </header>

        {canUseImages && (
          <section className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-md">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-wide text-indigo-950"><ImagePlus className="h-6 w-6 text-indigo-500" /> Imagem do deck oficial</h3>
            <div className="flex flex-col gap-5 lg:flex-row">
              <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-indigo-50 bg-slate-50 lg:w-36">{deckCover ? <img src={deckCover} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <Layers className="h-10 w-10 text-indigo-200" />}</div>
              <div className="flex-1 space-y-3">
                <Input placeholder="Cole a URL da imagem do deck oficial..." value={deckImage} onChange={(event) => setDeckImage(event.target.value)} className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-bold text-[#1e1b4b]" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleUpdateDeckImage} disabled={updatingDeck || uploadingDeckImage} className="h-11 px-5 btn-squishy-indigo text-xs font-black uppercase text-white">{updatingDeck ? 'Salvando...' : 'Salvar URL'}</Button>
                  <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-5 text-xs font-black uppercase text-indigo-700 hover:bg-indigo-100"><ImagePlus className="h-4 w-4" />{uploadingDeckImage ? 'Salvando...' : 'Anexar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingDeckImage} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void handleAttachDeckImage(file); }} /></label>
                  {deckCover && <Button type="button" onClick={handleRemoveDeckImage} disabled={updatingDeck || uploadingDeckImage} className="h-11 bg-rose-50 px-5 text-xs font-black uppercase text-rose-600 hover:bg-rose-100"><ImageOff className="mr-1.5 h-4 w-4" /> Excluir imagem</Button>}
                </div>
              </div>
            </div>
          </section>
        )}

        {canCreateCharacters && (
          <section className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-md">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-wide text-indigo-950"><Plus className="h-6 w-6 text-indigo-500" /> Adicionar novo personagem</h3>
            <div className="flex w-full flex-col items-start gap-4 md:flex-row">
              <div className="w-full space-y-1 md:max-w-md"><Input placeholder="NOME DO PERSONAGEM..." value={charName} maxLength={35} onChange={(event) => { setCharName(event.target.value); if (errorChart) setErrorChart(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void handleAddChar(); }} className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-bold text-[#1e1b4b]" />{errorChart && <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 p-2 text-xs font-bold text-rose-500">{errorChart}</p>}</div>
              <Button onClick={handleAddChar} disabled={adding || !charName.trim() || characters.length >= MAX_CHARACTERS_PER_DECK} className="h-12 w-full shrink-0 px-6 btn-squishy-green text-xs font-black uppercase text-white md:w-auto"><Plus className="mr-1.5 h-4 w-4" />{adding ? 'Inserindo...' : 'Inserir personagem'}</Button>
            </div>
            {!isOfficialDeck && (
              <div className="mt-4 rounded-2xl border-2 border-indigo-50 bg-indigo-50/45 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-3xl shadow-sm">{selectedCommonEmoji || emojiForName(charName)}</div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-950">Emoji do personagem</p>
                    <p className="text-[11px] font-bold text-slate-500">Escolha um emoji ou deixe o jogo sugerir pelo nome.</p>
                  </div>
                </div>
                <CommonEmojiPicker selectedEmoji={selectedCommonEmoji || emojiForName(charName)} onSelect={setSelectedCommonEmoji} />
              </div>
            )}
            <p className="mt-3 text-[11px] font-bold italic text-slate-400">{canUseImages ? 'Deck oficial: imagens podem ser anexadas nos cards.' : 'Deck comum: personagens usam card simples com emoji. Imagem fica disponível apenas para deck oficial.'}</p>
          </section>
        )}

        <section className="min-h-[40vh] rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-md md:p-8">
          {displayCharacters.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-4 border-dashed border-indigo-50 bg-slate-50/50 p-8 py-20 text-center"><BookOpen className="mb-3 h-12 w-12 text-indigo-200" /><p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Este baralho ainda não tem personagens.</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {displayCharacters.map((char, index) => <CharacterCard key={char.id} char={char} index={index} canEditDeck={canEditDeck} canUseImages={canUseImages} isOfficialDeck={isOfficialDeck} canDeleteCharacters={canDeleteCharacters} characterDrafts={characterDrafts} setCharacterDrafts={setCharacterDrafts} uploadingCharacterId={uploadingCharacterId} editingCharacterId={editingCharacterId} deletingCharacterId={deletingCharacterId} onAttach={handleAttachCharacterImage} onRemoveImage={handleRemoveCharacterImage} onSave={handleSaveCharacter} onDelete={handleDeleteChar} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CharacterCard({ char, index, canEditDeck, canUseImages, isOfficialDeck, canDeleteCharacters, characterDrafts, setCharacterDrafts, uploadingCharacterId, editingCharacterId, deletingCharacterId, onAttach, onRemoveImage, onSave, onDelete }: any) {
  const draft = characterDrafts[char.id] || { name: char.name || '', imageUrl: char.image_url || '', avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG };
  const commonEmoji = getCommonEmoji(draft.avatarConfig) || getCommonEmoji(char.avatar_config) || emojiForName(draft.name || char.name);

  const updateDraft = (patch: Partial<CharacterDraft>) => {
    setCharacterDrafts((current: Record<string, CharacterDraft>) => ({
      ...current,
      [char.id]: {
        name: current[char.id]?.name ?? char.name ?? '',
        imageUrl: current[char.id]?.imageUrl ?? char.image_url ?? '',
        avatarConfig: current[char.id]?.avatarConfig ?? char.avatar_config ?? DEFAULT_AVATAR_CONFIG,
        ...patch,
      },
    }));
  };

  const updateCommonEmoji = (emoji: string) => {
    const avatarConfig = {
      ...(draft.avatarConfig || char.avatar_config || DEFAULT_AVATAR_CONFIG),
      commonEmoji: emoji,
    };
    updateDraft({ avatarConfig });
  };

  return (
    <div className="group relative flex aspect-[2/3] flex-col overflow-hidden rounded-2xl border-4 border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-400" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-slate-50/50 p-2">
        <CharacterImage
          name={char.name}
          imageUrl={isOfficialDeck ? sanitizeStoredCharacterImageUrl(char.image_url) : ''}
          avatarConfig={isOfficialDeck ? char.avatar_config : draft.avatarConfig || char.avatar_config}
          isOfficial={isOfficialDeck}
          className="h-full w-full rounded-xl object-cover shadow-inner transition-transform duration-500 group-hover:scale-105"
          placeholderClassName="text-slate-300"
        />
      </div>
      <div className="border-t-2 border-slate-50 bg-white p-3">
        <span className="block truncate text-center text-sm font-black text-[#1e1b4b]">{char.name}</span>
        {canUseImages && <label className="mt-2 flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 text-[10px] font-black uppercase text-indigo-700 hover:bg-indigo-100"><ImagePlus className="h-3.5 w-3.5" />{uploadingCharacterId === char.id ? 'Salvando...' : char.image_url ? 'Trocar imagem' : 'Anexar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingCharacterId === char.id} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void onAttach(char, file); }} /></label>}
        {canUseImages && char.image_url && <button type="button" onClick={() => onRemoveImage(char)} disabled={uploadingCharacterId === char.id} className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 disabled:opacity-60"><ImageOff className="h-3.5 w-3.5" /> Remover imagem</button>}
      </div>
      {canDeleteCharacters && <button type="button" onClick={() => onDelete(char.id)} disabled={deletingCharacterId === char.id} className="absolute right-2.5 top-2.5 z-30 rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-500 shadow-md transition-all hover:border-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-60" title="Excluir personagem"><Trash2 className="h-3.5 w-3.5" /></button>}
      {canEditDeck && (
        <div className="absolute inset-x-2 bottom-[52px] z-20 space-y-2 rounded-xl border border-indigo-100 bg-white/95 p-2 opacity-0 shadow-lg backdrop-blur transition-all group-hover:opacity-100 group-focus-within:opacity-100">
          <Input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className="h-8 border-slate-200 text-[11px] font-bold" placeholder="Nome do personagem" />
          {canUseImages && <Input value={draft.imageUrl} onChange={(event) => updateDraft({ imageUrl: event.target.value })} className="h-8 border-slate-200 text-[11px] font-semibold" placeholder="URL da imagem" />}
          {!isOfficialDeck && (
            <div className="rounded-xl border border-indigo-50 bg-indigo-50/70 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wide text-indigo-950">Emoji do personagem</span>
                <span className="text-xl leading-none">{commonEmoji}</span>
              </div>
              <CommonEmojiPicker selectedEmoji={commonEmoji} onSelect={updateCommonEmoji} compact />
            </div>
          )}
          <Button onClick={() => onSave(char)} disabled={editingCharacterId === char.id} className="h-8 w-full btn-squishy-indigo text-[10px] font-black uppercase text-white">{editingCharacterId === char.id ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      )}
    </div>
  );
}

function emojiForName(name: string) {
  const normalized = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(bruxa|mago|feitic|wizard|witch)/.test(normalized)) return '🧙';
  if (/(robo|bot|cyber|android)/.test(normalized)) return '🤖';
  if (/(fantasma|ghost|assombra)/.test(normalized)) return '👻';
  if (/(heroi|hero|super)/.test(normalized)) return '🦸';
  if (/(rei|rainha|king|queen)/.test(normalized)) return '👑';
  if (/(monstro|monster|fera|drag)/.test(normalized)) return '🐲';
  const hash = normalized.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return PLAYER_DECK_EMOJIS[hash % PLAYER_DECK_EMOJIS.length];
}

function CommonEmojiPicker({ selectedEmoji, onSelect, compact = false }: { selectedEmoji: string; onSelect: (emoji: string) => void; compact?: boolean }) {
  return (
    <div className={cn('grid gap-1.5', compact ? 'max-h-28 grid-cols-7 overflow-y-auto pr-1' : 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12')}>
      {COMMON_EMOJI_OPTIONS.map((emoji) => {
        const active = selectedEmoji === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={cn(
              'flex aspect-square min-h-8 items-center justify-center rounded-xl border bg-white text-lg leading-none shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50',
              active ? 'border-amber-400 bg-amber-100 ring-2 ring-amber-200' : 'border-indigo-100',
              compact && 'min-h-7 rounded-lg text-base',
            )}
            aria-label={`Usar emoji ${emoji}`}
            aria-pressed={active}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

function getCommonEmoji(avatarConfig?: AvatarConfig | null) {
  const emoji = String((avatarConfig as any)?.commonEmoji || '').trim();
  return emoji ? Array.from(emoji).slice(0, 3).join('') : '';
}

function sanitizeGeneratedImageUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('image.pollinations.ai') && raw.includes('fallback')) return '';
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith('/api/')) return '';
  return raw;
}

function sanitizeStoredCharacterImageUrl(value?: string | null) {
  return sanitizeGeneratedImageUrl(value);
}
