import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInSeconds } from 'date-fns';
import { motion } from 'motion/react';
import { Check, Layers, Lightbulb } from 'lucide-react';
import CharacterImage from '@/components/CharacterImage';
import { isOfficialDeckId } from '@/lib/officialDecks';

export default function RoomPicking({ room, players, me, isAdmin }: any) {
  const [deckChars, setDeckChars] = useState<any[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(room.pick_time_seconds || 30);
  const [confirmed, setConfirmed] = useState(false);
  const finalizingRef = useRef(false);

  useEffect(() => {
    const fn = async () => {
      const query = supabaseGame.from('characters').select('*');
      const { data } = room.deck_id
        ? await query.eq('deck_id', room.deck_id)
        : await query.is('deck_id', null);
      setDeckChars(data || []);
    };
    fn();
  }, [room.deck_id]);

  const finalizePicking = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    try {
      const response = await fetch(`/api/rooms/${room.id}/finalize-picking`, {
        method: 'POST',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        finalizingRef.current = false;
        if (result.error) console.warn(result.error);
      } else if (result.skipped) {
        finalizingRef.current = false;
      }
    } catch {
      finalizingRef.current = false;
    }
  }, [room.id]);

  const finalizeIfReady = useCallback(async () => {
    if (finalizingRef.current) return;
    const realPlayers = players.filter((p: any) => !p.is_bot);
    if (realPlayers.length === 0) return;

    const { data: currentCards } = await supabaseGame
      .from('player_cards')
      .select('player_id')
      .eq('room_id', room.id);

    const playersWithCards = new Set((currentCards || []).map((card: any) => card.player_id));
    const allRealPlayersReady = realPlayers.every((p: any) => playersWithCards.has(p.id));
    if (allRealPlayersReady) {
      await finalizePicking();
    }
  }, [finalizePicking, players, room.id]);

  useEffect(() => {
    const timer = setInterval(finalizeIfReady, 2000);
    return () => clearInterval(timer);
  }, [finalizeIfReady]);

  useEffect(() => {
    const i = setInterval(() => {
      const diff = differenceInSeconds(new Date(room.turn_expires_at), new Date());
      if (diff <= 0) {
        setTimeLeft(0);
        finalizePicking();
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(i);
  }, [room.turn_expires_at, finalizePicking]);

  const toggleChar = (id: string) => {
    if (confirmed) return;
    if (selectedChars.includes(id)) {
      setSelectedChars(selectedChars.filter((c) => c !== id));
    } else if (selectedChars.length < room.chars_per_player) {
      setSelectedChars([...selectedChars, id]);
    }
  };

  const confirmSelection = async () => {
    if (selectedChars.length !== room.chars_per_player) return;
    setConfirmed(true);

    const inserts = selectedChars.map((cid) => ({
      room_id: room.id,
      player_id: me.id,
      character_id: cid
    }));
    await supabaseGame.from('player_cards').insert(inserts);
    await supabaseGame.from('room_players').update({ lives: room.chars_per_player }).eq('id', me.id);
  };

  const totalTime = room.pick_time_seconds || 30;
  const progressPercent = Math.max(0, (timeLeft / totalTime) * 100);
  const usesOfficialImages = !room.deck_id || isOfficialDeckId(room.deck_id);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-[#f5f6ff] font-sans text-indigo-950 relative overflow-hidden party-grid-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[1200px] w-full bg-white border-4 border-indigo-150 p-6 md:p-10 rounded-3xl relative z-10 text-center shadow-xl flex flex-col"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-50 overflow-hidden rounded-t-3xl">
          <motion.div className={cn('h-full transition-all duration-1000', timeLeft <= 5 ? 'bg-rose-500' : 'bg-indigo-500')} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mb-6 md:mb-8 mt-4 relative">
          <h2 className="text-4xl md:text-5xl font-black mb-2 text-indigo-950 font-display flex items-center justify-center gap-2">
            <Layers className="h-9 w-9 text-indigo-500" /> Monte seu Baralho
          </h2>
          <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider">
            Tempo restante para escolher: <span className={cn('font-bold text-rose-500 font-mono', timeLeft <= 5 && 'animate-pulse')}>{timeLeft}s</span>
          </p>
        </div>

        {!confirmed ? (
          <p className="mb-6 text-sm bg-indigo-50 border-2 border-indigo-100 px-6 py-3 text-indigo-950 font-bold tracking-wide inline-flex items-center gap-2 mx-auto rounded-2xl">
            <Lightbulb className="h-4 w-4 text-indigo-500" /> Escolha exatamente <span className="text-indigo-600 underline decoration-indigo-300 font-extrabold">{room.chars_per_player} personagens</span> para a sua partida.
          </p>
        ) : (
          <p className="mb-6 text-sm bg-emerald-50 text-emerald-800 border-2 border-emerald-200 px-6 py-3 inline-block font-extrabold mx-auto rounded-2xl animate-pulse">
            Seus personagens estao salvos. Aguardando os demais jogadores...
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 mb-8 overflow-y-auto max-h-[50vh] p-4">
          {deckChars.map((c, i) => {
            const isSelected = selectedChars.includes(c.id);
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, translateY: -5 }}
                transition={{ delay: i * 0.05 }}
                key={c.id}
                onClick={() => toggleChar(c.id)}
                className={cn(
                  'aspect-[2/3] bg-slate-50 cursor-pointer transition-all duration-300 flex flex-col overflow-hidden relative shadow-md border-4 rounded-2xl',
                  isSelected ? 'border-indigo-500 ring-4 ring-indigo-200 scale-102' : 'border-slate-100 hover:border-indigo-300',
                  confirmed && !isSelected && 'opacity-50 grayscale bg-slate-100'
                )}
              >
                <CharacterImage
                  name={c.name}
                  imageUrl={c.image_url}
                  avatarConfig={c.avatar_config}
                  isOfficial={usesOfficialImages}
                  alt=""
                  className="flex-1 object-cover w-full h-full bg-slate-100"
                />

                <div className="p-3 bg-white w-full border-t-2 border-slate-100">
                  <p className="text-sm font-black text-center text-indigo-950 truncate">{c.name}</p>
                </div>

                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-md z-30 animate-bounce">
                    <Check className="w-4 h-4 stroke-[3px]" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-auto">
          <Button
            onClick={confirmSelection}
            disabled={selectedChars.length !== room.chars_per_player || confirmed}
            className={cn(
              'w-full md:w-96 h-14 text-sm font-black tracking-wider uppercase transition-all rounded-2xl cursor-pointer',
              selectedChars.length === room.chars_per_player && !confirmed
                ? 'btn-squishy-green text-white'
                : 'bg-indigo-50 text-indigo-400/80 border-2 border-indigo-100 opacity-60'
            )}
          >
            {confirmed ? 'Selecao Confirmada' : (selectedChars.length === room.chars_per_player ? 'Confirmar Escolha' : `Faltam ${room.chars_per_player - selectedChars.length} personagens`)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
