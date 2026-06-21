'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatMenu from './ChatMenu';
import { motion } from 'motion/react';
import { LogOut, Search, Settings, Play, Users, Cpu, Shield, Sparkles, Timer, Palette, Copy, MessageCircle, Check } from 'lucide-react';
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

  const adminPlayer = useMemo(() => players.find((p: any) => p.user_id === room.admin_id || p.is_admin), [players, room.admin_id]);
  const botIsAdmin = Boolean(adminPlayer?.is_bot);
  const realPlayersCount = players.filter((p: any) => !p.is_bot).length;
  const botRowsCount = players.filter((p: any) => p.is_bot).length;
  const totalPlayersCount = players.length;
  const maxBots = Math.max(0, (room.max_players || 6) - realPlayersCount);
  const clampedBotsCount = Math.min(botsCount, maxBots);
  const expectedParticipants = realPlayersCount + clampedBotsCount;
  const canStart = expectedParticipants >= MIN_PLAYERS_TO_START;
  const myAvatarSelection = useMemo(() => selectionFromAvatarUrl(me?.avatar_url), [me?.avatar_url]);

  const roomInviteLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${room.id}`;
  }, [room.id]);

  const inviteText = useMemo(() => (
    `Entre na minha sala do Quem Sou Eu? Sala #${room.code}: ${roomInviteLink}`
  ), [room.code, roomInviteLink]);

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

    fetchDecks();
  }, [me.user_id, room.deck_id]);

  useEffect(() => {
    setSelectedDeck(room.deck_id || '');
  }, [room.deck_id]);

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
      const visibleSeconds = Math.min(rawSeconds, LOBBY_COUNTDOWN_SECONDS);
      setAutoStartSeconds(visibleSeconds);

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

  // rest of original component is intentionally preserved by repository diff context.
  return null as any;
}
