'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { getPlayerColors } from '@/lib/colors';
import { audioManager } from '@/lib/audioManager';
import { preloadRoomAssets } from '@/lib/preloadGameAssets';
import RoomLobby from '@/components/game/RoomLobby';
import RoomPicking from '@/components/game/RoomPicking';
import RoomStarting from '@/components/game/RoomStarting';
import RoomPlayingPremium from '@/components/game/RoomPlayingPremium';
import RoomFinished from '@/components/game/RoomFinished';
import AudioToggle from '@/components/AudioToggle';
import LoadingArena from '@/components/LoadingArena';
import GameErrorBoundary from '@/components/GameErrorBoundary';
import AvatarAnimationShowcase from '@/components/avatar/AvatarAnimationShowcase';
import { AnimatePresence, motion } from 'motion/react';

function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function uid() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2); }

function trackForRoomStatus(status?: string) {
  if (status === 'LOBBY' || status === 'PICKING') return 'lobby-theme';
  if (status === 'STARTING' || status === 'PLAYING') return 'game-theme';
  if (status === 'FINISHED') return 'victory-theme';
  return 'lobby-theme';
}

function normalizeEmoji(value: unknown) {
  const emoji = String(value || '').trim();
  return Array.from(emoji).slice(0, 2).join('') || '🙂';
}

function dedupeRoomPlayers(list: any[]) {
  const seenIds = new Set<string>();
  const seenUserIds = new Set<string>();

  return list.filter((player: any) => {
    const id = String(player?.id || '');
    const userId = String(player?.user_id || '');
    if (id && seenIds.has(id)) return false;
    if (userId && seenUserIds.has(userId)) return false;
    if (id) seenIds.add(id);
    if (userId) seenUserIds.add(userId);
    return true;
  });
}

