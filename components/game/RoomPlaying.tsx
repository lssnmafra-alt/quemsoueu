import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Heart, Target, Clock, LogOut, Zap, List, Skull, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager } from '@/lib/audioManager';
import ChatMenu from './ChatMenu';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import CharacterImage from '@/components/CharacterImage';
import { isOfficialDeckId } from '@/lib/officialDecks';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function secondsLeft(expiresAt?: string | null) {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
}

function revealKey(payload: any) {
  const hitIds = payload?.hitPlayerIds || payload?.hits || [];
  return `${payload?.voterId || ''}:${payload?.charName || ''}:${hitIds.join(',')}`;
}

export default function RoomPlaying({ room, players, me, leaveRoom }: any) {
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(secondsLeft(room.turn_expires_at) || room.vote_time_seconds || 30);
  const [actionLog, setActionLog] = useState<{ id: string; msg: string }[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [liveCharIds, setLiveCharIds] = useState<Set<string>>(new Set());
  const [liveCardsLoaded, setLiveCardsLoaded] = useState(false);
  const [suddenDeathIntro, setSuddenDeathIntro] = useState(false);
  const [revelation, setRevelation] = useState<{
    voterName: string;
    voter?: any;
    charName: string;
    card?: any;
    players: any[];
    eliminatedPlayers: any[];
  } | null>(null);
  const [revealStage, setRevealStage] = useState<'choosing' | 'choice' | 'owner' | 'result' | 'consequence' | 'eliminated'>('choice');
  const [isVoting, setIsVoting] = useState(false);

  const handlingTimeoutRef = useRef(false);
  const voteProcessingRef = useRef(false);
  const botTurnRef = useRef('');
  const channelRef = useRef<any>(null);
  const playersRef = useRef(players);
  const activePlayerRef = useRef<any>(null);
  const showRevealRef = useRef<any>(null);
  const sentRevealKeysRef = useRef<Set<string>>(new Set());
  const suddenDeathAnnouncedRef = useRef(false);

  const orderedPlayers = useMemo(() => [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0)), [players]);
  const activePlayers = useMemo(() => orderedPlayers.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0), [orderedPlayers]);
  const activePlayer = activePlayers.length > 0 ? activePlayers[(room.current_turn_number || 0) % activePlayers.length] : null;
  const isSuddenDeath = activePlayers.length > 1 && activePlayers.every((p: any) => (p.lives || 0) <= 1);
  const isSpectator = Boolean(me?.is_eliminated || (me?.lives || 0) <= 0);
  const hudPlayers = orderedPlayers;
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);
  const visibleDeckChars = useMemo(() => (
    liveCardsLoaded ? deckChars.filter((c) => liveCharIds.has(c.id)) : deckChars
  ), [deckChars, liveCharIds, liveCardsLoaded]);
  const isMyTurn = activePlayer?.id === me.id && !me.is_eliminated && !isRevealing && !isVoting && !voteProcessingRef.current;
  const humanPlayers = orderedPlayers.filter((p: any) => !p.is_bot);
  const timerVisible = !isRevealing && !isVoting;
  const turnLabel = isSpectator
    ? 'Você está eliminado'
    : isVoting
      ? 'Escolha realizada'
      : isRevealing
        ? 'Revelando resultado'
        : isMyTurn
          ? 'Sua vez: escolha um personagem'
          : activePlayer?.is_bot
            ? `${activePlayer.nickname} está pensando...`
            : activePlayer
              ? `${activePlayer.nickname} está escolhendo...`
              : 'Aguardando rodada';
  const roundSummary = isSpectator
    ? '👻 Assistindo a partida'
    : isVoting
      ? 'O servidor está resolvendo seu palpite'
      : isRevealing
        ? 'Leia o resultado da jogada'
        : `Rodada ${room.current_turn_number + 1} • ${activePlayers.length} vivo${activePlayers.length === 1 ? '' : 's'}`;

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
    const revealCard = deckChars.find((card) => String(card.name || '').toLowerCase() === String(charName || '').toLowerCase());
    const hasHit = hitPlayers.length > 0;
    const peopleToRead = Math.max(1, hitPlayers.length);
    const timing = {
      preparing: 750,
      card: 2600,
      owner: Math.min(2600, 1750 + peopleToRead * 180),
      result: 1250,
      consequence: Math.min(2900, 2000 + peopleToRead * 220),
      eliminated: 3100,
      breath: 400,
    };

    setIsRevealing(true);
    setRevealStage('choosing');
    setRevelation({
      voterName: revealVoter?.nickname || 'Alguem',
      voter: revealVoter,
      charName,
      card: revealCard,
      players: hitPlayers,
      eliminatedPlayers,
    });

    audioManager.playSFX('vote');
    if (eliminatedPlayers.length > 0) void refreshLiveCards();

    await sleep(timing.preparing);
    setRevealStage('choice');
    audioManager.playSFX('card_reveal');

    await sleep(timing.card);
    setRevealStage('owner');

    await sleep(timing.owner);
    setRevealStage('result');
    audioManager.playSFX(hasHit ? 'life_lost' : 'miss');

    await sleep(timing.result);
    setRevealStage('consequence');
    await sleep(timing.consequence);

    if (eliminatedPlayers.length > 0) {
      setRevealStage('eliminated');
      audioManager.playSFX(eliminatedPlayers.some((player: any) => player.id === me?.id) ? 'defeat' : 'player_eliminated');
      await sleep(timing.eliminated);
    }

    await sleep(timing.breath);
    setIsRevealing(false);
    setRevelation(null);
    await refreshLiveCards();
  }, [deckChars, me?.id, refreshLiveCards]);

  useEffect(() => {
    showRevealRef.current = showReveal;
  }, [showReveal]);

  useEffect(() => {
    const ch = supabaseGame.channel(`revels:${room.id}`)
      .on('broadcast', { event: 'REVEAL' }, (payload) => {
        const key = revealKey(payload.payload);
        if (sentRevealKeysRef.current.has(key)) {
          sentRevealKeysRef.current.delete(key);
          return;
        }

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
    const key = revealKey(payload);
    const message = { type: 'broadcast', event: 'REVEAL', payload };

    sentRevealKeysRef.current.add(key);
    setTimeout(() => sentRevealKeysRef.current.delete(key), 15000);

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

    const payload = {
      charName: result.target,
      hitPlayerIds: result.hitPlayerIds || [],
      hitPlayers: result.hitPlayers || [],
      voterId: voter?.id || result.voterId,
      voterName: voter?.nickname || result.voterName,
    };

    await sendReveal(payload);
    await showReveal(result.target, payload.hitPlayerIds, voter, payload.hitPlayers);

    const finishResponse = await fetch(`/api/rooms/${room.id}/finish-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnNumber: room.current_turn_number,
        tiebreakPlayerIds: (result.hitPlayers || []).map((player: any) => player.id),
      }),
    });
    const progress = await finishResponse.json().catch(() => ({}));

    if ((result.hitPlayerIds || []).length > 0) {
      addLog(`ACERTOU! ${voter?.nickname || 'Jogador'} votou em ${result.target}.`);
      for (const player of result.hitPlayers || []) {
        addLog(player.is_eliminated ? `${player.nickname} foi eliminado por ${voter?.nickname || 'Jogador'}!` : `${player.nickname} perdeu 1 vida!`);
      }
    } else {
      addLog(`ERROU! Ninguem tinha ${result.target}.`);
    }
    if (progress.tiebreak) addLog('EMPATE! Escolham novos personagens para o desempate.');
    if (progress.finished) addLog(`Partida encerrada! Campeao: ${progress.winner || 'Empate'}!`);
  }, [addLog, room.current_turn_number, room.id, sendReveal, showReveal]);

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
        addLog(result?.reason === 'cannot-vote-own-card' ? 'Você não pode votar na própria carta.' : result?.reason === 'turn-already-handled' ? 'Esse turno ja foi processado.' : 'Nao foi possivel votar agora.');
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
    audioManager.setMusicRate(isSuddenDeath ? 1.18 : 1);
    if (!isSuddenDeath) {
      suddenDeathAnnouncedRef.current = false;
      setSuddenDeathIntro(false);
      return;
    }

    if (suddenDeathAnnouncedRef.current) return;
    suddenDeathAnnouncedRef.current = true;
    setSuddenDeathIntro(true);
    audioManager.playSFX('sudden_death');
    const timer = setTimeout(() => setSuddenDeathIntro(false), 2200);
    return () => clearTimeout(timer);
  }, [isSuddenDeath]);

  useEffect(() => () => audioManager.setMusicRate(1), []);

  useEffect(() => {
    const lastLog = actionLog[actionLog.length - 1];
    if (!lastLog) return;
    if (lastLog.msg.includes('perdeu') || lastLog.msg.includes('eliminado') || lastLog.msg.includes('falta') || lastLog.msg.includes('nao votou')) audioManager.playSFX('eliminated');
    else if (lastLog.msg.includes('Campeao')) audioManager.playSFX('win');
    else if (lastLog.msg.includes('escolha')) audioManager.playSFX('select');
  }, [actionLog]);

  useEffect(() => {
    handlingTimeoutRef.current = false;
    voteProcessingRef.current = false;
    botTurnRef.current = '';
    setIsVoting(false);
    setTimeLeft(secondsLeft(room.turn_expires_at));
  }, [room.current_turn_number, room.turn_expires_at, isSuddenDeath]);

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
      const diff = secondsLeft(room.turn_expires_at);
      if (diff > 0) {
        setTimeLeft(diff);
        return;
      }

      setTimeLeft(0);
      if (!activePlayer || handlingTimeoutRef.current || voteProcessingRef.current) return;

      const timeoutKey = `timeout-lock-${room.id}-${room.current_turn_number}-${activePlayer.id}`;
      let lockWritten = false;
      try {
        if (sessionStorage.getItem(timeoutKey)) return;
        sessionStorage.setItem(timeoutKey, '1');
        lockWritten = true;
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
            else if (result.missedTurns === 1 && !result.eliminated) addLog(`${activePlayer.nickname} ficou sem votar: 1ª falta. Na próxima falta será eliminado.`);
            else if (result.eliminated && (result.missedTurns || 0) >= 2) addLog(`${activePlayer.nickname} ficou sem votar pela 2ª vez e foi eliminado.`);
            else if (result.eliminated) addLog(`${activePlayer.nickname} ficou sem votar e foi eliminado.`);
            else addLog(`${activePlayer.nickname} nao votou e perdeu 1 vida.`);
            if (result.finished) addLog(`Partida encerrada! Campeao: ${result.winner || 'Empate'}!`);
            void refreshLiveCards();
          } else if (lockWritten) {
            try { sessionStorage.removeItem(timeoutKey); } catch {}
          }
        })
        .catch(() => {
          if (lockWritten) {
            try { sessionStorage.removeItem(timeoutKey); } catch {}
          }
        })
        .finally(() => {
          handlingTimeoutRef.current = false;
        });
    }, 500);

    return () => clearInterval(interval);
  }, [room.turn_expires_at, room.id, room.current_turn_number, isRevealing, activePlayer, addLog, refreshLiveCards]);

  useEffect(() => {
    if (!activePlayer?.is_bot || activePlayer.is_eliminated || isRevealing) return;
    const turnKey = `${room.id}:${room.current_turn_number}:${activePlayer.id}`;
    if (botTurnRef.current === turnKey) return;

    addLog(`${activePlayer.nickname} está pensando no palpite...`);
    botTurnRef.current = turnKey;
    const voteSeconds = Math.max(5, room.vote_time_seconds || 30);
    const maxDelay = Math.max(900, voteSeconds * 1000 - 4500);
    const preferredDelay = isSuddenDeath
      ? (humanPlayers.length === 1 ? 1700 : 2200) + Math.floor(Math.random() * 600)
      : (humanPlayers.length === 1 ? 2100 : 2800) + Math.floor(Math.random() * 700);
    const delay = Math.min(maxDelay, preferredDelay);

    const timer = setTimeout(async () => {
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
      } else if (result?.ok && result.skipped) {
        addLog(`${activePlayer.nickname} passou a vez.`);
        void refreshLiveCards();
      } else {
        botTurnRef.current = '';
        console.warn('[RoomPlaying] bot turn did not complete', {
          roomId: room.id,
          turnNumber: room.current_turn_number,
          playerId: activePlayer.id,
          status: response?.status,
          result,
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activePlayer, isRevealing, isSuddenDeath, room.current_turn_number, room.id, room.vote_time_seconds, addLog, runVoteResult, refreshLiveCards, humanPlayers.length]);

  return (
    <div className={cn('flex h-[100dvh] overflow-hidden bg-[#f5f6ff] font-sans relative party-grid-bg', isSpectator && 'grayscale-[0.15]')}>
      <div className="flex-1 flex flex-col p-2.5 md:p-6 overflow-y-auto relative z-10">
        <header className={cn('mb-3 bg-white border-2 p-2.5 md:p-3 rounded-2xl shrink-0 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative overflow-hidden', isSpectator ? 'border-slate-300 bg-slate-900 text-white' : isSuddenDeath ? 'border-rose-200 bg-rose-50' : 'border-indigo-100')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={cn('animate-ping absolute inline-flex h-full w-full opacity-75 rounded-full', isSpectator ? 'bg-slate-400' : isSuddenDeath ? 'bg-rose-500' : isMyTurn ? 'bg-emerald-500' : 'bg-indigo-400')} />
              <span className={cn('relative inline-flex h-3 w-3 rounded-full', isSpectator ? 'bg-slate-400' : isSuddenDeath ? 'bg-rose-500' : isMyTurn ? 'bg-emerald-500' : 'bg-indigo-400')} />
            </span>
            <div className="min-w-0 text-left">
              <p className={cn('text-[13px] md:text-sm font-black truncate', isSpectator ? 'text-white' : 'text-indigo-950')}>{turnLabel}</p>
              <div className={cn('mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider', isSpectator ? 'text-slate-300' : isSuddenDeath ? 'text-rose-600' : 'text-indigo-500')}>
                <span>{roundSummary}</span>
                {isSpectator && <span className="rounded-full border border-slate-500 bg-slate-800 px-2 py-0.5 text-slate-200"><Eye className="mr-1 inline h-3 w-3" /> Espectador</span>}
                {isSuddenDeath && <span className="rounded-full border border-rose-300 bg-white px-2 py-0.5 text-rose-600">🔥 Morte súbita</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-2xl border text-[10px] md:text-xs font-black uppercase tracking-wider', isSpectator ? 'bg-slate-800 border-slate-600 text-slate-200' : isSuddenDeath ? 'bg-white border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-100 text-indigo-700')}>
              <Zap className="w-4 h-4" />
              {isRevealing || isVoting ? 'Resultado em andamento' : activePlayer?.is_bot ? 'Bot pensando...' : activePlayer ? 'Escolhendo...' : 'Aguardando'}
            </div>
            {timerVisible && (
              <div key={`${room.current_turn_number}-${isSuddenDeath ? 'sudden' : 'normal'}`} className={cn('flex items-center gap-2 px-3 py-2 rounded-2xl border', isSpectator ? 'bg-slate-800 border-slate-600' : isSuddenDeath ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 'bg-indigo-50/50 border-indigo-100')}>
                <Clock className={cn('w-4 h-4', isSpectator ? 'text-slate-300' : isSuddenDeath ? 'text-white' : 'text-indigo-500')} />
                <span className={cn('text-xl md:text-2xl font-black font-mono', timeLeft <= 5 ? 'text-rose-500 animate-pulse' : isSpectator ? 'text-white' : isSuddenDeath ? 'text-white' : 'text-indigo-950')}>00:{timeLeft.toString().padStart(2, '0')}</span>
              </div>
            )}
            <button onClick={leaveRoom} className="h-10 md:h-11 px-3 md:px-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-600 text-[10px] md:text-xs font-black uppercase flex items-center gap-1.5 hover:bg-rose-100 transition-all cursor-pointer">
              Sair <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {me?.missed_turns === 1 && !me.is_eliminated && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-3 py-2 text-center text-[10px] md:text-xs font-black uppercase tracking-wider text-amber-800 shadow-sm">
            Atenção: você já tem 1 falta. Se deixar o tempo acabar novamente, será eliminado.
          </motion.div>
        )}

        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {hudPlayers.map((p: any) => {
            const isOut = p.is_eliminated || (p.lives || 0) <= 0;
            const isActive = activePlayer?.id === p.id;
            const missedTurns = p.missed_turns || 0;
            return (
              <div key={p.id} className={cn('border-2 rounded-2xl px-2 py-1.5 md:px-3 md:py-2 flex items-center gap-2 shadow-sm min-w-0 transition-all relative overflow-hidden', isOut ? 'bg-slate-100/90 border-slate-300 opacity-70 grayscale' : isActive ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50') : 'bg-white/90 border-indigo-100')}>
                {isOut && <div className="absolute inset-0 bg-slate-200/25 pointer-events-none" />}
                <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('w-7 h-7 md:w-8 md:h-8 rounded-xl border-2 shrink-0 relative z-10', isOut ? 'border-slate-400 bg-slate-200' : p.color?.border || 'border-slate-200')} />
                <div className="min-w-0 flex-1 relative z-10">
                  <p className={cn('text-[11px] md:text-xs font-black truncate', isOut ? 'text-slate-500' : p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {isOut ? <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Fora</span> : Array.from({ length: room.chars_per_player }).map((_, i) => i < p.lives ? <Heart key={i} className={cn('w-3 h-3 md:w-3.5 md:h-3.5 fill-current', p.color?.text || 'text-indigo-500')} /> : <Skull key={i} className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-300" />)}
                  </div>
                  {missedTurns > 0 && !isOut && <span className="mt-0.5 inline-block rounded-full border bg-amber-50 border-amber-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700">{missedTurns} falta{missedTurns > 1 ? 's' : ''}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {((!isMyTurn && !isVoting) || isRevealing) ? (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-3 md:p-4 mb-3 max-h-[68vh] sm:max-h-[62vh] overflow-y-auto shadow-sm">
            <h3 className="text-xs md:text-sm font-black text-indigo-950 uppercase mb-2 border-b-2 border-indigo-50 pb-1.5 flex items-center gap-2">
              <List className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Personagens vivos
            </h3>
            <ul className="divide-y divide-slate-100">
              {visibleDeckChars.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-1.5 sm:py-2">
                  <CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="w-9 h-11 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl object-cover bg-slate-200 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-indigo-950 truncate">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn('mb-4 md:mb-5 rounded-3xl border-4 p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4', me.color?.border || 'border-indigo-300', me.color?.lightBgc || 'bg-indigo-50')}>
              <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} state="vote" primaryColor={me.color?.hex} className={cn('w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 shrink-0', me.color?.border || 'border-indigo-400')} />
              <div className="text-left">
                <p className={cn('text-[10px] md:text-xs font-black uppercase tracking-widest', me.color?.text || 'text-indigo-600')}>Sua vez de palpitar</p>
                <h3 className="text-xl md:text-2xl font-black text-indigo-950 font-display">Escolha um card da mesa</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">A rodada so anda quando voce vota ou o tempo acaba.</p>
              </div>
            </motion.div>
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-4 p-1 sm:p-2">
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
                  className="bg-white border-4 border-slate-100 hover:border-indigo-400 hover:shadow-xl rounded-3xl p-2 md:p-2.5 cursor-pointer transition-all flex flex-col group hover:-translate-y-1 relative disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-slate-950 mb-2 shadow-inner">
                    <CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="object-cover w-full h-full" />
                  </div>
                  <p className="text-xs md:text-sm font-black text-center text-indigo-950 line-clamp-2 min-h-[2.25rem] md:min-h-[2.5rem] flex items-center justify-center w-full">{c.name}</p>
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
          {suddenDeathIntro && !isRevealing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[85] flex items-center justify-center bg-slate-950/86 backdrop-blur-md rounded-3xl p-4 text-white">
              <motion.div initial={{ scale: 0.82, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: -12 }} className="max-w-md rounded-3xl border-4 border-rose-500 bg-rose-950/80 p-8 text-center shadow-2xl">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-rose-200">Agora ficou sério</p>
                <h2 className="text-5xl font-black font-display text-white drop-shadow-lg">🔥 MORTE SÚBITA</h2>
                <p className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-100">Últimos jogadores restantes. Qualquer erro pode ser fatal.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isRevealing && revelation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/82 backdrop-blur-md rounded-3xl p-4 text-white">
              <AnimatePresence mode="wait" initial={false}>
              {revealStage === 'choosing' ? (
                <motion.div key="choosing" initial={{ y: 18, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -14, scale: 0.98, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-8 max-w-sm w-full">
                  <div className="w-20 h-20 bg-indigo-500/20 border-2 border-indigo-300/40 text-indigo-200 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse"><Zap className="w-10 h-10" /></div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-indigo-200 mb-3">Preparando palpite</p>
                  <h2 className="text-3xl font-black font-display">{revelation.voterName}</h2>
                  <p className="mt-2 text-sm font-bold text-white/70">está pensando no palpite...</p>
                </motion.div>
              ) : revealStage === 'choice' ? (
                <motion.div key="choice" initial={{ scale: 0.88, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 1.03, y: -14, opacity: 0 }} transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-sm text-center">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-amber-200">{revelation.voterName} votou em:</p>
                  <div className="mx-auto mb-5 w-60 max-w-[74vw] rounded-[1.6rem] border-4 border-white/20 bg-slate-900 p-2 shadow-2xl">
                    <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-slate-800">
                      <CharacterImage name={revelation.charName} imageUrl={revelation.card?.image_url} avatarConfig={revelation.card?.avatar_config} isOfficial={usesOfficialImages} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black font-display uppercase leading-none drop-shadow-lg">{revelation.charName}</h2>
                </motion.div>
              ) : revealStage === 'owner' ? (
                <motion.div key="owner" initial={{ y: 20, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, scale: 1.02, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-7 bg-white text-indigo-950 border-4 border-indigo-200 shadow-2xl max-w-md w-full rounded-3xl">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-3">Dono da carta</p>
                  {revelation.players.length > 0 ? (
                    <>
                      <h2 className="text-2xl font-black font-display mb-4">{revelation.charName} estava com:</h2>
                      <div className="grid gap-2">
                        {revelation.players.map((p: any) => <div key={p.id} className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 font-black text-indigo-800">{p.nickname}</div>)}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black font-display mb-4">Ninguém tinha {revelation.charName}</h2>
                      <div className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-lg font-black text-slate-600">Palpite sem alvo</div>
                    </>
                  )}
                </motion.div>
              ) : revealStage === 'result' ? (
                revelation.players.length > 0 ? (
                  <motion.div key="hit" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-8 bg-emerald-500 border-4 border-emerald-300 shadow-2xl max-w-md w-full rounded-3xl text-white">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-100 mb-3">Resultado</p>
                    <h2 className="text-5xl font-black font-display drop-shadow-lg">ACERTOU!</h2>
                    <p className="mt-4 text-sm font-black uppercase tracking-wider text-emerald-50">O palpite de {revelation.voterName} atingiu {revelation.players.map((p: any) => p.nickname).join(', ')}</p>
                  </motion.div>
                ) : (
                  <motion.div key="miss" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-8 bg-slate-900 border-4 border-slate-600 shadow-2xl max-w-md w-full rounded-3xl text-white">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400 mb-3">Resultado</p>
                    <h2 className="text-5xl font-black font-display text-slate-200">ERROU</h2>
                    <p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-300">O palpite de {revelation.voterName} não encontrou ninguém</p>
                  </motion.div>
                )
              ) : revealStage === 'consequence' ? (
                revelation.players.length > 0 ? (
                  <motion.div key="life-lost" initial={{ y: 18, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-7 bg-white text-indigo-950 border-4 border-amber-300 shadow-2xl max-w-md w-full rounded-3xl">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 mb-2">Consequência</p>
                    <h2 className="text-3xl font-black font-display mb-4">Perda de vida</h2>
                    <div className="grid gap-2">
                      {revelation.players.map((p: any) => <div key={p.id} className="rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3 font-black text-amber-800">{p.nickname} perdeu 1 vida • vidas: {Math.max(0, p.lives || 0)}</div>)}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="safe" initial={{ y: 18, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3 }} className="text-center p-8 bg-slate-900 border-4 border-slate-600 shadow-2xl max-w-md w-full rounded-3xl text-white">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400 mb-3">Consequência</p>
                    <h2 className="text-3xl font-black font-display mb-3 line-through decoration-slate-500 decoration-4">{revelation.charName}</h2>
                    <p className="text-lg font-bold text-slate-300">Ninguém perdeu vida.</p>
                  </motion.div>
                )
              ) : (() => {
                const isMeHit = revelation.eliminatedPlayers.some((p: any) => p.id === me.id);
                return (
                  <motion.div key="eliminated" initial={{ scale: 0.8, opacity: 0, rotate: -1 }} animate={{ scale: [0.8, 1.05, 1], opacity: 1, rotate: [0, -1.5, 1.5, 0], x: [0, -10, 10, -5, 5, 0] }} exit={{ scale: 1.03, opacity: 0 }} transition={{ duration: 0.65 }} className="relative overflow-hidden text-center p-8 bg-slate-950 border-4 border-rose-500 shadow-2xl max-w-md w-full rounded-3xl text-white">
                    <motion.div className="absolute inset-0 bg-rose-500/25" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }} />
                    <div className="relative z-10">
                      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-rose-400 bg-rose-950/70 text-rose-200 shadow-xl"><Skull className="h-14 w-14" /></div>
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-rose-300 mb-3">Eliminação</p>
                      <h2 className="text-4xl font-black font-display mb-4">{isMeHit ? 'VOCÊ FOI ELIMINADO' : 'JOGADOR ELIMINADO'}</h2>
                      <p className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-lg font-black">{revelation.eliminatedPlayers.map((p: any) => p.nickname).join(', ')}</p>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-300">{revelation.voterName} eliminou usando {revelation.charName}</p>
                      {isMeHit && <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-300">Entrando no modo espectador</p>}
                    </div>
                  </motion.div>
                );
              })()}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}
