'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Globe, Lock, Trash, Star, StarOff, Layers, Image as ImageIcon } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import LoadingArena from '@/components/LoadingArena';
import CharacterImage from '@/components/CharacterImage';
import AvatarBuilder from '@/components/avatar/AvatarBuilder';
import { DEFAULT_AVATAR_CONFIG, randomAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { user, initialized: authInitialized, loading: authLoading } = useUserStore();

  const [deck, setDeck] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const [charName, setCharName] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [deckImage, setDeckImage] = useState('');
  const [adding, setAdding] = useState(false);
  const [updatingDeck, setUpdatingDeck] = useState(false);
  const [errorChart, setErrorChart] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState('');
  const [characterDrafts, setCharacterDrafts] = useState<Record<string, { name: string; imageUrl: string; avatarConfig: AvatarConfig }>>({});

  const isCreator = deck?.creator_id === user?.id;
  const isTemporaryOfficialEditor = TEMP_OFFICIAL_DECK_EDITING_ENABLED && isOfficialDeckId(deckId);
  const canEditDeck = isCreator || isTemporaryOfficialEditor;

  useEffect(() => {
    if (!authInitialized || authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    const fetchDeck = async () => {
      setLoading(true);

      try {
        const { data: dData, error: deckError } = await supabaseGame
          .from('decks')
          .select('*')
          .eq('id', deckId)
          .single();

        if (deckError || !dData) {
          setDeck(null);
          setCharacters([]);
          setCharacterDrafts({});
          setIsFavorited(false);
          setLoading(false);
          return;
        }

        const { data: cData } = await supabaseGame
          .from('characters')
          .select('*')
          .eq('deck_id', deckId);

        let isFav = false;

        if (user?.id) {
          const { data: favData } = await supabaseGame
            .from('deck_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('deck_id', deckId)
            .single();

          isFav = !!favData;
        }

        let creatorNickname = 'Criador Anônimo';

        if (dData?.creator_id) {
          const { data: creatorData } = await supabaseGame
            .from('profiles')
            .select('nickname')
            .eq('id', dData.creator_id)
            .single();

          if (creatorData?.nickname) {
            creatorNickname = creatorData.nickname;
          }
        }

        const sanitizedCharacters = (cData || []).map((char: any) => ({
          ...char,
          image_url: sanitizeStoredCharacterImageUrl(char.image_url),
          avatar_config: char.avatar_config || DEFAULT_AVATAR_CONFIG,
        }));

        setDeck({ ...dData, creator_nickname: creatorNickname });
        setDeckImage(dData?.cover_url || dData?.image_url || '');
        setCharacters(sanitizedCharacters);
        setCharacterDrafts(
          Object.fromEntries(
            sanitizedCharacters.map((char: any) => [
              char.id,
              {
                name: char.name || '',
                imageUrl: char.image_url || '',
                avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG,
              },
            ]),
          ),
        );
        setIsFavorited(isFav);
      } catch (error) {
        console.error('Failed to fetch deck', error);
        setDeck(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [authInitialized, authLoading, user, deckId, router]);

  const toggleFavorite = async () => {
    if (!user?.id) return;

    if (isFavorited) {
      await supabaseGame.from('deck_favorites').delete().eq('user_id', user.id).eq('deck_id', deckId);
      setIsFavorited(false);
    } else {
      await supabaseGame.from('deck_favorites').insert({ user_id: user.id, deck_id: deckId });
      setIsFavorited(true);
    }
  };

  const handleAddChar = async () => {
    if (!canEditDeck) return;

    const cleanName = charName.trim();

    if (!cleanName) return;

    if (characters.length >= MAX_CHARACTERS_PER_DECK) {
      setErrorChart(`Cada baralho pode ter no maximo ${MAX_CHARACTERS_PER_DECK} personagens.`);
      return;
    }

    setAdding(true);
    setErrorChart('');

    try {
      const isSafeName = await moderateText(cleanName);

      if (!isSafeName) {
        setErrorChart('Nomes inadequados nao sao permitidos.');
        return;
      }

      const data = isTemporaryOfficialEditor
        ? await fetch('/api/official-decks/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add-character',
              deckId,
              name: cleanName,
              imageUrl: '',
            }),
          }).then(async (res) => {
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Nao foi possivel inserir o personagem.');
            return result.character;
          })
        : (
            await supabaseGame
              .from('characters')
              .insert({
                deck_id: deckId,
                name: cleanName,
                image_url: '',
                avatar_config: avatarConfig,
              })
              .select()
              .single()
          ).data;

      if (data) {
        const sanitizedCharacter = {
          ...data,
          image_url: sanitizeStoredCharacterImageUrl(data.image_url),
          avatar_config: data.avatar_config || avatarConfig,
        };

        setCharacters((current) => [...current, sanitizedCharacter]);
        setCharacterDrafts((current) => ({
          ...current,
          [sanitizedCharacter.id]: {
            name: sanitizedCharacter.name || '',
            imageUrl: sanitizedCharacter.image_url || '',
            avatarConfig: sanitizedCharacter.avatar_config || DEFAULT_AVATAR_CONFIG,
          },
        }));
        setCharName('');
        setAvatarConfig(DEFAULT_AVATAR_CONFIG);
      }
    } catch (error: any) {
      console.error('Failed to add character', error);
      setErrorChart(error.message || 'Nao foi possivel inserir o personagem.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChar = async (id: string) => {
    if (!canEditDeck) return;

    if (isTemporaryOfficialEditor) {
      const response = await fetch('/api/official-decks/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-character', deckId, characterId: id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        alert(result.error || 'Nao foi possivel excluir o personagem.');
        return;
      }
    } else {
      await supabaseGame.from('characters').delete().eq('id', id);
    }

    setCharacters((current) => current.filter((char) => char.id !== id));
    setCharacterDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const togglePublish = async () => {
    if (!isCreator) return;

    if (!deck.is_public && characters.length < 5) {
      alert('Seu baralho precisa conter pelo menos 5 personagens antes de ser publicado globalmente.');
      return;
    }

    const newStatus = !deck.is_public;

    await supabaseGame.from('decks').update({ is_public: newStatus }).eq('id', deckId);
    setDeck({ ...deck, is_public: newStatus });
  };

  const handleUpdateDeckImage = async () => {
    if (!canEditDeck) return;

    const cleanDeckImage = deckImage.trim();

    setUpdatingDeck(true);

    try {
      if (isTemporaryOfficialEditor) {
        const response = await fetch('/api/official-decks/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-cover', deckId, coverUrl: cleanDeckImage }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          alert(result.error || 'Nao foi possivel salvar a capa.');
        } else {
          setDeck({ ...deck, cover_url: cleanDeckImage });
          setDeckImage(cleanDeckImage);
        }
      } else {
        await supabaseGame.from('decks').update({ cover_url: cleanDeckImage }).eq('id', deckId);
        setDeck({ ...deck, cover_url: cleanDeckImage });
        setDeckImage(cleanDeckImage);
      }
    } finally {
      setUpdatingDeck(false);
    }
  };

  const handleSaveCharacter = async (char: any) => {
    if (!canEditDeck) return;

    const draft = characterDrafts[char.id] || {
      name: char.name || '',
      imageUrl: char.image_url || '',
      avatarConfig: char.avatar_config || DEFAULT_AVATAR_CONFIG,
    };

    const cleanName = draft.name.trim();
    const rawImageUrl = draft.imageUrl.trim();
    const cleanImageUrl = rawImageUrl ? sanitizeGeneratedImageUrl(rawImageUrl) : '';

    if (!cleanName) {
      alert('O nome do personagem nao pode ficar vazio.');
      return;
    }

    if (isTemporaryOfficialEditor && rawImageUrl && !cleanImageUrl) {
      alert('Essa URL de imagem e invalida ou e um fallback antigo ruim.');
      return;
    }

    setEditingCharacterId(char.id);

    try {
      const updated = isTemporaryOfficialEditor
        ? await fetch('/api/official-decks/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-character',
              deckId,
              characterId: char.id,
              name: cleanName,
              imageUrl: cleanImageUrl,
            }),
          }).then(async (res) => {
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Nao foi possivel salvar o personagem.');
            return result.character;
          })
        : (
            await supabaseGame
              .from('characters')
              .update({
                name: cleanName,
                image_url: '',
                avatar_config: draft.avatarConfig || DEFAULT_AVATAR_CONFIG,
              })
              .eq('id', char.id)
              .select()
              .single()
          ).data;

      if (updated) {
        const sanitizedCharacter = {
          ...updated,
          image_url: sanitizeStoredCharacterImageUrl(updated.image_url),
          avatar_config: updated.avatar_config || draft.avatarConfig || DEFAULT_AVATAR_CONFIG,
        };

        setCharacters((current) => current.map((item) => (item.id === char.id ? sanitizedCharacter : item)));
        setCharacterDrafts((current) => ({
          ...current,
          [sanitizedCharacter.id]: {
            name: sanitizedCharacter.name || '',
            imageUrl: sanitizedCharacter.image_url || '',
            avatarConfig: sanitizedCharacter.avatar_config || DEFAULT_AVATAR_CONFIG,
          },
        }));
      }
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel salvar o personagem.');
    } finally {
      setEditingCharacterId('');
    }
  };

  const handleDeleteDeck = async () => {
    if (!isCreator) return;

    if (confirm('Deseja realmente apagar este baralho permanentemente?')) {
      await supabaseGame.from('decks').delete().eq('id', deckId);
      router.push('/decks');
    }
  };

  if (loading) {
    return <LoadingArena label="Carregando dados do baralho..." />;
  }

  if (!deck) {
    return (
      <div className="p-8 flex items-center justify-center text-rose-500 font-bold text-sm bg-[#f5f6ff] min-h-screen">
        Baralho não encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 flex flex-col relative overflow-hidden party-grid-bg">
      <div className="max-w-[1400px] mx-auto w-full space-y-6 relative z-10 flex-1 flex flex-col">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-white border-4 border-indigo-100 flex items-center justify-between shrink-0 rounded-3xl shadow-md"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-12 h-12 rounded-2xl border-2 border-slate-250 transition-colors cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3px]" />
            </Button>

            <div className="flex items-center gap-4">
              {deck.cover_url || deck.image_url ? (
                <div className="w-14 h-14 border-2 border-indigo-100 bg-slate-50 hidden md:block rounded-xl overflow-hidden shadow-sm">
                  <img
                    src={deck.cover_url || deck.image_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 border-2 border-indigo-100 bg-indigo-50 hidden md:flex items-center justify-center rounded-xl shadow-sm text-indigo-500">
                  <Layers className="w-5 h-5" />
                </div>
              )}

              <div>
                <h1 className="text-2xl md:text-3xl font-black text-indigo-950 font-display leading-tight mb-0.5">
                  {deck.name}
                </h1>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-indigo-600 font-extrabold">
                    {characters.length}/{MAX_CHARACTERS_PER_DECK} Personagens criados
                  </p>
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                  <p className="text-xs text-slate-500 font-semibold">
                    Dono: <strong className="text-slate-600">{deck.creator_nickname}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!canEditDeck && deck.is_public && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFavorite}
                className={cn(
                  'w-12 h-12 rounded-2xl transition-all border-2 cursor-pointer flex items-center justify-center',
                  isFavorited
                    ? 'text-amber-500 border-amber-200 bg-amber-50'
                    : 'text-slate-400 border-slate-200 bg-white hover:text-amber-500 hover:border-amber-100',
                )}
              >
                {isFavorited ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
              </Button>
            )}

            {canEditDeck && (
              <>
                {isCreator && (
                  <Button
                    onClick={togglePublish}
                    className={cn(
                      'h-12 px-5 rounded-2xl text-xs font-black uppercase transition-all hidden sm:flex border-2 cursor-pointer',
                      deck.is_public
                        ? 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                        : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {deck.is_public ? (
                      <Globe className="w-4 h-4 mr-2 text-indigo-500" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2 text-slate-400" />
                    )}
                    {deck.is_public ? ' Baralho Publico' : ' Baralho Privado'}
                  </Button>
                )}

                {isCreator && (
                  <Button
                    onClick={togglePublish}
                    size="icon"
                    className={cn(
                      'h-12 w-12 rounded-2xl flex sm:hidden transition-all border-2 cursor-pointer items-center justify-center',
                      deck.is_public ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'bg-white text-slate-500 border-slate-250',
                    )}
                  >
                    {deck.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </Button>
                )}

                {isCreator && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteDeck}
                    className="h-12 w-12 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-rose-200 hover:border-rose-300 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Trash className="w-5 h-5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.header>

        {canEditDeck && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-indigo-100 p-6 md:p-8 rounded-3xl shadow-md space-y-6 relative"
          >
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1 bg-slate-50/50 p-5 border-2 border-slate-100 rounded-2xl space-y-3">
                <label className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> Imagem de Capa do Baralho
                </label>

                <div className="flex gap-3">
                  <Input
                    placeholder="Insira a URL de uma imagem para ilustrar o álbum..."
                    value={deckImage}
                    onChange={(e) => setDeckImage(e.target.value)}
                    className="flex-1 bg-white border-2 border-slate-200 h-12 text-sm font-semibold rounded-xl text-indigo-950 focus-visible:ring-indigo-150"
                  />

                  <Button
                    onClick={handleUpdateDeckImage}
                    disabled={updatingDeck || deckImage === (deck.cover_url || deck.image_url || '')}
                    className="h-12 px-5 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer shrink-0"
                  >
                    {updatingDeck ? '...' : 'Salvar Capa'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xl font-black text-indigo-950 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6 text-indigo-500 stroke-[3px]" /> Adicionar Novo Personagem
              </h3>

              <div className="flex flex-col md:flex-row gap-4 items-start w-full">
                <div className="w-full md:max-w-md space-y-1">
                  <Input
                    placeholder="NOME DO PERSONAGEM, EX: SHREK, HARRY POTTER..."
                    value={charName}
                    maxLength={35}
                    onChange={(e) => {
                      setCharName(e.target.value);
                      if (errorChart) setErrorChart('');
                    }}
                    className="bg-slate-50 border-2 border-slate-200 h-12 rounded-xl text-sm font-bold text-[#1e1b4b] focus-visible:ring-indigo-150"
                  />

                  {errorChart && (
                    <p className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 mt-2 rounded-xl">
                      {errorChart}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAddChar}
                  disabled={adding || !charName.trim() || characters.length >= MAX_CHARACTERS_PER_DECK}
                  className="w-full md:w-auto h-12 px-6 btn-squishy-green text-white font-black uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {adding ? (
                    'Inserindo...'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 font-black" /> Inserir Personagem
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-5 bg-slate-50/70 border-2 border-slate-100 rounded-2xl p-4">
                <p className="text-xs font-black uppercase text-indigo-700 mb-3">Criar Avatar</p>
                <AvatarBuilder value={avatarConfig} onChange={setAvatarConfig} />
              </div>

              <p className="text-[11px] text-slate-400 font-bold mt-2 pl-1 italic">
                Personalize o personagem em camadas. Cards criados por jogadores nao usam imagem externa.
              </p>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-3xl border-4 border-indigo-100 p-6 md:p-8 min-h-[40vh] shadow-md">
          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center p-8 border-4 border-dashed border-indigo-50 rounded-2xl bg-slate-50/50">
              <Layers className="w-12 h-12 text-indigo-200 mb-3" />
              <p className="text-sm font-extrabold text-slate-400 uppercase tracking-wide">
                Este baralho ainda não tem personagens. Adicione alguns acima!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              <AnimatePresence>
                {characters.map((char, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: i * 0.05 }}
                    key={char.id}
                    className="group relative bg-white border-4 border-slate-100 rounded-2xl overflow-hidden aspect-[2/3] flex flex-col hover:border-indigo-400 shadow-sm transition-all duration-300 hover:-translate-y-1.5"
                  >
                    <div className="flex-1 w-full bg-slate-50/50 flex items-center justify-center relative p-2 overflow-hidden">
                      <CharacterImage
                        name={char.name}
                        imageUrl={sanitizeStoredCharacterImageUrl(char.image_url)}
                        avatarConfig={char.avatar_config}
                        isOfficial={isOfficialDeckId(deckId)}
                        className="w-full h-full object-cover rounded-xl shadow-inner transition-transform duration-500 scale-100 group-hover:scale-105"
                        placeholderClassName="text-slate-300"
                      />
                    </div>

                    <div className="p-3 bg-white border-t-2 border-slate-50">
                      <span className="text-sm font-black text-[#1e1b4b] truncate block text-center">{char.name}</span>
                    </div>

                    {canEditDeck && (
                      <button
                        onClick={() => handleDeleteChar(char.id)}
                        className="absolute top-2.5 right-2.5 p-2 bg-rose-50 border border-rose-200 z-30 rounded-xl text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 shadow-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                      </button>
                    )}

                    {canEditDeck && (
                      <div className="absolute inset-x-2 bottom-[52px] z-20 bg-white/95 backdrop-blur border border-indigo-100 rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg space-y-1">
                        <Input
                          value={characterDrafts[char.id]?.name ?? char.name ?? ''}
                          onChange={(event) =>
                            setCharacterDrafts((current) => ({
                              ...current,
                              [char.id]: {
                                name: event.target.value,
                                imageUrl: current[char.id]?.imageUrl ?? char.image_url ?? '',
                                avatarConfig: current[char.id]?.avatarConfig ?? char.avatar_config ?? DEFAULT_AVATAR_CONFIG,
                              },
                            }))
                          }
                          className="h-8 text-[11px] font-bold border-slate-200"
                          placeholder="Nome"
                        />

                        {isTemporaryOfficialEditor ? (
                          <Input
                            value={characterDrafts[char.id]?.imageUrl ?? char.image_url ?? ''}
                            onChange={(event) =>
                              setCharacterDrafts((current) => ({
                                ...current,
                                [char.id]: {
                                  name: current[char.id]?.name ?? char.name ?? '',
                                  imageUrl: event.target.value,
                                  avatarConfig: current[char.id]?.avatarConfig ?? char.avatar_config ?? DEFAULT_AVATAR_CONFIG,
                                },
                              }))
                            }
                            className="h-8 text-[11px] font-semibold border-slate-200"
                            placeholder="URL da imagem oficial"
                          />
                        ) : (
                          <Button
                            type="button"
                            onClick={() =>
                              setCharacterDrafts((current) => ({
                                ...current,
                                [char.id]: {
                                  name: current[char.id]?.name ?? char.name ?? '',
                                  imageUrl: '',
                                  avatarConfig: randomAvatarConfig(),
                                },
                              }))
                            }
                            className="h-8 w-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                          >
                            Randomizar visual
                          </Button>
                        )}

                        <Button
                          onClick={() => handleSaveCharacter(char)}
                          disabled={editingCharacterId === char.id}
                          className="h-8 w-full text-[10px] font-black uppercase btn-squishy-indigo text-white"
                        >
                          {editingCharacterId === char.id ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    )}

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sanitizeGeneratedImageUrl(value?: string | null) {
  const url = value?.trim();

  if (!url) return '';
  if (isBadCharacterImageUrl(url)) return '';

  return url;
}

function sanitizeStoredCharacterImageUrl(value?: string | null) {
  const url = value?.trim();

  if (!url) return '';
  if (isBadCharacterImageUrl(url)) return '';

  return url;
}

function isBadCharacterImageUrl(url: string) {
  const normalized = url.toLowerCase().trim();

  if (normalized.startsWith('data:image/svg')) return true;
  if (normalized.includes('fallback-svg')) return true;
  if (normalized.includes('source=fallback')) return true;

  if (normalized.includes('/characters/') && normalized.endsWith('.svg')) return true;

  return false;
}
