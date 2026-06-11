import { useState, useEffect, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { differenceInSeconds } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audioManager';
import AvatarFigure from '@/components/avatar/AvatarFigure';

export default function RoomStarting({ room, players }: any) {
  const [timeLeft, setTimeLeft] = useState(8);
  const advancingRef = useRef(false);

  const orderedPlayers = [...players].sort((a, b) => (a.play_order || 0) - (b.play_order || 0));

  useEffect(() => {
    audioManager.playSFX('select');
  }, [timeLeft]);

  useEffect(() => {
    const i = setInterval(async () => {
      const diff = differenceInSeconds(new Date(room.turn_expires_at), new Date());
      if (diff <= 0) {
        setTimeLeft(0);
        if (advancingRef.current) return;
        advancingRef.current = true;
        await supabaseGame.from('rooms').update({
          status: 'PLAYING',
          turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString()
        }).eq('id', room.id);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(i);
  }, [room.turn_expires_at, room.vote_time_seconds, room.id]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#f5f6ff] font-sans text-indigo-950 party-grid-bg relative overflow-hidden">
      <div className="max-w-2xl w-full text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-black text-indigo-950 mb-2 font-display">
          A Partida vai Comecar!
        </h1>
        <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider mb-8 animate-pulse">
          Definindo a ordem dos turnos... ({timeLeft}s)
        </p>

        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          {orderedPlayers.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.4, type: 'spring' }}
              className={cn("bg-white border-4 p-4 rounded-2xl flex items-center justify-between shadow-md relative overflow-hidden", p.color?.border || 'border-indigo-100')}
            >
              <div className={cn("absolute top-0 left-0 w-2 h-full", p.color?.bg || 'bg-slate-400')} />
              <div className="flex items-center gap-4 pl-2">
                <span className="text-xl font-black text-amber-500 bg-amber-50 rounded-full w-8 h-8 flex items-center justify-center border border-amber-200">
                  #{index + 1}
                </span>
                <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} className={cn("w-10 h-10 border-2 rounded-xl shadow-sm", p.color?.border || 'border-indigo-200', p.color?.lightBgc || 'bg-slate-50')} />
                <span className={cn("text-base font-bold", p.color?.text || 'text-indigo-950')}>{p.nickname}</span>
              </div>

              <div className={cn("text-[11px] font-bold uppercase py-1.5 px-3 border rounded-full", p.color?.text || 'text-indigo-600', p.color?.border || 'border-indigo-100', p.color?.lightBgc || 'bg-indigo-50')}>
                {index === 0 ? 'Comeca Palpitando' : 'Proximo da Vez'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
