import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabaseGame } from '@/lib/supabase';
import { Trophy, Medal, Crown, Skull, Target, XCircle, Clock, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarFigure from '@/components/avatar/AvatarFigure';

export default function RoomFinished({ room, players, isAdmin, leaveRoom }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        const { data, error } = await supabaseGame
          .from('match_events')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('match_events unavailable:', error.message);
          if (!cancelled) setEvents([]);
          return;
        }

        if (!cancelled) setEvents(data || []);
      } catch (error) {
        console.warn('match_events unavailable:', error);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setEventsLoaded(true);
      }
    };

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const playersById = useMemo(() => new Map(players.map((player: any) => [player.id, player])), [players]);

  const eliminationEvents = useMemo(() => {
    const seen = new Set<string>();
    return events.filter((event: any) => {
      if (event.event_type !== 'player_eliminated' || !event.target_player_id || seen.has(event.target_player_id)) return false;
      seen.add(event.target_player_id);
      return true;
    });
  }, [events]);

  const eliminationOrder = useMemo(() => {
    const map = new Map<string, number>();
    eliminationEvents.forEach((event: any, index: number) => map.set(event.target_player_id, index));
    return map;
  }, [eliminationEvents]);

  const statsByPlayer = useMemo(() => {
    const map = new Map<string, { hits: number; misses: number; eliminations: number; timeouts: number; turns: number }>();
    const getStats = (playerId: string) => {
      const current = map.get(playerId) || { hits: 0, misses: 0, eliminations: 0, timeouts: 0, turns: 0 };
      map.set(playerId, current);
      return current;
    };

    for (const event of events) {
      if ((event.event_type === 'vote_hit' || event.event_type === 'vote_miss' || event.event_type === 'bot_skip') && event.actor_player_id) {
        const stats = getStats(event.actor_player_id);
        stats.turns += 1;
        if (event.event_type === 'vote_hit') stats.hits += 1;
        if (event.event_type === 'vote_miss') stats.misses += 1;
      }

      if (event.event_type === 'player_eliminated' && event.actor_player_id) {
        getStats(event.actor_player_id).eliminations += 1;
      }

      if ((event.event_type === 'timeout_warning' || event.event_type === 'timeout_eliminated') && event.target_player_id) {
        getStats(event.target_player_id).timeouts += 1;
      }
    }

    return map;
  }, [events]);

  const ranking = useMemo(() => {
    const hasRealEliminationOrder = eliminationOrder.size > 0;

    return [...players].sort((a: any, b: any) => {
      const aAlive = !a.is_eliminated && (a.lives || 0) > 0 ? 1 : 0;
      const bAlive = !b.is_eliminated && (b.lives || 0) > 0 ? 1 : 0;
      if (aAlive !== bAlive) return bAlive - aAlive;

      const aElimOrder = eliminationOrder.get(a.id);
      const bElimOrder = eliminationOrder.get(b.id);
      if (hasRealEliminationOrder && aElimOrder !== undefined && bElimOrder !== undefined) return bElimOrder - aElimOrder;
      if (hasRealEliminationOrder && aElimOrder !== undefined) return 1;
      if (hasRealEliminationOrder && bElimOrder !== undefined) return -1;

      return (b.lives || 0) - (a.lives || 0)
        || (a.missed_turns || 0) - (b.missed_turns || 0)
        || (a.play_order ?? 999) - (b.play_order ?? 999)
        || String(a.nickname || '').localeCompare(String(b.nickname || ''));
    });
  }, [eliminationOrder, players]);

  const winner = ranking.find((p: any) => !p.is_eliminated && (p.lives || 0) > 0);
  const hasEventHistory = events.length > 0;

  const resetGame = async () => {
    await supabaseGame.from('rooms').update({ status: 'LOBBY', current_turn_number: 0 }).eq('id', room.id);

    for (const p of players) {
      await supabaseGame.from('room_players').update({ lives: 0, is_eliminated: false, missed_turns: 0, play_order: null }).eq('id', p.id);
    }

    await supabaseGame.from('player_cards').delete().eq('room_id', room.id);
    await supabaseGame.from('match_events').delete().eq('room_id', room.id);
  };

  const positionLabel = (index: number) => `${index + 1}º`;
  const playerName = (playerId?: string | null) => playerId ? (playersById.get(playerId) as any)?.nickname || 'Jogador' : 'Timeout';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f6ff] p-6 text-center font-sans party-grid-bg relative overflow-hidden">
      <div className="max-w-3xl w-full p-6 md:p-10 bg-white border-4 border-indigo-100 shadow-xl relative z-10 rounded-3xl">
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

        <div className="mb-6 rounded-3xl border-4 border-indigo-50 bg-indigo-50/40 p-4 text-left">
          <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-indigo-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" /> Ranking final
            </h3>
            <span className="text-[10px] font-black uppercase text-indigo-500">{hasEventHistory ? 'ordem real' : 'snapshot final'}</span>
          </div>

          <div className="space-y-2">
            {ranking.map((p: any, index: number) => {
              const isWinner = winner?.id === p.id;
              const isOut = p.is_eliminated || (p.lives || 0) <= 0;
              const eliminatedAt = eliminationOrder.get(p.id);
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
                      {isWinner ? 'Campeao' : isOut ? `Eliminado${eliminatedAt !== undefined ? ` #${eliminatedAt + 1}` : ''}` : 'Sobreviveu'} · vidas: {Math.max(0, p.lives || 0)} · faltas: {p.missed_turns || 0}
                    </p>
                  </div>
                  {isWinner ? <Trophy className="w-5 h-5 text-amber-500" fill="currentColor" /> : isOut ? <Skull className="w-5 h-5 text-slate-400" /> : <Medal className="w-5 h-5 text-indigo-400" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border-4 border-indigo-50 bg-white p-4 text-left">
          <div className="mb-3 flex items-center gap-2 border-b-2 border-indigo-50 pb-3">
            <Target className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950">Estatisticas</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {ranking.map((p: any) => {
              const stats = statsByPlayer.get(p.id) || { hits: 0, misses: 0, eliminations: 0, timeouts: 0, turns: 0 };
              return (
                <div key={p.id} className="rounded-2xl border-2 border-indigo-50 bg-indigo-50/30 px-3 py-2">
                  <p className="text-xs font-black text-indigo-950 truncate">{p.nickname}</p>
                  <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px] font-black uppercase text-slate-500">
                    <span><Target className="mx-auto mb-0.5 w-3.5 h-3.5 text-emerald-500" />{stats.hits}</span>
                    <span><XCircle className="mx-auto mb-0.5 w-3.5 h-3.5 text-rose-500" />{stats.misses}</span>
                    <span><Skull className="mx-auto mb-0.5 w-3.5 h-3.5 text-slate-500" />{stats.eliminations}</span>
                    <span><Clock className="mx-auto mb-0.5 w-3.5 h-3.5 text-amber-500" />{stats.timeouts}</span>
                    <span><Medal className="mx-auto mb-0.5 w-3.5 h-3.5 text-indigo-500" />{stats.turns}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8 rounded-3xl border-4 border-indigo-50 bg-slate-50 p-4 text-left">
          <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-indigo-50 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-950 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-indigo-500" /> Historico de eliminacoes
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-400">{eliminationEvents.length}</span>
          </div>

          {!eventsLoaded ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500">Carregando historico...</p>
          ) : eliminationEvents.length === 0 ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500">
              Historico detalhado indisponivel para esta partida. As novas partidas passam a registrar eventos depois que a tabela match_events existir no Supabase.
            </p>
          ) : (
            <div className="space-y-2">
              {eliminationEvents.map((event: any, index: number) => {
                const characterName = event.metadata?.target_name ? ` usando ${event.metadata.target_name}` : '';
                const actor = event.actor_player_id ? playerName(event.actor_player_id) : 'Timeout';
                const target = playerName(event.target_player_id);
                return (
                  <div key={event.id || `${event.target_player_id}-${index}`} className="rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-700">
                    <span className="font-black text-indigo-600">#{index + 1}</span> {actor} eliminou {target}{characterName}.
                  </div>
                );
              })}
            </div>
          )}
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