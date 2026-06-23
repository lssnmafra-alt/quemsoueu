import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Eye, Heart, LogOut, Skull, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseGame } from '@/lib/supabase';
import { audioManager } from '@/lib/audioManager';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { useSyncedCountdown } from '@/hooks/useSyncedCountdown';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import CharacterImage from '@/components/CharacterImage';
import ChatMenu from './ChatMenu';

const ALLOWED_VOTE_SECONDS = [15, 30, 45] as const;
const DEFAULT_VOTE_SECONDS = 30;
const REVEAL_TIMING = { thinking: 900, card: 2600, owner: 2600, result: 2200, eliminated: 5200 };

type RevealStage = 'thinking' | 'card' | 'owner' | 'result' | 'eliminated';
type RecapTone = 'hit' | 'miss' | 'timeout' | 'tiebreak' | 'finished';
type Recap = { id: string; tone: RecapTone; label: string; main: string; detail?: string; next?: string };

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function clampVoteSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_VOTE_SECONDS;
  const rounded = Math.round(parsed);
  return (ALLOWED_VOTE_SECONDS as readonly number[]).includes(rounded) ? rounded : DEFAULT_VOTE_SECONDS;
}

function secondsLeft(expiresAt?: string | null) {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
}

function isAlive(player: any) {
  return Boolean(player) && !player.is_eliminated && (player.lives || 0) > 0;
}

function hitIds(value: any) {
  const ids = value?.hitPlayerIds || value?.hit_player_ids || value?.hits || [];
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

function eventIsVote(event: any) {
  return event?.event_type === 'vote_hit' || event?.event_type === 'vote_miss';
}

function revealKey(payload: any) {
  return `${payload?.turnNumber ?? ''}:${payload?.voterId || ''}:${payload?.charName || ''}:${hitIds(payload).join(',')}`;
}

function recapClasses(tone: RecapTone) {
  if (tone === 'hit') return 'border-emerald-200 bg-emerald-50/90 text-emerald-900';
  if (tone === 'miss') return 'border-slate-200 bg-white/90 text-slate-900';
  if (tone === 'timeout') return 'border-amber-200 bg-amber-50/90 text-amber-900';
  if (tone === 'tiebreak') return 'border-rose-200 bg-rose-50/90 text-rose-900';
  return 'border-indigo-200 bg-indigo-50/90 text-indigo-950';
}

function playerStatus(player: any, activePlayerId?: string) {
  if (!isAlive(player)) return 'eliminado';
  if (player.id === activePlayerId) return 'jogando agora';
  return 'aguardando';
}

function nextPlayerText(payload: any, progress: any, activePlayers: any[], currentTurnNumber: number) {
  if (progress?.finished) return undefined;
  if (progress?.tiebreak || progress?.needsPicking) return 'Próximo: desempate, escolham novas cartas.';

  const hitMap = new Map<string, any>((payload.hitPlayers || []).filter((p: any) => p?.id).map((p: any) => [p.id, p]));
  const future = activePlayers
    .map((player: any) => hitMap.has(player.id) ? { ...player, ...hitMap.get(player.id) } : player)
    .filter(isAlive)
    .sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));

  if (future.length === 0) return undefined;
  const voter = activePlayers.find((p: any) => p.id === payload.voterId) || activePlayers[currentTurnNumber % Math.max(1, activePlayers.length)];
  const voterOrder = voter?.play_order || 0;
  const next = future.find((p: any) => (p.play_order || 0) > voterOrder) || future[0];
  return next ? `Próximo: ${next.nickname}.` : undefined;
}

