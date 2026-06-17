import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Heart, Target, Clock, LogOut, Zap, List, Skull } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager } from '@/lib/audioManager';
import ChatMenu from './ChatMenu';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import CharacterImage from '@/components/CharacterImage';
import { isOfficialDeckId } from '@/lib/officialDecks';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RoomPlaying({ room, players, me, leaveRoom }: any) {
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(room.vote_time_seconds || 30);
  const [actionLog, setActionLog] = useState<{ id: string; msg: string }[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [liveCharIds, setLiveCharIds] = useState<Set<string>>(new Set());
  const [liveCardsLoaded, setLiveCardsLoaded] = useState(false);
  const [revelation, setRevelation] = useState<{
    voterName: string;
    voter?: any;
    charName: string;
    players: any[];
    eliminatedPlayers: any[];
  } | null>(null);
  const [revealStage, setRevealStage] = useState<'choosing' | 'choice' | 'impact' | 'eliminated' | 'miss'>('choice');
  const [isVoting, setIsVoting] = useState(false);

  const handlingTimeoutRef = useRef(false);
  const voteProcessingRef = useRef(false);
  const botTurnRef = useRef('');
  const channelRef = useRef<any>(null);
  const playersRef = useRef(players);
  const activePlayerRef = useRef<any>(null);
  const showRevealRef = useRef<any>(null);

  const orderedPlayers = useMemo(() => [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0)), [players]);
  const activePlayers = useMemo(() => orderedPlayers.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0), [orderedPlayers]);
  const activePlayer = activePlayers.length > 0 ? activePlayers[(room.current_turn_number || 0) % activePlayers.length] : null;
  const isSuddenDeath = activePlayers.length > 1 && activePlayers.every((p: any) => (p.lives || 0) <= 1);
  const hudPlayers = isSuddenDeath ? activePlayers : orderedPlayers;
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);
  const visibleDeckChars = useMemo(() => (
    liveCardsLoaded ? deckChars.filter((c) => liveCharIds.has(c.id)) : deckChars
  ), [deckChars, liveCharIds, liveCardsLoaded]);
  const isMyTurn = activePlayer?.id === me.id && !me.is_eliminated && !isRevealing && !isVoting && !voteProcessingRef.current;
  const humanPlayers = orderedPlayers.filter((p: any) => !p.is_bot);

  useEffect(() => {
    playersRef.current = players;
    activePlayerRef.current = activePlayer;
  }, [players, activePlayer]);

  const addLog = useCallback((msg: string) => {
    const id = crypto.randomUUID?.() || Math.random().toString();
    setActionLog((prev) => [...prev.slice(-2), { id, msg }]);
    setTimeout(() => setActionLog((prev) => prev.filter((log) => log.id !== id)), 3500);
  }, []);

  const refreshLiveCards = useCallback(async () => {
    const { data } = await supabaseGame
      .from('player_cards')
      .select('character_id,player_id')
      .eq('room_id', room.id)
      .eq('is_dead', false);

    const activeIds = new Set(
      (playersRef.current || [])
        .filter((player: any) => !player.is_eliminated && (player.lives || 0) > 0)
        .map((player: any) => player.id),
    );
    const liveCardsInPlay = (data || []).filter((card: any) => activeIds.has(card.player_id));

    setLiveCharIds(new Set(liveCardsInPlay.map((card: any) => card.character_id)));
    setLiveCardsLoaded(true);
  }, [room.id]);

  const showReveal = useCallback(async (charName: string, hitPlayerIds: string[] = [], voter?: any, hitSnapshots: any[] = []) => {
    const currentPlayers = playersRef.current;
    const revealVoter = voter || activePlayerRef.current;
    const snapshotsById = new Map((hitSnapshots || []).map((player: any) => [player.id, player]));
    const hitPlayers = [...new Set(hitPlayerIds)]
      .map((id: string) => snapshotsById.get(id) || currentPlayers.find((p: any) => p.id === id))
      .filter(Boolean);
    const eliminatedPlayers = hitPlayers.filter((player: any) => (player.lives || 0) <= 0 || player.is_eliminated);

    setIsRevealing(true);
    setRevealStage('choosing');
    setRevelation({
      voterName: revealVoter?.nickname || 'Alguem',
      voter: revealVoter,
      charName,
      players: hitPlayers,
      eliminatedPlayers,
    });

    if (eliminatedPlayers.length > 0) void refreshLiveCards();

    await sleep(800);
    setRevealStage('choice');
    await sleep(950);
    setRevealStage(hitPlayers.length > 0 ? 'impact' : 'miss');
    await sleep(1400);

    if (eliminatedPlayers.length > 0) {
      setRevealStage('eliminated');
      await sleep(1600);
    } else {
      await sleep(450);
    }

    setIsRevealing(false);
    setRevelation(null);
    await refreshLiveCards();
  }, [refreshLiveCards]);

  useEffect(() => {
    showRevealRef.current = showReveal;
  }, [showReveal]);

  useEffect(() => {
    const ch = supabaseGame.channel(`revels:${room.id}`)
      .on('broadcast', { event: 'REVEAL' }, (payload) => {
        const voter = playersRef.current.find((p: any) => p.id === payload.payload.voterId) || { nickname: payload.payload.voterName };
        showRevealRef.current?.(
          payload.payload.charName,
          payload.payload.hitPlayerIds || payload.payload.hits || [],
          voter,
          payload.payload.hitPlayers || [],
        );
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [room.id]);

  const sendReveal = useCallback(async (payload: any) => {
    const channel = channelRef.current;
    if (!channel) return;
    const message = { type: 'broadcast', event: 'REVEAL', payload };

    try {
      if (typeof channel.httpSend === 'function') await channel.httpSend(message);
      else if (typeof channel.send === 'function') await channel.send(message);
    } catch {
      try {
        if (typeof channel.send === 'function') await channel.send(message);
      } catch {}
    }
  }, []);

  const runVoteResult = useCallback(async (result: any, voter: any) => {
    if (!result?.ok || !result?.target) return;

    if ((result.hitPlayerIds || []).length > 0) {
      addLog(`ACERTOU! ${result.target} estava na mesa.`);
      for (const player of result.hitPlayers || []) {
        addLog(player.is_eliminated ? `${player.nickname} foi eliminado!` : `${player.nickname} perdeu vida!`);
      }
    } else {
      addLog(`ERROU! Ninguem tinha ${result.target}.`);
    }

    const payload = {
      charName: result.target,
      hitPlayerIds: result.hitPlayerIds || [],
      hitPlayers: result.hitPlayers || [],
      voterId: voter?.id || result.voterId,
      voterName: voter?.nickname || result.voterName,
    };

    await sendReveal(payload);
    await showReveal(result.target, payload.hitPlayerIds, voter, payload.hitPlayers);

    if (result.tiebreak) addLog('EMPATE! Escolham novos personagens para o desempate.');
    if (result.finished) addLog(`Partida encerrada! Campeao: ${result.winner || 'Empate'}!`);
  }, [addLog, sendReveal, showReveal]);

  const processVote = async (targetCharId: string) => {
    if (!activePlayer || !isMyTurn || voteProcessingRef.current || isVoting) return;
    const targetChar = deckChars.find((c) => c.id === targetCharId);
    if (!targetChar) return;

    voteProcessingRef.current = true;
    setIsVoting(true);
    addLog(`${activePlayer.nickname} fez sua escolha...`);

    try {
      const response = await fetch(`/api/rooms/${room.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnNumber: room.current_turn_number,
          playerId: activePlayer.id,
          characterId: targetCharId,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) {
        addLog(result?.reason === 'turn-already-handled' ? 'Esse turno ja foi processado.' : 'Nao foi possivel votar agora.');
        return;
      }

      await runVoteResult(result, activePlayer);
    } finally {
      voteProcessingRef.current = false;
      setIsVoting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const query = supabaseGame.from('characters').select('*');
      const { data } = room.deck_id ? await query.eq('deck_id', room.deck_id) : await query.is('deck_id', null);
      setDeckChars(data || []);
      await refreshLiveCards();
    };
    void load();
  }, [room.deck_id, refreshLiveCards]);

  useEffect(() => {
    const timer = setTimeout(() => void refreshLiveCards(), 0);
    return () => clearTimeout(timer);
  }, [room.current_turn_number, refreshLiveCards]);

  useEffect(() => {
    audioManager.playSFX('turn');
  }, [room.current_turn_number]);

  useEffect(() => {
    const lastLog = actionLog[actionLog.length - 1];
    if (!lastLog) return;
    if (lastLog.msg.includes('perdeu') || lastLog.msg.includes('eliminado') || lastLog.msg.includes('nao votou')) audioManager.playSFX('eliminated');
    else if (lastLog.msg.includes('Campeao')) audioManager.playSFX('win');
    else if (lastLog.msg.includes('escolha')) audioManager.playSFX('select');
  }, [actionLog]);

  useEffect(() => {
    handlingTimeoutRef.current = false;
    voteProcessingRef.current = false;
    setIsVoting(false);
    setTimeLeft(Math.max(0, differenceInSeconds(new Date(room.turn_expires_at), new Date())));
  }, [room.current_turn_number, room.turn_expires_at]);

  useEffect(() => {
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(`timeout-lock-${room.id}-`))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
  }, [room.id, room.current_turn_number]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRevealing) return;
      const diff = differenceInSeconds(new Date(room.turn_expires_at), new Date());
      if (diff > 0) {
        setTimeLeft(diff);
        return;
      }

      setTimeLeft(0);
      if (!activePlayer || handlingTimeoutRef.current || voteProcessingRef.current) return;

      const timeoutKey = `timeout-lock-${room.id}-${room.current_turn_number}-${activePlayer.id}`;
      try {
        if (sessionStorage.getItem(timeoutKey)) return;
        sessionStorage.setItem(timeoutKey, '1');
      } catch {}

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
            if (result.tiebreak) addLog('EMPATE! Escolham novos personagens para o desempate.');
            else if (result.eliminated) addLog(`${activePlayer.nickname} ficou sem votar e foi eliminado.`);
            else addLog(`${activePlayer.nickname} nao votou e perdeu 1 vida.`);
            if (result.finished) addLog(`Partida encerrada! Campeao: ${result.winner || 'Empate'}!`);
          }
        })
        .finally(() => {
          handlingTimeoutRef.current = false;
        });
    }, 500);

    return () => clearInterval(interval);
  }, [room.turn_expires_at, room.id, room.current_turn_number, isRevealing, activePlayer, addLog]);

  useEffect(() => {
    if (!activePlayer?.is_bot || activePlayer.is_eliminated || isRevealing) return;
    const turnKey = `${room.id}:${room.current_turn_number}:${activePlayer.id}`;
    if (botTurnRef.current === turnKey) return;

    const delay = (humanPlayers.length === 1 ? 2200 : 9000) + Math.floor(Math.random() * 2600);
    const timer = setTimeout(async () => {
      botTurnRef.current = turnKey;
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
        await runVoteResult(result, activePlayer);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activePlayer, isRevealing, room.current_turn_number, room.id, addLog, runVoteResult, humanPlayers.length]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f5f6ff] font-sans relative party-grid-bg">
      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-y-auto relative z-10">
        <header className="mb-4 bg-white border-2 border-indigo-100 p-3 rounded-2xl shrink-0 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-indigo-50 border-2 border-indigo-100 px-4 py-2 flex flex-col justify-center rounded-2xl shadow-inner shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-indigo-500 font-extrabold mb-0.5">Rodada</span>
              <h2 className="text-sm font-black text-indigo-950 font-mono">TURNO {room.current_turn_number + 1}</h2>
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className={cn('animate-ping absolute inline-flex h-full w-full opacity-75 rounded-full', isMyTurn ? 'bg-indigo-500' : 'bg-indigo-400')} />
                <span className={cn('relative inline-flex h-3 w-3 rounded-full', isMyTurn ? 'bg-indigo-500' : 'bg-indigo-400')} />
              </span>
              <span className="text-sm font-bold text-indigo-950 truncate">
                {isMyTurn ? 'SUA VEZ DE JOGAR!' : `Aguardando ${activePlayer?.nickname || 'jogador'}...`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center gap-2.5 bg-indigo-50/50 px-4 py-2 rounded-2xl border border-indigo-100">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span className={cn('text-2xl font-black font-mono', timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-indigo-950')}>00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            <button onClick={leaveRoom} className="h-11 px-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-600 text-xs font-black uppercase flex items-center gap-2 hover:bg-rose-100 transition-all cursor-pointer">
              Sair <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {hudPlayers.map((p: any) => {
            const isOut = p.is_eliminated || (p.lives || 0) <= 0;
            const isActive = activePlayer?.id === p.id;
            return (
              <div key={p.id} className={cn('border-2 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-sm min-w-0 transition-all relative overflow-hidden', isOut ? 'bg-slate-100/90 border-slate-300 opacity-70 grayscale' : isActive ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50') : 'bg-white/90 border-indigo-100')}>
                {isOut && <div className="absolute inset-0 bg-slate-200/35" />}
                <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('w-8 h-8 rounded-xl border-2 shrink-0 relative z-10', isOut ? 'border-slate-400 bg-slate-200' : p.color?.border || 'border-slate-200')} />
                <div className="min-w-0 flex-1 relative z-10">
                  <p className={cn('text-xs font-black truncate', isOut ? 'text-slate-500 line-through decoration-slate-400' : p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {isOut ? <Skull className="w-3.5 h-3.5 text-slate-500" /> : Array.from({ length: room.chars_per_player }).map((_, i) => i < p.lives ? <Heart key={i} className={cn('w-3.5 h-3.5 fill-current', p.color?.text || 'text-indigo-500')} /> : <Skull key={i} className="w-3.5 h-3.5 text-slate-300" />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activePlayer && !isRevealing && (
          <motion.div key={activePlayer.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn('mb-4 flex items-center justify-center font-black text-xs md:text-sm px-5 py-4 rounded-2xl shadow-sm border-b-4 uppercase tracking-widest w-full gap-3 text-white', activePlayer.color?.bg || 'bg-indigo-500', activePlayer.color?.border || 'border-indigo-700')}>
            {isMyTurn ? 'É A SUA VEZ! SELECIONE UM SUSPEITO NA MESA.' : `É A VEZ DE ${activePlayer.nickname}`}
          </motion.div>
        )}

        {(!isMyTurn || isRevealing) ? (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-4 max-h-[62vh] overflow-y-auto shadow-sm">
            <h3 className="text-sm font-black text-indigo-950 uppercase mb-3 border-b-2 border-indigo-50 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><List className="w-5 h-5 text-indigo-500" /> Personagens vivos</span>
              <span className="text-[11px] text-slate-500 font-black normal-case">{activePlayer ? `Vez de ${activePlayer.nickname}` : 'Aguardando'}</span>
            </h3>
            <ul className="divide-y divide-slate-100">
              {visibleDeckChars.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="w-12 h-14 rounded-xl object-cover bg-slate-200 shrink-0" />
                  <span className="text-sm font-bold text-indigo-950 truncate">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn('mb-5 rounded-3xl border-4 p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4', me.color?.border || 'border-indigo-300', me.color?.lightBgc || 'bg-indigo-50')}>
              <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} state="vote" primaryColor={me.color?.hex} className={cn('w-20 h-20 rounded-2xl border-4 shrink-0', me.color?.border || 'border-indigo-400')} />
              <div className="text-left">
                <p className={cn('text-xs font-black uppercase tracking-widest', me.color?.text || 'text-indigo-600')}>Sua vez de palpitar</p>
                <h3 className="text-2xl font-black text-indigo-950 font-display">Escolha um card da mesa</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">A rodada so anda quando voce vota ou o tempo acaba.</p>
              </div>
            </motion.div>
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-4 p-1 sm:p-2">
              {visibleDeckChars.map((c, i) => (
                <motion.button
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  key={c.id}
                  onClick={() => processVote(c.id)}
                  disabled={!isMyTurn || isVoting || voteProcessingRef.current}
                  className="bg-white border-4 border-slate-100 hover:border-indigo-400 hover:shadow-xl rounded-3xl p-2.5 cursor-pointer transition-all flex flex-col group hover:-translate-y-1 relative disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-slate-950 mb-2 shadow-inner">
                    <CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="object-cover w-full h-full" />
                  </div>
                  <p className="text-sm font-black text-center text-indigo-950 line-clamp-2 min-h-[2.5rem] flex items-center justify-center w-full">{c.name}</p>
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-all rounded-3xl flex items-center justify-center pointer-events-none">
                    <Target className="w-10 h-10 text-indigo-500 opacity-0 group-hover:opacity-100 shadow-md bg-white p-2 rounded-full scale-90 group-hover:scale-100 transition-all" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}

        <div className="fixed right-4 top-20 z-[70] flex flex-col gap-2 pointer-events-none max-w-[320px]">
          <AnimatePresence>{actionLog.map((log) => <motion.div key={log.id} initial={{ opacity: 0, x: 30, scale: 0.96 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30, scale: 0.96 }} className="bg-white/92 backdrop-blur-md border-2 border-indigo-100 text-indigo-950 font-bold px-3 py-2 text-[11px] shadow-md rounded-xl">{log.msg}</motion.div>)}</AnimatePresence>
        </div>

        <AnimatePresence>
          {isRevealing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md rounded-3xl p-4">
              {revelation && revealStage === 'choosing' ? (
                <div className="text-center p-8 bg-white border-4 border-indigo-100 shadow-2xl max-w-sm w-full rounded-3xl">
                  <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Zap className="w-8 h-8" /></div>
                  <p className={cn('text-sm font-black uppercase tracking-widest mb-2', revelation.voter?.color?.text || 'text-indigo-600')}>{revelation.voterName}</p>
                  <h2 className="text-2xl font-black text-indigo-950 font-display mb-1.5 animate-pulse">Fez sua escolha...</h2>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">A mesa ainda nao sabe o alvo</p>
                </div>
              ) : revelation && revealStage === 'choice' ? (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 bg-white border-4 border-indigo-100 shadow-2xl max-w-md w-full rounded-3xl text-indigo-950">
                  <p className={cn('text-sm font-black uppercase tracking-widest mb-2', revelation.voter?.color?.text || 'text-indigo-600')}>{revelation.voterName} escolheu</p>
                  <p className="text-4xl font-black font-display mb-4">{revelation.charName}</p>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Conferindo atingidos...</p>
                </motion.div>
              ) : revelation && (revealStage === 'impact' || revealStage === 'eliminated') ? (() => {
                const isMeHit = revelation.players.some((p: any) => p.id === me.id);
                const visiblePlayers = revealStage === 'eliminated' ? revelation.eliminatedPlayers : revelation.players;
                const title = isMeHit ? revealStage === 'eliminated' ? 'VOCE FOI ELIMINADO!' : 'VOCE FOI ATINGIDO!' : revealStage === 'eliminated' ? 'ELIMINACAO' : 'ATINGIDO';
                return (
                  <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className={cn('text-center p-8 border-4 shadow-2xl max-w-md w-full rounded-3xl text-white', isMeHit ? 'bg-indigo-700 border-indigo-300' : 'bg-rose-600 border-rose-400')}>
                    <h2 className="font-extrabold tracking-widest text-sm mb-4 uppercase drop-shadow-sm">{title}</h2>
                    <p className="text-4xl font-black font-display mb-6 drop-shadow-md">{revelation.charName}</p>
                    <div className="rounded-2xl p-4 mb-4 border bg-white/15 border-white/25">
                      <p className="text-xs font-bold uppercase mb-2 text-white/80">{revealStage === 'eliminated' ? 'Saiu do jogo:' : 'Perdeu vida:'}</p>
                      <p className="text-lg font-black">{visiblePlayers.map((p: any) => p.nickname).join(', ')}</p>
                    </div>
                    <div className="grid gap-2 text-left">{revelation.players.map((p: any) => <div key={p.id} className="rounded-xl bg-white/15 border border-white/20 px-3 py-2"><span className="font-black">{p.nickname}</span><span className="ml-2 text-white/80 font-bold">vidas: {Math.max(0, p.lives || 0)}</span></div>)}</div>
                  </motion.div>
                );
              })() : revelation ? (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 bg-slate-800 border-4 border-slate-600 shadow-2xl max-w-md w-full rounded-3xl text-white">
                  <h2 className="text-slate-400 font-extrabold tracking-widest text-sm mb-4 uppercase">NENHUM ACERTO</h2>
                  <p className="text-2xl font-black mb-2 text-slate-300 line-through decoration-slate-500 decoration-4">{revelation.charName}</p>
                  <p className="text-lg font-bold text-slate-400">Ninguem tinha este personagem!</p>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}