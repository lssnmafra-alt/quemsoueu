import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Flame, Globe2, LogOut, Search, Settings, Play, Users, Cpu, ShieldAlert, Sparkles, Shield, Star, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatMenu from './ChatMenu';
import { motion } from 'motion/react';
import { avatarSelectionToUrl, readStoredAvatar, selectionFromAvatarUrl } from '@/lib/avatars';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarPickerModal from '@/components/avatar/AvatarPickerModal';

const MIN_PLAYERS_TO_START = 4;

const officialDeck = {
  id: '',
  name: 'Personagens Oficiais',
  is_public: true,
  is_official: true,
  favorite_count: 0,
};

const deckTabs = [
  { id: 'official', label: 'Oficial', icon: Globe2 },
  { id: 'mine', label: 'Criado por mim', icon: UserRound },
  { id: 'favorites', label: 'Favoritos', icon: Star },
  { id: 'trending', label: 'Bombando agora', icon: Flame },
] as const;

const settingGroups = [
  { label: 'Max de Jogadores', key: 'max_players', options: [4, 6, 10, 12] },
  { label: 'Vidas por Jogador', key: 'chars_per_player', options: [1, 2, 3] },
  { label: 'Tempo de Escolha (S)', key: 'pick_time_seconds', options: [15, 30, 45] },
  { label: 'Tempo de Votacao (S)', key: 'vote_time_seconds', options: [15, 30, 45] },
  { label: 'Tempo de Revelacao (S)', key: 'reveal_time_seconds', options: [5, 8, 12] },
] as const;