function buildRecap(payload: any, progress: any, activePlayers: any[], currentTurnNumber: number): Omit<Recap, 'id'> {
  const voterName = payload.voterName || 'Jogador';
  const charName = payload.charName || 'Personagem';
  const hitPlayers = payload.hitPlayers || [];

  if (progress?.finished) return { tone: 'finished', label: 'fim', main: 'Partida encerrada', detail: `Campeão: ${progress.winner || 'sem vencedor definido'}.` };
  if (progress?.tiebreak || progress?.needsPicking) return { tone: 'tiebreak', label: 'morte súbita', main: `${voterName} votou em ${charName}.`, detail: 'A partida entrou em desempate.', next: 'Escolham novas cartas.' };
  if (hitPlayers.length > 0) {
    const eliminated = hitPlayers.filter((p: any) => (p.lives || 0) <= 0 || p.is_eliminated);
    const detail = eliminated.length > 0
      ? `${eliminated.map((p: any) => p.nickname).join(', ')} foi eliminado da arena.`
      : `${hitPlayers.map((p: any) => p.nickname).join(', ')} perdeu 1 vida.`;
    return { tone: 'hit', label: 'acerto', main: `${voterName} acertou ${charName}.`, detail, next: nextPlayerText(payload, progress, activePlayers, currentTurnNumber) };
  }
  return { tone: 'miss', label: 'erro', main: `${voterName} votou em ${charName}.`, detail: 'Ninguém tinha essa carta.', next: nextPlayerText(payload, progress, activePlayers, currentTurnNumber) };
}

