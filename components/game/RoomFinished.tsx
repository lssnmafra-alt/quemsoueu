import { Button } from '@/components/ui/button';
import { supabaseGame } from '@/lib/supabase';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoomFinished({ room, players, isAdmin, leaveRoom }: any) {
  const winner = players.find((p: any) => !p.is_eliminated && p.lives > 0);

  const resetGame = async () => {
    await supabaseGame.from('rooms').update({ status: 'LOBBY', current_turn_number: 0 }).eq('id', room.id);

    for (const p of players) {
      await supabaseGame.from('room_players').update({ lives: 0, is_eliminated: false, missed_turns: 0, play_order: null }).eq('id', p.id);
    }

    await supabaseGame.from('player_cards').delete().eq('room_id', room.id);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f6ff] p-6 text-center font-sans party-grid-bg relative overflow-hidden">
      <div className="max-w-xl w-full p-8 md:p-12 bg-white border-4 border-indigo-100 shadow-xl relative z-10 rounded-3xl">
        <div className="w-20 h-20 mx-auto bg-amber-400 border-4 border-amber-300 flex items-center justify-center shadow-md mb-6 rounded-2xl animate-bounce">
          <Trophy className="w-10 h-10 text-amber-950" fill="currentColor" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-indigo-950 mb-2 font-display">
          Partida Concluida!
        </h2>

        {winner ? (
          <div className={cn("mb-8 mt-6 border-4 rounded-2xl p-6", winner.color?.bg || 'bg-amber-50', winner.color?.border || 'border-amber-200')}>
            <p className="text-white/80 text-xs uppercase tracking-wider font-extrabold mb-1">Grande Campeao</p>
            <h3 className="text-3xl md:text-4xl font-black text-white font-display">
              {winner.nickname}
            </h3>
          </div>
        ) : (
          <div className="mb-8 mt-6 bg-rose-50 border-4 border-rose-200 rounded-2xl p-6">
            <p className="text-rose-700 text-xs uppercase tracking-wider font-extrabold mb-1">Empate</p>
            <h3 className="text-2xl font-black text-rose-950 font-display">
              Todos foram eliminados!
            </h3>
          </div>
        )}

        <div className="space-y-4 max-w-sm mx-auto">
          {isAdmin ? (
            <Button onClick={resetGame} className="w-full h-14 text-sm font-black uppercase tracking-wider btn-squishy-green text-white cursor-pointer select-none">
              Jogar Novamente
            </Button>
          ) : (
            <div className="h-14 flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-650 text-xs font-bold uppercase rounded-2xl animate-pulse">
              Dono de sala reiniciando...
            </div>
          )}
          <Button onClick={leaveRoom} variant="outline" className="w-full h-14 text-sm font-black uppercase btn-squishy-white cursor-pointer select-none">
            Voltar para o Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
