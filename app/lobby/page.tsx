'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { audioManager } from '@/lib/audioManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingArena from '@/components/LoadingArena';
import GameTopNav from '@/components/navigation/GameTopNav';
import { isProjectAdmin } from '@/lib/admin';
import { ArrowRight, Circle, Crown, Plus, Search, Timer, Trash2, Trophy, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function HomeLobby() {
  const router = useRouter();
  const { user, profile, logout, loading: authLoading, initialized: authInitialized } = useUserStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState('');

  const isAdminUser = isProjectAdmin(user?.id);
  const profileCompleted = Boolean(profile?.profile_completed);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!profileCompleted) router.replace('/profile');
  }, [authInitialized, authLoading, profileCompleted, router, user]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profileCompleted) return;
    void audioManager.playMusic('lobby-theme');
  }, [authInitialized, authLoading, user?.id, profileCompleted, profile?.music_genres, profile?.music_blocked_tracks]);

  const fetchRooms = async () => {
    const response = await fetch('/api/rooms/public', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setRooms(Array.isArray(result.rooms) ? result.rooms : []);
    setRoomsLoading(false);
  };

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profileCompleted) return;

    void fetchRooms();
    const roomTimer = setInterval(fetchRooms, 10000);
    const subscription = supabaseGame.channel('public:rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms).subscribe();

    return () => {
      clearInterval(roomTimer);
      subscription.unsubscribe();
    };
  }, [authInitialized, authLoading, user?.id, profileCompleted]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleCreateRoom = async () => {
    if (!user?.id) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabaseGame
      .from('rooms')
      .insert({ code, admin_id: user.id, is_public: true, max_players: 6, chars_per_player: 3, pick_time_seconds: 30, vote_time_seconds: 30, reveal_time_seconds: 8, status: 'LOBBY' })
      .select()
      .single();

    if (error) {
      alert('Não foi possível criar a sala agora.');
      return;
    }
    if (data) router.push(`/room/${data.id}`);
  };

  const joinPrivateRoom = async () => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    const { data } = await supabaseGame.from('rooms').select('id,status').eq('code', cleanCode).maybeSingle();

    if (!data) {
      alert('Sala de jogo não encontrada.');
      return;
    }

    if (data.status !== 'LOBBY') {
      alert('Essa sala não aceita novos jogadores no momento. Escolha uma sala aguardando jogadores.');
      return;
    }

    router.push(`/room/${data.id}`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!isAdminUser || deletingRoomId) return;
    if (!confirm('Deseja excluir esta sala e limpar seus dados relacionados?')) return;

    setDeletingRoomId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível excluir a sala.');
      setRooms((current) => current.filter((room) => room.id !== roomId));
    } catch (error: any) {
      alert(error.message || 'Não foi possível excluir a sala.');
    } finally {
      setDeletingRoomId('');
    }
  };

  if (!authInitialized || authLoading || !user || !profileCompleted) return <LoadingArena label="Entrando no lobby..." />;

  return (
    <div className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={profile} isAdmin={isAdminUser} onLogout={handleLogout} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <main className="relative z-10 mx-auto max-w-[1220px] px-4 pb-8 pt-28 md:px-8">
        <section className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Modo social</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Encontrar partidas</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase">
              <span className="rounded-md border border-cyan-200/40 bg-cyan-300/20 px-3 py-1 text-cyan-50">Servidor ativo</span>
              <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-blue-100">{rooms.length} salas públicas</span>
              {isAdminUser && <span className="rounded-md border border-amber-300/60 bg-amber-300 px-3 py-1 text-amber-950"><Crown className="mr-1 inline h-3.5 w-3.5" /> ADM</span>}
            </div>
          </div>
          <Button onClick={handleCreateRoom} className="h-16 min-w-[260px] rounded-none bg-yellow-300 px-8 text-xl font-black uppercase italic text-slate-950 shadow-[0_8px_0_#b45309] hover:bg-yellow-200"><Plus className="mr-2 h-6 w-6 stroke-[3px]" /> Criar sala</Button>
        </section>

        <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex flex-1 rounded-none border-2 border-cyan-200/30 bg-white/10 p-1 shadow-inner focus-within:border-yellow-300">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-200" />
              <Input placeholder="CÓDIGO DA SALA..." value={roomCode} onChange={(event) => setRoomCode(event.target.value)} className="h-14 flex-1 rounded-none border-0 bg-transparent pl-12 text-base font-black uppercase text-white shadow-none placeholder:text-blue-100/70 focus-visible:ring-0" />
              <Button onClick={joinPrivateRoom} disabled={!roomCode.trim()} className="h-14 rounded-none bg-blue-400 px-7 text-xs font-black uppercase text-white shadow-[0_5px_0_#1d4ed8] hover:bg-blue-300">Entrar</Button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border-b border-cyan-200/20 pb-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100">Salas públicas disponíveis</h2>
            <span className="text-xs font-black uppercase text-yellow-200">Aguardando jogadores</span>
          </div>

          <div className="min-h-[430px] rounded-2xl border-2 border-cyan-200/20 bg-white/8 p-5 relative">
            {roomsLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="h-12 w-12 rounded-full border-4 border-cyan-200 border-t-yellow-300 animate-spin" /><p className="text-xs font-black uppercase tracking-wider text-cyan-100">Carregando salas...</p></div>
            ) : rooms.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/5 p-6 text-center"><Circle className="mb-3 h-14 w-14 text-cyan-200/60" /><p className="text-lg font-black uppercase text-white">Nenhuma sala pública</p><p className="mt-1 text-sm font-bold text-blue-100">Crie uma sala para começar uma partida.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {rooms.map((room, index) => (
                    <motion.div key={room.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.04 }} onClick={() => router.push(`/room/${room.id}`)} className="cursor-pointer rounded-2xl border-2 border-cyan-200/25 bg-white/95 p-5 text-[#1e1b4b] shadow-xl transition-all hover:-translate-y-1 hover:border-yellow-300 hover:shadow-2xl">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="mb-1 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /><p className="text-[10px] font-black uppercase text-emerald-600">{roomStatusLabel(room.status)}</p></div>
                          <p className="text-2xl font-black font-display">Sala #{room.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdminUser && <button type="button" disabled={deletingRoomId === room.id} onClick={(event) => { event.stopPropagation(); void handleDeleteRoom(room.id); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50" title="Excluir sala"><Trash2 className="h-4 w-4" /></button>}
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ArrowRight className="h-5 w-5" /></div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600"><Users className="mr-1 inline h-3.5 w-3.5" /> {room.player_count || 0}/{room.max_players || 6} jogadores</span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600"><Timer className="mr-1 inline h-3.5 w-3.5" /> Aguardando</span>
                        <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{room.chars_per_player || 3} Vidas</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function roomStatusLabel(status: string) {
  if (status === 'LOBBY') return 'Pronto para jogar';
  if (status === 'PICKING') return 'Escolhendo cartas';
  if (status === 'STARTING') return 'Iniciando';
  if (status === 'PLAYING') return 'Em jogo';
  if (status === 'FINISHED') return 'Finalizada';
  return 'Lobby';
}
