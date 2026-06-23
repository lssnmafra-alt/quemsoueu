import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Heart, Target, Clock, LogOut, Zap, List, Skull, Eye, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager } from '@/lib/audioManager';
import ChatMenu from './ChatMenu';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import CharacterImage from '@/components/CharacterImage';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { useSyncedCountdown } from '@/hooks/useSyncedCountdown';

const REVEAL_TIMING = {
  thinking: 1300,
  card: 3400,
  owner: 3400,
  result: 2800,
  consequence: 5200,
  eliminationExtra: 1800,
  multiHitExtra: 900,
};

type RoundRecapTone = 'hit' | 'miss' | 'timeout' | 'tiebreak' | 'finished';

type RoundRecap = {
  id: string;
  tone: RoundRecapTone;
  title: string;
  lines: string[];
  next?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function secondsLeft(expiresAt?: string | null) {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

const ALLOWED_VOTE_SECONDS = [15, 30, 45] as const;
const DEFAULT_VOTE_SECONDS = 30;

function clampVoteSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_VOTE_SECONDS;
  const rounded = Math.round(parsed);
  return (ALLOWED_VOTE_SECONDS as readonly number[]).includes(rounded) ? rounded : DEFAULT_VOTE_SECONDS;
}

function getHitIds(value: any) {
  const ids = value?.hitPlayerIds || value?.hit_player_ids || value?.hits || [];
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

function revealKey(payload: any) {
  return `${payload?.turnNumber ?? ''}:${payload?.voterId || ''}:${payload?.charName || ''}:${getHitIds(payload).join(',')}`;
}

function isVoteEvent(event: any) {
  return event?.event_type === 'vote_hit' || event?.event_type === 'vote_miss';
}

function isPlayerAlive(player: any) {
  return Boolean(player) && !player.is_eliminated && (player.lives || 0) > 0;
}

function consequenceText(player: any) {
  const eliminated = (player.lives || 0) <= 0 || player.is_eliminated;
  return eliminated ? `${player.nickname} foi eliminado.` : `${player.nickname} perdeu 1 vida.`;
}

function resolveNextPlayerText(payload: any, progress: any, activePlayers: any[], currentTurnNumber: number) {
  if (progress?.finished) return undefined;
  if (progress?.tiebreak || progress?.needsPicking) return 'Próximo: desempate, escolham novas cartas.';

  const hitPlayerMap = new Map<string, any>(
    (payload.hitPlayers || [])
      .filter((player: any) => player?.id)
      .map((player: any) => [player.id, player]),
  );
  const futureActivePlayers = activePlayers
    .map((player: any) => {
      const hitPlayer = hitPlayerMap.get(player.id);
      return hitPlayer ? { ...player, ...hitPlayer } : player;
    })
    .filter(isPlayerAlive)
    .sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));

  if (futureActivePlayers.length === 0) return undefined;
  if (futureActivePlayers.length === 1) return `Próximo: ${futureActivePlayers[0].nickname}.`;

  const voter = activePlayers.find((player: any) => player.id === payload.voterId) || activePlayers[currentTurnNumber % Math.max(1, activePlayers.length)];
  const voterOrder = voter?.play_order || 0;
  const nextPlayer = futureActivePlayers.find((player: any) => (player.play_order || 0) > voterOrder) || futureActivePlayers[0];

  return nextPlayer ? `Próximo: ${nextPlayer.nickname}. Prepare o palpite.` : undefined;
}

function buildVoteRecap(payload: any, progress: any, activePlayers: any[], currentTurnNumber: number): Omit<RoundRecap, 'id'> {
  const voterName = payload.voterName || 'Jogador';
  const charName = payload.charName || 'Personagem';
  const hitPlayers = payload.hitPlayers || [];

  if (progress?.finished) {
    return {
      tone: 'finished',
      title: 'Partida encerrada',
      lines: [`${voterName} votou em ${charName}.`, `Campeão: ${progress.winner || 'sem vencedor definido'}.`],
    };
  }

  if (progress?.tiebreak || progress?.needsPicking) {
    return {
      tone: 'tiebreak',
      title: 'Desempate à vista',
      lines: [`${voterName} votou em ${charName}.`, 'A partida entrou em morte súbita/desempate.'],
      next: 'Próximo: escolham novas cartas.',
    };
  }

  if (hitPlayers.length > 0) {
    return {
      tone: 'hit',
      title: 'Resumo da rodada',
      lines: [`${voterName} acertou ${charName}.`, ...hitPlayers.map(consequenceText)],
      next: resolveNextPlayerText(payload, progress, activePlayers, currentTurnNumber),
    };
  }

  return {
    tone: 'miss',
    title: 'Resumo da rodada',
    lines: [`${voterName} votou em ${charName}.`, 'Ninguém tinha essa carta.'],
    next: resolveNextPlayerText(payload, progress, activePlayers, currentTurnNumber),
  };
}