export default function RoomLobby({ room, players, me, isAdmin, leaveRoom }: any) {
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState(room.deck_id || '');
  const [deckSearch, setDeckSearch] = useState('');
  const [deckTab, setDeckTab] = useState<(typeof deckTabs)[number]['id']>('official');
  const [botsCount, setBotsCount] = useState<number>(() => players.filter((p: any) => p.is_bot).length);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const botStartRef = useRef(false);
  const botRowsCountRef = useRef(players.filter((p: any) => p.is_bot).length);
  const adminPlayer = useMemo(() => players.find((p: any) => p.user_id === room.admin_id || p.is_admin), [players, room.admin_id]);
  const botIsAdmin = Boolean(adminPlayer?.is_bot);

  useEffect(() => {
    const fetchDecks = async () => {
      const { data } = await supabaseGame
        .from('decks')
        .select('*')
        .or(`is_public.eq.true,creator_id.eq.${me.user_id}`);
      const { data: favoriteRows } = await supabaseGame
        .from('deck_favorites')
        .select('deck_id')
        .eq('user_id', me.user_id);
      const { data: allFavoriteRows } = await supabaseGame
        .from('deck_favorites')
        .select('deck_id');

      const favoriteIds = new Set((favoriteRows || []).map((row: any) => row.deck_id));
      const favoriteCounts = new Map<string, number>();
      (allFavoriteRows || []).forEach((row: any) => {
        favoriteCounts.set(row.deck_id, (favoriteCounts.get(row.deck_id) || 0) + 1);
      });

      const nextDecks = [officialDeck, ...(data || []).map((deck: any) => ({
        ...deck,
        is_favorite: favoriteIds.has(deck.id),
        favorite_count: favoriteCounts.get(deck.id) || 0,
        is_official: deck.is_public && deck.creator_id !== me.user_id,
      }))];

      setDecks(nextDecks);
    };

    if (isAdmin || botIsAdmin) fetchDecks();
  }, [botIsAdmin, isAdmin, me.user_id]);

  useEffect(() => {
    if (!isAdmin || room.status !== 'LOBBY') return;
    const bots = players.filter((p: any) => p.is_bot);
    if (bots.length === 0) return;

    const key = `botLobbyMessage:${room.id}:${bots.length}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(key, 'true');

    const timer = setTimeout(() => {
      import('@/app/actions/bots').then(({ triggerBotLobbyMessage }) => {
        triggerBotLobbyMessage(room.id);
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [isAdmin, players, room.id, room.status]);

  const updateSettings = async (updates: any) => {
    await supabaseGame.from('rooms').update(updates).eq('id', room.id);
  };

  const handleStart = useCallback(async (forcedDeckId?: string, auto = false) => {
    const deckId = forcedDeckId || selectedDeck;

    const response = await fetch(`/api/rooms/${room.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckId: deckId || undefined,
        desiredBots: auto ? undefined : botsCount,
        auto,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok && !auto) {
      alert(result.error || 'Nao foi possivel iniciar a partida agora.');
    }
  }, [botsCount, room.id, selectedDeck]);

  useEffect(() => {
    const hasBot = players.some((player: any) => player.is_bot);
    if (!hasBot || room.status !== 'LOBBY' || botStartRef.current) return;
    if (!botIsAdmin && isAdmin) return;

    const startableDeck = decks.find((deck: any) => deck.id === room.deck_id) || decks.find((deck: any) => deck.is_public) || decks[0];
    botStartRef.current = true;
    const timer = setTimeout(() => {
      handleStart(startableDeck?.id, true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [botIsAdmin, decks, handleStart, isAdmin, players, room.deck_id, room.status]);

  const realPlayersCount = players.filter((p: any) => !p.is_bot).length;
  const botRowsCount = players.filter((p: any) => p.is_bot).length;
  const totalPlayersCount = players.length;
  const maxBots = Math.max(0, (room.max_players || 6) - realPlayersCount);
  const clampedBotsCount = Math.min(botsCount, maxBots);
  const expectedParticipants = realPlayersCount + clampedBotsCount;
  const canStart = expectedParticipants >= MIN_PLAYERS_TO_START;
  const selectedDeckName = decks.find((deck: any) => deck.id === selectedDeck)?.name || 'Personagens Oficiais';

  const filteredDecks = useMemo(() => {
    const search = deckSearch.trim().toLowerCase();
    return decks
      .filter((deck: any) => {
        if (deckTab === 'official') return deck.is_official || deck.id === '';
        if (deckTab === 'mine') return deck.creator_id === me.user_id;
        if (deckTab === 'favorites') return deck.is_favorite;
        return deck.is_public;
      })
      .filter((deck: any) => !search || deck.name.toLowerCase().includes(search))
      .sort((a: any, b: any) => {
        if (deckTab === 'trending') {
          return (b.favorite_count || 0) - (a.favorite_count || 0) || b.name.localeCompare(a.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [deckSearch, deckTab, decks, me.user_id]);

  useEffect(() => {
    if (botRowsCount === botRowsCountRef.current) return;
    botRowsCountRef.current = botRowsCount;
    setBotsCount(Math.min(botRowsCount, maxBots));
  }, [botRowsCount, maxBots]);

  return (
    <div className="flex h-screen overflow-hidden w-full bg-[#f5f6ff] text-indigo-950 font-sans relative party-grid-bg">
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative z-10 w-full max-w-[1400px] mx-auto h-full">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 bg-white border-4 border-indigo-100 rounded-3xl shadow-md shrink-0 flex items-center justify-between relative"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sala de Espera
              </p>
            </div>
            <h1 className="text-3xl font-black font-display text-indigo-950">
              Sala do Jogo <span className="text-indigo-600 font-bold font-display">#{room.code}</span>
            </h1>
          </div>

          <Button variant="ghost" onClick={leaveRoom} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-black uppercase h-11 px-5 rounded-2xl border-2 border-slate-200 hover:border-rose-450 transition-all cursor-pointer">
            Sair da Sala <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </motion.header>

        <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 min-h-0 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-4 h-full"
          >
            <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2 border-b-4 border-indigo-50 pb-2">
              <Users className="w-6 h-6 text-indigo-500" /> Integrantes na Sala ({players.length}/{room.max_players})
            </h2>

            <div className="bg-white border-4 border-indigo-100 rounded-3xl p-5 flex-1 overflow-y-auto space-y-3 shadow-md min-h-[250px]">
              {players.map((p: any, i: number) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id}
                  className={cn(
                    'flex items-center gap-4 p-4 border-2 transition-all relative overflow-hidden shadow-sm rounded-2xl bg-white',
                    p.user_id === me.user_id
                      ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50/20')
                      : 'border-slate-100 hover:border-slate-200'
                  )}
                >
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full", p.color?.bg || 'bg-slate-400')} />
                  <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn("w-12 h-12 border-2 rounded-2xl shadow-sm shrink-0", p.color?.border || 'border-slate-200', p.color?.lightBgc || 'bg-slate-100')} />
                  <div className="flex-1">
                    <p className={cn("text-base font-bold", p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.is_admin && <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 border border-amber-200 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Dono da Sala</span>}
                      {!p.is_admin && <span className="text-[10px] bg-slate-50 text-slate-600 px-2.5 py-0.5 border border-slate-200 rounded-full">Jogador</span>}
                      {p.is_bot && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 border border-indigo-200 rounded-full font-bold">Bot Convidado</span>}
                      {p.user_id === me.user_id && <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm">Voce</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {me && (
              <div className={cn("bg-white border-4 rounded-3xl shadow-md p-5", me.color?.border || 'border-indigo-100')}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} primaryColor={me.color?.hex} className={cn("w-14 h-14 rounded-2xl border-2 shrink-0", me.color?.border || 'border-indigo-200', me.color?.lightBgc || 'bg-slate-50')} />
                    <div className="min-w-0">
                      <h3 className={cn("text-xs font-black uppercase tracking-wider border-l-4 pl-2 select-none", me.color?.text || 'text-indigo-600', me.color?.border || 'border-indigo-500')}>Avatar do Jogador</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Escolha base, cores e moldura.</p>
                    </div>
                  </div>
                  <Button onClick={() => setAvatarPickerOpen(true)} className={cn("h-11 px-4 text-white text-xs font-black uppercase flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md", me.color?.bg || 'bg-indigo-500', 'hover:opacity-90')}>
                    <Shield className="w-4 h-4" /> Escolher Avatar
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4 h-full"
          >
            <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2 border-b-4 border-indigo-50 pb-2">
              <Settings className="w-5 h-5 text-indigo-500" /> Configuracoes da Partida
            </h2>
            <div className="bg-white border-4 border-indigo-100 rounded-3xl p-6 flex flex-col gap-5 flex-1 shadow-md overflow-y-auto">
              <div>
                <label className="text-xs font-black text-indigo-600 uppercase tracking-wider block mb-2 border-l-4 border-indigo-500 pl-2 h-4 select-none">Tema de Cartas Escolhido</label>
                <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-3 space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white border-2 border-indigo-100 px-3 h-11">
                    <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                    <input
                      disabled={!isAdmin}
                      value={deckSearch}
                      onChange={(event) => setDeckSearch(event.target.value)}
                      placeholder="Pesquisar baralho..."
                      className="min-w-0 flex-1 bg-transparent outline-none text-sm font-bold text-indigo-950 placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {deckTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => setDeckTab(tab.id)}
                          className={cn(
                            'h-10 rounded-xl border-2 px-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all disabled:cursor-not-allowed',
                            deckTab === tab.id
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-indigo-100 text-indigo-600 hover:border-indigo-300'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {filteredDecks.length === 0 ? (
                      <div className="h-20 flex items-center justify-center text-xs font-black text-slate-400 uppercase bg-white border-2 border-dashed border-indigo-100 rounded-xl">
                        Nenhum baralho encontrado
                      </div>
                    ) : filteredDecks.map((deck: any) => (
                      <button
                        key={deck.id || 'official'}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => {
                          setSelectedDeck(deck.id);
                          updateSettings({ deck_id: deck.id || null });
                        }}
                        className={cn(
                          'w-full min-h-12 rounded-xl border-2 px-3 py-2 text-left transition-all disabled:cursor-not-allowed flex items-center justify-between gap-3',
                          selectedDeck === deck.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-indigo-100 text-indigo-950 hover:border-indigo-300'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-black truncate">{deck.name}</span>
                          <span className={cn('block text-[10px] font-bold uppercase', selectedDeck === deck.id ? 'text-indigo-100' : 'text-slate-400')}>
                            {deck.id === '' || deck.is_official ? 'Oficial' : deck.creator_id === me.user_id ? 'Criado por mim' : 'Publico'} {deck.favorite_count ? `- ${deck.favorite_count} favoritos` : ''}
                          </span>
                        </span>
                        {selectedDeck === deck.id && <Sparkles className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-indigo-600">Selecionado: {selectedDeckName}</p>
                </div>
                {!isAdmin && <p className="text-[11px] text-indigo-600 font-bold mt-2 flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-indigo-400" /> Apenas o dono da sala pode mudar configuracoes do jogo.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/30 p-3.5 border-2 border-indigo-50 relative col-span-2 rounded-2xl">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block mb-1">Visibilidade da Sala</label>
                  <select disabled={!isAdmin} value={room.is_public ? 'true' : 'false'} onChange={(e) => updateSettings({ is_public: e.target.value === 'true' })} className="w-full bg-transparent border-0 h-8 text-sm font-bold text-indigo-950 focus:outline-none cursor-pointer appearance-none p-0">
                    <option value="true" className="bg-white">SALA PUBLICA (Qualquer um pode entrar)</option>
                    <option value="false" className="bg-white">SALA PRIVADA (Apenas com codigo)</option>
                  </select>
                </div>

                {settingGroups.map((field) => {
                  const currentValue = room[field.key] || field.options[0];
                  return (
                  <div key={field.key} className="bg-indigo-50/30 p-3 border-2 border-indigo-50 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block mb-1">{field.label}</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {field.options.map((option) => {
                        const optionDisabled = !isAdmin || (field.key === 'max_players' && option < totalPlayersCount);
                        return (
                          <button
                            key={option}
                            type="button"
                            disabled={optionDisabled}
                            onClick={() => {
                              updateSettings({ [field.key]: option });
                              if (field.key === 'max_players') {
                                setBotsCount((current) => Math.min(current, Math.max(0, option - realPlayersCount)));
                              }
                            }}
                            className={cn(
                              'h-8 rounded-lg border text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                              currentValue === option
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-indigo-100 text-indigo-600 hover:border-indigo-300'
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
                })}
              </div>

              {isAdmin && (
                <div className="bg-indigo-50/20 p-4 border-2 border-indigo-50 rounded-2xl">
                  <label className="text-xs font-black text-indigo-600 uppercase tracking-wider block mb-2 flex items-center gap-1 border-l-4 border-indigo-500 pl-2 select-none">
                    <Cpu className="w-4 h-4 text-indigo-500" /> Adicionar Bots de Inteligencia Artificial
                  </label>
                  <div className="flex items-center gap-4 bg-white border-2 border-indigo-100 p-2.5 rounded-xl">
                    <input type="range" min="0" max={maxBots} value={clampedBotsCount} onChange={(e) => setBotsCount(Math.min(parseInt(e.target.value), maxBots))} className="flex-1 accent-indigo-550 h-2 bg-slate-100 appearance-none cursor-pointer rounded-full" />
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-base text-indigo-950 font-black">{clampedBotsCount}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4">
                {isAdmin ? (
                  <Button disabled={!canStart} onClick={() => handleStart()} className="w-full h-14 text-sm font-black tracking-wider uppercase btn-squishy-green text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Play className="w-4 h-4 fill-white" /> Iniciar Partida
                  </Button>
                ) : (
                  <div className="h-14 flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-2xl animate-pulse">
                    Aguardando o Administrador iniciar a partida...
                  </div>
                )}
                {isAdmin && !canStart && (
                  <p className="text-[11px] text-indigo-600 font-bold mt-2 text-center">
                    A partida libera com 4 participantes. Ajuste os bots ou convide mais jogadores.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />

      <AvatarPickerModal
        open={avatarPickerOpen}
        initial={selectionFromAvatarUrl(me.avatar_url) || readStoredAvatar()}
        onClose={() => setAvatarPickerOpen(false)}
        onSave={async (selection) => {
          const avatarUrl = avatarSelectionToUrl(selection);
          await supabaseGame.from('room_players').update({ avatar_url: avatarUrl }).eq('id', me.id);
          setAvatarPickerOpen(false);
        }}
      />
    </div>
  );
}
