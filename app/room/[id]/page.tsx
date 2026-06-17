'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { getPlayerColors } from '@/lib/colors';
import { audioManager } from '@/lib/audioManager';
import RoomLobby from '@/components/game/RoomLobby';
import RoomPicking from '@/components/game/RoomPicking';
import RoomStarting from '@/components/game/RoomStarting';
import RoomPlaying from '@/components/game/RoomPlaying';
import RoomFinished from '@/components/game/RoomFinished';
import AudioToggle from '@/components/AudioToggle';
import LoadingArena from '@/components/LoadingArena';
import GameErrorBoundary from '@/components/GameErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trackForRoomStatus(status?: string) {
  if (status === 'LOBBY' || status === 'PICKING') return 'lobby-theme';
  if (status === 'STARTING' || status === 'PLAYING') return 'game-theme';
  if (status === 'FINISHED') return 'victory-theme';
  return 'lobby-theme';
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { user, profile, loading: authLoading, initialized: authInitialized } = useUserStore();

  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomNotices, setRoomNotices] = useState<{ id: string; text: string }[]>([]);
  const botAdminStartAttemptAtRef = useRef(0);
  const pickingFinalizeAttemptAtRef = useRef(0);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const syncRoomState = async (shouldAutoJoin = false) => {
      let rm: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabaseGame
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();

        if (data) {
          rm = data;
          break;
        }

        if (attempt < 2) {
          await wait(300 + attempt * 200);
        }
      }

      if (!rm) {
        router.push('/lobby');
        return;
      }

      const { data: pls } = await supabaseGame.from('room_players').select('*').eq('room_id', roomId);
      const currentPlayers = pls || [];
      const myRows = currentPlayers.filter((p: any) => p.user_id === user.id);
      const alreadyInRoom = myRows[0];
      const duplicateRows = myRows.slice(1);
      const normalizedPlayers = duplicateRows.length > 0
        ? currentPlayers.filter((p: any) => !duplicateRows.some((duplicate: any) => duplicate.id === p.id))
        : currentPlayers;

      if (duplicateRows.length > 0) {
        await supabaseGame.from('room_players').delete().in('id', duplicateRows.map((p: any) => p.id));
      }

      setRoom(rm);
      setPlayers(normalizedPlayers);

      const currentAdmin = normalizedPlayers.find((player: any) => (
        player.user_id === rm.admin_id || player.is_admin
      ));
      if (rm.status === 'LOBBY' && currentAdmin?.is_bot) {
        const now = Date.now();
        if (now - botAdminStartAttemptAtRef.current > 8000) {
          botAdminStartAttemptAtRef.current = now;
          fetch(`/api/rooms/${roomId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto: true }),
          }).catch(() => {
            botAdminStartAttemptAtRef.current = 0;
          });
        }
      }

      if (rm.status === 'PICKING' && (!rm.turn_expires_at || new Date(rm.turn_expires_at).getTime() <= Date.now())) {
        const now = Date.now();
        if (now - pickingFinalizeAttemptAtRef.current > 5000) {
          pickingFinalizeAttemptAtRef.current = now;
          fetch(`/api/rooms/${roomId}/finalize-picking`, {
            method: 'POST',
          }).catch(() => {
            pickingFinalizeAttemptAtRef.current = 0;
          });
        }
      }

      if (shouldAutoJoin && !alreadyInRoom) {
        if (rm.status !== 'LOBBY') {
          router.push('/lobby');
          return;
        }

        if (rm.status === 'LOBBY' && normalizedPlayers.length >= (rm.max_players || 6)) {
          alert('Sala cheia.');
          router.push('/lobby');
          return;
        }

        const { data: newP } = await supabaseGame.from('room_players').insert({
          room_id: roomId,
          user_id: user.id,
          nickname: profile?.nickname || user.email?.split('@')[0] || 'Visitante',
          is_admin: rm.admin_id === user.id,
        }).select().single();
        if (newP) {
          setPlayers([...normalizedPlayers, newP]);
          setRoomNotices((prev) => [...prev.slice(-2), { id: crypto.randomUUID(), text: `${newP.nickname} entrou na sala` }]);
        }
      }
      setLoading(false);
    };

    syncRoomState(true);
    const poll = setInterval(() => syncRoomState(false), 2000);

    const subs1 = supabaseGame.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => prev.some((p) => p.id === payload.new.id) ? prev : [...prev, payload.new]);
            if (payload.new.user_id !== user.id) {
              setRoomNotices((prev) => [...prev.slice(-2), { id: crypto.randomUUID(), text: `${payload.new.nickname || 'Usuario'} entrou na sala` }]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setPlayers((prev) => prev.map((p) => p.id === payload.new.id ? payload.new : p));
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
            if (payload.old.user_id !== user.id) {
              setRoomNotices((prev) => [...prev.slice(-2), { id: crypto.randomUUID(), text: `${payload.old.nickname || 'Usuario'} saiu da sala` }]);
            }
          }
        },
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      subs1.unsubscribe();
    };
  }, [authInitialized, authLoading, user, roomId, profile?.nickname, router]);

  useEffect(() => {
    if (!room?.status) return;
    void audioManager.playMusic(trackForRoomStatus(room.status));
  }, [room?.status]);

  useEffect(() => {
    if (roomNotices.length === 0) return;
    const latest = roomNotices[roomNotices.length - 1];
    const timer = setTimeout(() => {
      setRoomNotices((prev) => prev.filter((notice) => notice.id !== latest.id));
    }, 3200);
    return () => clearTimeout(timer);
  }, [roomNotices]);

  const enrichedPlayers = useMemo(() => {
    const cmap = getPlayerColors(players);
    return players.map((p) => ({ ...p, color: cmap[p.id] }));
  }, [players]);

  const me = useMemo(() => {
    if (!user) return null;
    return enrichedPlayers.find((p) => p.user_id === user.id);
  }, [enrichedPlayers, user]);

  const isAdmin = useMemo(() => {
    if (!room || !user || !me) return false;
    return room.admin_id === user.id || Boolean(me.is_admin);
  }, [room, user, me]);

  useEffect(() => {
    if (!me?.id || !room?.id || !user?.id) return;

    const heartbeat = () => {
      fetch(`/api/rooms/${room.id}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: me.id, userId: user.id }),
        keepalive: true,
      }).catch(() => {});
    };

    heartbeat();
    const timer = setInterval(heartbeat, 10000);
    return () => clearInterval(timer);
  }, [me?.id, room?.id, user?.id]);

  const leaveRoom = async () => {
    if (me) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`chatClearedAt:${room.id}:${me.user_id}`, new Date().toISOString());
      }
      await fetch(`/api/rooms/${room.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: me.id }),
      });
    }
    router.push('/lobby');
  };

  if (!authInitialized || authLoading || loading || !room) return <LoadingArena label="Carregando sala..." />;
  if (!user) return null;
  if (!me) return <LoadingArena label="Entrando na sala..." />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <AudioToggle />
      {room.status !== 'FINISHED' && (
        <button
          type="button"
          onClick={leaveRoom}
          className="fixed right-4 top-16 z-[90] rounded-2xl border-2 border-rose-200 bg-white/95 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-rose-600 shadow-xl backdrop-blur transition hover:bg-rose-50"
        >
          Abandonar
        </button>
      )}
      <AnimatePresence>
        {roomNotices.map((notice) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className="fixed left-1/2 top-5 z-[90] -translate-x-1/2 rounded-2xl border-2 border-indigo-100 bg-white/90 px-5 py-3 text-xs font-black uppercase tracking-wide text-indigo-950 shadow-xl backdrop-blur-md"
          >
            {notice.text}
          </motion.div>
        ))}
      </AnimatePresence>
      <GameErrorBoundary>
        {room.status === 'LOBBY' && <RoomLobby room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
        {room.status === 'PICKING' && <RoomPicking room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} />}
        {room.status === 'STARTING' && <RoomStarting room={room} players={enrichedPlayers} isAdmin={isAdmin} />}
        {room.status === 'PLAYING' && <RoomPlaying room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
        {room.status === 'FINISHED' && <RoomFinished room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
      </GameErrorBoundary>
    </div>
  );
}