export default function RoomPlayingPremium({ room, players, me, leaveRoom }: any) {
  const safeVoteSeconds = clampVoteSeconds(room.vote_time_seconds);
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [liveCharIds, setLiveCharIds] = useState<Set<string>>(new Set());
  const [liveCardsLoaded, setLiveCardsLoaded] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [revealStage, setRevealStage] = useState<RevealStage>('thinking');
  const [revelation, setRevelation] = useState<any>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [timeoutNotice, setTimeoutNotice] = useState<any>(null);
  const [suddenDeathIntro, setSuddenDeathIntro] = useState(false);

  const playersRef = useRef(players);
  const voteProcessingRef = useRef(false);
  const timeoutRef = useRef(false);
  const botTurnRef = useRef('');
  const handledRevealKeysRef = useRef<Set<string>>(new Set());
  const handledEventIdsRef = useRef<Set<string>>(new Set());
  const suddenDeathShownRef = useRef(false);

  const orderedPlayers = useMemo(() => [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0)), [players]);
  const activePlayers = useMemo(() => orderedPlayers.filter(isAlive), [orderedPlayers]);
  const activePlayer = activePlayers.length > 0 ? activePlayers[(room.current_turn_number || 0) % activePlayers.length] : null;
  const activePlayerId = activePlayer?.id;
  const isSpectator = Boolean(me?.is_eliminated || (me?.lives || 0) <= 0);
  const isExplaining = Boolean(revelation || timeoutNotice);
  const isMyTurn = activePlayer?.id === me?.id && !isSpectator && !isExplaining && !isVoting && !voteProcessingRef.current;
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);
  const visibleDeckChars = liveCardsLoaded ? deckChars.filter((c) => liveCharIds.has(c.id)) : deckChars;
  const isSuddenDeath = activePlayers.length > 1 && activePlayers.every((p: any) => (p.lives || 0) <= 1);
  const humanPlayers = orderedPlayers.filter((p: any) => !p.is_bot);

  const { secondsLeft: timeLeft, formattedTime } = useSyncedCountdown({
    expiresAt: room.turn_expires_at,
    fallbackSeconds: safeVoteSeconds,
    maxSeconds: safeVoteSeconds,
    enabled: !isExplaining && !isVoting,
    phaseKey: `${room.id}:PLAYING:${room.current_turn_number || 0}`,
  });

  useEffect(() => { playersRef.current = players; }, [players]);

  const refreshLiveCards = useCallback(async () => {
    const { data } = await supabaseGame.from('player_cards').select('character_id,player_id').eq('room_id', room.id).eq('is_dead', false);
    const activeIds = new Set((playersRef.current || []).filter(isAlive).map((p: any) => p.id));
    const liveCards = (data || []).filter((card: any) => activeIds.has(card.player_id));
    setLiveCharIds(new Set(liveCards.map((card: any) => card.character_id)));
    setLiveCardsLoaded(true);
  }, [room.id]);

  useEffect(() => {
    const load = async () => {
      const query = supabaseGame.from('characters').select('*');
      const { data } = room.deck_id ? await query.eq('deck_id', room.deck_id) : await query.is('deck_id', null);
      setDeckChars(data || []);
      await refreshLiveCards();
    };
    void load();
  }, [room.deck_id, refreshLiveCards]);

  const finishTurn = useCallback(async (turnNumber: number, ids: string[]) => {
    const response = await fetch(`/api/rooms/${room.id}/finish-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnNumber, tiebreakPlayerIds: ids }),
    });
    return response.json().catch(() => ({}));
  }, [room.id]);

  const showRecap = useCallback((nextRecap: Omit<Recap, 'id'>) => {
    const id = crypto.randomUUID?.() || Math.random().toString();
    setRecap({ id, ...nextRecap });
    setTimeout(() => setRecap((current) => current?.id === id ? null : current), 8500);
  }, []);

  const showReveal = useCallback(async (payload: any) => {
    const card = deckChars.find((c) => c.id === payload.characterId || String(c.name || '').toLowerCase() === String(payload.charName || '').toLowerCase());
    const hitPlayers = payload.hitPlayers || [];
    const eliminatedPlayers = hitPlayers.filter((p: any) => (p.lives || 0) <= 0 || p.is_eliminated);

    setRecap(null);
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
      setRevealStage('eliminated');
      audioManager.playSFX(eliminatedPlayers.some((p: any) => p.id === me?.id) ? 'defeat' : 'player_eliminated');
      await sleep(REVEAL_TIMING.eliminated);
    }

    setRevelation(null);
    await refreshLiveCards();
  }, [deckChars, me?.id, refreshLiveCards]);

  const handleRevealPayload = useCallback(async (payload: any) => {
    const key = revealKey(payload);
    if (handledRevealKeysRef.current.has(key)) return;
    handledRevealKeysRef.current.add(key);
    setTimeout(() => handledRevealKeysRef.current.delete(key), 45000);

    await showReveal(payload);
    const progress = await finishTurn(payload.turnNumber ?? room.current_turn_number, hitIds(payload));
    showRecap(buildRecap(payload, progress, activePlayers, room.current_turn_number || 0));
  }, [activePlayers, finishTurn, room.current_turn_number, showRecap, showReveal]);

  const buildHitPlayers = useCallback(async (ids: string[], metadataHitPlayers: any[] = []) => {
    const map = new Map<string, any>();
    metadataHitPlayers.forEach((p: any) => { if (p?.id) map.set(p.id, p); });
    (playersRef.current || []).forEach((p: any) => { if (p?.id && !map.has(p.id)) map.set(p.id, p); });
    const missing = ids.filter((id) => !map.has(id));
    if (missing.length > 0) {
      const { data } = await supabaseGame.from('room_players').select('*').in('id', missing);
      (data || []).forEach((p: any) => map.set(p.id, p));
    }
    return ids.map((id) => map.get(id)).filter(Boolean);
  }, []);

  const processMatchEvent = useCallback(async (event: any) => {
    if (!eventIsVote(event)) return;
    if (Number(event.turn_number || 0) !== Number(room.current_turn_number || 0)) return;
    if (event.id && handledEventIdsRef.current.has(event.id)) return;

    const metadata = event.metadata || {};
    const ids = hitIds(metadata);
    const voter = (playersRef.current || []).find((p: any) => p.id === event.actor_player_id) || { id: event.actor_player_id, nickname: metadata.voter_name || 'Jogador' };
    const hitPlayers = await buildHitPlayers(ids, Array.isArray(metadata.hit_players) ? metadata.hit_players : []);
    const charName = metadata.target_name || deckChars.find((c) => c.id === event.character_id)?.name || 'Personagem';

    if (event.id) handledEventIdsRef.current.add(event.id);
    await handleRevealPayload({ turnNumber: event.turn_number, charName, characterId: event.character_id, hitPlayerIds: ids, hitPlayers, voterId: voter.id, voterName: voter.nickname });
  }, [buildHitPlayers, deckChars, handleRevealPayload, room.current_turn_number]);

  useEffect(() => {
    const ch = supabaseGame.channel(`match-events:${room.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events', filter: `room_id=eq.${room.id}` }, (payload) => {
      if (eventIsVote(payload.new)) void processMatchEvent(payload.new);
    }).subscribe();
    return () => { ch.unsubscribe(); };
  }, [processMatchEvent, room.id]);

  useEffect(() => {
    timeoutRef.current = false;
    voteProcessingRef.current = false;
    botTurnRef.current = '';
    setIsVoting(false);
    void refreshLiveCards();
    if (!isExplaining) audioManager.playSFX('turn');
  }, [isExplaining, refreshLiveCards, room.current_turn_number]);

  useEffect(() => {
    audioManager.setMusicRate(isSuddenDeath ? 1.18 : 1);
    if (!isSuddenDeath) {
      suddenDeathShownRef.current = false;
      setSuddenDeathIntro(false);
      return;
    }
    if (suddenDeathShownRef.current) return;
    suddenDeathShownRef.current = true;
    setSuddenDeathIntro(true);
    audioManager.playSFX('sudden_death');
    const timer = setTimeout(() => setSuddenDeathIntro(false), 3200);
    return () => clearTimeout(timer);
  }, [isSuddenDeath]);

  useEffect(() => () => audioManager.setMusicRate(1), []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isExplaining || isVoting) return;
      if (secondsLeft(room.turn_expires_at) > 0) return;
      if (!activePlayer || timeoutRef.current || voteProcessingRef.current) return;

      const key = `timeout-lock-${room.id}-${room.current_turn_number}-${activePlayer.id}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch {}

      timeoutRef.current = true;
      fetch(`/api/rooms/${room.id}/turn-timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id }),
      }).then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) return;
        if (result.revealPending && result.target) {
          await handleRevealPayload({ turnNumber: room.current_turn_number, charName: result.target, characterId: result.targetId, hitPlayerIds: hitIds(result), hitPlayers: result.hitPlayers || [], voterId: activePlayer.id, voterName: activePlayer.nickname });
          return;
        }
        setTimeoutNotice({ player: activePlayer, result });
        audioManager.playSFX(result.eliminated ? 'player_eliminated' : 'life_lost');
        await sleep(result.eliminated ? 5200 : 3600);
        setTimeoutNotice(null);
        await refreshLiveCards();
        showRecap({ tone: result.tiebreak ? 'tiebreak' : result.finished ? 'finished' : 'timeout', label: result.finished ? 'fim' : result.tiebreak ? 'morte súbita' : 'tempo', main: `${activePlayer.nickname} não votou a tempo.`, detail: result.eliminated ? `${activePlayer.nickname} foi eliminado da arena.` : result.missedTurns === 1 ? 'Recebeu a 1ª falta.' : 'Perdeu 1 vida.' });
      }).finally(() => { timeoutRef.current = false; });
    }, 500);
    return () => clearInterval(interval);
  }, [activePlayer, handleRevealPayload, isExplaining, isVoting, refreshLiveCards, room.current_turn_number, room.id, room.turn_expires_at, showRecap]);

  useEffect(() => {
    if (!activePlayer?.is_bot || activePlayer.is_eliminated || isExplaining || isVoting) return;
    const turnKey = `${room.id}:${room.current_turn_number}:${activePlayer.id}`;
    if (botTurnRef.current === turnKey) return;
    botTurnRef.current = turnKey;

    const voteSeconds = Math.max(5, room.vote_time_seconds || 30);
    const maxDelay = Math.max(1400, voteSeconds * 1000 - 5500);
    const preferredDelay = isSuddenDeath ? (humanPlayers.length === 1 ? 2600 : 3200) + Math.floor(Math.random() * 900) : (humanPlayers.length === 1 ? 3300 : 4200) + Math.floor(Math.random() * 1200);
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/rooms/${room.id}/bot-turn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id }) }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (result?.ok && result.target) {
        await handleRevealPayload({ turnNumber: room.current_turn_number, charName: result.target, characterId: result.targetId, hitPlayerIds: hitIds(result), hitPlayers: result.hitPlayers || [], voterId: activePlayer.id, voterName: activePlayer.nickname });
      } else if (result?.reason !== 'bot-turn-already-handled') {
        botTurnRef.current = '';
      }
    }, Math.min(maxDelay, preferredDelay));

    return () => clearTimeout(timer);
  }, [activePlayer, handleRevealPayload, humanPlayers.length, isExplaining, isVoting, isSuddenDeath, room.current_turn_number, room.id, room.vote_time_seconds]);

  const processVote = async (characterId: string) => {
    if (!activePlayer || !isMyTurn || voteProcessingRef.current || isVoting) return;
    voteProcessingRef.current = true;
    setIsVoting(true);
    setRecap(null);
    try {
      const response = await fetch(`/api/rooms/${room.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnNumber: room.current_turn_number, playerId: activePlayer.id, characterId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) return;
      await handleRevealPayload({ turnNumber: room.current_turn_number, charName: result.target, characterId: result.targetId, hitPlayerIds: hitIds(result), hitPlayers: result.hitPlayers || [], voterId: activePlayer.id, voterName: activePlayer.nickname });
    } finally {
      voteProcessingRef.current = false;
      setIsVoting(false);
    }
  };

  const headline = isSpectator ? 'Você está assistindo' : isMyTurn ? 'Sua vez de escolher uma carta' : activePlayer?.is_bot ? `${activePlayer.nickname} está pensando` : activePlayer ? `${activePlayer.nickname} está escolhendo` : 'Aguardando rodada';

  return (
    <div className={cn('flex h-[100dvh] overflow-hidden bg-[#f5f6ff] font-sans relative party-grid-bg', isSpectator && 'grayscale-[0.08]')}>
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto p-2.5 md:p-6">
        <header className="mb-3 shrink-0 rounded-[1.35rem] border-2 border-indigo-100 bg-white/92 p-3 shadow-sm backdrop-blur md:rounded-[1.75rem] md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">Quem Sou Eu?</span>
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Rodada {(room.current_turn_number || 0) + 1}</span>
                {isSuddenDeath && <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">Morte súbita</span>}
              </div>
              <h1 className="mt-2 truncate font-display text-xl font-black text-indigo-950 md:text-2xl">{headline}</h1>
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:justify-end">
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2 text-xs font-black uppercase tracking-wide text-indigo-700">
                <Zap className="h-4 w-4" /> {isMyTurn ? 'Sua vez' : activePlayer ? playerStatus(activePlayer, activePlayerId) : 'Aguardando'}
              </div>
              {!isExplaining && !isVoting && <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-2 font-mono text-2xl font-black text-indigo-950"><Clock className="h-4 w-4 text-indigo-500" /> {formattedTime}</div>}
              <button onClick={leaveRoom} className="col-span-2 rounded-2xl border-2 border-rose-100 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-rose-600 sm:col-span-1"><LogOut className="mr-1 inline h-4 w-4" /> Sair</button>
            </div>
          </div>
        </header>

        <section className={cn('relative mb-3 overflow-hidden rounded-[1.65rem] border-2 border-indigo-100 bg-white/88 p-3 shadow-xl backdrop-blur md:rounded-[2rem] md:p-5', isExplaining && 'opacity-35 pointer-events-none')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Mesa da rodada</p>
              <h2 className="font-display text-2xl font-black text-indigo-950 md:text-4xl">Cartas em jogo</h2>
            </div>
            <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">{visibleDeckChars.length} personagens vivos</div>
          </div>

          <div className={cn('grid gap-3 md:gap-4', isMyTurn ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6')}>
            {visibleDeckChars.map((card, index) => {
              const content = (
                <>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
                    <CharacterImage name={card.name} imageUrl={card.image_url} avatarConfig={card.avatar_config} isOfficial={usesOfficialImages} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 flex min-h-[2.2rem] items-center justify-center text-center text-xs font-black leading-tight text-indigo-950 md:text-sm">{card.name}</p>
                </>
              );

              return isMyTurn ? (
                <motion.button key={card.id} type="button" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} onClick={() => processVote(card.id)} disabled={isVoting || voteProcessingRef.current} className="group relative rounded-[1.35rem] border-2 border-indigo-100 bg-white p-2 shadow-lg transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl disabled:cursor-wait disabled:opacity-60">
                  {content}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[1.35rem] bg-indigo-500/0 transition group-hover:bg-indigo-500/10"><Target className="h-10 w-10 rounded-full bg-white p-2 text-indigo-500 opacity-0 shadow-lg transition group-hover:opacity-100" /></div>
                </motion.button>
              ) : (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.02, 0.2) }} className="rounded-[1.35rem] border-2 border-indigo-100 bg-white p-2 shadow-lg">
                  {content}
                </motion.div>
              );
            })}
          </div>
        </section>

        <AnimatePresence>
          {recap && !isExplaining && (
            <motion.section key={recap.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('mx-auto mb-3 w-full max-w-4xl rounded-3xl border-2 p-3 shadow-sm md:p-4', recapClasses(recap.tone))}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <span className="rounded-full border border-current/15 bg-white/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em]">{recap.label}</span>
                  <p className="mt-2 text-sm font-black leading-snug md:text-base">{recap.main}</p>
                  {recap.detail && <p className="mt-1 text-xs font-bold opacity-80 md:text-sm">{recap.detail}</p>}
                </div>
                {recap.next && <div className="rounded-2xl border border-current/15 bg-white/50 px-4 py-2 text-xs font-black md:text-sm">{recap.next}</div>}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className={cn('mt-auto rounded-[1.35rem] border-2 border-indigo-100 bg-white/85 p-2 shadow-sm backdrop-blur md:rounded-[1.75rem] md:p-3', isExplaining && 'opacity-35 pointer-events-none')}>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-indigo-500">Jogadores na arena</p>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{activePlayers.length} vivos</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {orderedPlayers.map((player: any) => {
              const alive = isAlive(player);
              const active = player.id === activePlayerId;
              const status = playerStatus(player, activePlayerId);
              const lives = Math.max(0, player.lives || 0);
              return (
                <div key={player.id} className={cn('relative overflow-hidden rounded-2xl border-2 bg-white p-2 shadow-sm', !alive ? 'border-slate-200 opacity-70 grayscale' : active ? cn('ring-2 ring-offset-1 ring-offset-white shadow-md', player.color?.border || 'border-indigo-400', player.color?.lightBgc || 'bg-indigo-50') : 'border-slate-100')}>
                  {active && alive && <span className={cn('absolute right-2 top-2 rounded-full border bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wide', player.color?.text || 'text-indigo-700', player.color?.border || 'border-indigo-200')}>AGORA</span>}
                  <div className="flex items-center gap-2 pr-10">
                    <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} primaryColor={player.color?.hex} className={cn('h-10 w-10 shrink-0 rounded-2xl border-2 bg-white', !alive ? 'border-slate-300' : player.color?.border || 'border-slate-200')} imageClassName={!alive ? 'grayscale opacity-60' : undefined} />
                    <div className="min-w-0">
                      <p className={cn('truncate text-xs font-black', !alive ? 'text-slate-500' : player.color?.text || 'text-indigo-950')}>{player.nickname}</p>
                      <p className={cn('mt-0.5 text-[8px] font-black uppercase tracking-wide', !alive ? 'text-slate-500' : active ? player.color?.text || 'text-indigo-700' : 'text-slate-400')}>{status}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5">
                    {Array.from({ length: room.chars_per_player }).map((_, i) => i < lives ? <Heart key={i} className={cn('h-3 w-3 fill-current', player.color?.text || 'text-indigo-500')} /> : <Skull key={i} className="h-3 w-3 text-slate-300" />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <AnimatePresence>{suddenDeathIntro && !isExplaining && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[85] flex items-center justify-center rounded-[2rem] bg-slate-950/86 p-4 text-white backdrop-blur-md"><motion.div initial={{ scale: 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-rose-500 bg-rose-950/80 p-8 text-center shadow-2xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-rose-200">Agora ficou sério</p><h2 className="font-display text-5xl font-black">MORTE SÚBITA</h2><p className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-100">Últimos jogadores restantes.</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{timeoutNotice && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[82] flex items-center justify-center rounded-[2rem] bg-slate-950/84 p-4 text-white backdrop-blur-md"><motion.div initial={{ y: 20, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="max-w-lg rounded-3xl border-4 border-amber-300 bg-white p-8 text-center text-indigo-950 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Tempo esgotado</p><h2 className="mt-2 font-display text-3xl font-black">{timeoutNotice.player?.nickname} não votou a tempo</h2><p className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">{timeoutNotice.result?.eliminated ? 'Foi eliminado da arena.' : timeoutNotice.result?.missedTurns === 1 ? 'Recebeu a 1ª falta.' : 'Perdeu 1 vida.'}</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{revelation && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] flex items-center justify-center rounded-[2rem] bg-slate-950/88 p-4 text-white backdrop-blur-md"><AnimatePresence mode="wait" initial={false}>{revealStage === 'thinking' ? <motion.div key="thinking" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="text-center"><Zap className="mx-auto mb-5 h-16 w-16 rounded-full border border-indigo-300/30 bg-indigo-500/20 p-4 text-indigo-100" /><p className="text-xs font-black uppercase tracking-[0.35em] text-indigo-200">Preparando palpite</p><h2 className="mt-3 font-display text-4xl font-black">{revelation.voterName}</h2></motion.div> : revealStage === 'card' ? <motion.div key="card" initial={{ scale: 0.9, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 1.03, opacity: 0 }} className="w-full max-w-sm text-center"><p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-amber-200">{revelation.voterName} votou em</p><div className="mx-auto mb-5 w-60 max-w-[74vw] rounded-[1.6rem] border-4 border-white/20 bg-slate-900 p-2 shadow-2xl"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-slate-800"><CharacterImage name={revelation.charName} imageUrl={revelation.card?.image_url} avatarConfig={revelation.card?.avatar_config} isOfficial={usesOfficialImages} alt="" className="h-full w-full object-cover" /></div></div><h2 className="font-display text-4xl font-black uppercase leading-none md:text-5xl">{revelation.charName}</h2></motion.div> : revealStage === 'owner' ? <motion.div key="owner" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="w-full max-w-md rounded-3xl border-4 border-indigo-200 bg-white p-7 text-center text-indigo-950 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Dono da carta</p><h2 className="mt-3 font-display text-2xl font-black">{revelation.hitPlayers.length > 0 ? `${revelation.charName} estava com:` : `Ninguém tinha ${revelation.charName}`}</h2>{revelation.hitPlayers.length > 0 && <div className="mt-4 grid gap-2">{revelation.hitPlayers.map((p: any) => <div key={p.id} className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 font-black text-indigo-800">{p.nickname}</div>)}</div>}</motion.div> : revealStage === 'result' ? revelation.hitPlayers.length > 0 ? <motion.div key="hit" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-emerald-300 bg-emerald-500 p-8 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-100">Resultado</p><h2 className="mt-3 font-display text-5xl font-black">ACERTOU!</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-emerald-50">{revelation.hitPlayers.map((p: any) => p.nickname).join(', ')} foi atingido.</p></motion.div> : <motion.div key="miss" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-slate-600 bg-slate-900 p-8 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Resultado</p><h2 className="mt-3 font-display text-5xl font-black text-slate-200">ERROU</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-300">O palpite não encontrou ninguém.</p></motion.div> : <motion.div key="eliminated" initial={{ y: 18, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="w-full max-w-2xl rounded-[2rem] border-4 border-slate-500 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-800 p-7 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Fora da arena</p><h2 className="mt-2 font-display text-4xl font-black md:text-5xl">{revelation.eliminatedPlayers.length > 1 ? 'ELIMINADOS' : 'ELIMINADO'}</h2><div className={cn('mx-auto mt-6 grid gap-4', revelation.eliminatedPlayers.length === 1 ? 'max-w-xs grid-cols-1' : 'max-w-xl grid-cols-2 md:grid-cols-3')}>{revelation.eliminatedPlayers.map((p: any) => <div key={p.id} className="rounded-3xl border border-white/15 bg-white/8 p-4"><AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} state="defeat" primaryColor={p.color?.hex} className="mx-auto h-28 w-28 rounded-3xl border-4 border-slate-500 bg-slate-800 grayscale" imageClassName="grayscale opacity-60" /><p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-100">{p.nickname}</p></div>)}</div></motion.div>}</AnimatePresence></motion.div>}</AnimatePresence>
      </main>
      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}
