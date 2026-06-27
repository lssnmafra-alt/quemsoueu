'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatMenu from './ChatMenu';
import { motion } from 'motion/react';
import { Check, Copy, Cpu, LogOut, MessageCircle, Palette, Play, Search, Settings, Shield, Sparkles, Timer, UserPlus, Users } from 'lucide-react';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import AvatarLobbyVideo from '@/components/avatar/AvatarLobbyVideo';
import AvatarPickerModal from '@/components/avatar/AvatarPickerModal';
import { avatarSelectionToUrl, selectionFromAvatarUrl, type AvatarSelection } from '@/lib/avatars';

const MIN_PLAYERS_TO_START = 4;
const LOBBY_COUNTDOWN_SECONDS = 5;
const TIMER_REPAIR_GRACE_SECONDS = 2;

const settingGroups = [
  { label: 'Max de Jogadores', key: 'max_players', options: [4, 6, 10, 12] },
  { label: 'Vidas por Jogador', key: 'chars_per_player', options: [1, 2, 3] },
  { label: 'Tempo de Escolha (S)', key: 'pick_time_seconds', options: [15, 30, 45] },
  { label: 'Tempo de Votacao (S)', key: 'vote_time_seconds', options: [15, 30, 45] },
  { label: 'Tempo de Revelacao (S)', key: 'reveal_time_seconds', options: [5, 8, 12] },
] as const;

