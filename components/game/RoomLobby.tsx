'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatMenu from './ChatMenu';
import { motion } from 'motion/react';
import { Check, Copy, Cpu, LogOut, MessageCircle, Palette, Play, Search, Settings, Shield, Sparkles, Timer, Users } from 'lucide-react';
import AvatarFigure from '@/components/avatar/AvatarFigure';
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
  const startNudgeRef = useRef<string | null>(null);
  const repairNudgeRef = useRef<string | null>(null);

  const realPlayersCount = players.filter((p: any) => !p.is_bot).length;
  const botRowsCount = players.filter((p: any) => p.is_bot).length;
  const maxBots = Math.max(0, (room.max_players || 6) - realPlayersCount);
  const clampedBotsCount = Math.min(botsCount, maxBots);
  const expectedParticipants = realPlayersCount + clampedBotsCount;
  const canStart = expectedParticipants >= MIN_PLAYERS_TO_START;
  const myAvatarSelection = useMemo(() => selectionFromAvatarUrl(me?.avatar_url), [me?.avatar_url]);

  const roomInviteLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${room.id}`;
  }, [room.id]);

  const inviteText = useMemo(() => `Entre na minha sala do Quem Sou Eu? Sala #${room.code}: ${roomInviteLink}`, [room.code, roomInviteLink]);

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

  const copyInviteLink = async () => {
    if (!roomInviteLink) return;
    try {
      await navigator.clipboard.writeText(roomInviteLink);
      setShareNotice('Link copiado!');
    } catch {
      setShareNotice('Copie o link manualmente.');
    }
    setTimeout(() => setShareNotice(''), 2500);
  };

  const shareOnWhatsApp = () => {
    if (!roomInviteLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, '_blank', 'noopener,noreferrer');
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
    <div className="flex h-screen overflow-hidden w-full bg-[#f5f6ff] text-indigo-950 font-sans relative party-grid-bg">
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative z-10 w-full max-w-[1400px] mx-auto h-full">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-5 bg-white border-4 border-indigo-100 rounded-3xl shadow-md shrink-0 flex items-center justify-between relative">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sala de Espera</p>
            </div>
            <h1 className="text-3xl font-black font-display text-indigo-950">Sala do Jogo <span className="text-indigo-600 font-bold font-display">#{room.code}</span></h1>
          </div>
          <Button variant="ghost" onClick={leaveRoom} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-black uppercase h-11 px-5 rounded-2xl border-2 border-slate-200 transition-all cursor-pointer">
            Sair da Sala <LogOut className="w-4 h-4 ml-2" />
          </Button>
        </motion.header>

        {autoStartSeconds !== null && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl border-4 border-amber-200 bg-amber-50 px-5 py-4 text-center shadow-md">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <Timer className="h-5 w-5" />
              <p className="text-sm font-black uppercase tracking-wider">Jogador entrou. Preparando partida.</p>
            </div>
            <p className="mt-1 text-xl font-black text-amber-950 font-display">{autoStartSeconds > 0 ? `A partida começa em ${autoStartSeconds} segundos.` : 'Iniciando partida...'}</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 min-h-0 mb-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-4 h-full">
            <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2 border-b-4 border-indigo-50 pb-2"><Users className="w-6 h-6 text-indigo-500" /> Integrantes na Sala ({players.length}/{room.max_players})</h2>

            <div className="bg-white border-4 border-indigo-100 rounded-3xl p-5 flex-1 overflow-y-auto space-y-3 shadow-md min-h-[250px]">
              {players.map((p: any, index: number) => {
                const isMe = p.user_id === me.user_id;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} className={cn('flex items-center gap-4 p-4 border-2 transition-all relative overflow-hidden shadow-sm rounded-2xl bg-white', isMe ? cn(p.color?.border || 'border-indigo-400', p.color?.lightBgc || 'bg-indigo-50/20') : 'border-slate-100 hover:border-slate-200')}>
                    <div className={cn('absolute top-0 left-0 w-1.5 h-full', p.color?.bg || 'bg-slate-400')} />
                    <div className="relative shrink-0">
                      <button type="button" disabled={!isMe || room.status !== 'LOBBY'} onClick={() => isMe && setAvatarPickerOpen(true)} className="block disabled:cursor-default rounded-2xl" aria-label={isMe ? 'Trocar avatar' : `Avatar de ${p.nickname}`}>
                        <AvatarFigure avatarUrl={p.avatar_url} label={p.nickname} primaryColor={p.color?.hex} className={cn('w-12 h-12 border-2 rounded-2xl shadow-sm shrink-0', p.color?.border || 'border-slate-200', p.color?.lightBgc || 'bg-slate-100')} />
                      </button>
                      {isMe && room.status === 'LOBBY' && (
                        <button type="button" onClick={() => setAvatarPickerOpen(true)} className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl border-2 border-white bg-indigo-600 text-white shadow-md flex items-center justify-center hover:bg-indigo-700 transition-all" aria-label="Trocar avatar">
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-base font-bold truncate', p.color?.text || 'text-indigo-950')}>{p.nickname}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {p.is_admin && <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 border border-amber-200 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Dono da Sala</span>}
                        {!p.is_admin && <span className="text-[10px] bg-slate-50 text-slate-600 px-2.5 py-0.5 border border-slate-200 rounded-full">Jogador</span>}
                        {p.is_bot && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 border border-indigo-200 rounded-full font-bold">Bot Convidado</span>}
                        {isMe && <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm">Você</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-white border-4 border-emerald-100 rounded-3xl p-4 shadow-md">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Convidar amigos</p>
              <p className="mt-1 text-xs font-bold text-slate-500 break-all">{roomInviteLink}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <Button type="button" onClick={shareOnWhatsApp} className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
                <Button type="button" variant="ghost" onClick={copyInviteLink} className="h-11 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2">{shareNotice ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {shareNotice || 'Copiar link'}</Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4 h-full">
            <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2 border-b-4 border-indigo-50 pb-2"><Settings className="w-5 h-5 text-indigo-500" /> Configurações da Partida</h2>
            <div className="bg-white border-4 border-indigo-100 rounded-3xl p-6 flex flex-col gap-5 flex-1 shadow-md overflow-y-auto">
              {settingsNotice && <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-amber-700">{settingsNotice}</div>}

              <div>
                <label className="text-xs font-black text-indigo-600 uppercase tracking-wider block mb-2 border-l-4 border-indigo-500 pl-2">Tema de Cartas Escolhido</label>
                <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-3 space-y-3">
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-2 rounded-xl bg-white border-2 border-indigo-100 px-3 h-11">
                        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                        <input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="Pesquisar baralho..." className="min-w-0 flex-1 bg-transparent outline-none text-sm font-bold text-indigo-950 placeholder:text-slate-400" />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {decksLoading ? <p className="text-xs font-bold text-indigo-400 uppercase p-3">Carregando baralhos...</p> : filteredDecks.length === 0 ? <p className="text-xs font-bold text-slate-400 uppercase p-3">Nenhum baralho público encontrado.</p> : filteredDecks.map((deck: any) => (
                          <button key={deck.id} type="button" onClick={() => { setSelectedDeck(deck.id); updateSettings({ deck_id: deck.id }); }} className={cn('w-full min-h-12 rounded-xl border-2 px-3 py-2 text-left transition-all flex items-center justify-between gap-3', selectedDeck === deck.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-indigo-100 text-indigo-950 hover:border-indigo-300')}>
                            <span className="block text-sm font-black truncate">{deck.name}</span>
                            {selectedDeck === deck.id && <Sparkles className="w-4 h-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] font-bold text-indigo-600">Selecionado: {selectedDeckName}</p>
                    </>
                  ) : (
                    <div className="rounded-2xl border-2 border-indigo-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Deck selecionado</p>
                      <p className="mt-1 text-lg font-black text-indigo-950">{selectedDeckName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {settingGroups.map((group) => (
                  <div key={group.key} className="rounded-2xl border-2 border-indigo-50 bg-indigo-50/40 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2">{group.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.options.map((option) => {
                        const active = Number(room[group.key]) === option;
                        return (
                          <button key={option} type="button" disabled={!isAdmin || room.status !== 'LOBBY'} onClick={() => updateSettings({ [group.key]: option })} className={cn('h-9 rounded-xl border-2 text-xs font-black transition-all disabled:opacity-50', active ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-indigo-100 text-indigo-400 hover:border-indigo-300')}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border-2 border-indigo-50 bg-indigo-50/40 p-3 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> Bots convidados</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].filter((value) => value <= maxBots).map((value) => (
                      <button key={value} type="button" disabled={!isAdmin || room.status !== 'LOBBY'} onClick={() => setBotsCount(value)} className={cn('h-9 min-w-10 rounded-xl border-2 px-3 text-xs font-black transition-all disabled:opacity-50', clampedBotsCount === value ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-indigo-100 text-indigo-400 hover:border-indigo-300')}>
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-500">Participantes previstos: {expectedParticipants}/{room.max_players || 6}</p>
                </div>
              </div>

              {isAdmin && (
                <Button type="button" onClick={handleStart} disabled={!canStart || room.status !== 'LOBBY'} className="h-14 rounded-2xl btn-squishy-green text-white text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                  <Play className="w-5 h-5 fill-current" /> Iniciar partida
                </Button>
              )}
              {!isAdmin && <p className="text-center text-xs font-bold text-slate-500">Aguardando o dono da sala iniciar a partida.</p>}
            </div>
          </motion.div>
        </div>
      </div>

      <ChatMenu room={room} me={me} />
      <AvatarPickerModal open={avatarPickerOpen} initial={myAvatarSelection} onClose={() => setAvatarPickerOpen(false)} onSave={saveAvatar} />
    </div>
  );
}