function mergeRoomPlayer(list: any[], nextPlayer: any) {
  const nextId = String(nextPlayer?.id || '');
  const nextUserId = String(nextPlayer?.user_id || '');
  const index = list.findIndex((player: any) => {
    const id = String(player?.id || '');
    const userId = String(player?.user_id || '');
    return (nextId && id === nextId) || (nextUserId && userId === nextUserId);
  });

  if (index === -1) return [...list, nextPlayer];

  const merged = [...list];
  merged[index] = nextPlayer;
  return merged;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function ensureJoinFriendRequest(roomOwnerId: string, visitorId: string) {
  if (!isUuid(roomOwnerId) || !isUuid(visitorId) || roomOwnerId === visitorId) return;

  const { data: existing } = await supabaseGame
    .from('friendships')
    .select('id,status')
    .or(`and(requester_profile_id.eq.${roomOwnerId},receiver_profile_id.eq.${visitorId}),and(requester_profile_id.eq.${visitorId},receiver_profile_id.eq.${roomOwnerId})`)
    .maybeSingle();

  if (existing) return;

  try {
    await supabaseGame.from('friendships').insert({ requester_profile_id: roomOwnerId, receiver_profile_id: visitorId, status: 'pending' });
  } catch {}
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
  const [broadcastVote, setBroadcastVote] = useState<any>(null);
  const pickingFinalizeAttemptAtRef = useRef(0);
  const handledActionRef = useRef('');
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) { router.push('/'); return; }

    const requestAdvance = (humanJoined = false) => fetch(`/api/rooms/${roomId}/tick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ humanJoined }) }).catch(() => {});

    const syncRoomState = async (shouldAutoJoin = false) => {
      let rm: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle();
        if (data) { rm = data; break; }
        if (attempt < 2) await wait(300 + attempt * 200);
      }

      if (!rm) { router.push('/lobby'); return; }

      const { data: pls } = await supabaseGame.from('room_players').select('*').eq('room_id', roomId);
      const currentPlayers = pls || [];
      let normalizedPlayers = dedupeRoomPlayers(currentPlayers);
      const alreadyInRoom = normalizedPlayers.find((p: any) => p.user_id === user.id);

      if (alreadyInRoom) {
        joinedRef.current = true;
        const updates: Record<string, any> = {};
        const nextNickname = profile?.nickname || user.email?.split('@')[0] || alreadyInRoom.nickname;
        const nextEmoji = normalizeEmoji(profile?.emoji || alreadyInRoom.emoji);
        const nextAvatarUrl = profile?.avatar_url || alreadyInRoom.avatar_url || '';
        const nextAvatarSetId = profile?.avatar_animation_set_id || alreadyInRoom.avatar_animation_set_id || null;
        if (nextNickname && alreadyInRoom.nickname !== nextNickname) updates.nickname = nextNickname;
        if (alreadyInRoom.emoji !== nextEmoji) updates.emoji = nextEmoji;
        if ((alreadyInRoom.avatar_url || '') !== nextAvatarUrl) updates.avatar_url = nextAvatarUrl;
        if ((alreadyInRoom.avatar_animation_set_id || null) !== nextAvatarSetId) updates.avatar_animation_set_id = nextAvatarSetId;
        if (Object.keys(updates).length > 0) {
          await supabaseGame.from('room_players').update(updates).eq('id', alreadyInRoom.id);
          normalizedPlayers = normalizedPlayers.map((player: any) => player.id === alreadyInRoom.id ? { ...player, ...updates } : player);
        }
      }

      setRoom(rm);
      setPlayers(normalizedPlayers);

      if (rm.status === 'PICKING' && (!rm.turn_expires_at || new Date(rm.turn_expires_at).getTime() <= Date.now())) {
        const now = Date.now();
        if (now - pickingFinalizeAttemptAtRef.current > 5000) {
          pickingFinalizeAttemptAtRef.current = now;
          fetch(`/api/rooms/${roomId}/finalize-picking`, { method: 'POST' }).catch(() => { pickingFinalizeAttemptAtRef.current = 0; });
        }
      }

      if (shouldAutoJoin && !alreadyInRoom) {
        if (joinedRef.current) return;
        if (rm.status !== 'LOBBY') { alert('Essa sala não aceita novos jogadores no momento. Escolha uma sala aguardando jogadores.'); router.push('/lobby'); return; }
        if (rm.status === 'LOBBY' && normalizedPlayers.length >= (rm.max_players || 6)) { alert('Sala cheia.'); router.push('/lobby'); return; }

        joinedRef.current = true;
        const playerPayload = {
          room_id: roomId,
          user_id: user.id,
          nickname: profile?.nickname || user.email?.split('@')[0] || 'Visitante',
          emoji: normalizeEmoji(profile?.emoji),
          avatar_url: profile?.avatar_url || '',
          avatar_animation_set_id: profile?.avatar_animation_set_id || null,
          is_admin: rm.admin_id === user.id,
        };

        const { data: newP, error } = await supabaseGame
          .from('room_players')
          .upsert(playerPayload, { onConflict: 'room_id,user_id' })
          .select()
          .single();

        if (error) {
          joinedRef.current = false;
          console.error('Erro ao entrar na sala:', error);
        }

        if (newP) {
          setPlayers((prev) => mergeRoomPlayer(dedupeRoomPlayers(prev.length > 0 ? prev : normalizedPlayers), newP));
          setRoomNotices((prev) => [...prev.slice(-2), { id: uid(), text: `${newP.nickname} entrou na sala` }]);
          requestAdvance(true);
          setTimeout(() => requestAdvance(false), 1200);
          setTimeout(() => requestAdvance(false), 5200);
        }
      }

      setLoading(false);
    };

    syncRoomState(true);
    const poll = setInterval(() => { syncRoomState(false); requestAdvance(false); }, 1500);
    const subs1 = supabaseGame.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => setRoom(payload.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPlayers((prev) => mergeRoomPlayer(prev, payload.new));
          if (payload.new.user_id !== user.id) setRoomNotices((prev) => [...prev.slice(-2), { id: uid(), text: `${payload.new.nickname || 'Usuario'} entrou na sala` }]);
          const humanJoined = payload.new.is_bot !== true;
          requestAdvance(humanJoined);
          setTimeout(() => requestAdvance(false), 5200);
        } else if (payload.eventType === 'UPDATE') {
          setPlayers((prev) => mergeRoomPlayer(prev, payload.new));
        } else {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      }).subscribe();

    return () => { clearInterval(poll); subs1.unsubscribe(); };
  }, [authInitialized, authLoading, user, roomId, profile?.nickname, profile?.emoji, profile?.avatar_url, profile?.avatar_animation_set_id, router]);

  useEffect(() => { if (room?.status) void audioManager.playMusic(trackForRoomStatus(room.status)); }, [room?.status]);

  useEffect(() => {
    if (roomNotices.length === 0) return;
    const latest = roomNotices[roomNotices.length - 1];
    const timer = setTimeout(() => setRoomNotices((prev) => prev.filter((notice) => notice.id !== latest.id)), 3200);
    return () => clearTimeout(timer);
  }, [roomNotices]);

  useEffect(() => {
    const action = room?.last_action_payload;
    if (room?.status !== 'PLAYING' || action?.type !== 'vote' || !action.id) return;
    if (handledActionRef.current === action.id) return;
    handledActionRef.current = action.id;
    setBroadcastVote(action);
    audioManager.playSFX('vote');
    const timer = setTimeout(() => setBroadcastVote((current: any) => current?.id === action.id ? null : current), 8500);
    return () => clearTimeout(timer);
  }, [room?.last_action_payload?.id, room?.status]);

  const enrichedPlayers = useMemo(() => {
    const cmap = getPlayerColors(players);
    return players.map((p) => ({ ...p, color: cmap[p.id], emoji: normalizeEmoji(p.emoji) }));
  }, [players]);

  const me = useMemo(() => { if (!user) return null; return enrichedPlayers.find((p) => p.user_id === user.id); }, [enrichedPlayers, user]);
  const isAdmin = useMemo(() => { if (!room || !user || !me) return false; return room.admin_id === user.id || Boolean(me.is_admin); }, [room, user, me]);
  const isPrePickLoading = room?.status === 'STARTING' && enrichedPlayers.some((player: any) => player.play_order === null || player.play_order === undefined);

  useEffect(() => { if (isPrePickLoading && room?.id && user?.id) void preloadRoomAssets({ room, players: enrichedPlayers, profile, userId: user.id, minMs: 0 }); }, [isPrePickLoading, room?.id, room?.status, enrichedPlayers, profile, user?.id]);

  const winner = useMemo(() => enrichedPlayers.find((p: any) => !p.is_eliminated && (p.lives || 0) > 0), [enrichedPlayers]);
  const finalAnimationPlayer = room?.status === 'FINISHED' ? (winner?.id === me?.id ? winner : me || winner) : null;
  const finalAnimationType = winner?.id === me?.id ? 'victory' : 'defeat';

  useEffect(() => {
    if (!me?.id || !room?.id || !user?.id) return;
    const heartbeat = () => { fetch(`/api/rooms/${room.id}/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: me.id, userId: user.id }), keepalive: true }).catch(() => {}); };
    heartbeat();
    const timer = setInterval(heartbeat, 10000);
    return () => clearInterval(timer);
  }, [me?.id, room?.id, user?.id]);

  const leaveRoom = async () => {
    if (me) {
      if (typeof window !== 'undefined') localStorage.setItem(`chatClearedAt:${room.id}:${me.user_id}`, new Date().toISOString());
      await fetch(`/api/rooms/${room.id}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: me.id }) });
    }
    router.push('/lobby');
  };

  if (!authInitialized || authLoading || loading || !room) return <LoadingArena label="Carregando sala..." />;
  if (!user) return null;
  if (!me) return <LoadingArena label="Entrando na sala..." />;
  if (isPrePickLoading) return <LoadingArena label="Preparando partida..." />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <AudioToggle />
      {room.status === 'FINISHED' && finalAnimationPlayer && <div className="fixed bottom-4 right-4 z-[95] hidden w-[360px] max-w-[calc(100vw-2rem)] md:block"><AvatarAnimationShowcase player={finalAnimationPlayer} eventType={finalAnimationType} title={finalAnimationType === 'victory' ? 'Animação de vitória' : 'Animação de derrota'} subtitle={finalAnimationType === 'victory' ? `${finalAnimationPlayer.nickname} venceu` : `${finalAnimationPlayer.nickname} perdeu`} compact /></div>}
      {room.status !== 'FINISHED' && <button type="button" onClick={leaveRoom} className="fixed right-4 top-16 z-[90] rounded-2xl border-2 border-rose-200 bg-white/95 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-rose-600 shadow-xl backdrop-blur transition hover:bg-rose-50">Abandonar</button>}
      <AnimatePresence>{roomNotices.map((notice) => <motion.div key={notice.id} initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }} className="fixed left-1/2 top-5 z-[90] -translate-x-1/2 rounded-2xl border-2 border-indigo-100 bg-white/90 px-5 py-3 text-xs font-black uppercase tracking-wide text-indigo-950 shadow-xl backdrop-blur-md">{notice.text}</motion.div>)}</AnimatePresence>
      <AnimatePresence>{broadcastVote && <BroadcastVoteOverlay payload={broadcastVote} />}</AnimatePresence>
      <GameErrorBoundary>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={room.status} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            {room.status === 'LOBBY' && <RoomLobby room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
            {room.status === 'PICKING' && <RoomPicking room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} />}
            {room.status === 'STARTING' && <RoomStarting room={room} players={enrichedPlayers} isAdmin={isAdmin} />}
            {room.status === 'PLAYING' && <RoomPlayingPremium room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
            {room.status === 'FINISHED' && <RoomFinished room={room} players={enrichedPlayers} me={me} isAdmin={isAdmin} leaveRoom={leaveRoom} />}
          </motion.div>
        </AnimatePresence>
      </GameErrorBoundary>
    </div>
  );
}

function BroadcastVoteOverlay({ payload }: { payload: any }) {
  const hits = Number(payload?.hits || 0);
  const hitPlayers = Array.isArray(payload?.hitPlayers) ? payload.hitPlayers : [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/78 p-4 text-white backdrop-blur-md pointer-events-none">
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -12 }} className="w-full max-w-xl rounded-[2rem] border-4 border-yellow-300 bg-[#071a64] p-7 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-200">Revelação da rodada</p>
        <h2 className="mt-3 text-3xl font-black uppercase italic font-display">{payload?.voterName || 'Jogador'} votou em</h2>
        <div className="my-5 rounded-3xl border-4 border-white/20 bg-white px-6 py-5 text-indigo-950"><p className="text-3xl font-black uppercase font-display">{payload?.target || 'Personagem'}</p></div>
        {hits > 0 ? <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-400/15 px-4 py-3 text-emerald-100"><p className="text-4xl font-black font-display">ACERTOU</p><p className="mt-2 text-sm font-black uppercase">{hitPlayers.map((p: any) => p.nickname).filter(Boolean).join(', ') || 'Jogador'} perdeu vida.</p></div> : <div className="rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-3"><p className="text-4xl font-black font-display">ERROU</p><p className="mt-2 text-sm font-black uppercase text-blue-100">Ninguém tinha essa carta.</p></div>}
      </motion.div>
    </motion.div>
  );
}
