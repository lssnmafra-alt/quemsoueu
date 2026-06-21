'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { audioManager } from '@/lib/audioManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { isProjectAdmin } from '@/lib/admin';
import { isOfficialDeckId } from '@/lib/officialDecks';
import {
  ArrowRight,
  BookOpen,
  Circle,
  Crown,
  Eye,
  Gamepad2,
  Globe,
  LayoutGrid,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Timer,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function HomeLobby() {
  const router = useRouter();
  const { user, profile, logout, loading: authLoading, initialized: authInitialized } = useUserStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [decks, setDecks] = useState<any[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckSearch, setDeckSearch] = useState('');
  const [favoriteDeckIds, setFavoriteDeckIds] = useState<Set<string>>(new Set());
  const [newDeckName, setNewDeckName] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState('');
  const [deletingDeckId, setDeletingDeckId] = useState('');

  const isAdminUser = isProjectAdmin(user?.id);
  const profileCompleted = Boolean(profile?.profile_completed);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!profileCompleted) {
      router.replace('/profile?next=/lobby');
    }
  }, [authInitialized, authLoading, profileCompleted, router, user?.id]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profileCompleted) return;
    void audioManager.playMusic('lobby-theme');
  }, [authInitialized, authLoading, user?.id, profileCompleted, profile?.music_genres, profile?.music_blocked_tracks]);

  const fetchRooms = async () => {
    const response = await fetch('/api/rooms/public', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setRooms(Array.isArray(result.rooms) ? result.rooms : []);
    setRoomsLoading(false);
  };

  const fetchDecks = async () => {
    if (!user?.id) return;
    setDeckLoading(true);

    const { data: favorites } = await supabaseGame
      .from('deck_favorites')
      .select('deck_id')
      .eq('user_id', user.id);

    const favoriteIds = (favorites || []).map((fav: any) => fav.deck_id).filter(Boolean);
    const favoriteIdSet = new Set<string>(favoriteIds);
    setFavoriteDeckIds(favoriteIdSet);

    const publicOrOwn = supabaseGame
      .from('decks')
      .select('*')
      .or(`is_public.eq.true,creator_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const [{ data: visibleDecks }, { data: favoriteDecks }] = await Promise.all([
      publicOrOwn,
      favoriteIds.length ? supabaseGame.from('decks').select('*').in('id', favoriteIds) : Promise.resolve({ data: [] }),
    ]);

    const mergedDecks = Array.from(
      new Map([...(visibleDecks || []), ...(favoriteDecks || [])].map((deck: any) => [deck.id, deck])).values(),
    );

    if (!mergedDecks.length) {
      setDecks([]);
      setDeckLoading(false);
      return;
    }

    const { data: characters } = await supabaseGame
      .from('characters')
      .select('deck_id')
      .in('deck_id', mergedDecks.map((deck: any) => deck.id));

    const characterCounts = new Map<string, number>();
    (characters || []).forEach((character: any) => {
      characterCounts.set(character.deck_id, (characterCounts.get(character.deck_id) || 0) + 1);
    });

    const creatorIds = mergedDecks.map((deck: any) => deck.creator_id).filter(Boolean);
    const { data: creatorProfiles } = creatorIds.length
      ? await supabaseGame.from('profiles').select('id,nickname').in('id', creatorIds)
      : { data: [] };
    const creatorMap = new Map((creatorProfiles || []).map((profile: any) => [profile.id, profile.nickname]));

    const nextDecks = mergedDecks.map((deck: any) => {
      const deckIsOfficial = Boolean(deck.is_official) || deck.creator_id === null || isOfficialDeckId(deck.id);
      return {
        ...deck,
        is_official: deckIsOfficial,
        character_count: characterCounts.get(deck.id) || 0,
        creator_nickname: deckIsOfficial ? 'Oficial' : (creatorMap.get(deck.creator_id) || 'Jogador'),
      };
    });

    setDecks(nextDecks);
    setDeckLoading(false);
  };

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profileCompleted) return;

    void fetchRooms();
    const roomTimer = setInterval(fetchRooms, 10000);
    const subscription = supabaseGame
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => {
      clearInterval(roomTimer);
      subscription.unsubscribe();
    };
  }, [authInitialized, authLoading, user?.id, profileCompleted]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profileCompleted) return;

    void fetchDecks();
    const subscription = supabaseGame
      .channel(`library:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decks' }, fetchDecks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deck_favorites', filter: `user_id=eq.${user.id}` }, fetchDecks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, fetchDecks)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [authInitialized, authLoading, user?.id, profileCompleted]);

  const filteredDecks = useMemo(() => {
    const query = deckSearch.trim().toLowerCase();
    return decks
      .filter((deck) => !query || String(deck.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const aOwn = a.creator_id === user?.id ? 1 : 0;
        const bOwn = b.creator_id === user?.id ? 1 : 0;
        const aOfficial = a.is_official ? 1 : 0;
        const bOfficial = b.is_official ? 1 : 0;
        const aFav = favoriteDeckIds.has(a.id) ? 1 : 0;
        const bFav = favoriteDeckIds.has(b.id) ? 1 : 0;
        return (bOwn - aOwn) || (bOfficial - aOfficial) || (bFav - aFav) || ((b.character_count || 0) - (a.character_count || 0));
      });
  }, [deckSearch, decks, favoriteDeckIds, user?.id]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleCreateRoom = async () => {
    if (!user?.id) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabaseGame
      .from('rooms')
      .insert({
        code,
        admin_id: user.id,
        is_public: true,
        max_players: 6,
        chars_per_player: 3,
        pick_time_seconds: 30,
        vote_time_seconds: 30,
        reveal_time_seconds: 8,
        status: 'LOBBY',
      })
      .select()
      .single();

    if (error) {
      alert('Não foi possível criar a sala agora.');
      return;
    }
    if (data) router.push(`/room/${data.id}`);
  };

  const joinPrivateRoom = async () => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    const { data } = await supabaseGame
      .from('rooms')
      .select('id,status')
      .eq('code', cleanCode)
      .maybeSingle();

    if (!data) {
      alert('Sala de jogo não encontrada.');
      return;
    }

    if (data.status !== 'LOBBY') {
      alert('Essa sala não aceita novos jogadores no momento. Escolha uma sala aguardando jogadores.');
      return;
    }

    router.push(`/room/${data.id}`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!isAdminUser || deletingRoomId) return;
    if (!confirm('Deseja excluir esta sala e limpar seus dados relacionados?')) return;

    setDeletingRoomId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível excluir a sala.');
      setRooms((current) => current.filter((room) => room.id !== roomId));
    } catch (error: any) {
      alert(error.message || 'Não foi possível excluir a sala.');
    } finally {
      setDeletingRoomId('');
    }
  };

  const handleCreateDeck = async () => {
    const name = newDeckName.trim();
    if (!user?.id || !name || creatingDeck) return;

    setCreatingDeck(true);
    const { data, error } = await supabaseGame
      .from('decks')
      .insert({ name, creator_id: user.id, is_public: false, cover_url: '' })
      .select()
      .single();
    setCreatingDeck(false);

    if (error) {
      alert('Não foi possível criar o baralho agora.');
      return;
    }

    setNewDeckName('');
    if (data) router.push(`/decks/${data.id}`);
  };

  const handleRemoveDeck = async (deck: any) => {
    if (!user?.id || deletingDeckId) return;
    const isOwn = deck.creator_id === user.id;
    const canRemoveDeck = isAdminUser || (!deck.is_official && isOwn);
    if (!canRemoveDeck) return;

    if (!confirm(`Remover o deck "${deck.name}"?`)) return;

    setDeletingDeckId(deck.id);
    try {
      const response = await fetch(`/api/decks/${deck.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível remover o deck.');
      setDecks((current) => current.filter((item) => item.id !== deck.id));
      setFavoriteDeckIds((current) => {
        const next = new Set(current);
        next.delete(deck.id);
        return next;
      });
    } catch (error: any) {
      alert(error.message || 'Não foi possível remover o deck.');
    } finally {
      setDeletingDeckId('');
    }
  };

  const toggleFavoriteDeck = async (deck: any) => {
    if (!user?.id) return;
    const isFavorite = favoriteDeckIds.has(deck.id);
    const nextFavorites = new Set(favoriteDeckIds);

    if (isFavorite) {
      nextFavorites.delete(deck.id);
      setFavoriteDeckIds(nextFavorites);
      await supabaseGame.from('deck_favorites').delete().eq('user_id', user.id).eq('deck_id', deck.id);
    } else {
      nextFavorites.add(deck.id);
      setFavoriteDeckIds(nextFavorites);
      await supabaseGame.from('deck_favorites').insert({ user_id: user.id, deck_id: deck.id });
    }
  };

  if (!authInitialized || authLoading || !user || !profileCompleted) {
    return <LoadingArena label="Entrando no jogo..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 relative overflow-hidden party-grid-bg">
      <div className="max-w-[1400px] mx-auto space-y-6 relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border-4 border-indigo-100 p-6 rounded-3xl shadow-xl gap-4"
        >
          <div className="flex items-center gap-5">
            <AvatarFigure avatarUrl={profile?.avatar_url} label={profile?.nickname || 'Jogador'} className="w-16 h-16 bg-slate-100 border-4 border-indigo-400 rounded-2xl shadow-md" />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Jogador Online</p>
              </div>
              <h2 className="text-3xl font-black text-indigo-950 font-display">{profile?.nickname || 'Jogador'}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                <span className="flex items-center gap-1 font-bold text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  <Trophy className="w-3.5 h-3.5" /> Vitórias: <strong className="text-indigo-950">{profile?.wins || 0}</strong>
                </span>
                <span className="flex items-center gap-1 font-bold text-slate-550 uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  <Gamepad2 className="w-3.5 h-3.5" /> Partidas: <strong>{profile?.played_matches || 0}</strong>
                </span>
                {isAdminUser && (
                  <span className="flex items-center gap-1 font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                    <Crown className="w-3.5 h-3.5" /> ADM
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/profile?next=/lobby')} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs font-black uppercase rounded-2xl border-2 border-indigo-100 px-5 h-12 cursor-pointer">
              Editar Perfil <UserRound className="w-4 h-4 ml-2" />
            </Button>
            {isAdminUser && (
              <Button onClick={() => router.push('/decks/official/new')} className="text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-black uppercase rounded-2xl border-2 border-amber-100 px-5 h-12 cursor-pointer">
                Novo Oficial <Crown className="w-4 h-4 ml-2" />
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-black uppercase rounded-2xl border-2 border-slate-200 px-5 h-12 cursor-pointer">
              Sair da Conta <LogOut className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.header>

        <div className="grid lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b-4 border-indigo-50 pb-2">
              <h3 className="text-3xl font-black text-indigo-950 flex items-center gap-2.5 font-display"><Users className="w-7 h-7 text-indigo-500" /> Encontrar Partidas</h3>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Servidor Ativo
              </div>
            </div>

            <div className="bg-white border-4 border-indigo-100 p-6 flex flex-col shadow-xl rounded-3xl gap-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex bg-indigo-50/50 border-2 border-indigo-100 p-1 rounded-2xl focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-inner relative justify-between">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                  <Input
                    placeholder="CÓDIGO DA SALA..."
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value)}
                    className="border-0 bg-transparent pl-12 pr-1 h-12 text-base font-bold text-indigo-950 uppercase placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none flex-1"
                  />
                  <Button onClick={joinPrivateRoom} disabled={!roomCode.trim()} className="h-12 px-6 ml-2 text-xs font-black uppercase tracking-wider btn-squishy-indigo text-white cursor-pointer">
                    Entrar
                  </Button>
                </div>
                <Button onClick={handleCreateRoom} className="h-14 sm:w-64 text-sm font-black tracking-wide uppercase btn-squishy-yellow text-amber-950 cursor-pointer flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5 stroke-[3px]" /> Criar Minha Sala
                </Button>
              </div>

              <h4 className="text-xs uppercase font-black text-indigo-600/60 pb-1 border-b border-indigo-50 tracking-wider">Salas Públicas Disponíveis</h4>

              <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-5 min-h-[380px] relative">
                {roomsLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Carregando salas...</p>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/70 rounded-2xl">
                    <Circle className="w-12 h-12 text-indigo-200 mb-3" />
                    <p className="text-slate-500 font-bold text-sm mb-1">Nenhuma sala pública aguardando jogadores</p>
                    <p className="text-xs text-indigo-600/80 font-bold">Salas em andamento ficam ocultas para não confundir.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {rooms.map((room, index) => (
                        <motion.div
                          key={room.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.04 }}
                          onClick={() => router.push(`/room/${room.id}`)}
                          className="bg-white border-2 border-indigo-100 p-5 rounded-2xl shadow-sm transition-all flex flex-col justify-between hover:bg-indigo-50/10 hover:border-indigo-400 cursor-pointer hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-4 gap-3">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-[10px] font-black uppercase text-emerald-600">{roomStatusLabel(room.status)}</p>
                              </div>
                              <p className="text-2xl font-black text-indigo-950 font-display">Sala #{room.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdminUser && (
                                <button
                                  type="button"
                                  disabled={deletingRoomId === room.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteRoom(room.id);
                                  }}
                                  className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all disabled:opacity-50"
                                  title="Excluir sala"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center">
                                <ArrowRight className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100 pt-3 flex-wrap">
                            <span className="text-[#3b82f6] text-xs font-bold bg-blue-50 py-1 px-3 border border-blue-100 rounded-full flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {room.player_count || 0}/{room.max_players || 6} jogadores</span>
                            <span className="text-indigo-600 text-xs font-bold bg-indigo-50 py-1 px-3 border border-indigo-100 rounded-full flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Aguardando iniciar</span>
                            <span className="text-slate-600 text-xs font-bold bg-slate-50 py-1 px-3 border border-slate-100 rounded-full">{room.chars_per_player || 3} Vidas</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b-4 border-indigo-50 pb-2">
              <h3 className="text-3xl font-black text-indigo-950 flex items-center gap-2.5 font-display"><BookOpen className="w-7 h-7 text-indigo-500" /> Biblioteca</h3>
            </div>

            <div className="bg-white border-4 border-indigo-100 p-5 flex flex-col h-full rounded-3xl shadow-xl min-h-[560px] gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 border-2 border-amber-200 flex items-center justify-center rounded-2xl shrink-0">
                  <LayoutGrid className="w-6 h-6 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-black text-indigo-950 font-display leading-tight">Biblioteca de Decks</h4>
                  <p className="text-xs text-slate-500 font-bold">Crie, consulte e favorite baralhos.</p>
                </div>
              </div>

              <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-3 space-y-3">
                <Input
                  value={newDeckName}
                  maxLength={40}
                  onChange={(event) => setNewDeckName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateDeck(); }}
                  placeholder="NOME DO NOVO DECK..."
                  className="h-11 bg-white border-2 border-indigo-100 text-sm font-bold text-indigo-950 rounded-xl focus-visible:ring-indigo-100"
                />
                <Button onClick={handleCreateDeck} disabled={creatingDeck || !newDeckName.trim()} className="w-full h-11 btn-squishy-green text-white font-black uppercase text-xs flex items-center justify-center gap-2 cursor-pointer">
                  <Plus className="w-4 h-4" /> {creatingDeck ? 'Criando...' : 'Criar Deck'}
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <Input
                  value={deckSearch}
                  onChange={(event) => setDeckSearch(event.target.value)}
                  placeholder="PESQUISAR DECKS..."
                  className="h-11 bg-slate-50 border-2 border-slate-200 pl-10 text-sm font-bold text-indigo-950 rounded-xl focus-visible:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] uppercase font-black text-indigo-600/70 border-b border-indigo-50 pb-2">
                <span>{filteredDecks.length} decks encontrados</span>
                <button onClick={() => router.push('/decks')} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5" /> Ver página
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[680px]">
                {deckLoading ? (
                  <div className="py-8 text-center text-xs font-black uppercase text-indigo-400">Carregando decks...</div>
                ) : filteredDecks.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-6 text-center text-sm font-bold text-slate-500">Nenhum deck encontrado.</div>
                ) : (
                  filteredDecks.map((deck) => {
                    const isOwn = deck.creator_id === user.id;
                    const isFavorite = favoriteDeckIds.has(deck.id);
                    const canEdit = isOwn || (deck.is_official && isAdminUser);
                    const canDelete = isAdminUser || (!deck.is_official && isOwn);
                    const deckPath = deck.is_official && isAdminUser ? `/decks/official/${deck.id}/edit` : `/decks/${deck.id}`;

                    return (
                      <div key={deck.id} className="group bg-white border-2 border-slate-100 hover:border-indigo-200 p-4 rounded-2xl shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-14 h-14 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                            {deck.cover_url || deck.image_url ? <img src={deck.cover_url || deck.image_url} alt="" className="w-full h-full object-cover" /> : <LayoutGrid className="w-6 h-6 text-indigo-300" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-black text-indigo-950 leading-tight truncate">{deck.name}</h5>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> {deck.creator_nickname}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-600">{deck.character_count || 0} personagens</span>
                              <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 flex items-center gap-1">{deck.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {deck.is_public ? 'Público' : 'Privado'}</span>
                              {deck.is_official && <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-1 text-[10px] font-black text-amber-700 flex items-center gap-1"><Crown className="w-3 h-3" /> Oficial</span>}
                              {isOwn && !deck.is_official && <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">Seu deck</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {canDelete && (
                              <button
                                type="button"
                                disabled={deletingDeckId === deck.id}
                                onClick={() => void handleRemoveDeck(deck)}
                                className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 flex items-center justify-center disabled:opacity-50"
                                title="Excluir deck"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void toggleFavoriteDeck(deck)}
                              className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-100 flex items-center justify-center"
                              title={isFavorite ? 'Remover favorito' : 'Favoritar'}
                            >
                              {isFavorite ? <Star className="w-4 h-4 fill-current text-amber-500" /> : <StarOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => router.push(deckPath)} variant="outline" className="h-10 rounded-xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-black uppercase cursor-pointer">
                            {canEdit ? <Pencil className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />} {canEdit ? 'Editar' : 'Consultar'}
                          </Button>
                          <Button onClick={() => void toggleFavoriteDeck(deck)} variant="outline" className="h-10 rounded-xl border-2 border-amber-100 text-amber-600 hover:bg-amber-50 text-xs font-black uppercase cursor-pointer">
                            {isFavorite ? <Star className="w-4 h-4 mr-1 fill-current" /> : <StarOff className="w-4 h-4 mr-1" />} {isFavorite ? 'Favorito' : 'Favoritar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function roomStatusLabel(status?: string) {
  if (status === 'LOBBY') return 'Pronto para jogar';
  if (status === 'STARTING') return 'Começando';
  if (status === 'PICKING') return 'Escolhendo cartas';
  if (status === 'PLAYING') return 'Em partida';
  return 'Aguardando jogadores';
}
