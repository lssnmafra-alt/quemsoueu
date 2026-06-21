import { useState, useEffect, useRef, useMemo } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audioManager';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarAnimationShowcase from '@/components/avatar/AvatarAnimationShowcase';

function openingDurationSeconds(playerCount: number) {
  return Math.max(8, Math.min(22, 2 + Math.max(1, playerCount) * 2));
}

export default function RoomStarting({ room, players }: any) {
  const totalSecondsRef = useRef(openingDurationSeconds(players.length || 1));
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((new Date(room.turn_expires_at).getTime() - Date.now()) / 1000)));
  const advancingRef = useRef(false);

  const activePlayers = players.filter((p: any) => !p.is_eliminated && (p.lives || 0) > 0);
  const visiblePlayers = activePlayers.length > 0 ? activePlayers : players.filter((p: any) => !p.is_eliminated);
  const orderedPlayers = [...visiblePlayers].sort((a, b) => (a.play_order || 0) - (b.play_order || 0));
  const totalSeconds = Math.max(totalSecondsRef.current, openingDurationSeconds(orderedPlayers.length || 1));
  const elapsedSeconds = Math.max(0, totalSeconds - timeLeft);
  const focusIndex = elapsedSeconds < 2 ? -1 : Math.min(orderedPlayers.length - 1, Math.floor((elapsedSeconds - 2) / 2));
  const focusedPlayer = focusIndex >= 0 ? orderedPlayers[focusIndex] : null;
  const countdownNumber = timeLeft > 0 && timeLeft <= 3 ? timeLeft : null;

  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0) {
      audioManager.playSFX('countdown');
    }
  }, [timeLeft]);

  useEffect(() => {
    const tick = async () => {
      const diff = Math.max(0, Math.ceil((new Date(room.turn_expires_at).getTime() - Date.now()) / 1000));
      if (diff <= 0) {
        setTimeLeft(0);
        if (advancingRef.current) return;
        advancingRef.current = true;
        await supabaseGame.from('rooms').update({
          status: 'PLAYING',
          turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString()
        }).eq('id', room.id).eq('status', 'STARTING');
      } else {
        setTimeLeft(diff);
      }
    };

    void tick();
    const i = setInterval(tick, 250);

    return () => clearInterval(i);
  }, [room.turn_expires_at, room.vote_time_seconds, room.id]);

  const gridColumns = useMemo(() => {
    if (orderedPlayers.length <= 4) return 'md:grid-cols-2';
    return 'md:grid-cols-3';
  }, [orderedPlayers.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 bg-[#f5f6ff] font-sans text-indigo-950 party-grid-bg relative overflow-hidden">
      <div className="max-w-6xl w-full text-center relative z-10">
        <AnimatePresence mode="wait">
          {countdownNumber ? (
            <motion.div
              key={countdownNumber}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.35, y: -10 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-indigo-200 bg-white text-5xl font-black text-indigo-600 shadow-xl font-display"
            >
              {countdownNumber}
            </motion.div>
          ) : (
            <motion.div
              key="preparing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mx-auto mb-4 inline-flex rounded-full border-2 border-indigo-100 bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-indigo-500 shadow-sm"
            >
              {focusedPlayer ? `Apresentando ${focusedPlayer.nickname}` : 'Todos os jogadores na mesa'}
            </motion.div>
          )}
        </AnimatePresence>

        <h1 className="text-3xl md:text-5xl font-black text-indigo-950 mb-2 font-display">
          A Partida vai Comecar!
        </h1>
        <p className="text-xs md:text-sm text-indigo-600 font-bold uppercase tracking-wider mb-5 animate-pulse">
          Apresentacao dos jogadores... ({timeLeft}s)
        </p>

        {focusedPlayer && (
          <div className="mx-auto mb-5 max-w-xl md:hidden">
            <AvatarAnimationShowcase
              player={focusedPlayer}
              eventType="intro"
              title="Entrada do personagem"
              subtitle={`${focusedPlayer.nickname} em destaque`}
              compact
              className="text-left"
            />
          </div>
        )}

        <div className={cn('grid grid-cols-1 gap-4 md:gap-5', gridColumns)}>
          {orderedPlayers.map((p, index) => {
            const isFocused = index === focusIndex;
            const waitingFocus = focusIndex < 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: isFocused || waitingFocus ? 1 : 0.72, scale: isFocused ? 1.04 : 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.08, 0.4), type: 'spring', stiffness: 260, damping: 24 }}
                className={cn(
                  'relative overflow-hidden rounded-3xl border-4 bg-white p-3 text-left shadow-xl transition-all',
                  isFocused ? cn(p.color?.border || 'border-indigo-400', 'ring-4 ring-amber-200') : 'border-indigo-100',
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-2', p.color?.bg || 'bg-indigo-400')} />

                <div className="mb-3 flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 text-lg font-black text-amber-500">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('truncate text-lg font-black font-display', p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {isFocused ? 'Em movimento' : index === 0 ? 'Comeca palpitando' : 'Aguardando destaque'}
                      </p>
                    </div>
                  </div>
                  <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('h-14 w-14 shrink-0 rounded-2xl border-2 shadow-sm', p.color?.border || 'border-indigo-200', p.color?.lightBgc || 'bg-slate-50')} />
                </div>

                <div className="hidden md:block">
                  {isFocused ? (
                    <AvatarAnimationShowcase
                      player={p}
                      eventType="intro"
                      title="Entrada do personagem"
                      subtitle={`${p.nickname} em destaque`}
                      compact
                      className="border-2 shadow-none"
                    />
                  ) : (
                    <div className="flex h-[260px] items-center justify-center rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/40">
                      <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className="h-32 w-32 rounded-[2rem] border-4 border-white bg-white shadow-lg" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
