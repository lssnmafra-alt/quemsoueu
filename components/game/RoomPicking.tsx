import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncedCountdown, formatCountdown } from '@/hooks/useSyncedCountdown';
import { motion } from 'motion/react';
import { Check, Layers, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import CharacterImage from '@/components/CharacterImage';
import { isOfficialDeckId } from '@/lib/officialDecks';

const ALLOWED_PICK_SECONDS = [15, 30, 45] as const;
const DEFAULT_PICK_SECONDS = 30;
const TIMER_REPAIR_GRACE_SECONDS = 2;

function clampPickSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PICK_SECONDS;
  const rounded = Math.round(parsed);
  return (ALLOWED_PICK_SECONDS as readonly number[]).includes(rounded) ? rounded : DEFAULT_PICK_SECONDS;
}

export default function RoomPicking({ room, players, me, isAdmin }: any) {
  const safePickSeconds = clampPickSeconds(room.pick_time_seconds);
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [currentCards, setCurrentCards] = useState<any[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [pickingNotice, setPickingNotice] = useState('');
  const [isDeckLoading, setIsDeckLoading] = useState(true);
  const [deckLoadError, setDeckLoadError] = useState('');
  const finalizingRef = useRef(false);
  const timerRepairRef = useRef('');

  const baseActivePlayers = useMemo(() => players.filter((p: any) => !p.is_eliminated), [players]);
  const baseIsTiebreak = currentCards.length > 0 && baseActivePlayers.length > 1 && baseActivePlayers.every((p: any) => (p.lives || 0) <= 1);
  const activePlayers = useMemo(() => (
    baseIsTiebreak
      ? players.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0)
      : baseActivePlayers
  ), [baseActivePlayers, baseIsTiebreak, players]);
  const isTiebreak = baseIsTiebreak;
  const pickCount = isTiebreak ? 1 : room.chars_per_player;
  const isMeEligible = Boolean(me?.id) && !me.is_eliminated && activePlayers.some((p: any) => p.id === me.id);
  const liveCards = useMemo(() => currentCards.filter((card: any) => !card.is_dead), [currentCards]);
  const liveCardsByPlayer = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const card of liveCards) {
      const list = map.get(card.player_id) || [];
      list.push(card);
      map.set(card.player_id, list);
    }
    return map;
  }, [liveCards]);
  const realActivePlayers = activePlayers.filter((p: any) => !p.is_bot);
  const pendingPlayers = realActivePlayers.filter((p: any) => (liveCardsByPlayer.get(p.id)?.length || 0) < pickCount);
  const myLiveCards = me?.id ? liveCardsByPlayer.get(me.id) || [] : [];
  const pendingCount = pendingPlayers.length;
  const allRealPlayersReady = realActivePlayers.length > 0 && pendingCount === 0;
  const pendingText = pendingCount > 0 ? ` Faltam ${pendingCount} jogador${pendingCount === 1 ? '' : 'es'}.` : '';
  const mainStatus = pickingNotice || (allRealPlayersReady
    ? 'Todos escolheram. Preparando partida...'
    : confirmed
      ? `Escolha confirmada. Aguardando os demais jogadores.${pendingText}`
      : `Escolha ${pickCount} ${pickCount === 1 ? 'personagem' : 'personagens'}.${pendingText}`);

  const { secondsLeft: timeLeft, formattedTime } = useSyncedCountdown({
    expiresAt: room.turn_expires_at,
    fallbackSeconds: safePickSeconds,
    maxSeconds: safePickSeconds,
    enabled: !allRealPlayersReady && !finalizingRef.current,
    phaseKey: `${room.id}:PICKING:${isTiebreak ? 'tiebreak' : 'initial'}`,
  });

  const loadPickingState = useCallback(async () => {
    try {
      setDeckLoadError('');
      const query = supabaseGame.from('characters').select('*');
      const [{ data: chars, error: charsError }, { data: cards }] = await Promise.all([
        room.deck_id ? query.eq('deck_id', room.deck_id) : query.is('deck_id', null),
        supabaseGame.from('player_cards').select('*').eq('room_id', room.id),
      ]);

      if (charsError) {
        setDeckLoadError(charsError.message || 'Nao foi possivel carregar personagens.');
      }

      setDeckChars(chars || []);
      setCurrentCards(cards || []);
    } catch (error: any) {
      setDeckLoadError(error?.message || 'Nao foi possivel carregar personagens.');
    } finally {
      setIsDeckLoading(false);
    }
  }, [room.deck_id, room.id]);

  useEffect(() => {
    setIsDeckLoading(true);
    loadPickingState();
  }, [loadPickingState]);

  useEffect(() => {
    if (!isMeEligible) {
      setConfirmed(true);
      setSelectedChars([]);
      return;
    }

    if (myLiveCards.length >= pickCount) {
      setConfirmed(true);
      setSelectedChars(myLiveCards.slice(0, pickCount).map((card: any) => card.character_id));
    } else {
      setConfirmed(false);
      setSelectedChars([]);
    }
  }, [isMeEligible, myLiveCards.length, pickCount, room.id]);

  const finalizePicking = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setPickingNotice('Tempo encerrado. Sorteando automaticamente e preparando a partida...');

    try {
      const response = await fetch(`/api/rooms/${room.id}/finalize-picking`, {
        method: 'POST',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        finalizingRef.current = false;
        if (result.error) {
          console.warn(result.error);
          setPickingNotice(result.error);
        }
      } else if (result.skipped) {
        finalizingRef.current = false;
        if (result.duplicatePick) {
          setPickingNotice(result.message || 'Alguns jogadores escolheram o mesmo personagem. Escolham novamente para desempatar.');
        }
        await loadPickingState();
      }
    } catch {
      finalizingRef.current = false;
      setPickingNotice('Falha ao finalizar. Tentando novamente...');
    }
  }, [loadPickingState, room.id]);

  const finalizeIfReady = useCallback(async () => {
    if (finalizingRef.current) return;
    const activeRealPlayers = realActivePlayers;
    if (activeRealPlayers.length === 0) return;

    const { data: cards } = await supabaseGame
      .from('player_cards')
      .select('player_id,is_dead')
      .eq('room_id', room.id)
      .eq('is_dead', false);

    const activePlayerIds = new Set(activePlayers.map((p: any) => p.id));
    const liveCountByPlayer = new Map<string, number>();
    for (const card of cards || []) {
      if (!activePlayerIds.has(card.player_id)) continue;
      liveCountByPlayer.set(card.player_id, (liveCountByPlayer.get(card.player_id) || 0) + 1);
    }

    const allReady = activeRealPlayers.every((p: any) => (liveCountByPlayer.get(p.id) || 0) >= pickCount);
    if (allReady) {
      await finalizePicking();
    } else {
      await loadPickingState();
    }
  }, [activePlayers, finalizePicking, loadPickingState, pickCount, realActivePlayers, room.id]);

  useEffect(() => {
    const timer = setInterval(finalizeIfReady, 800);
    return () => clearInterval(timer);
  }, [finalizeIfReady]);

  useEffect(() => {
    if (allRealPlayersReady || finalizingRef.current) return;

    const expiresMs = new Date(room.turn_expires_at || '').getTime();
    const rawSeconds = Number.isFinite(expiresMs) ? Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000)) : safePickSeconds;

    if (rawSeconds > safePickSeconds + TIMER_REPAIR_GRACE_SECONDS && timerRepairRef.current !== room.turn_expires_at) {
      timerRepairRef.current = room.turn_expires_at || 'missing';
      fetch(`/api/rooms/${room.id}/tick`, { method: 'POST' }).catch(() => {});
    }

    if (rawSeconds <= 0 || timeLeft <= 0) {
      finalizePicking();
    }
  }, [allRealPlayersReady, room.turn_expires_at, room.id, safePickSeconds, finalizePicking, timeLeft]);

  const toggleChar = (id: string) => {
    if (confirmed || !isMeEligible) return;
    setPickingNotice('');
    if (selectedChars.includes(id)) {
      setSelectedChars(selectedChars.filter((c) => c !== id));
    } else if (selectedChars.length < pickCount) {
      setSelectedChars([...selectedChars, id]);
    }
  };

  const confirmSelection = async () => {
    if (!isMeEligible || selectedChars.length !== pickCount) return;
    setPickingNotice('');
    setConfirmed(true);

    const myCurrentLiveCards = liveCards.filter((card: any) => card.player_id === me.id);
    if (myCurrentLiveCards.length > 0) {
      await supabaseGame
        .from('player_cards')
        .update({ is_dead: true })
        .in('id', myCurrentLiveCards.map((card: any) => card.id));
    }

    const inserts = selectedChars.map((cid) => ({
      room_id: room.id,
      player_id: me.id,
      character_id: cid,
      is_dead: false,
    }));

    await supabaseGame.from('player_cards').insert(inserts);
    await supabaseGame
      .from('room_players')
      .update({ lives: pickCount, is_eliminated: false, missed_turns: 0 })
      .eq('id', me.id);

    await loadPickingState();
  };

  const totalTime = safePickSeconds;
  const progressPercent = allRealPlayersReady ? 0 : Math.max(0, (timeLeft / totalTime) * 100);
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);
  const showEmptyDeckState = !isDeckLoading && deckChars.length === 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-3 md:p-8 bg-[#f5f6ff] font-sans text-indigo-950 relative overflow-hidden party-grid-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[1200px] w-full bg-white border-4 border-indigo-150 p-4 md:p-10 rounded-3xl relative z-10 text-center shadow-xl flex flex-col"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-50 overflow-hidden rounded-t-3xl">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-300 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mb-5 md:mb-8 mt-4 relative">
          <h2 className="text-4xl md:text-5xl font-black mb-2 text-indigo-950 font-display flex items-center justify-center gap-2">
            <Layers className="h-9 w-9 text-indigo-500" /> {isTiebreak ? 'Desempate!' : 'Monte seu Baralho'}
          </h2>
          <p className={cn('text-sm font-black uppercase tracking-wider', pickingNotice ? 'text-amber-600' : allRealPlayersReady ? 'text-emerald-600' : confirmed ? 'text-emerald-700' : 'text-indigo-600')}>
            {mainStatus}
          </p>
          {!allRealPlayersReady && !confirmed && (
            <p className="mt-2 text-xs text-indigo-500 font-bold uppercase tracking-wider">
              Tempo restante: <span className={cn('font-bold text-rose-500 font-mono', timeLeft <= 5 && 'animate-pulse')}>{formattedTime || formatCountdown(timeLeft)}</span>
            </p>
          )}
        </div>

        {!confirmed && isMeEligible && (
          <div className="mb-4 flex items-center justify-center">
            <p className="text-sm bg-indigo-50 border-2 border-indigo-100 px-4 py-3 text-indigo-950 font-bold tracking-wide inline-flex items-center gap-2 rounded-2xl">
              <Lightbulb className="h-4 w-4 text-indigo-500 shrink-0" /> Toque nos cards e confirme. Se nao escolher, o jogo sorteia automaticamente.
            </p>
          </div>
        )}

        {!isMeEligible ? (
          <p className="mb-6 text-sm bg-slate-50 text-slate-500 border-2 border-slate-200 px-6 py-3 inline-block font-extrabold mx-auto rounded-2xl">
            Voce esta fora desta escolha. Aguarde a partida continuar.
          </p>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-6 mb-8 overflow-y-auto max-h-[58vh] p-2 sm:p-4">
          {isDeckLoading && deckChars.length === 0 && (
            <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-indigo-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-black uppercase tracking-wider">Carregando personagens do deck...</p>
            </div>
          )}

          {showEmptyDeckState && (
            <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-8 text-amber-700">
              <p className="max-w-lg text-sm font-black uppercase tracking-wider">
                Os cards ainda nao carregaram nesta tela. Aguarde o timer: o servidor sorteia automaticamente e segue a partida.
              </p>
              {deckLoadError && <p className="max-w-lg text-xs font-bold text-amber-600">{deckLoadError}</p>}
              <Button type="button" onClick={loadPickingState} className="rounded-2xl border-2 border-amber-200 bg-white px-5 py-3 text-xs font-black uppercase text-amber-700 hover:bg-amber-50">
                <RefreshCw className="mr-2 h-4 w-4" /> Recarregar cards
              </Button>
            </div>
          )}

          {deckChars.map((c, i) => {
            const isSelected = selectedChars.includes(c.id);
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: confirmed || !isMeEligible ? 1 : 1.04, translateY: confirmed || !isMeEligible ? 0 : -4 }}
                transition={{ delay: i * 0.05 }}
                key={c.id}
                onClick={() => toggleChar(c.id)}
                className={cn(
                  'aspect-[2/3] transition-all duration-300 relative shadow-md border-4 rounded-2xl',
                  usesOfficialImages ? 'bg-transparent overflow-visible p-1' : 'bg-slate-50 flex flex-col overflow-hidden',
                  confirmed || !isMeEligible ? 'cursor-default' : 'cursor-pointer',
                  isSelected ? 'border-indigo-500 ring-4 ring-indigo-200 scale-[1.02]' : 'border-slate-100 hover:border-indigo-300',
                  (confirmed || !isMeEligible) && !isSelected && 'opacity-50 grayscale bg-slate-100'
                )}
              >
                <CharacterImage
                  name={c.name}
                  imageUrl={c.image_url}
                  avatarConfig={c.avatar_config}
                  isOfficial={usesOfficialImages}
                  alt=""
                  className={usesOfficialImages ? 'h-full w-full' : 'flex-1 object-cover w-full h-full bg-slate-100'}
                />

                {!usesOfficialImages && (
                  <div className="p-3 bg-white w-full border-t-2 border-slate-100">
                    <p className="text-sm font-black text-center text-indigo-950 truncate">{c.name}</p>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-md z-30 animate-bounce">
                    <Check className="w-4 h-4 stroke-[3px]" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={confirmSelection}
            disabled={selectedChars.length !== pickCount || confirmed || !isMeEligible}
            className={cn(
              'w-full md:w-96 h-14 text-sm font-black tracking-wider uppercase transition-all rounded-2xl cursor-pointer',
              selectedChars.length === pickCount && !confirmed && isMeEligible
                ? 'btn-squishy-green text-white'
                : 'bg-indigo-50 text-indigo-400/80 border-2 border-indigo-100 opacity-60'
            )}
          >
            {confirmed ? 'Selecao Confirmada' : (selectedChars.length === pickCount ? 'Confirmar Escolha' : `Faltam ${pickCount - selectedChars.length} ${pickCount - selectedChars.length === 1 ? 'personagem' : 'personagens'}`)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
