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
  const roundNumber = (room.current_turn_number || 0) + 1;
  const maxRounds = Number(room.max_rounds || room.round_limit || room.max_turns || 0);
  const roundLabel = maxRounds > 0 ? `Rodada ${roundNumber}/${maxRounds}` : `Rodada ${roundNumber}`;
  const turnStatusText = isSpectator ? 'Assistindo' : isVoting ? 'Registrando voto' : isMyTurn ? 'Sua vez!' : activePlayer ? playerStatus(activePlayer, activePlayerId) : 'Aguardando';
  const actionHint = isMyTurn ? 'Toque em uma carta para votar' : isSpectator ? 'Acompanhe a rodada' : activePlayer ? `${activePlayer.nickname} joga agora` : 'Preparando mesa';

  return (
    <div className={cn('gameplay-screen flex h-[100dvh] overflow-hidden font-sans relative party-grid-bg', isSpectator && 'grayscale-[0.08]')}>
      <main className="gameplay-shell relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="gameplay-hud">
          <div className="gameplay-hud-brand">
            <span className="gameplay-logo-mark">Quem Sou Eu?</span>
            <span className="gameplay-round-pill">{roundLabel}</span>
            {isSuddenDeath && <span className="gameplay-sudden-pill">Morte súbita</span>}
          </div>

          <div className={cn('gameplay-timer', timeLeft <= 5 && !isExplaining && !isVoting && 'gameplay-timer--danger')} aria-label="Tempo restante">
            <Clock className="h-4 w-4" />
            <span>{!isExplaining && !isVoting ? formattedTime : '--:--'}</span>
          </div>

          <div className="gameplay-top-status">
            <div className={cn('gameplay-turn-pill', isMyTurn && 'gameplay-turn-pill--mine')}>
              {isSpectator ? <Eye className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              <span>{turnStatusText}</span>
            </div>
            <button onClick={leaveRoom} className="gameplay-icon-action gameplay-leave-button" aria-label="Sair da sala">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <section className={cn('gameplay-board', isExplaining && 'gameplay-muted')}>
          <div className="gameplay-board-title">
            <div>
              <p>Mesa da rodada</p>
              <h1>{headline}</h1>
            </div>
            <div className="gameplay-board-actions">
              <span>{visibleDeckChars.length} cartas vivas</span>
              <strong>{actionHint}</strong>
            </div>
          </div>

          <div className={cn('gameplay-card-grid', isMyTurn && 'gameplay-card-grid--selectable')}>
            {visibleDeckChars.map((card, index) => {
              const content = (
                <>
                  <div className="gameplay-card-portrait">
                    <CharacterImage name={card.name} imageUrl={card.image_url} avatarConfig={card.avatar_config} isOfficial={usesOfficialImages} showRarityFrame={usesOfficialImages} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="gameplay-card-name">{card.name}</p>
                </>
              );

              return isMyTurn ? (
                <motion.button key={card.id} type="button" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} onClick={() => processVote(card.id)} disabled={isVoting || voteProcessingRef.current} className="gameplay-card-item gameplay-card-item--button group" data-action="vote-card">
                  {content}
                  <span className="gameplay-card-target"><Target className="h-7 w-7" /> Escolher</span>
                </motion.button>
              ) : (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.02, 0.2) }} className="gameplay-card-item">
                  {content}
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className={cn('gameplay-player-scoreboard', isExplaining && 'gameplay-muted')} aria-label="Placar de jogadores">
          <div className="gameplay-scoreboard-head">
            <span>Jogadores</span>
            <strong>{activePlayers.length} vivos</strong>
          </div>
          <div className="gameplay-player-list">
            {orderedPlayers.map((player: any) => {
              const alive = isAlive(player);
              const active = player.id === activePlayerId;
              const status = playerStatus(player, activePlayerId);
              const lives = Math.max(0, player.lives || 0);
              return (
                <div key={player.id} className={cn('gameplay-player-chip', !alive && 'gameplay-player-chip--dead', active && alive && 'gameplay-player-chip--active')} style={alive ? { ['--player-color' as any]: player.color?.hex || '#7c3aed' } : undefined}>
                  {active && alive && <span className="gameplay-now-badge">AGORA</span>}
                  <AvatarFigure avatarUrl={player.avatar_url} label={player.nickname} primaryColor={player.color?.hex} className="gameplay-player-avatar" imageClassName={!alive ? 'grayscale opacity-60' : undefined} />
                  <div className="gameplay-player-info">
                    <p>{player.nickname}</p>
                    <span>{status}</span>
                    <div className="gameplay-life-row" aria-label={`${lives} vidas`}>
                      {Array.from({ length: room.chars_per_player }).map((_, i) => i < lives ? <Heart key={i} className="gameplay-life-icon gameplay-life-icon--alive" /> : <Skull key={i} className="gameplay-life-icon gameplay-life-icon--lost" />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <AnimatePresence>
          {recap && !isExplaining && (
            <motion.section key={recap.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('gameplay-recap', recapClasses(recap.tone))}>
              <div className="min-w-0">
                <span>{recap.label}</span>
                <p>{recap.main}</p>
                {recap.detail && <small>{recap.detail}</small>}
              </div>
              {recap.next && <strong>{recap.next}</strong>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>{suddenDeathIntro && !isExplaining && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[85] flex items-center justify-center rounded-[2rem] bg-slate-950/86 p-4 text-white backdrop-blur-md"><motion.div initial={{ scale: 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-rose-500 bg-rose-950/80 p-8 text-center shadow-2xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-rose-200">Agora ficou sério</p><h2 className="font-display text-5xl font-black">MORTE SÚBITA</h2><p className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-100">Últimos jogadores restantes.</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{timeoutNotice && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[82] flex items-center justify-center rounded-[2rem] bg-slate-950/84 p-4 text-white backdrop-blur-md"><motion.div initial={{ y: 20, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="max-w-lg rounded-3xl border-4 border-amber-300 bg-white p-8 text-center text-indigo-950 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Tempo esgotado</p><h2 className="mt-2 font-display text-3xl font-black">{timeoutNotice.player?.nickname} não votou a tempo</h2><p className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">{timeoutNotice.result?.eliminated ? 'Foi eliminado da arena.' : timeoutNotice.result?.missedTurns === 1 ? 'Recebeu a 1ª falta.' : 'Perdeu 1 vida.'}</p></motion.div></motion.div>}</AnimatePresence>

        <AnimatePresence>{revelation && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] flex items-center justify-center rounded-[2rem] bg-slate-950/88 p-4 text-white backdrop-blur-md"><AnimatePresence mode="wait" initial={false}>{revealStage === 'thinking' ? <motion.div key="thinking" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="text-center"><Zap className="mx-auto mb-5 h-16 w-16 rounded-full border border-indigo-300/30 bg-indigo-500/20 p-4 text-indigo-100" /><p className="text-xs font-black uppercase tracking-[0.35em] text-indigo-200">Preparando palpite</p><h2 className="mt-3 font-display text-4xl font-black">{revelation.voterName}</h2></motion.div> : revealStage === 'card' ? <motion.div key="card" initial={{ scale: 0.9, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 1.03, opacity: 0 }} className="w-full max-w-sm text-center"><p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-amber-200">{revelation.voterName} votou em</p><div className="mx-auto mb-5 w-60 max-w-[74vw] rounded-[1.6rem] border-4 border-white/20 bg-slate-900 p-2 shadow-2xl"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-slate-800"><CharacterImage name={revelation.charName} imageUrl={revelation.card?.image_url} avatarConfig={revelation.card?.avatar_config} isOfficial={usesOfficialImages} showRarityFrame={usesOfficialImages} alt="" className="h-full w-full object-cover" /></div></div><h2 className="font-display text-4xl font-black uppercase leading-none md:text-5xl">{revelation.charName}</h2></motion.div> : revealStage === 'owner' ? <motion.div key="owner" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="w-full max-w-md rounded-3xl border-4 border-indigo-200 bg-white p-7 text-center text-indigo-950 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Dono da carta</p><h2 className="mt-3 font-display text-2xl font-black">{revelation.hitPlayers.length > 0 ? `${revelation.charName} estava com:` : `Ninguém tinha ${revelation.charName}`}</h2>{revelation.hitPlayers.length > 0 && <div className="mt-4 grid gap-2">{revelation.hitPlayers.map((p: any) => <div key={p.id} className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 font-black text-indigo-800">{p.nickname}</div>)}</div>}</motion.div> : revealStage === 'result' ? revelation.hitPlayers.length > 0 ? <motion.div key="hit" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-emerald-300 bg-emerald-500 p-8 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-100">Resultado</p><h2 className="mt-3 font-display text-5xl font-black">ACERTOU!</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-emerald-50">{revelation.hitPlayers.map((p: any) => p.nickname).join(', ')} foi atingido.</p></motion.div> : <motion.div key="miss" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.04, opacity: 0 }} className="max-w-md rounded-3xl border-4 border-slate-600 bg-slate-900 p-8 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Resultado</p><h2 className="mt-3 font-display text-5xl font-black text-slate-200">ERROU</h2><p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-300">O palpite não encontrou ninguém.</p></motion.div> : <motion.div key="eliminated" initial={{ y: 18, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="w-full max-w-2xl rounded-[2rem] border-4 border-slate-500 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-800 p-7 text-center text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Fora da arena</p><h2 className="mt-2 font-display text-4xl font-black md:text-5xl">{revelation.eliminatedPlayers.length > 1 ? 'ELIMINADOS' : 'ELIMINADO'}</h2><div className={cn('mx-auto mt-6 grid gap-4', revelation.eliminatedPlayers.length === 1 ? 'max-w-xs grid-cols-1' : 'max-w-xl grid-cols-2 md:grid-cols-3')}>{revelation.eliminatedPlayers.map((p: any) => <div key={p.id} className="rounded-3xl border border-white/15 bg-white/8 p-4"><AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} state="defeat" primaryColor={p.color?.hex} className="mx-auto h-28 w-28 rounded-3xl border-4 border-slate-500 bg-slate-800 grayscale" imageClassName="grayscale opacity-60" /><p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-100">{p.nickname}</p></div>)}</div></motion.div>}</AnimatePresence></motion.div>}</AnimatePresence>
      </main>
      <ChatMenu roomId={room.id} me={me} players={players} collapsible={true} />
    </div>
  );
}