function recapToneClass(tone: RoundRecapTone) {
  if (tone === 'hit') return 'border-emerald-300/40 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 text-white shadow-2xl shadow-emerald-950/20';
  if (tone === 'miss') return 'border-slate-300/30 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white shadow-2xl shadow-slate-950/20';
  if (tone === 'timeout') return 'border-amber-300/50 bg-gradient-to-br from-amber-950 via-amber-800 to-orange-700 text-white shadow-2xl shadow-amber-950/20';
  if (tone === 'tiebreak') return 'border-rose-300/50 bg-gradient-to-br from-rose-950 via-rose-800 to-fuchsia-800 text-white shadow-2xl shadow-rose-950/20';
  return 'border-indigo-300/40 bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-800 text-white shadow-2xl shadow-indigo-950/20';
}

function recapBadge(tone: RoundRecapTone) {
  if (tone === 'hit') return 'ACERTO';
  if (tone === 'miss') return 'ERROU';
  if (tone === 'timeout') return 'TEMPO ESGOTADO';
  if (tone === 'tiebreak') return 'MORTE SÚBITA';
  return 'FIM DA PARTIDA';
}

export default function RoomPlaying({ room, players, me, leaveRoom }: any) {
  const safeVoteSeconds = clampVoteSeconds(room.vote_time_seconds);
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [roundRecap, setRoundRecap] = useState<RoundRecap | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealStage, setRevealStage] = useState<'thinking' | 'card' | 'owner' | 'result' | 'consequence'>('thinking');
  const [revelation, setRevelation] = useState<any>(null);
  const [timeoutNotice, setTimeoutNotice] = useState<any>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [liveCharIds, setLiveCharIds] = useState<Set<string>>(new Set());
  const [liveCardsLoaded, setLiveCardsLoaded] = useState(false);
  const [suddenDeathIntro, setSuddenDeathIntro] = useState(false);

  const playersRef = useRef(players);
  const handlingTimeoutRef = useRef(false);
  const voteProcessingRef = useRef(false);
  const botTurnRef = useRef('');
  const handledRevealKeysRef = useRef<Set<string>>(new Set());
  const handledEventIdsRef = useRef<Set<string>>(new Set());
  const suddenDeathAnnouncedRef = useRef(false);

  const orderedPlayers = useMemo(() => [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0)), [players]);
  const activePlayers = useMemo(() => orderedPlayers.filter(isPlayerAlive), [orderedPlayers]);
  const activePlayer = activePlayers.length > 0 ? activePlayers[(room.current_turn_number || 0) % activePlayers.length] : null;
  const isSuddenDeath = activePlayers.length > 1 && activePlayers.every((p: any) => (p.lives || 0) <= 1);
  const isSpectator = Boolean(me?.is_eliminated || (me?.lives || 0) <= 0);
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);
  const visibleDeckChars = liveCardsLoaded ? deckChars.filter((c) => liveCharIds.has(c.id)) : deckChars;
  const isExplaining = isRevealing || Boolean(timeoutNotice);
  const isMyTurn = activePlayer?.id === me.id && !me.is_eliminated && !isExplaining && !isVoting && !voteProcessingRef.current;
  const humanPlayers = orderedPlayers.filter((p: any) => !p.is_bot);
  const { secondsLeft: timeLeft, formattedTime } = useSyncedCountdown({
    expiresAt: room.turn_expires_at,
    fallbackSeconds: safeVoteSeconds,
    maxSeconds: safeVoteSeconds,
    enabled: !isExplaining && !isVoting,
    phaseKey: `${room.id}:PLAYING:${room.current_turn_number || 0}`,
  });

  useEffect(() => { playersRef.current = players; }, [players]);

  const addLog = useCallback((msg: string) => {
    console.info('[game]', msg);
  }, []);

  const showRoundRecap = useCallback((recap: Omit<RoundRecap, 'id'>) => {
    const id = crypto.randomUUID?.() || Math.random().toString();
    setRoundRecap({ id, ...recap });
    setTimeout(() => {
      setRoundRecap((current) => current?.id === id ? null : current);
    }, 8500);
  }, []);

  const markRevealHandled = useCallback((payload: any) => {
    const key = revealKey(payload);
    if (handledRevealKeysRef.current.has(key)) return false;
    handledRevealKeysRef.current.add(key);
    setTimeout(() => handledRevealKeysRef.current.delete(key), 45000);
    return true;
  }, []);

  const refreshLiveCards = useCallback(async () => {
    const { data } = await supabaseGame.from('player_cards').select('character_id,player_id').eq('room_id', room.id).eq('is_dead', false);
    const activeIds = new Set((playersRef.current || []).filter(isPlayerAlive).map((p: any) => p.id));
    const liveCards = (data || []).filter((card: any) => activeIds.has(card.player_id));
    setLiveCharIds(new Set(liveCards.map((card: any) => card.character_id)));
    setLiveCardsLoaded(true);
  }, [room.id]);

  const finishTurnAfterReveal = useCallback(async (turnNumber: number, hitPlayerIds: string[]) => {
    const response = await fetch(`/api/rooms/${room.id}/finish-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnNumber, tiebreakPlayerIds: hitPlayerIds }),
    });
    return response.json().catch(() => ({}));
  }, [room.id]);

  const showReveal = useCallback(async (payload: any) => {
    const charName = payload.charName;
    const hitPlayers = payload.hitPlayers || [];
    const eliminatedPlayers = hitPlayers.filter((p: any) => (p.lives || 0) <= 0 || p.is_eliminated);
    const card = deckChars.find((c) => c.id === payload.characterId || String(c.name || '').toLowerCase() === String(charName || '').toLowerCase());

    setRoundRecap(null);
    setIsRevealing(true);
    setRevealStage('thinking');
    setRevelation({ ...payload, card, eliminatedPlayers });
    audioManager.playSFX('vote');

    await sleep(REVEAL_TIMING.thinking);
    setRevealStage('card');
    audioManager.playSFX('card_reveal');
    await sleep(REVEAL_TIMING.card);

    setRevealStage('owner');
    await sleep(REVEAL_TIMING.owner);

    setRevealStage('result');
    audioManager.playSFX(hitPlayers.length > 0 ? 'life_lost' : 'miss');
    await sleep(REVEAL_TIMING.result);

    if (eliminatedPlayers.length > 0) {
      setRevealStage('consequence');
      audioManager.playSFX(eliminatedPlayers.some((p: any) => p.id === me?.id) ? 'defeat' : 'player_eliminated');
      const consequenceDelay = REVEAL_TIMING.consequence + REVEAL_TIMING.eliminationExtra + (hitPlayers.length > 1 ? REVEAL_TIMING.multiHitExtra : 0);
      await sleep(consequenceDelay);
    }

    setIsRevealing(false);
    setRevelation(null);
    await refreshLiveCards();
  }, [deckChars, me?.id, refreshLiveCards]);

  const logResult = useCallback((payload: any, progress: any) => {
    const recap = buildVoteRecap(payload, progress, activePlayers, room.current_turn_number || 0);
    showRoundRecap(recap);
  }, [activePlayers, room.current_turn_number, showRoundRecap]);

  const buildHitPlayers = useCallback(async (hitPlayerIds: string[], metadataHitPlayers: any[] = []) => {
    const map = new Map<string, any>();
    metadataHitPlayers.forEach((p: any) => { if (p?.id) map.set(p.id, p); });
    (playersRef.current || []).forEach((p: any) => { if (p?.id && !map.has(p.id)) map.set(p.id, p); });
    const missing = hitPlayerIds.filter((id) => !map.has(id));
    if (missing.length > 0) {
      const { data } = await supabaseGame.from('room_players').select('*').in('id', missing);
      (data || []).forEach((p: any) => map.set(p.id, p));
    }
    return hitPlayerIds.map((id) => map.get(id)).filter(Boolean);
  }, []);

  const handleRevealPayload = useCallback(async (payload: any) => {
    if (!markRevealHandled(payload)) return;
    await showReveal(payload);
    const progress = await finishTurnAfterReveal(payload.turnNumber ?? room.current_turn_number, getHitIds(payload));
    logResult(payload, progress);
  }, [finishTurnAfterReveal, logResult, markRevealHandled, room.current_turn_number, showReveal]);

  const processMatchVoteEvent = useCallback(async (event: any) => {
    if (!isVoteEvent(event)) return;
    if (Number(event.turn_number || 0) !== Number(room.current_turn_number || 0)) return;
    if (event.id && handledEventIdsRef.current.has(event.id)) return;

    const metadata = event.metadata || {};
    const charName = metadata.target_name || deckChars.find((c) => c.id === event.character_id)?.name || 'Personagem';
    const hitPlayerIds = getHitIds(metadata);
    const voter = (playersRef.current || []).find((p: any) => p.id === event.actor_player_id) || { id: event.actor_player_id, nickname: metadata.voter_name || 'Jogador' };
    const hitPlayers = await buildHitPlayers(hitPlayerIds, Array.isArray(metadata.hit_players) ? metadata.hit_players : []);
    const payload = { turnNumber: event.turn_number, charName, characterId: event.character_id, hitPlayerIds, hitPlayers, voterId: voter.id, voterName: voter.nickname };

    if (event.id) handledEventIdsRef.current.add(event.id);
    await handleRevealPayload(payload);
  }, [buildHitPlayers, deckChars, handleRevealPayload, room.current_turn_number]);

  const runVoteResult = useCallback(async (result: any, voter: any) => {
    if (!result?.ok || !result?.target) return;
    const payload = { turnNumber: room.current_turn_number, charName: result.target, characterId: result.targetId, hitPlayerIds: getHitIds(result), hitPlayers: result.hitPlayers || [], voterId: voter?.id || result.voterId, voterName: voter?.nickname || result.voterName };
    await handleRevealPayload(payload);
  }, [handleRevealPayload, room.current_turn_number]);

  const processVote = async (targetCharId: string) => {
    if (!activePlayer || !isMyTurn || voteProcessingRef.current || isVoting) return;
    voteProcessingRef.current = true;
    setIsVoting(true);
    setRoundRecap(null);
    try {
      const response = await fetch(`/api/rooms/${room.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id, characterId: targetCharId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) {
        addLog(result?.reason === 'turn-already-handled' ? 'Esse turno já foi processado.' : 'Não foi possível votar agora.');
        return;
      }
      await runVoteResult(result, activePlayer);
    } finally {
      voteProcessingRef.current = false;
      setIsVoting(false);
    }
  };

  const showTimeoutExplanation = useCallback(async (player: any, result: any) => {
    const eliminated = Boolean(result?.eliminated);
    const missedTurns = result?.missedTurns || 0;
    setRoundRecap(null);
    setTimeoutNotice({ player, result, eliminated, missedTurns });
    audioManager.playSFX(eliminated ? 'player_eliminated' : 'life_lost');
    await sleep(eliminated ? 6200 : 4800);
    setTimeoutNotice(null);
    await refreshLiveCards();
  }, [refreshLiveCards]);

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
    const ch = supabaseGame.channel(`match-events:${room.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events', filter: `room_id=eq.${room.id}` }, (payload) => {
      if (isVoteEvent(payload.new)) void processMatchVoteEvent(payload.new);
    }).subscribe();
    return () => { ch.unsubscribe(); };
  }, [processMatchVoteEvent, room.id]);

  useEffect(() => {
    if (isExplaining || isVoting) return;
    const timer = setTimeout(async () => {
      const { data } = await supabaseGame.from('match_events').select('*').eq('room_id', room.id).eq('turn_number', room.current_turn_number || 0).in('event_type', ['vote_hit', 'vote_miss']).order('created_at', { ascending: false }).limit(1);
      if (data?.[0]) void processMatchVoteEvent(data[0]);
    }, 700);
    return () => clearTimeout(timer);
  }, [isExplaining, isVoting, processMatchVoteEvent, room.current_turn_number, room.id, room.turn_expires_at]);

  useEffect(() => {
    handlingTimeoutRef.current = false;
    voteProcessingRef.current = false;
    botTurnRef.current = '';
    setIsVoting(false);
    void refreshLiveCards();
    if (!isExplaining) audioManager.playSFX('turn');
  }, [room.current_turn_number, refreshLiveCards, isExplaining]);

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
    const timer = setTimeout(() => setSuddenDeathIntro(false), 3200);
    return () => clearTimeout(timer);
  }, [isSuddenDeath]);

  useEffect(() => () => audioManager.setMusicRate(1), []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isExplaining || isVoting) return;
      const diff = secondsLeft(room.turn_expires_at);
      if (diff > 0) return;
      if (!activePlayer || handlingTimeoutRef.current || voteProcessingRef.current) return;
      const timeoutKey = `timeout-lock-${room.id}-${room.current_turn_number}-${activePlayer.id}`;
      try {
        if (sessionStorage.getItem(timeoutKey)) return;
        sessionStorage.setItem(timeoutKey, '1');
      } catch {}
      handlingTimeoutRef.current = true;
      fetch(`/api/rooms/${room.id}/turn-timeout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id }) })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.ok) {
            if (result.resolvedVoteInsteadOfTimeout) {
              addLog('Palpite já registrado. Confirmando resultado...');
              return;
            }
            if (result.revealPending && result.target) {
              await runVoteResult(result, activePlayer);
              return;
            }
            await showTimeoutExplanation(activePlayer, result);
            const timeoutLine = result.eliminated
              ? `${activePlayer.nickname} ficou sem votar e foi eliminado.`
              : result.missedTurns === 1
                ? `${activePlayer.nickname} recebeu a 1ª falta.`
                : `${activePlayer.nickname} não votou e perdeu 1 vida.`;
            showRoundRecap({
              tone: result.tiebreak ? 'tiebreak' : result.finished ? 'finished' : 'timeout',
              title: result.finished ? 'Partida encerrada' : result.tiebreak ? 'Desempate à vista' : 'Resumo da rodada',
              lines: result.finished ? [timeoutLine, `Campeão: ${result.winner || 'sem vencedor definido'}.`] : [timeoutLine],
              next: result.tiebreak ? 'Próximo: escolham novas cartas.' : undefined,
            });
          }
        })
        .finally(() => { handlingTimeoutRef.current = false; });
    }, 500);
    return () => clearInterval(interval);
  }, [activePlayer, addLog, isExplaining, isVoting, refreshLiveCards, room.current_turn_number, room.id, room.turn_expires_at, runVoteResult, showRoundRecap, showTimeoutExplanation]);

  useEffect(() => {
    if (!activePlayer?.is_bot || activePlayer.is_eliminated || isExplaining || isVoting) return;
    const turnKey = `${room.id}:${room.current_turn_number}:${activePlayer.id}`;
    if (botTurnRef.current === turnKey) return;
    botTurnRef.current = turnKey;
    const voteSeconds = Math.max(5, room.vote_time_seconds || 30);
    const maxDelay = Math.max(1400, voteSeconds * 1000 - 5500);
    const preferredDelay = isSuddenDeath ? (humanPlayers.length === 1 ? 2600 : 3200) + Math.floor(Math.random() * 900) : (humanPlayers.length === 1 ? 3300 : 4200) + Math.floor(Math.random() * 1200);
    const delay = Math.min(maxDelay, preferredDelay);
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/rooms/${room.id}/bot-turn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id }) }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (result?.ok && result.target) await runVoteResult(result, activePlayer);
      else if (result?.ok && result.skipped) addLog(`${activePlayer.nickname} passou a vez.`);
      else if (result?.reason !== 'bot-turn-already-handled') botTurnRef.current = '';
    }, delay);
    return () => clearTimeout(timer);
  }, [activePlayer, addLog, humanPlayers.length, isExplaining, isVoting, isSuddenDeath, room.current_turn_number, room.id, room.vote_time_seconds, runVoteResult]);

  const heading = isSpectator ? 'Você está eliminado' : isVoting ? 'Escolha realizada' : isRevealing ? 'Revelando resultado' : timeoutNotice ? 'Explicando consequência' : roundRecap ? 'Resumo da rodada' : isMyTurn ? 'Sua vez: escolha um personagem' : activePlayer?.is_bot ? `${activePlayer.nickname} está pensando...` : activePlayer ? `${activePlayer.nickname} está escolhendo...` : 'Aguardando rodada';
  const focusLabel = isExplaining || isVoting ? 'Resultado em andamento' : roundRecap ? 'Leia o resumo' : activePlayer?.is_bot ? 'Bot pensando...' : activePlayer ? 'Escolhendo...' : 'Aguardando';

  return (
    <div className={cn('flex h-[100dvh] overflow-hidden bg-[#f5f6ff] font-sans relative party-grid-bg', isSpectator && 'grayscale-[0.15]')}>
      <div className="flex-1 flex flex-col p-2.5 md:p-6 overflow-y-auto relative z-10">
        <header className={cn('mb-3 bg-white border-2 p-2.5 md:p-3 rounded-2xl shrink-0 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5', isSpectator ? 'border-slate-300 bg-slate-900 text-white' : isSuddenDeath ? 'border-rose-200 bg-rose-50' : 'border-indigo-100')}>
          <div className="min-w-0 text-left">
            <p className={cn('text-[13px] md:text-sm font-black truncate', isSpectator ? 'text-white' : 'text-indigo-950')}>{heading}</p>
            <div className={cn('mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider', isSpectator ? 'text-slate-300' : isSuddenDeath ? 'text-rose-600' : 'text-indigo-500')}>
              <span>{isSpectator ? 'Assistindo a partida' : `Rodada ${(room.current_turn_number || 0) + 1} • ${activePlayers.length} vivos`}</span>
              {isSpectator && <span className="rounded-full border border-slate-500 bg-slate-800 px-2 py-0.5 text-slate-200"><Eye className="mr-1 inline h-3 w-3" /> Espectador</span>}
              {isSuddenDeath && <span className="rounded-full border border-rose-300 bg-white px-2 py-0.5 text-rose-600">Morte súbita</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-2xl border text-[10px] md:text-xs font-black uppercase tracking-wider', isSpectator ? 'bg-slate-800 border-slate-600 text-slate-200' : isSuddenDeath ? 'bg-white border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-100 text-indigo-700')}>
              <Zap className="w-4 h-4" />{focusLabel}
            </div>
            {!isExplaining && !isVoting && <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border bg-indigo-50/50 border-indigo-100"><Clock className="w-4 h-4 text-indigo-500" /><span className={cn('text-xl md:text-2xl font-black font-mono', timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-indigo-950')}>{formattedTime || formatTimer(timeLeft)}</span></div>}
            <button onClick={leaveRoom} className="h-10 md:h-11 px-3 md:px-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-600 text-[10px] md:text-xs font-black uppercase flex items-center gap-1.5 hover:bg-rose-100 transition-all cursor-pointer">Sair <LogOut className="w-4 h-4" /></button>
          </div>
        </header>

        <div className={cn('mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 transition-opacity', isExplaining && 'opacity-35 pointer-events-none')}>
          {orderedPlayers.map((p: any) => {
            const isOut = p.is_eliminated || (p.lives || 0) <= 0;
            const isActive = activePlayer?.id === p.id;
            const statusText = isOut ? 'Fora' : isActive ? 'Jogando agora' : 'Aguardando';
            return <div key={p.id} className={cn('border-2 rounded-2xl px-2 py-1.5 md:px-3 md:py-2 flex items-center gap-2 shadow-sm min-w-0 transition-all relative overflow-hidden', isOut ? 'bg-slate-100/90 border-slate-300 opacity-70 grayscale' : isActive ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50') : 'bg-white/90 border-indigo-100')}>
              <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('w-7 h-7 md:w-8 md:h-8 rounded-xl border-2 shrink-0', isOut ? 'border-slate-400 bg-slate-200' : p.color?.border || 'border-slate-200')} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[11px] md:text-xs font-black truncate', isOut ? 'text-slate-500' : p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className={cn('text-[8px] font-black uppercase tracking-wider', isOut ? 'text-slate-500' : isActive ? p.color?.text || 'text-indigo-700' : 'text-slate-500')}>{statusText}</span>
                  {!isOut && <span className="flex items-center gap-0.5">{Array.from({ length: room.chars_per_player }).map((_, i) => i < p.lives ? <Heart key={i} className={cn('w-3 h-3 md:w-3.5 md:h-3.5 fill-current', p.color?.text || 'text-indigo-500')} /> : <Skull key={i} className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-300" />)}</span>}
                </div>
              </div>
            </div>;
          })}
        </div>

        <AnimatePresence>
          {roundRecap && !isExplaining && (
            <motion.section
              key={roundRecap.id}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={cn('relative mx-auto mb-4 w-full max-w-3xl overflow-hidden rounded-[2rem] border-2 p-5 md:p-6', recapToneClass(roundRecap.tone))}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/85">{recapBadge(roundRecap.tone)}</p>
                  <h2 className="mt-3 text-2xl md:text-3xl font-black font-display leading-tight">{roundRecap.title}</h2>
                  <div className="mt-3 grid gap-1.5 text-sm md:text-base font-extrabold text-white/90">
                    {roundRecap.lines.slice(0, 3).map((line) => <p key={line}>{line}</p>)}
                  </div>
                </div>
                <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-white/80">
                  <Zap className="h-8 w-8" />
                </div>
              </div>
              {roundRecap.next && <p className="relative mt-5 rounded-2xl border border-white/20 bg-white/14 px-4 py-3 text-sm font-black text-white">{roundRecap.next}</p>}
            </motion.section>
          )}
        </AnimatePresence>

        {isExplaining ? (
          <div className="flex-1 min-h-[260px]" />
        ) : (!isMyTurn && !isVoting) ? (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-3 md:p-4 mb-3 max-h-[68vh] overflow-y-auto shadow-sm">
            <h3 className="text-xs md:text-sm font-black text-indigo-950 uppercase mb-2 border-b-2 border-indigo-50 pb-1.5 flex items-center gap-2"><List className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Personagens vivos</h3>
            <ul className="divide-y divide-slate-100">{visibleDeckChars.map((c) => <li key={c.id} className="flex items-center gap-2 py-1.5 sm:py-2"><CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="w-9 h-11 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl object-cover bg-slate-200 shrink-0" /><span className="text-xs sm:text-sm font-bold text-indigo-950 truncate">{c.name}</span></li>)}</ul>
          </div>
        ) : (
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn('mb-4 md:mb-5 rounded-3xl border-4 p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4', me.color?.border || 'border-indigo-300', me.color?.lightBgc || 'bg-indigo-50')}>
              <AvatarFigure avatarUrl={me.avatar_url} label={me.nickname} state="vote" primaryColor={me.color?.hex} className={cn('w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 shrink-0', me.color?.border || 'border-indigo-400')} />
              <div className="text-left">
                <p className={cn('text-[10px] md:text-xs font-black uppercase tracking-widest', me.color?.text || 'text-indigo-600')}>Sua vez de palpitar</p>
                <h3 className="text-xl md:text-2xl font-black text-indigo-950 font-display">Escolha um card da mesa</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">A rodada só anda quando você vota ou o tempo acaba.</p>
              </div>
            </motion.div>
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-4 p-1 sm:p-2">
              {visibleDeckChars.map((c, i) => <motion.button type="button" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} key={c.id} onClick={() => processVote(c.id)} disabled={!isMyTurn || isVoting || voteProcessingRef.current} className="bg-white border-4 border-slate-100 hover:border-indigo-400 hover:shadow-xl rounded-3xl p-2 md:p-2.5 cursor-pointer transition-all flex flex-col group hover:-translate-y-1 relative disabled:opacity-60 disabled:cursor-wait">
                <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-slate-950 mb-2 shadow-inner"><CharacterImage name={c.name} imageUrl={c.image_url} avatarConfig={c.avatar_config} isOfficial={usesOfficialImages} alt="" className="object-cover w-full h-full" /></div>
                <p className="text-xs md:text-sm font-black text-center text-indigo-950 line-clamp-2 min-h-[2.25rem] md:min-h-[2.5rem] flex items-center justify-center w-full">{c.name}</p>
                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-all rounded-3xl flex items-center justify-center pointer-events-none"><Target className="w-10 h-10 text-indigo-500 opacity-0 group-hover:opacity-100 shadow-md bg-white p-2 rounded-full scale-90 group-hover:scale-100 transition-all" /></div>
              </motion.button>)}
            </motion.div>
          </div>
        )}

        <AnimatePresence>{suddenDeathIntro && !isExplaining && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[85] flex items-center justify-center bg-slate-950/86 backdrop-blur-md rounded-3xl p-4 text-white"><motion.div initial={{ scale: 0.82, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: -12 }} className="max-w-md rounded-3xl border-4 border-rose-500 bg-rose-950/80 p-8 text-center shadow-2xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-rose-200">Agora ficou sério</p><h2 className="text-5xl font-black font-display text-white drop-shadow-lg">MORTE SÚBITA</h2><p className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-100">Últimos jogadores restantes. Qualquer erro pode ser fatal.</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{timeoutNotice && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[82] flex items-center justify-center bg-slate-950/84 backdrop-blur-md rounded-3xl p-4 text-white"><motion.div initial={{ y: 20, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="max-w-lg w-full rounded-3xl border-4 border-amber-300 bg-white p-8 text-center text-indigo-950 shadow-2xl"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 border-4 border-amber-200"><AlertTriangle className="h-8 w-8" /></div><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 mb-2">Tempo esgotado</p><h2 className="text-3xl font-black font-display">{timeoutNotice.player?.nickname} não votou a tempo</h2><p className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">{timeoutNotice.eliminated ? 'Foi eliminado pela consequência do timeout.' : timeoutNotice.missedTurns === 1 ? 'Recebeu a 1ª falta.' : 'Perdeu 1 vida por não votar.'}</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{isRevealing && revelation && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/86 backdrop-blur-md rounded-3xl p-4 text-white"><AnimatePresence mode="wait" initial={false}>{revealStage === 'thinking' ? <motion.div key="thinking" initial={{ y: 18, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="text-center p-8 max-w-sm w-full"><div className="w-20 h-20 bg-indigo-500/20 border-2 border-indigo-300/40 text-indigo-200 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse"><Zap className="w-10 h-10" /></div><p className="text-xs font-black uppercase tracking-[0.35em] text-indigo-200 mb-3">Preparando palpite</p><h2 className="text-3xl font-black font-display">{revelation.voterName}</h2><p className="mt-2 text-sm font-bold text-white/70">vai revelar uma escolha...</p></motion.div> : revealStage === 'card' ? <motion.div key="card" initial={{ scale: 0.88, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 1.03, y: -14, opacity: 0 }} className="w-full max-w-sm text-center"><p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-amber-200">{revelation.voterName} votou em:</p><div className="mx-auto mb-5 w-60 max-w-[74vw] rounded-[1.6rem] border-4 border-white/20 bg-slate-900 p-2 shadow-2xl"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-slate-800"><CharacterImage name={revelation.charName} imageUrl={revelation.card?.image_url} avatarConfig={revelation.card?.avatar_config} isOfficial={usesOfficialImages} alt="" className="h-full w-full object-cover" /></div></div><h2 className="text-4xl md:text-5xl font-black font-display uppercase leading-none drop-shadow-lg">{revelation.charName}</h2></motion.div> : revealStage === 'owner' ? <motion.div key="owner" initial={{ y: 20, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="text-center p-7 bg-white text-indigo-950 border-4 border-indigo-200 shadow-2xl max-w-md w-full rounded-3xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-3">Dono da carta</p>{revelation.hitPlayers.length > 0 ? <><h2 className="text-2xl font-black font-display mb-4">{revelation.charName} estava com:</h2><div className="grid gap-2">{revelation.hitPlayers.map((p: any) => <div key={p.id} className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 font-black text-indigo-800">{p.nickname}</div>)}</div></> : <><h2 className="text-2xl font-black font-display mb-4">Ninguém tinha {revelation.charName}</h2><div className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-lg font-black text-slate-600">Palpite sem alvo</div></>}</motion.div> : revealStage === 'result' ? revelation.hitPlayers.length > 0 ? <motion.div key="hit" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="text-center p-8 bg-emerald-500 border-4 border-emerald-300 shadow-2xl max-w-md w-full rounded-3xl text-white"><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-100 mb-3">Resultado</p><h2 className="text-5xl font-black font-display drop-shadow-lg">ACERTOU!</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-emerald-50">O palpite atingiu {revelation.hitPlayers.map((p: any) => p.nickname).join(', ')}</p></motion.div> : <motion.div key="miss" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="text-center p-8 bg-slate-900 border-4 border-slate-600 shadow-2xl max-w-md w-full rounded-3xl text-white"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400 mb-3">Resultado</p><h2 className="text-5xl font-black font-display text-slate-200">ERROU</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-300">O palpite não encontrou ninguém</p></motion.div> : <motion.div key="eliminated" initial={{ y: 18, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="w-full max-w-2xl rounded-[2rem] border-4 border-slate-500 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-800 p-7 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300 mb-3">Fora da arena</p><h2 className="text-4xl md:text-5xl font-black font-display drop-shadow-lg">{revelation.eliminatedPlayers.length > 1 ? 'ELIMINADOS' : 'ELIMINADO'}</h2><div className={cn('mx-auto mt-6 grid gap-4', revelation.eliminatedPlayers.length === 1 ? 'max-w-xs grid-cols-1' : 'max-w-xl grid-cols-2 md:grid-cols-3')}>{revelation.eliminatedPlayers.map((p: any) => <div key={p.id} className="rounded-3xl border border-white/15 bg-white/8 p-4"><AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} state="defeat" primaryColor={p.color?.hex} className="mx-auto h-28 w-28 rounded-3xl border-4 border-slate-500 bg-slate-800 grayscale" imageClassName="grayscale opacity-60" /><p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-100">{p.nickname}</p></div>)}</div><p className="mx-auto mt-6 max-w-md text-sm font-bold text-slate-300">A mesa mudou. O próximo palpite vale ainda mais.</p></motion.div>}</AnimatePresence></motion.div>}</AnimatePresence>
      </div>
      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}
