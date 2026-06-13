'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Users, LayoutGrid, Plus, LogOut, Search, ArrowRight, BookOpen, Star, StarOff, Globe, Lock, Eye, Pencil, Trophy, Gamepad2, Circle, Timer, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';

const OFFICIAL_DECK_ID = '__official__';
let lastBotCycleRunAt = 0;

export default function HomeLobby() {
  const router = useRouter();
  const { user, profile, logout, loading: authLoading, initialized: authInitialized } = useUserStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [decks, setDecks] = useState<any[]>([]);
  const [favoriteDeckIds, setFavoriteDeckIds] = useState<Set<string>>(new Set());
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckSearch, setDeckSearch] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    
    const fetchRooms = async () => {
      const now = Date.now();
      if (now - lastBotCycleRunAt > 25000) {
        lastBotCycleRunAt = now;
        fetch('/api/rooms/bot-cycle', { method: 'POST' }).catch(() => {});
      }

      const { data } = await supabaseGame
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .in('status', ['LOBBY', 'PICKING', 'STARTING', 'PLAYING'])
        .order('created_at', { ascending: false });

      const roomIds = (data || []).map((room: any) => room.id);
      const { data: roomPlayers } = roomIds.length > 0
        ? await supabaseGame.from('room_players').select('room_id').in('room_id', roomIds)
        : { data: [] };

      const playerCounts = new Map<string, number>();
      (roomPlayers || []).forEach((player: any) => {
        playerCounts.set(player.room_id, (playerCounts.get(player.room_id) || 0) + 1);
      });

      const orderedRooms = (data || [])
        .map((room: any) => ({ ...room, player_count: playerCounts.get(room.id) || 0 }))
        .sort((a: any, b: any) => {
          const aWaiting = a.status === 'LOBBY' ? 1 : 0;
          const bWaiting = b.status === 'LOBBY' ? 1 : 0;
          return (bWaiting - aWaiting) || ((b.player_count || 0) - (a.player_count || 0));
        });

      setRooms(orderedRooms);
      setLoading(false);
    };

    fetchRooms();
    const roomCycle = setInterval(fetchRooms, 25000);
    
    // Subscribe to new rooms
    const subscription = supabaseGame.channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
      
    return () => {
      clearInterval(roomCycle);
      subscription.unsubscribe();
    };
  }, [authInitialized, authLoading, router, user]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user) return;

    const fetchDecks = async () => {
      setDeckLoading(true);

      const { data: favorites } = await supabaseGame
        .from('deck_favorites')
        .select('deck_id')
        .eq('user_id', user.id);

      const favoriteIds = (favorites || []).map((fav: any) => fav.deck_id).filter(Boolean);
      const favoriteIdSet = new Set<string>(favoriteIds);
      if (typeof window !== 'undefined' && localStorage.getItem('favoriteOfficialDeck') === 'true') {
        favoriteIdSet.add(OFFICIAL_DECK_ID);
      }
      setFavoriteDeckIds(favoriteIdSet);

      const ownOrPublicQuery = supabaseGame
        .from('decks')
        .select('*')
        .or(`is_public.eq.true,creator_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const [{ data: ownOrPublic }, { data: favoritedDecks }] = await Promise.all([
        ownOrPublicQuery,
        favoriteIds.length
          ? supabaseGame.from('decks').select('*').in('id', favoriteIds)
          : Promise.resolve({ data: [] }),
      ]);

      const mergedDecks = Array.from(
        new Map([...(ownOrPublic || []), ...(favoritedDecks || [])].map((deck: any) => [deck.id, deck])).values()
      );

      let decksWithCreators: any[] = [];

      if (mergedDecks.length > 0) {
        const { data: characters } = await supabaseGame
          .from('characters')
          .select('deck_id')
          .in('deck_id', mergedDecks.map((deck: any) => deck.id));

        const characterCounts = new Map<string, number>();
        (characters || []).forEach((char: any) => {
          characterCounts.set(char.deck_id, (characterCounts.get(char.deck_id) || 0) + 1);
        });

        const creatorIds = mergedDecks.map((d: any) => d.creator_id).filter(id => id);
        const { data: creatorProfiles } = creatorIds.length > 0
          ? await supabaseGame.from('profiles').select('id, nickname').in('id', creatorIds)
          : { data: [] };
        const creatorMap = new Map((creatorProfiles || []).map((p: any) => [p.id, p.nickname]));

        decksWithCreators = mergedDecks.map((deck: any) => ({
          ...deck,
          character_count: characterCounts.get(deck.id) || 0,
          creator_nickname: creatorMap.get(deck.creator_id) || 'Oficial',
        }));
      }

      setDecks(decksWithCreators);
      setDeckLoading(false);
    };

    fetchDecks();

    const decksChannel = supabaseGame.channel(`library:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decks' }, fetchDecks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deck_favorites', filter: `user_id=eq.${user.id}` }, fetchDecks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, fetchDecks)
      .subscribe();

    return () => {
      decksChannel.unsubscribe();
    };
  }, [authInitialized, authLoading, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleCreateRoom = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data } = await supabaseGame.from('rooms').insert({
      code,
      admin_id: user?.id,
      is_public: true,
      max_players: 6,
      chars_per_player: 3,
      pick_time_seconds: 30,
      vote_time_seconds: 30,
      reveal_time_seconds: 8,
      status: 'LOBBY'
    }).select().single();
    
    if (data) {
      router.push(`/room/${data.id}`);
    }
  };

  const handleCreateDeck = async () => {
    const name = newDeckName.trim();
    if (!name || creatingDeck) return;

    setCreatingDeck(true);
    const { data, error } = await supabaseGame
      .from('decks')
      .insert({
        name,
        creator_id: user.id,
        is_public: false,
        cover_url: '',
      })
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

  const toggleFavoriteDeck = async (deck: any) => {
    const isFavorite = favoriteDeckIds.has(deck.id);
    const nextFavorites = new Set(favoriteDeckIds);

    if (deck.is_official) {
      if (isFavorite) {
        nextFavorites.delete(deck.id);
        if (typeof window !== 'undefined') localStorage.removeItem('favoriteOfficialDeck');
      } else {
        nextFavorites.add(deck.id);
        if (typeof window !== 'undefined') localStorage.setItem('favoriteOfficialDeck', 'true');
      }
      setFavoriteDeckIds(nextFavorites);
      return;
    }

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

  const joinPrivateRoom = async () => {
     if(!roomCode.trim()) return;
     const { data } = await supabaseGame.from('rooms').select('id').eq('code', roomCode.trim().toUpperCase()).single();
     if(data) {
        router.push(`/room/${data.id}`);
     } else {
        alert("Sala de jogo não encontrada.");
     }
  };

  if (!authInitialized || authLoading || !user) return <LoadingArena label="Entrando no jogo..." />;

  const filteredDecks = decks
    .filter((deck) => deck.name?.toLowerCase().includes(deckSearch.trim().toLowerCase()))
    .sort((a, b) => {
      const aOwn = a.creator_id === user.id ? 1 : 0;
      const bOwn = b.creator_id === user.id ? 1 : 0;
      const aFav = favoriteDeckIds.has(a.id) ? 1 : 0;
      const bFav = favoriteDeckIds.has(b.id) ? 1 : 0;
      return (bOwn - aOwn) || (bFav - aFav) || (b.character_count - a.character_count);
    });

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 relative overflow-hidden party-grid-bg">
      <div className="max-w-[1400px] mx-auto space-y-6 relative z-10">
        
        {/* Playful Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border-4 border-indigo-100 p-6 rounded-3xl shadow-xl gap-4 relative"
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <AvatarFigure avatarUrl={profile?.avatar_url} label={profile?.nickname || 'Jogador'} className="w-16 h-16 bg-slate-100 border-4 border-indigo-400 rounded-2xl shadow-md" />
            </div>
            <div>
               <div className="flex items-center gap-1.5 mb-1">
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Jogador Online</p>
               </div>
               <h2 className="text-3xl font-black text-indigo-950 font-display">
                 {profile?.nickname || 'Jogador'}
               </h2>
               <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="flex items-center gap-1 font-bold text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    <Trophy className="w-3.5 h-3.5" /> Vitorias: <strong className="text-indigo-950">{profile?.wins || 0}</strong>
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="flex items-center gap-1 font-bold text-slate-550 uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    <Gamepad2 className="w-3.5 h-3.5" /> Partidas: <strong>{profile?.played_matches || 0}</strong>
                  </span>
               </div>
            </div>
          </div>
          
          <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-black uppercase rounded-2xl border-2 border-slate-200 px-5 h-12 transition-all cursor-pointer">
             Sair da Conta <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </motion.header>

        {/* Matches Grid & Decks Panel */}
        <div className="grid lg:grid-cols-12 gap-6 mt-6">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 flex flex-col gap-6"
          >
             <div className="flex items-center justify-between border-b-4 border-indigo-50 pb-2">
               <h3 className="text-3xl font-black text-indigo-950 flex items-center gap-2.5 font-display">
                 <Users className="w-7 h-7 text-indigo-500" /> Encontrar Partidas
               </h3>
               <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                 Servidor Ativo
               </div>
             </div>
             
             <div className="bg-white border-4 border-indigo-100 p-6 flex flex-col shadow-xl rounded-3xl gap-6">
                
                {/* Search & Action Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex bg-indigo-50/50 border-2 border-indigo-100 p-1 rounded-2xl focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-inner relative justify-between">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                     <Input 
                       placeholder="CODIGO DA SALA..."
                       value={roomCode}
                       onChange={e => setRoomCode(e.target.value)}
                       className="border-0 bg-transparent pl-12 pr-1 h-12 text-base font-bold text-indigo-950 uppercase placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none flex-1"
                     />
                     <Button 
                       onClick={joinPrivateRoom}
                       disabled={!roomCode.trim()} 
                       className="h-12 px-6 ml-2 text-xs font-black uppercase tracking-wider btn-squishy-indigo text-white cursor-pointer"
                     >
                        Entrar
                     </Button>
                  </div>
                  
                  <Button 
                    onClick={handleCreateRoom} 
                    className="h-14 sm:w-64 text-sm font-black tracking-wide uppercase btn-squishy-yellow text-amber-950 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5 stroke-[3px]" /> Criar Minha Sala
                  </Button>
                </div>
                
                <h4 className="text-xs uppercase font-black text-indigo-600/60 pb-1 border-b border-indigo-50 select-none tracking-wider">Salas Publicas Disponiveis</h4>
                
                <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-5 min-h-[380px] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                       <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                       <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Carregando salas do servidor...</p>
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/70 rounded-2xl">
                       <Circle className="w-12 h-12 text-indigo-200 mb-3" />
                       <p className="text-slate-500 font-bold text-sm mb-1">Nenhuma sala publica ativa no momento</p>
                       <p className="text-xs text-indigo-600/80 font-bold">Crie uma nova sala acima para atrair competidores!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {rooms.map((room, i) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={room.id} 
                            className={`bg-white border-2 border-indigo-100 p-5 rounded-2xl shadow-sm transition-all flex flex-col justify-between ${room.status === 'LOBBY' ? 'hover:bg-indigo-50/10 hover:border-indigo-400 cursor-pointer hover:shadow-md' : 'cursor-default opacity-85'}`}
                            onClick={() => {
                              if (room.status === 'LOBBY') {
                                router.push(`/room/${room.id}`);
                              } else {
                                alert('Essa partida ja esta rolando. Entre em uma sala aguardando jogadores.');
                              }
                            }}
                          >
                             <div className="flex items-center justify-between mb-4">
                               <div>
                                 <div className="flex items-center gap-1 mb-1">
                                   <span className={`w-2 h-2 rounded-full ${room.status === 'LOBBY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                   <p className={`text-[10px] font-black uppercase ${room.status === 'LOBBY' ? 'text-emerald-600' : 'text-amber-600'}`}>{roomStatusLabel(room.status)}</p>
                                 </div>
                                 <p className="text-2xl font-black text-indigo-950 font-display">Sala #{room.code}</p>
                               </div>
                               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                  <ArrowRight className="w-5 h-5" />
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-3 border-t border-slate-100 pt-3 flex-wrap">
                                <span className="text-[#3b82f6] text-xs font-bold bg-blue-50 py-1 px-3 border border-blue-100 rounded-full flex items-center gap-1.5">
                                   <Users className="w-3.5 h-3.5" /> {room.player_count || 0}/{room.max_players || 6} jogadores
                                </span>
                                <span className="text-indigo-600 text-xs font-bold bg-indigo-50 py-1 px-3 border border-indigo-100 rounded-full flex items-center gap-1.5">
                                   {room.status === 'LOBBY' ? <Timer className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                   {room.status === 'LOBBY' ? 'Aguardando iniciar' : 'Rolando'}
                                </span>
                                <span className="text-slate-600 text-xs font-bold bg-slate-50 py-1 px-3 border border-slate-100 rounded-full">
                                    {room.chars_per_player} Vidas
                                </span>
                             </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
             </div>
          </motion.div>

          {/* Right Column: Decks Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 flex flex-col gap-6"
          >
             <div className="flex items-center justify-between border-b-4 border-indigo-50 pb-2">
               <h3 className="text-3xl font-black text-indigo-950 flex items-center gap-2.5 font-display">
                 <BookOpen className="w-7 h-7 text-indigo-500" /> Biblioteca
               </h3>
             </div>
             
             <div className="bg-white border-4 border-indigo-100 p-5 flex flex-col h-full rounded-3xl shadow-xl relative min-h-[560px] gap-4">
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
                   onChange={(e) => setNewDeckName(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') handleCreateDeck();
                   }}
                   placeholder="NOME DO NOVO DECK..."
                   className="h-11 bg-white border-2 border-indigo-100 text-sm font-bold text-indigo-950 rounded-xl focus-visible:ring-indigo-100"
                 />
                 <Button
                   onClick={handleCreateDeck}
                   disabled={creatingDeck || !newDeckName.trim()}
                   className="w-full h-11 btn-squishy-green text-white font-black uppercase text-xs flex items-center justify-center gap-2 cursor-pointer"
                 >
                   <Plus className="w-4 h-4" /> {creatingDeck ? 'Criando...' : 'Criar Deck'}
                 </Button>
               </div>

               <div className="relative">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                 <Input
                   value={deckSearch}
                   onChange={(e) => setDeckSearch(e.target.value)}
                   placeholder="PESQUISAR DECKS..."
                   className="h-11 bg-slate-50 border-2 border-slate-200 pl-10 text-sm font-bold text-indigo-950 rounded-xl focus-visible:ring-indigo-100"
                 />
               </div>

               <div className="flex items-center justify-between text-[10px] uppercase font-black text-indigo-600/70 border-b border-indigo-50 pb-2">
                 <span>{filteredDecks.length} decks encontrados</span>
                 <button
                   onClick={() => router.push('/decks')}
                   className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                 >
                   <BookOpen className="w-3.5 h-3.5" /> Ver página
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[260px]">
                 {deckLoading ? (
                   <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-indigo-500 gap-3">
                     <div className="w-9 h-9 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                     <p className="text-xs font-black uppercase">Carregando decks...</p>
                   </div>
                 ) : filteredDecks.length === 0 ? (
                   <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                     <LayoutGrid className="w-10 h-10 text-slate-300 mb-3" />
                     <p className="text-sm font-black text-slate-500">Nenhum deck encontrado.</p>
                     <p className="text-xs font-bold text-slate-400 mt-1">Crie um novo ou limpe a busca.</p>
                   </div>
                 ) : (
                   filteredDecks.map((deck) => {
                     const isOwn = deck.creator_id === user.id;
                     const isFavorite = favoriteDeckIds.has(deck.id);
                     const deckHref = deck.is_official ? '/decks' : `/decks/${deck.id}`;

                     return (
                       <motion.div
                         key={deck.id}
                         initial={{ opacity: 0, y: 8 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-2xl p-3 shadow-sm transition-all"
                       >
                         <div className="flex gap-3">
                           <div className="w-14 h-14 rounded-xl border-2 border-indigo-50 bg-indigo-50/70 overflow-hidden flex items-center justify-center shrink-0">
                             {deck.cover_url || deck.image_url ? (
                               <img src={deck.cover_url || deck.image_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                             ) : (
                               <LayoutGrid className="w-6 h-6 text-indigo-300" />
                             )}
                           </div>
                           <div className="min-w-0 flex-1">
                             <div className="flex items-start justify-between gap-2">
                               <button
                                 onClick={() => router.push(deckHref)}
                                 className="text-left text-sm font-black text-indigo-950 truncate hover:text-indigo-600 transition-colors cursor-pointer"
                                 title={deck.name}
                               >
                                 {deck.name}
                               </button>
                               <button
                                 onClick={() => toggleFavoriteDeck(deck)}
                                 className="w-8 h-8 rounded-xl border-2 border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 flex items-center justify-center shrink-0 cursor-pointer transition-all"
                                 title={isFavorite ? 'Remover dos favoritos' : 'Favoritar deck'}
                               >
                                 {isFavorite ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <StarOff className="w-4 h-4 text-slate-400" />}
                               </button>
                             </div>
                             <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase tracking-widest flex items-center gap-1"><Users className="w-3 h-3"/> {deck.creator_nickname}</p>
                             <div className="flex flex-wrap gap-1.5 mt-2">
                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                 {deck.character_count} personagens
                               </span>
                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 flex items-center gap-1">
                                 {deck.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                 {deck.is_public ? 'Publico' : 'Privado'}
                               </span>
                               {isOwn && (
                                 <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                   Seu deck
                                 </span>
                               )}
                               {deck.is_official && (
                                 <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                   Oficial
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-2 mt-3">
                           <Button
                             onClick={() => router.push(deckHref)}
                             variant="outline"
                             className="h-9 rounded-xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-[11px] font-black uppercase cursor-pointer"
                           >
                             {isOwn ? <Pencil className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                             {isOwn ? 'Editar' : 'Consultar'}
                           </Button>
                           <Button
                             onClick={() => toggleFavoriteDeck(deck)}
                             variant="outline"
                             className="h-9 rounded-xl border-2 border-amber-100 text-amber-600 hover:bg-amber-50 text-[11px] font-black uppercase cursor-pointer"
                           >
                             {isFavorite ? <Star className="w-3.5 h-3.5 mr-1.5 fill-amber-500" /> : <StarOff className="w-3.5 h-3.5 mr-1.5" />}
                             {isFavorite ? 'Salvo' : 'Favoritar'}
                           </Button>
                         </div>
                       </motion.div>
                     );
                   })
                 )}
               </div>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function roomStatusLabel(status: string) {
  if (status === 'LOBBY') return 'Aguardando Jogadores';
  if (status === 'PICKING') return 'Escolhendo Cartas';
  if (status === 'STARTING') return 'Comecando';
  if (status === 'PLAYING') return 'Partida em Andamento';
  return 'Sala Ativa';
}
