'use client';

import { usePathname } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { supabaseAuth, supabaseGame } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function persistLocalProfile(profile: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('quemSouEu:profile', JSON.stringify(profile));
  if (profile?.is_guest) localStorage.setItem('guestNickname', profile.nickname);
}

export default function ProfileNameButton() {
  const pathname = usePathname();
  const { user, profile } = useUserStore();

  if (!user || !profile || pathname === '/') return null;

  const changeName = async () => {
    const currentName = profile?.nickname || 'Jogador';
    const requested = window.prompt('Novo nome de usuario:', currentName);
    if (requested === null) return;

    const nickname = requested.trim().replace(/\s+/g, ' ');
    if (nickname.length < 3) {
      alert('Use pelo menos 3 caracteres.');
      return;
    }
    if (nickname.length > 16) {
      alert('Use no maximo 16 caracteres.');
      return;
    }

    const normalized = normalizeName(nickname);
    const { data: myRooms, error: myRoomsError } = await supabaseGame
      .from('room_players')
      .select('room_id')
      .eq('user_id', user.id)
      .in('is_eliminated', [false, true]);

    if (myRoomsError) {
      alert('Nao foi possivel validar o nome agora.');
      return;
    }

    const roomIds = [...new Set((myRooms || []).map((row: any) => row.room_id).filter(Boolean))];
    if (roomIds.length > 0) {
      const { data: roomPlayers, error } = await supabaseGame
        .from('room_players')
        .select('user_id,nickname,room_id')
        .in('room_id', roomIds);

      if (error) {
        alert('Nao foi possivel validar conflito de nomes agora.');
        return;
      }

      const conflict = (roomPlayers || []).some((player: any) => (
        player.user_id !== user.id && normalizeName(player.nickname || '') === normalized
      ));

      if (conflict) {
        alert('Esse nome ja esta sendo usado por outro jogador em uma das suas salas. Escolha outro.');
        return;
      }
    }

    const nextProfile = { ...profile, nickname };

    if (!profile.is_guest) {
      await supabaseAuth
        .from('profiles')
        .upsert({ id: user.id, nickname }, { onConflict: 'id' });
    }

    await supabaseGame
      .from('room_players')
      .update({ nickname })
      .eq('user_id', user.id);

    persistLocalProfile(nextProfile);
    useUserStore.setState({ profile: nextProfile });
  };

  return (
    <button
      type="button"
      onClick={changeName}
      className="fixed right-4 top-4 z-[90] flex h-11 items-center gap-2 rounded-2xl border-2 border-indigo-100 bg-white/95 px-3 text-[10px] font-black uppercase tracking-wide text-indigo-700 shadow-lg backdrop-blur transition hover:bg-indigo-50"
      aria-label="Alterar nome de usuario"
    >
      <Pencil className="h-4 w-4" />
      Nome
    </button>
  );
}
