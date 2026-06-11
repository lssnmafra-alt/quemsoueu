import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Play, Users, Cpu, ShieldAlert, Sparkles, Smile, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatMenu from './ChatMenu';
import { motion } from 'motion/react';
import { avatarSelectionToUrl, readStoredAvatar, selectionFromAvatarUrl } from '@/lib/avatars';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarPickerModal from '@/components/avatar/AvatarPickerModal';

export default function RoomLobby({ room, players, me, isAdmin, leaveRoom }: any) {
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState(room.deck_id || '');
  const [botsCount, setBotsCount] = useState<number>(() => players.filter((p: any) => p.is_bot).length);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const botStartRef = useRef(false);
  const adminPlayer = useMemo(() => players.find((p: any) => p.user_id === room.admin_id || p.is_admin), [players, room.admin_id]);
  const botIsAdmin = Boolean(adminPlayer?.is_bot);

  useEffect(() => {
    const fetchDecks = async () => {
      const { data } = await supabaseGame.from('decks').select('*').or(`is_public.eq.true,creator_id.eq.${me.user_id}`);
      setDecks(data || []);
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
  const maxBots = Math.max(0, (room.max_players || 6) - realPlayersCount);
  const clampedBotsCount = Math.min(botsCount, maxBots);

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
                  <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} className={cn("w-12 h-12 border-2 rounded-2xl shadow-sm shrink-0", p.color?.border || 'border-slate-200', p.color?.lightBgc || 'bg-slate-100')} />
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
                    <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} className={cn("w-14 h-14 rounded-2xl border-2 shrink-0", me.color?.border || 'border-indigo-200', me.color?.lightBgc || 'bg-slate-50')} />
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
                <div className="relative">
                  <select
                    disabled={!isAdmin}
                    className="w-full bg-indigo-50/50 border-2 border-indigo-100 focus:border-indigo-400 h-12 px-4 text-sm font-bold text-indigo-950 transition-all cursor-pointer disabled:cursor-not-allowed rounded-xl appearance-none"
                    value={selectedDeck}
                    onChange={(e) => {
                      setSelectedDeck(e.target.value);
                      if (isAdmin) updateSettings({ deck_id: e.target.value });
                    }}
                  >
                    <option value="" className="bg-white">SELECIONE O TEMA DE CARTAS...</option>
                    {decks.map((d) => <option key={d.id} value={d.id} className="bg-white">{d.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 font-bold">v</div>
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

                {[
                  { label: 'Max de Jogadores', val: room.max_players || 6, key: 'max_players' },
                  { label: 'Vidas por Jogador', val: room.chars_per_player, key: 'chars_per_player' },
                  { label: 'Tempo de Escolha (S)', val: room.pick_time_seconds || 30, key: 'pick_time_seconds' },
                  { label: 'Tempo de Votacao (S)', val: room.vote_time_seconds || 30, key: 'vote_time_seconds' },
                  { label: 'Tempo de Revelacao (S)', val: room.reveal_time_seconds || 8, key: 'reveal_time_seconds' },
                ].map((field, idx) => (
                  <div key={idx} className="bg-indigo-50/30 p-3 border-2 border-indigo-50 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block mb-1">{field.label}</label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={field.val}
                      min={field.key === 'chars_per_player' ? 1 : field.key === 'max_players' ? realPlayersCount : 5}
                      max={field.key === 'max_players' ? 12 : 120}
                      onChange={(e) => {
                        const nextValue = parseInt(e.target.value) || 0;
                        updateSettings({ [field.key]: nextValue });
                        if (field.key === 'max_players') {
                          setBotsCount((current) => Math.min(current, Math.max(0, nextValue - realPlayersCount)));
                        }
                      }}
                      className="w-full bg-transparent border-0 h-6 text-sm font-bold text-indigo-950 focus:outline-none p-0"
                    />
                  </div>
                ))}
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
                  <Button onClick={() => handleStart()} className="w-full h-14 text-sm font-black tracking-wider uppercase btn-squishy-green text-white cursor-pointer flex items-center justify-center gap-2">
                    <Play className="w-4 h-4 fill-white" /> Iniciar Partida
                  </Button>
                ) : (
                  <div className="h-14 flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-2xl animate-pulse">
                    Aguardando o Administrador iniciar a partida...
                  </div>
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
