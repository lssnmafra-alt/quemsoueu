import { Button } from '@/components/ui/button';
import { supabaseGame } from '@/lib/supabase';
import { Trophy, Medal, Crown, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarFigure from '@/components/avatar/AvatarFigure';

export default function RoomFinished({ room, players, isAdmin, leaveRoom }: any) {
  const ranking = [...players].sort((a: any, b: any) => {
    const aAlive = !a.is_eliminated && (a.lives || 0) > 0 ? 1 : 0;
    const bAlive = !b.is_eliminated && (b.lives || 0) > 0 ? 1 : 0;

    return bAlive - aAlive
      || (b.lives || 0) - (a.lives || 0)
      || (a.missed_turns || 0) - (b.missed_turns || 0)
      || (a.play_order ?? 999) - (b.play_order ?? 999)
      || String(a.nickname || '').localeCompare(String(b.nickname || ''));
  });
  const winner = ranking.find((p: any) => !p.is_eliminated && (p.lives || 0) > 0);

  const resetGame = async () => {
    await supabaseGame.from('rooms').update({ status: 'LOBBY', current_turn_number: 0 }).eq('id', room.id);

    for (const p of players) {
      await supabaseGame.from('room_players').update({ lives: 0, is_eliminated: false, missed_turns: 0, play_order: null }).eq('id', p.id);
    }

    await supabaseGame.from('player_cards').delete().eq('room_id', room.id);
  };

  const positionLabel = (index: number) => `${index + 1}º`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f6ff] p-6 text-center font-sans party-grid-bg relative overflow-hidden">
      <div className="max-w-2xl w-full p-6 md:p-10 bg-white border-4 border-indigo-100 shadow-xl relative z-10 rounded-3xl">
        <div className="w-20 h-20 mx-auto bg-amber-400 border-4 border-amber-300 flex items-center justify-center shadow-md mb-6 rounded-2xl animate-bounce">
          <Trophy className="w-10 h-10 text-amber-950" fill="currentColor" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-indigo-950 mb-2 font-display">
          Partida Concluida!
        </h2>

        {winner ? (
          <div className={cn('mb-6 mt-6 border-4 rounded-3xl p-6 relative overflow-hidden', winner.color?.bg || 'bg-amber-500', winner.color?.border || 'border-amber-300')}>
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="rounded-full border-2 border-white/40 bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                Grande Campeao
              </div>
              <Crown className="w-10 h-10 text-white drop-shadow" fill="currentColor" />
              <h3 className="text-3xl md:text-4xl font-black text-white font-display drop-shadow">
                {winner.nickname}
              </h3>
            </div>
          </div>
        ) : (
          <div className="mb-6 mt-6 bg-rose-50 border-4 border-rose-200 rounded-3xl p-6">
            <p className="text-rose-700 text-xs uppercase tracking-wider font-extrabold mb-1">Empate</p>
            <h3 className="text-2xl font-black text-rose-950 font-display">
              Todos foram eliminados!
            </h3>
          </div>
        )}

        <div className="mb-8 rounded-3xl border-4 border-indigo-50 bg-indigo-50/40 p-4 text-left">
          <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-indigo-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" /> Ranking final
            </h3>
            <span className="text-[10px] font-black uppercase text-indigo-500">{ranking.length} jogadores</span>
          </div>

          <div className="space-y-2">
            {ranking.map((p: any, index: number) => {
              const isWinner = winner?.id === p.id;
              const isOut = p.is_eliminated || (p.lives || 0) <= 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2 shadow-sm',
                    isWinner ? cn(p.color?.border || 'border-amber-300', p.color?.lightBgc || 'bg-amber-50') : 'border-indigo-100',
                    isOut && !isWinner && 'opacity-70 grayscale'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0', isWinner ? 'bg-amber-400 text-amber-950' : 'bg-indigo-50 text-indigo-700')}>
                    {positionLabel(index)}
                  </div>
                  <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('w-10 h-10 rounded-xl border-2 shrink-0', isWinner ? p.color?.border || 'border-amber-300' : 'border-indigo-100')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-black truncate', isWinner ? p.color?.text || 'text-indigo-950' : 'text-indigo-950')}>{p.nickname}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      {isWinner ? 'Campeao' : isOut ? 'Eliminado' : 'Sobreviveu'} · vidas: {Math.max(0, p.lives || 0)} · faltas: {p.missed_turns || 0}
                    </p>
                  </div>
                  {isWinner ? <Trophy className="w-5 h-5 text-amber-500" fill="currentColor" /> : isOut ? <Skull className="w-5 h-5 text-slate-400" /> : <Medal className="w-5 h-5 text-indigo-400" />}
                </div>
              );
            })}
          </div>
        </div>

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