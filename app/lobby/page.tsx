'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { supabaseGame } from '@/lib/supabase';
import { audioManager } from '@/lib/audioManager';
import { Button } from '@/components/ui/button';
import { Users, LayoutGrid, Plus, LogOut, Search, ArrowRight, BookOpen, Star, StarOff, Globe, Lock, Eye, Pencil, Trophy, Gamepad2, Circle, Timer, Crown, UserRound, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { isProjectAdmin } from '@/lib/admin';
import { isOfficialDeckId } from '@/lib/officialDecks';

const OFFICIAL_DECK_ID = '__official__';

export default function HomeLobby() {
  const router = useRouter();
  const { user, profile, logout, loading: authLoading, initialized: authInitialized } = useUserStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [decks, setDecks] = useState<any[]>([]);
  const [favoriteDeckIds, setFavoriteDeckIds] = useState<Set<string>>(new Set());
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckSearch, setDeckSearch] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState('');
  const [deletingDeckId, setDeletingDeckId] = useState('');

  const isAdminUser = isProjectAdmin(user?.id);

  useEffect(() => {
    if (!authInitialized || authLoading || !user) return;
    if (profile?.profile_completed) return;
    router.replace('/profile?next=/lobby');
  }, [authInitialized, authLoading, router, user?.id, profile?.profile_completed]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profile?.profile_completed) return;
    void audioManager.playMusic('lobby-theme');
  }, [authInitialized, authLoading, user?.id, profile?.profile_completed, profile?.music_genres, profile?.music_blocked_tracks]);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    if (!profile?.profile_completed) return;

    const fetchRooms = async () => {
      const response = await fetch('/api/rooms/public', { cache: 'no-store' }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) : {};
      setRooms(Array.isArray(result.rooms) ? result.rooms : []);
      setLoading(false);
    };

    fetchRooms();
    const roomCycle = setInterval(fetchRooms, 10000);

    const subscription = supabaseGame.channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => {
      clearInterval(roomCycle);
      subscription.unsubscribe();
    };
  }, [authInitialized, authLoading, router, user, profile?.profile_completed]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user || !profile?.profile_completed) return;

    const fetchDecks = async () => {
      setDeckLoading(true);

      const { data: favorites } = await supabaseGame
        .from('deck_favorites')
        .select('deck_id')
        .eq('user_id', user.id);

      const favoriteIds = (favorites || []).map((fav: any) => fav.deck_id).filter(Boolean);
      const favoriteIdSet = new Set<string>(favoriteIds);
      if (typeof window !== 'undefined' && localStorage.getItem('favoriteOfficialDeck') === 'true') {
        favoriteIdSet.add(OFFICIAL_DECK_ID);
      }
      setFavoriteDeckIds(favoriteIdSet);

      const ownOrPublicQuery = supabaseGame
        .from('decks')
        .select('*')
        .or(`is_public.eq.true,creator_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const [{ data: ownOrPublic }, { data: favoritedDecks }] = await Promise.all([
        ownOrPublicQuery,
        favoriteIds.length
          ? supabaseGame.from('decks').select('*').in('id', favoriteIds)
          : Promise.resolve({ data: [] }),
      ]);

      const mergedDecks = Array.from(
        new Map([...(ownOrPublic || []), ...(favoritedDecks || [])].map((deck: any) => [deck.id, deck])).values()
      );

      let decksWithCreators: any[] = [];

      if (mergedDecks.length > 0) {
        const { data: characters } = await supabaseGame
          .from('characters')
          .select('deck_id')
          .in('deck_id', mergedDecks.map((deck: any) => deck.id));

        const characterCounts = new Map<string, number>();
        (characters || []).forEach((char: any) => {
          characterCounts.set(char.deck_id, (characterCounts.get(char.deck_id) || 0) + 1);
        });

        const creatorIds = mergedDecks.map((d: any) => d.creator_id).filter(id => id);
        const { data: creatorProfiles } = creatorIds.length > 0
          ? await supabaseGame.from('profiles').select('id, nickname').in('id', creatorIds)
          : { data: [] };
        const creatorMap = new Map((creatorProfiles || []).map((p: any) => [p.id, p.nickname]));

        decksWithCreators = mergedDecks.map((deck: any) => {
          const deckIsOfficial = Boolean(deck.is_official) || deck.creator_id === null || isOfficialDeckId(deck.id);

          return {
            ...deck,
            character_count: characterCounts.get(deck.id) || 0,
            creator_nickname: deckIsOfficial ? 'Oficial' : (creatorMap.get(deck.creator_id) || 'Jogador'),
            is_favorite: favoriteIdSet.has(deck.id),
            is_official: deckIsOfficial,
          };
        });
      }

      setDecks(decksWithCreators.sort((a, b) => Number(b.is_official) - Number(a.is_official) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDeckLoading(false);
    };

    fetchDecks();
  }, [authInitialized, authLoading, user, profile?.profile_completed]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const createRoom = async () => {
    if (!user) return;
    // rest of file preserved below
  };
}