export default function RoomLobby({ room, players, me, isAdmin, leaveRoom }: any) {
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState(room.deck_id || '');
  const [deckSearch, setDeckSearch] = useState('');
  const [botsCount, setBotsCount] = useState<number>(() => players.filter((p: any) => p.is_bot).length);
  const [autoStartSeconds, setAutoStartSeconds] = useState<number | null>(null);
  const [decksLoading, setDecksLoading] = useState(true);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const [roomInviteLink, setRoomInviteLink] = useState('');
  const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);
  const [friendInviteNotice, setFriendInviteNotice] = useState('');
  const [busyFriendId, setBusyFriendId] = useState('');
  const startNudgeRef = useRef<string | null>(null);
  const repairNudgeRef = useRef<string | null>(null);

  const realPlayersCount = players.filter((p: any) => !p.is_bot).length;
  const botRowsCount = players.filter((p: any) => p.is_bot).length;
  const maxBots = Math.max(0, (room.max_players || 6) - realPlayersCount);
  const clampedBotsCount = Math.min(botsCount, maxBots);
  const expectedParticipants = realPlayersCount + clampedBotsCount;
  const canStart = expectedParticipants >= MIN_PLAYERS_TO_START;
  const myAvatarSelection = useMemo(() => selectionFromAvatarUrl(me?.avatar_url), [me?.avatar_url]);

  const directRoomLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${room.id}`;
  }, [room.id]);

  const inviteText = useMemo(() => `Entre na minha sala do Quem Sou Eu? Sala #${room.code}: ${roomInviteLink}`, [room.code, roomInviteLink]);

  useEffect(() => {
    setRoomInviteLink(directRoomLink);
  }, [directRoomLink]);

  useEffect(() => {
    const fetchDecks = async () => {
      setDecksLoading(true);
      const deckFilter = room.deck_id
        ? `is_public.eq.true,creator_id.eq.${me.user_id},id.eq.${room.deck_id}`
        : `is_public.eq.true,creator_id.eq.${me.user_id}`;
      const { data } = await supabaseGame.from('decks').select('*').or(deckFilter);
      setDecks(data || []);
      setDecksLoading(false);
    };

    void fetchDecks();
  }, [me.user_id, room.deck_id]);

  useEffect(() => {
    setSelectedDeck(room.deck_id || '');
  }, [room.deck_id]);

  useEffect(() => {
    setBotsCount((current) => Math.min(current, maxBots));
  }, [maxBots, botRowsCount]);

  useEffect(() => {
    if (!isAdmin || !me?.user_id) return;
    let cancelled = false;
    async function loadFriends() {
      const response = await fetch(`/api/social/friends?userId=${encodeURIComponent(me.user_id)}`, { cache: 'no-store' }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) : {};
      if (cancelled) return;
      setAcceptedFriends(Array.isArray(result.friends) ? result.friends : []);
    }
    void loadFriends();
    return () => { cancelled = true; };
  }, [isAdmin, me?.user_id]);

  useEffect(() => {
    if (room.status !== 'LOBBY' || !room.turn_expires_at) {
      setAutoStartSeconds(null);
      startNudgeRef.current = null;
      repairNudgeRef.current = null;
      return;
    }

    const expiresAt = new Date(room.turn_expires_at).getTime();
    if (!Number.isFinite(expiresAt)) {
      setAutoStartSeconds(null);
      startNudgeRef.current = null;
      repairNudgeRef.current = null;
      return;
    }

    const tick = () => {
      const diffMs = expiresAt - Date.now();
      const rawSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      setAutoStartSeconds(Math.min(rawSeconds, LOBBY_COUNTDOWN_SECONDS));

      if (rawSeconds > LOBBY_COUNTDOWN_SECONDS + TIMER_REPAIR_GRACE_SECONDS && repairNudgeRef.current !== room.turn_expires_at) {
        repairNudgeRef.current = room.turn_expires_at;
        fetch(`/api/rooms/${room.id}/tick`, { method: 'POST' }).catch(() => {});
      }

      if (rawSeconds === 0 && startNudgeRef.current !== room.turn_expires_at) {
        startNudgeRef.current = room.turn_expires_at;
        fetch(`/api/rooms/${room.id}/tick`, { method: 'POST' }).catch(() => {});
      }
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [room.id, room.status, room.turn_expires_at]);

  const updateSettings = async (updates: any) => {
    if (!isAdmin || room.status !== 'LOBBY') {
      setSettingsNotice('Só o dono da sala pode alterar antes da partida começar.');
      return;
    }

    setSettingsNotice('');
    const { error } = await supabaseGame.from('rooms').update(updates).eq('id', room.id);
    if (error) {
      setSettingsNotice(`Não foi possível salvar: ${error.message}`);
      return;
    }

    await fetch(`/api/rooms/${room.id}/tick`, { method: 'POST' }).catch(() => {});
  };

  const ensureRealInviteLink = async () => {
    if (!directRoomLink || !me?.user_id) return directRoomLink;
    if (roomInviteLink.includes('/invite/')) return roomInviteLink;

    const response = await fetch('/api/social/room-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: me.user_id, roomId: room.id, action: 'link', message: `Convite para a sala #${room.code}` }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.invite?.id) throw new Error(result.error || 'Nao foi possivel criar link de convite.');

    const link = `${window.location.origin}/invite/${result.invite.id}`;
    setRoomInviteLink(link);
    return link;
  };

  const copyInviteLink = async () => {
    if (!directRoomLink) return;
    try {
      const link = await ensureRealInviteLink();
      await navigator.clipboard.writeText(link);
      setShareNotice('Link copiado!');
    } catch {
      setShareNotice('Copie o link manualmente.');
    }
    setTimeout(() => setShareNotice(''), 2500);
  };

  const shareOnWhatsApp = async () => {
    if (!directRoomLink) return;
    const link = await ensureRealInviteLink().catch(() => directRoomLink);
    window.open(`https://wa.me/?text=${encodeURIComponent(`Entre na minha sala do Quem Sou Eu? Sala #${room.code}: ${link}`)}`, '_blank', 'noopener,noreferrer');
  };

  const inviteFriendToRoom = async (friendProfileId: string) => {
    if (!isAdmin || !me?.user_id || !friendProfileId || busyFriendId) return;
    setBusyFriendId(friendProfileId);
    setFriendInviteNotice('');
    try {
      const response = await fetch('/api/social/room-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.user_id, targetId: friendProfileId, roomId: room.id, message: inviteText }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel convidar.');
      setFriendInviteNotice('Convite enviado.');
    } catch (error: any) {
      setFriendInviteNotice(error.message || 'Nao foi possivel convidar. Copie o link.');
    } finally {
      setBusyFriendId('');
      setTimeout(() => setFriendInviteNotice(''), 2800);
    }
  };

  const saveAvatar = async (selection: AvatarSelection) => {
    if (!me?.id || room.status !== 'LOBBY') return;
    const avatarUrl = avatarSelectionToUrl(selection);
    const { error } = await supabaseGame.from('room_players').update({ avatar_url: avatarUrl }).eq('id', me.id);
    if (!error) setAvatarPickerOpen(false);
  };

  const handleStart = async () => {
    if (!canStart) {
      alert('A partida precisa de pelo menos 4 participantes. Adicione bots ou convide alguém.');
      return;
    }

    const response = await fetch(`/api/rooms/${room.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId: selectedDeck || undefined, desiredBots: botsCount }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) alert(result.error || 'Não foi possível iniciar a partida agora.');
  };

  const selectedDeckName = selectedDeck
    ? decks.find((deck: any) => deck.id === selectedDeck)?.name || (decksLoading ? 'Carregando baralho...' : 'Baralho indisponível')
    : 'Nenhum deck selecionado';

  const filteredDecks = decks
    .filter((deck: any) => !deckSearch.trim() || deck.name.toLowerCase().includes(deckSearch.trim().toLowerCase()))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-[100dvh] w-full overflow-y-auto bg-[#071a64] text-white font-sans relative party-grid-bg">
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />
      <div className="flex-1 flex flex-col p-4 md:p-6 relative z-10 w-full max-w-[1500px] mx-auto min-h-[100dvh]">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-5 bg-[#082c7a]/85 border-4 border-cyan-200/25 rounded-3xl shadow-2xl shrink-0 flex items-center justify-between relative backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs text-cyan-200 font-black uppercase tracking-[0.22em] flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sala de espera</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic font-display text-white">Sala <span className="text-yellow-300">#{room.code}</span></h1>
          </div>
          <Button variant="ghost" onClick={leaveRoom} className="text-rose-100 hover:text-white hover:bg-rose-500/20 text-xs font-black uppercase h-11 px-5 rounded-2xl border-2 border-white/15 transition-all cursor-pointer">
            Sair da Sala <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </motion.header>

        {autoStartSeconds !== null && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl border-4 border-yellow-300 bg-yellow-300 px-5 py-4 text-center shadow-[0_8px_0_#b45309]">
            <div className="flex items-center justify-center gap-2 text-amber-950">
              <Timer className="h-5 w-5" />
              <p className="text-sm font-black uppercase tracking-wider">Jogador entrou. Preparando arena.</p>
            </div>
            <p className="mt-1 text-xl font-black text-slate-950 font-display">{autoStartSeconds > 0 ? `A partida começa em ${autoStartSeconds} segundos.` : 'Carregando arena...'}</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start mb-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-4 min-w-0">
            <div className="flex flex-col gap-3 border-b border-cyan-200/20 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Squad aguardando iniciar</p>
                <h2 className="text-2xl md:text-3xl font-black uppercase italic text-white flex items-center gap-2"><Users className="w-6 h-6 text-cyan-200" /> Jogadores ({players.length}/{room.max_players})</h2>
              </div>
              {isAdmin ? (
                <Button type="button" onClick={handleStart} disabled={!canStart || room.status !== 'LOBBY'} className="h-12 rounded-2xl bg-yellow-300 px-5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-[0_5px_0_#b45309] hover:bg-yellow-200 disabled:opacity-50">
                  <Play className="mr-2 h-4 w-4 fill-current" /> Iniciar partida
                </Button>
              ) : (
                <p className="rounded-2xl border border-cyan-200/25 bg-white/10 px-4 py-3 text-xs font-black uppercase text-cyan-100">Aguardando o dono iniciar</p>
              )}
            </div>

            <div className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-2xl backdrop-blur-xl min-h-[520px] overflow-visible">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {players.map((p: any, index: number) => {
                  const isMe = p.user_id === me.user_id;
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={cn('relative overflow-hidden rounded-[2rem] border-4 bg-white p-2 text-center shadow-xl', isMe ? 'border-yellow-300 ring-4 ring-yellow-300/25' : 'border-cyan-200/25')}>
                      <div className={cn('absolute inset-x-0 top-0 h-2', p.color?.bg || 'bg-cyan-400')} />
                      <button type="button" disabled={!isMe || room.status !== 'LOBBY'} onClick={() => isMe && setAvatarPickerOpen(true)} className="relative block w-full overflow-hidden rounded-[1.55rem] bg-white disabled:cursor-default" aria-label={isMe ? 'Trocar avatar' : `Avatar de ${p.nickname}`}>
                        <AvatarLobbyVideo avatarUrl={p.avatar_url} label={p.nickname} className="aspect-[3/4] w-full rounded-[1.55rem]" />
                        {isMe && room.status === 'LOBBY' && (
                          <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-indigo-600 text-white shadow-md">
                            <Palette className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                      <div className="mt-3 rounded-2xl bg-[#071a64] px-3 py-2 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black uppercase text-white">{p.nickname}</p>
                          <span className="text-[10px] font-black text-yellow-200">#{index + 1}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {p.is_admin && <span className="text-[9px] bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Dono</span>}
                          {!p.is_admin && <span className="text-[9px] bg-white/10 text-cyan-100 px-2 py-0.5 rounded-full">Jogador</span>}
                          {p.is_bot && <span className="text-[9px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Cpu className="w-3 h-3" /> Bot</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#082c7a]/80 border-4 border-emerald-200/25 rounded-3xl p-4 shadow-xl space-y-3 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-200">Convidar para sala</p>
              <p className="text-xs font-bold text-blue-100 break-all">{roomInviteLink}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button type="button" onClick={shareOnWhatsApp} className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
                <Button type="button" variant="ghost" onClick={copyInviteLink} className="h-11 rounded-2xl border-2 border-emerald-200/25 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2">{shareNotice ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {shareNotice || 'Copiar link'}</Button>
              </div>
              {isAdmin && (
                <div className="rounded-2xl border-2 border-emerald-200/20 bg-white/10 p-3">
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-100"><UserPlus className="h-3.5 w-3.5" /> Amigos adicionados</p>
                  {acceptedFriends.length === 0 ? (
                    <p className="text-xs font-bold text-blue-100">Nenhum amigo aceito ainda. Use a tela Amigos para adicionar.</p>
                  ) : (
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {acceptedFriends.map((row: any) => {
                        const friend = row.other_profile;
                        if (!friend?.id) return null;
                        return (
                          <div key={friend.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2">
                            <AvatarFigure avatarUrl={friend.avatar_url} label={friend.nickname} className="h-9 w-9 rounded-xl border border-emerald-100 bg-white" />
                            <p className="min-w-0 flex-1 truncate text-xs font-black text-indigo-950">{friend.nickname || 'Jogador'}</p>
                            <Button type="button" size="sm" onClick={() => inviteFriendToRoom(friend.id)} disabled={busyFriendId === friend.id} className="h-8 rounded-xl bg-emerald-500 px-3 text-[10px] font-black uppercase text-white hover:bg-emerald-600">{busyFriendId === friend.id ? 'Enviando' : 'Convidar'}</Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {friendInviteNotice && <p className="mt-2 text-[11px] font-black uppercase text-emerald-100">{friendInviteNotice}</p>}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4 min-w-0">
            <h2 className="text-2xl font-black uppercase italic text-white flex items-center gap-2 border-b border-cyan-200/20 pb-2"><Settings className="w-5 h-5 text-cyan-200" /> Configurações</h2>
            <div className="bg-[#082c7a]/80 border-4 border-cyan-200/25 rounded-3xl p-5 flex flex-col gap-5 shadow-2xl backdrop-blur-xl">
              {settingsNotice && <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-amber-700">{settingsNotice}</div>}

              <div>
                <label className="text-xs font-black text-cyan-200 uppercase tracking-wider block mb-2 border-l-4 border-yellow-300 pl-2">Tema de cartas escolhido</label>
                <div className="bg-white/10 border-2 border-cyan-200/20 rounded-2xl p-3 space-y-3">
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-2 rounded-xl bg-white border-2 border-cyan-100 px-3 h-11">
                        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                        <input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="Pesquisar baralho..." className="min-w-0 flex-1 bg-transparent outline-none text-sm font-bold text-indigo-950 placeholder:text-slate-400" />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {decksLoading ? <p className="text-xs font-bold text-cyan-100 uppercase p-3">Carregando baralhos...</p> : filteredDecks.length === 0 ? <p className="text-xs font-bold text-blue-100 uppercase p-3">Nenhum baralho público encontrado.</p> : filteredDecks.map((deck: any) => (
                          <button key={deck.id} type="button" onClick={() => { setSelectedDeck(deck.id); updateSettings({ deck_id: deck.id }); }} className={cn('w-full min-h-12 rounded-xl border-2 px-3 py-2 text-left transition-all flex items-center justify-between gap-3', selectedDeck === deck.id ? 'bg-yellow-300 border-yellow-300 text-slate-950 shadow-sm' : 'bg-white border-cyan-100 text-indigo-950 hover:border-yellow-300')}>
                            <span className="block text-sm font-black truncate">{deck.name}</span>
                            {selectedDeck === deck.id && <Sparkles className="w-4 h-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] font-bold text-cyan-100">Selecionado: {selectedDeckName}</p>
                    </>
                  ) : (
                    <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Deck selecionado</p>
                      <p className="mt-1 text-lg font-black text-white">{selectedDeckName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {settingGroups.map((group) => (
                  <div key={group.key} className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200 mb-2">{group.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.options.map((option) => {
                        const active = Number(room[group.key]) === option;
                        return (
                          <button key={option} type="button" disabled={!isAdmin || room.status !== 'LOBBY'} onClick={() => updateSettings({ [group.key]: option })} className={cn('h-9 rounded-xl border-2 text-xs font-black transition-all disabled:opacity-50', active ? 'bg-yellow-300 border-yellow-300 text-slate-950' : 'bg-white/10 border-cyan-200/20 text-cyan-100 hover:border-yellow-300')}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/10 p-3 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200 mb-2 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> Bots convidados</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].filter((value) => value <= maxBots).map((value) => (
                      <button key={value} type="button" disabled={!isAdmin || room.status !== 'LOBBY'} onClick={() => setBotsCount(value)} className={cn('h-9 min-w-10 rounded-xl border-2 px-3 text-xs font-black transition-all disabled:opacity-50', clampedBotsCount === value ? 'bg-yellow-300 border-yellow-300 text-slate-950' : 'bg-white/10 border-cyan-200/20 text-cyan-100 hover:border-yellow-300')}>
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-blue-100">Participantes previstos: {expectedParticipants}/{room.max_players || 6}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ChatMenu room={room} me={me} />
      <AvatarPickerModal open={avatarPickerOpen} initial={myAvatarSelection} onClose={() => setAvatarPickerOpen(false)} onSave={saveAvatar} />
    </div>
  );
}
