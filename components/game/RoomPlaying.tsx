import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Heart, Target, Clock, LogOut, Zap, List, UserRound, Skull } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager } from '@/lib/audioManager';
import ChatMenu from './ChatMenu';
import AvatarFigure from '@/components/avatar/AvatarFigure';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RoomPlaying({ room, players, me, isAdmin, leaveRoom }: any) {
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(room.vote_time_seconds || 15);
  const [actionLog, setActionLog] = useState<{ id: string; msg: string }[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [liveCharIds, setLiveCharIds] = useState<Set<string>>(new Set());
  const handlingTimeoutRef = useRef(false);
  const botTurnRef = useRef<string>('');
  const [revelation, setRevelation] = useState<{
    voterName: string;
    voter?: any;
    charName: string;
    players: any[];
    eliminatedPlayers: any[];
  } | null>(null);
  const [revealStage, setRevealStage] = useState<'choosing' | 'choice' | 'impact' | 'eliminated' | 'miss'>('choice');

  const orderedPlayers = [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0));
  const activePlayers = orderedPlayers.filter((p) => !p.is_eliminated && p.lives > 0);
  const activePlayer = activePlayers.length > 0 ? activePlayers[room.current_turn_number % activePlayers.length] : null;
  const activePlayerIndex = orderedPlayers.findIndex((p) => p.id === activePlayer?.id);
  const playersRef = useRef(players);
  const activePlayerRef = useRef<any>(activePlayer);
  const visibleDeckChars = useMemo(() => (
    liveCharIds.size > 0 ? deckChars.filter((c) => liveCharIds.has(c.id)) : deckChars
  ), [deckChars, liveCharIds]);
  const isMyTurn = activePlayer?.id === me.id && !me.is_eliminated && !isRevealing;

  const humanPlayers = orderedPlayers.filter((p: any) => !p.is_bot);
  const isFirstHuman = humanPlayers.length > 0 && humanPlayers[0].id === me?.id;

  const addLog = useCallback((msg: string) => {
    const id = Math.random().toString();
    setActionLog((prev) => [...prev.slice(-2), { id, msg }]);
    setTimeout(() => {
      setActionLog((prev) => prev.filter((log) => log.id !== id));
    }, 3500);
  }, []);

  const refreshLiveCards = useCallback(async () => {
    const { data } = await supabaseGame
      .from('player_cards')
      .select('character_id')
      .eq('room_id', room.id)
      .eq('is_dead', false);

    setLiveCharIds(new Set((data || []).map((card: any) => card.character_id)));
  }, [room.id]);

  useEffect(() => {
    playersRef.current = players;
    activePlayerRef.current = activePlayer;
  }, [players, activePlayer]);

  const showReveal = useCallback(async (charName: string, hitPlayerIds: string[] = [], voter?: any) => {
    const currentPlayers = playersRef.current;
    const revealVoter = voter || activePlayerRef.current;
    const hitPlayers = hitPlayerIds.map((id: string) => currentPlayers.find((p: any) => p.id === id)).filter(Boolean);
    const eliminatedPlayers = hitPlayers.filter((player: any) => (player.lives || 0) <= 1 || player.is_eliminated);

    setIsRevealing(true);
    setRevealStage('choosing');
    setRevelation({
      voterName: revealVoter?.nickname || 'Alguem',
      voter: revealVoter,
      charName,
      players: hitPlayers,
      eliminatedPlayers,
    });

    await sleep(800);
    setRevealStage('choice');
    await sleep(950);
    setRevealStage(hitPlayers.length > 0 ? 'impact' : 'miss');
    await sleep(1200);

    if (eliminatedPlayers.length > 0) {
      setRevealStage('eliminated');
      await sleep(1400);
    } else {
      await sleep(500);
    }

    setIsRevealing(false);
    setRevelation(null);
    refreshLiveCards();
  }, [refreshLiveCards]);

  const channelRef = useRef<any>(null);
  const showRevealRef = useRef(showReveal);
  useEffect(() => {
    showRevealRef.current = showReveal;
  });

  useEffect(() => {
    const ch = supabaseGame.channel(`revels:${room.id}`)
      .on('broadcast', { event: 'REVEAL' }, (payload) => {
         const voter = players.find((p: any) => p.id === payload.payload.voterId) || { nickname: payload.payload.voterName };
         showRevealRef.current?.(payload.payload.charName, payload.payload.hits || payload.payload.hitPlayerIds || [], voter);
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [players, room.id]);

  const advanceTurn = useCallback(async () => {
    const { data: freshPlayers } = await supabaseGame.from('room_players').select('*').eq('room_id', room.id);
    const alive = freshPlayers?.filter((p) => !p.is_eliminated && p.lives > 0);

    if (alive && alive.length === 0) {
      addLog('EMPATE! Rodada extra de desempate iniciada.');
      await supabaseGame.from('room_players').update({ lives: 1, is_eliminated: false }).eq('room_id', room.id);
      await supabaseGame.from('player_cards').update({ is_dead: false }).eq('room_id', room.id);
      await supabaseGame.from('rooms').update({
        current_turn_number: room.current_turn_number + 1,
        turn_expires_at: new Date(Date.now() + room.vote_time_seconds * 1000).toISOString()
      }).eq('id', room.id);
      return;
    }

    if (alive && alive.length === 1) {
      addLog(`Partida encerrada! Campeao: ${alive[0]?.nickname || 'Empate'}!`);
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
      return;
    }

    const n = Date.now();
    await supabaseGame.from('rooms').update({
      current_turn_number: room.current_turn_number + 1,
      turn_expires_at: new Date(n + room.vote_time_seconds * 1000).toISOString()
    }).eq('id', room.id);
  }, [room, addLog]);

  const handleTimeout = async () => {
    if (!activePlayer || handlingTimeoutRef.current) return;
    handlingTimeoutRef.current = true;

    try {
      const newMissed = (activePlayer.missed_turns || 0) + 1;
      const isEliminated = newMissed >= 2;
      const newLives = Math.max(0, activePlayer.lives - 1);

      await supabaseGame.from('room_players').update({
        missed_turns: newMissed,
        lives: newLives,
        is_eliminated: newLives <= 0 || isEliminated
      }).eq('id', activePlayer.id);

      addLog(`${activePlayer.nickname} nao votou a tempo e perdeu 1 vida!`);
      await advanceTurn();
    } finally {
      handlingTimeoutRef.current = false;
    }
  };

  const processVote = async (targetCharId: string) => {
    const targetChar = deckChars.find((c) => c.id === targetCharId);
    if (!targetChar || !activePlayer) return;
    if (isRevealing) return;

    await supabaseGame.from('room_players').update({ missed_turns: 0 }).eq('id', activePlayer.id);

    addLog(`${activePlayer.nickname} fez sua escolha...`);

    const { data: allCards } = await supabaseGame.from('player_cards').select('*').eq('room_id', room.id).eq('is_dead', false);
    const hits = allCards?.filter((c) => c.character_id === targetCharId) || [];
    const hitPlayerIds = hits.map(h => h.player_id);

    const revelPayload = { charName: targetChar.name, hits: hitPlayerIds, voterId: activePlayer.id, voterName: activePlayer.nickname };
    if (channelRef.current) {
      channelRef.current.send({
         type: 'broadcast',
         event: 'REVEAL',
         payload: revelPayload
      });
    }

    await showReveal(targetChar.name, hitPlayerIds, activePlayer);

    if (hits.length > 0) {
      addLog(`ACERTOU! ${targetChar.name} estava na mesa.`);
      for (const hit of hits) {
        await supabaseGame.from('player_cards').update({ is_dead: true }).eq('id', hit.id);
        const targetP = players.find((p: any) => p.id === hit.player_id);
        if (targetP) {
          const newLives = targetP.lives - 1;
          await supabaseGame.from('room_players').update({
            lives: newLives,
            is_eliminated: newLives <= 0
          }).eq('id', targetP.id);
          addLog(newLives <= 0 ? `${targetP.nickname} foi eliminado!` : `${targetP.nickname} perdeu 1 vida!`);
        }
      }
    } else {
      addLog(`ERROU! Ninguem tinha ${targetChar.name}.`);
    }

    await refreshLiveCards();

    const [{ data: freshPlayers }, { data: remainingCards }] = await Promise.all([
      supabaseGame.from('room_players').select('*').eq('room_id', room.id),
      supabaseGame.from('player_cards').select('*').eq('room_id', room.id).eq('is_dead', false),
    ]);
    const liveCounts = new Map<string, number>();
    for (const card of remainingCards || []) {
      liveCounts.set(card.player_id, (liveCounts.get(card.player_id) || 0) + 1);
    }
    const alive = freshPlayers?.filter((p) => (liveCounts.get(p.id) || 0) > 0) || [];

    if (alive.length === 0) {
      addLog('EMPATE! Escolha qualquer personagem na rodada extra.');
      const recentlyEliminated = hits.map((h) => players.find((p: any) => p.id === h.player_id)).filter(Boolean);
      const playersToRevive = recentlyEliminated.length > 0 ? recentlyEliminated : players;
      for (const p of playersToRevive) {
        await supabaseGame.from('room_players').update({ lives: 1, is_eliminated: false }).eq('id', p.id);
      }
      await supabaseGame.from('player_cards').update({ is_dead: false }).eq('room_id', room.id);
      await advanceTurn();
    } else if (alive.length === 1) {
      addLog(`Partida encerrada! Campeao: ${alive[0].nickname}!`);
      await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    } else {
      const maxLives = Math.max(...alive.map((p) => liveCounts.get(p.id) || 0));
      const leaders = alive.filter((p) => (liveCounts.get(p.id) || 0) === maxLives);

      if (leaders.length === 1) {
        const { data: allUnguessed } = await supabaseGame.from('player_cards')
          .select('character_id')
          .in('player_id', alive.map((p) => p.id))
          .eq('is_dead', false);

        const distinctCardIds = new Set(allUnguessed?.map((c) => c.character_id)).size;
        const leaderLives = liveCounts.get(leaders[0].id) || leaders[0].lives;
        if (leaderLives >= distinctCardIds) {
          addLog(`Vitoria inteligente! Campeao: ${leaders[0].nickname}!`);
          await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
          return;
        }
      }
      await advanceTurn();
    }

    if (activePlayer.is_bot) {
      import('@/app/actions/bots').then(({ triggerBotResultMessage }) => {
        triggerBotResultMessage(room.id, activePlayer.id, hits.length > 0, targetChar.name);
      });
    }
  };

  useEffect(() => {
    const fn = async () => {
      const query = supabaseGame.from('characters').select('*');
      const { data } = room.deck_id
        ? await query.eq('deck_id', room.deck_id)
        : await query.is('deck_id', null);
      setDeckChars(data || []);
      await refreshLiveCards();
    };
    fn();
  }, [room.deck_id, refreshLiveCards]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshLiveCards();
    }, 0);
    return () => clearTimeout(timer);
  }, [room.current_turn_number, refreshLiveCards]);

  useEffect(() => {
    audioManager.playSFX('turn');
  }, [room.current_turn_number]);

  useEffect(() => {
    const lastLog = actionLog[actionLog.length - 1];
    if (lastLog) {
      if (lastLog.msg.includes('perdeu') || lastLog.msg.includes('nao votou')) audioManager.playSFX('eliminate');
      else if (lastLog.msg.includes('Campeao')) audioManager.playSFX('win');
      else if (lastLog.msg.includes('suspeita')) audioManager.playSFX('select');
    }
  }, [actionLog]);

  useEffect(() => {
    const i = setInterval(() => {
      if (isRevealing) return;
      const diff = differenceInSeconds(new Date(room.turn_expires_at), new Date());
      if (diff <= 0) {
        setTimeLeft(0);
        if (activePlayer && !handlingTimeoutRef.current) {
          handlingTimeoutRef.current = true;
          fetch(`/api/rooms/${room.id}/turn-timeout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turnNumber: room.current_turn_number,
              playerId: activePlayer.id,
            }),
          })
            .then(async (response) => {
              const result = await response.json().catch(() => ({}));
              if (response.ok && result.ok) {
                addLog(result.eliminated
                  ? `${activePlayer.nickname} ficou 2 turnos sem votar e foi eliminado.`
                  : `${activePlayer.nickname} nao votou e perdeu 1 vida.`);
              }
            })
            .finally(() => {
              handlingTimeoutRef.current = false;
            });
        }
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(i);
  }, [room.turn_expires_at, room.id, room.current_turn_number, isRevealing, activePlayer, addLog]);

  useEffect(() => {
    if (activePlayer?.is_bot && !activePlayer.is_eliminated && !isRevealing) {
      const turnKey = `${room.id}:${room.current_turn_number}:${activePlayer.id}`;
      if (botTurnRef.current === turnKey) return;
      
      const isMeFirst = isFirstHuman;
      
      // Random tempo de voto para o bot (entre 2.5s e 7.5s)
      let randomDelay = Math.floor(Math.random() * 5000) + 2500;
      if (!isMeFirst) {
         // Clientes secundários esperam 10 segundos extras, como fallback caso o primário caia
         randomDelay += 10000;
      }

      const timer = setTimeout(async () => {
        botTurnRef.current = turnKey; // Set before fetching to avoid duplicate
        const response = await fetch(`/api/rooms/${room.id}/bot-turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turnNumber: room.current_turn_number,
            playerId: activePlayer.id,
          }),
        }).catch(() => null);
        const result = response ? await response.json().catch(() => null) : null;
        if (result?.ok && result.target) {
          addLog(`${activePlayer.nickname} votou em ${result.target}.`);
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'REVEAL',
              payload: {
                charName: result.target,
                hits: result.hitPlayerIds || [],
                voterId: activePlayer.id,
                voterName: activePlayer.nickname,
              },
            });
          }
          await showReveal(result.target, result.hitPlayerIds || [], activePlayer);
        }
      }, randomDelay);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, isRevealing, room.current_turn_number, room.id, addLog, showReveal, isFirstHuman]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f5f6ff] font-sans relative party-grid-bg">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto relative z-10">
        <header className="mb-4 bg-white border-2 border-indigo-100 p-3 rounded-2xl shrink-0 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 border-2 border-indigo-100 px-4 py-2 flex flex-col justify-center rounded-2xl shadow-inner">
              <span className="text-[9px] uppercase tracking-wider text-indigo-500 font-extrabold mb-0.5">Rodada</span>
              <h2 className="text-sm font-black text-indigo-950 font-mono">TURNO {room.current_turn_number + 1}</h2>
            </div>

            <div className="flex items-center gap-2.5 ml-1 pl-4 border-l border-indigo-50 py-1.5">
              <span className="relative flex h-3 w-3">
                <span className={cn('animate-ping absolute inline-flex h-full w-full opacity-75 rounded-full', isMyTurn ? 'bg-indigo-500' : 'bg-indigo-400')} />
                <span className={cn('relative inline-flex h-3 w-3 rounded-full', isMyTurn ? 'bg-indigo-500' : 'bg-indigo-400')} />
              </span>
              <span className="text-sm font-bold text-indigo-950">
                {isMyTurn ? 'SUA VEZ DE JOGAR!' : `Aguardando ${activePlayer?.nickname}...`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-indigo-50/50 px-4 py-1.5 rounded-2xl border border-indigo-100">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span className={cn('text-2xl font-black font-mono', timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-indigo-950')}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>

          <button onClick={leaveRoom} className="ml-2 h-11 px-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-600 text-xs font-black uppercase flex items-center gap-2 hover:bg-rose-100 transition-all cursor-pointer">
            Sair <LogOut className="w-4 h-4" />
          </button>
        </header>

        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {orderedPlayers.map((p) => (
            <div key={p.id} className={cn("bg-white/90 border-2 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-sm min-w-0", activePlayer?.id === p.id ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50') : 'border-indigo-100')}>
              <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn("w-8 h-8 rounded-xl border-2 shrink-0", p.color?.border || 'border-slate-200')} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-black truncate", p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: room.chars_per_player }).map((_, i) => (
                    i < p.lives && !p.is_eliminated
                      ? <Heart key={i} className={cn("w-3.5 h-3.5 fill-current", p.color?.text || 'text-indigo-500')} />
                      : <Skull key={i} className="w-3.5 h-3.5 text-slate-300" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {activePlayer && !isRevealing && (
          <motion.div key={activePlayer.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn("mb-4 flex items-center justify-center font-black text-xs md:text-sm px-5 py-4 rounded-2xl shadow-sm border-b-4 uppercase tracking-widest w-full gap-3", activePlayer.color?.bg || 'bg-indigo-500', activePlayer.color?.border || 'border-indigo-700', "text-white")}>
            {isMyTurn ? (
              <>
                <span className="animate-ping w-2 h-2 rounded-full bg-white opacity-75" />
                É A SUA VEZ! SELECIONE UM SUSPEITO NA MESA.
                <span className="animate-ping w-2 h-2 rounded-full bg-white opacity-75" />
              </>
            ) : (
              <>
                <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center border border-white/30 truncate">
                   <AvatarFigure avatarUrl={activePlayer.avatar_url} label={activePlayer.nickname} primaryColor={activePlayer.color?.hex} className="w-6 h-6 border-0" />
                </div>
                <span>É A VEZ DE {activePlayer.nickname}</span>
              </>
            )}
          </motion.div>
        )}

        {(!isMyTurn || isRevealing) ? (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-4 max-h-[62vh] overflow-y-auto shadow-sm">
            <h3 className="text-sm font-black text-indigo-950 uppercase mb-3 border-b-2 border-indigo-50 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><List className="w-5 h-5 text-indigo-500" /> Personagens vivos</span>
              <span className="text-[11px] text-slate-500 font-black normal-case">
                {activePlayer ? `Vez de ${activePlayer.nickname}` : 'Aguardando'}
              </span>
            </h3>
            <ul className="divide-y divide-slate-100">
              {visibleDeckChars.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                   {c.image_url ? (
                     <img src={c.image_url} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0" />
                   ) : (
                     <div className="w-9 h-9 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center">
                       <UserRound className="w-4 h-4 text-slate-400" />
                     </div>
                   )}
                   <span className="text-sm font-bold text-indigo-950 truncate">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("mb-5 rounded-3xl border-4 p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4", me.color?.border || 'border-indigo-300', me.color?.lightBgc || 'bg-indigo-50')}
            >
              <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} state="vote" primaryColor={me.color?.hex} className={cn("w-20 h-20 rounded-2xl border-4 shrink-0", me.color?.border || 'border-indigo-400')} />
              <div className="text-left">
                <p className={cn("text-xs font-black uppercase tracking-widest", me.color?.text || 'text-indigo-600')}>Sua vez de palpitar</p>
                <h3 className="text-2xl font-black text-indigo-950 font-display">Escolha um card da mesa</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">A rodada so anda quando voce faz o palpite ou o tempo acaba.</p>
              </div>
            </motion.div>
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-4 p-2">
            {visibleDeckChars.map((c, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={c.id}
                onClick={() => (!isRevealing && isMyTurn) ? processVote(c.id) : null}
                className="bg-white border-4 border-slate-100 hover:border-indigo-400 hover:shadow-lg rounded-2xl p-3 cursor-pointer transition-all flex flex-col group hover:-translate-y-2 relative"
              >
                <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-slate-50 mb-2">
                  {c.image_url ? (
                    <img src={c.image_url} referrerPolicy="no-referrer" className="object-cover w-full h-full" alt="" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs text-slate-400 font-bold">Sem Foto</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-black text-center text-indigo-950 truncate">{c.name}</p>

                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-all rounded-2xl flex items-center justify-center">
                  <Target className="w-10 h-10 text-indigo-500 opacity-0 group-hover:opacity-100 shadow-md bg-white p-2 rounded-full scale-90 group-hover:scale-100 transition-all" />
                </div>
              </motion.div>
            ))}
            </motion.div>
          </div>
        )}

        <div className="fixed right-4 top-20 z-[70] flex flex-col gap-2 pointer-events-none max-w-[320px]">
          <AnimatePresence>
            {actionLog.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30, scale: 0.96 }}
                className="bg-white/92 backdrop-blur-md border-2 border-indigo-100 text-indigo-950 font-bold px-3 py-2 text-[11px] shadow-md rounded-xl"
              >
                {log.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isRevealing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md rounded-3xl"
            >
              {revelation && revealStage === 'choosing' ? (
                <div className="text-center p-8 bg-white border-4 border-indigo-100 shadow-2xl max-w-sm w-full rounded-3xl">
                  <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Zap className="w-8 h-8" />
                  </div>
                  <p className={cn("text-sm font-black uppercase tracking-widest mb-2", revelation.voter?.color?.text || 'text-indigo-600')}>{revelation.voterName}</p>
                  <h2 className="text-2xl font-black text-indigo-950 font-display mb-1.5 animate-pulse">Fez sua escolha...</h2>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">A mesa ainda nao sabe o alvo</p>
                </div>
              ) : revelation && revealStage === 'choice' ? (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 bg-white border-4 border-indigo-100 shadow-2xl max-w-md w-full rounded-3xl text-indigo-950">
                   <p className={cn("text-sm font-black uppercase tracking-widest mb-2", revelation.voter?.color?.text || 'text-indigo-600')}>{revelation.voterName} escolheu</p>
                   <p className="text-4xl font-black font-display mb-4">{revelation.charName}</p>
                   <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Conferindo atingidos...</p>
                </motion.div>
              ) : revelation && (revealStage === 'impact' || revealStage === 'eliminated') ? (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 bg-rose-600 border-4 border-rose-400 shadow-2xl max-w-md w-full rounded-3xl text-white">
                   <h2 className="text-rose-200 font-extrabold tracking-widest text-sm mb-4 uppercase drop-shadow-sm flex items-center justify-center gap-2">
                     {revealStage === 'eliminated' ? 'ELIMINACAO' : 'ATINGIDO'}
                   </h2>
                   <p className="text-4xl font-black font-display mb-6 drop-shadow-md">{revelation.charName}</p>
                   <div className="bg-rose-950/20 rounded-2xl p-4 mb-4 border border-rose-500/30">
                     <p className="text-xs font-bold text-rose-200 uppercase mb-2">{revealStage === 'eliminated' ? 'Saiu do jogo:' : 'Perdeu vida:'}</p>
                     <p className="text-lg font-black">{(revealStage === 'eliminated' ? revelation.eliminatedPlayers : revelation.players).map((p: any) => p.nickname).join(', ')}</p>
                   </div>
                   <div className="grid gap-2 text-left">{revelation.players.map((p: any) => <div key={p.id} className="rounded-xl bg-white/15 border border-white/20 px-3 py-2"><span className="font-black">{p.nickname}</span><span className="ml-2 text-rose-100 font-bold">vidas: {Math.max(0, (p.lives || 0) - 1)}</span></div>)}</div>
                </motion.div>
              ) : revelation ? (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 bg-slate-800 border-4 border-slate-600 shadow-2xl max-w-md w-full rounded-3xl text-white">
                   <h2 className="text-slate-400 font-extrabold tracking-widest text-sm mb-4 uppercase">
                     NENHUM ACERTO
                   </h2>
                   <p className="text-2xl font-black mb-2 text-slate-300 line-through decoration-slate-500 decoration-4">{revelation.charName}</p>
                   <p className="text-lg font-bold text-slate-400">Ninguem tinha este personagem!</p>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden">
        <div className="p-4 border-b border-indigo-50 flex items-center gap-2 text-indigo-950 text-sm font-black uppercase tracking-wider shrink-0">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Participantes do Jogo
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {[...players].sort((a,b) => (a.is_eliminated === b.is_eliminated ? b.lives - a.lives : a.is_eliminated ? 1 : -1)).map((p, idx, arr) => {
            const isActive = activePlayer?.id === p.id;
            const livesArr = Array.from(new Set(arr.filter(x => !x.is_eliminated).map(x => x.lives))).sort((a,b)=>b-a);
            const rank = p.is_eliminated ? -1 : livesArr.indexOf(p.lives);
            return (
              <motion.div layout key={p.id} className={cn(
                'p-3.5 border-2 transition-all relative overflow-hidden shadow-sm duration-300 rounded-2xl bg-white w-full',
                isActive ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50/20', 'ring-4 ring-indigo-50/50') : 'border-slate-100 hover:border-indigo-100',
                p.is_eliminated && 'opacity-40 grayscale'
              )}>
                {isActive && <div className={cn("absolute top-0 left-0 w-1.5 h-full", p.color?.bg || 'bg-indigo-500')} />}

                <div className="flex items-center gap-3 mb-3 relative z-10 w-full">
                  <div className="relative">
                    <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn("w-10 h-10 border-2 rounded-lg shrink-0", p.color?.border || 'border-slate-200', p.color?.lightBgc || 'bg-slate-100')} />
                    {!p.is_eliminated && (
                      <div className="absolute -top-2 -right-2 text-xl drop-shadow-md">
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : <div className="text-slate-400 font-bold bg-slate-100 rounded-full w-5 h-5 flex justify-center items-center text-[10px] border border-slate-300 shadow-sm mt-1 mr-1">#{rank + 1}</div>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className={cn("text-sm font-extrabold truncate w-full", p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      {isActive ? 'Palpitando Agora' : p.is_eliminated ? 'Fora do Jogo' : 'Aguardando vez'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 relative z-10 w-full">
                  {p.is_eliminated ? (
                    <div className="w-full h-8 flex items-center justify-center text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 rounded-lg shrink-0">
                      ELIMINADO
                    </div>
                  ) : (
                    Array.from({ length: room.chars_per_player }).map((_, i) => (
                      <div key={i} className="w-7 h-7 flex items-center justify-center transition-all bg-white border border-slate-200 rounded-md shrink-0 shadow-sm">
                        {i < p.lives ? <Heart className={cn("w-4 h-4 fill-current", p.color?.text || 'text-indigo-500')} /> : <Skull className="w-4 h-4 text-slate-300" />}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}
