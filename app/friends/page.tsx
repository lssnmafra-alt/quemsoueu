'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, Check, Gamepad2, Search, Shield, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import LoadingArena from '@/components/LoadingArena';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type SocialRow = {
  id: string;
  status: string;
  direction: 'incoming' | 'outgoing';
  other_profile_id: string;
  other_profile: any;
  blocked_by_profile_id?: string | null;
};

type RoomInvite = {
  id: string;
  room_id: string;
  sender_profile_id: string;
  sender?: any;
  room?: any;
};

export default function FriendsPage() {
  const router = useRouter();
  const { user, profile, loading, initialized } = useUserStore();
  const [friends, setFriends] = useState<SocialRow[]>([]);
  const [incoming, setIncoming] = useState<SocialRow[]>([]);
  const [outgoing, setOutgoing] = useState<SocialRow[]>([]);
  const [blocked, setBlocked] = useState<SocialRow[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [loadingList, setLoadingList] = useState(true);

  const userId = user?.id || profile?.id;

  const loadFriends = async (nextSearch = search) => {
    if (!userId) return;
    setLoadingList(true);
    const params = new URLSearchParams({ userId });
    if (nextSearch.trim().length >= 2) params.set('search', nextSearch.trim());
    const response = await fetch(`/api/social/friends?${params.toString()}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    setFriends(Array.isArray(data.friends) ? data.friends : []);
    setIncoming(Array.isArray(data.incoming) ? data.incoming : []);
    setOutgoing(Array.isArray(data.outgoing) ? data.outgoing : []);
    setBlocked(Array.isArray(data.blocked) ? data.blocked : []);
    setSearchResults(Array.isArray(data.searchResults) ? data.searchResults : []);
    setLoadingList(false);
  };

  const loadRoomInvites = async () => {
    if (!userId) return;
    const response = await fetch(`/api/social/room-invites?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    setRoomInvites(Array.isArray(data.invites) ? data.invites : []);
  };

  useEffect(() => {
    if (!initialized || loading) return;
    if (!userId) {
      router.replace('/');
      return;
    }
    void loadFriends('');
    void loadRoomInvites();
  }, [initialized, loading, userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(() => void loadFriends(search), 350);
    return () => window.clearTimeout(timer);
  }, [search, userId]);

  const existingByProfileId = useMemo(() => {
    const map = new Map<string, SocialRow>();
    [...friends, ...incoming, ...outgoing, ...blocked].forEach((row) => map.set(row.other_profile_id, row));
    return map;
  }, [friends, incoming, outgoing, blocked]);

  const action = async (targetId: string, actionName: string) => {
    if (!userId || busy) return;
    setBusy(`${actionName}:${targetId}`);
    try {
      const response = await fetch('/api/social/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId, action: actionName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nao foi possivel atualizar.');
      await loadFriends(search);
    } catch (error: any) {
      alert(error.message || 'Nao foi possivel atualizar.');
    } finally {
      setBusy('');
    }
  };

  const roomInviteAction = async (invite: RoomInvite, actionName: 'decline' | 'enter') => {
    if (!userId || busy) return;
    if (actionName === 'enter') {
      router.push(`/room/${invite.room_id}`);
      return;
    }

    setBusy(`${actionName}:${invite.id}`);
    try {
      await fetch('/api/social/room-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId: invite.sender_profile_id, roomId: invite.room_id, action: 'decline' }),
      });
      await loadRoomInvites();
    } finally {
      setBusy('');
    }
  };

  if (!initialized || loading || !userId) return <LoadingArena label="Carregando amigos..." />;

  return (
    <main className="min-h-screen bg-[#f5f6ff] party-grid-bg p-4 md:p-8 text-indigo-950">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button onClick={() => router.push('/lobby')} className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase text-indigo-500">
              <ArrowLeft className="h-4 w-4" /> Voltar ao lobby
            </button>
            <h1 className="text-3xl md:text-5xl font-black font-display">Amigos</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Busque jogadores, aceite amigos e veja convites de sala.</p>
          </div>
          <AvatarFigure avatarUrl={profile?.avatar_url} label={profile?.nickname || 'Jogador'} className="h-16 w-16 rounded-2xl border-4 border-indigo-200 bg-white" />
        </header>

        <section className="rounded-3xl border-4 border-amber-100 bg-white p-5 shadow-xl">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase"><Gamepad2 className="h-5 w-5 text-amber-500" /> Convites para sala</h2>
          {roomInvites.length === 0 ? (
            <EmptyCard text="Nenhum amigo chamou você para uma sala agora." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {roomInvites.map((invite) => (
                <ProfileCard key={invite.id} profile={invite.sender} subtext={`Chamou para a sala #${invite.room?.code || 'jogo'}`}>
                  <Button size="sm" onClick={() => roomInviteAction(invite, 'enter')} className="rounded-xl text-[10px] font-black uppercase"><Gamepad2 className="mr-1 h-3.5 w-3.5" />Entrar</Button>
                  <Button size="sm" variant="outline" onClick={() => roomInviteAction(invite, 'decline')} className="rounded-xl text-[10px] font-black uppercase"><X className="mr-1 h-3.5 w-3.5" />Recusar</Button>
                </ProfileCard>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black uppercase"><Search className="h-5 w-5 text-indigo-500" /> Procurar jogador</h2>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o nickname..." className="h-12 rounded-2xl border-2 border-indigo-100 font-bold" />
          {search.trim().length >= 2 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {loadingList ? <EmptyCard text="Buscando jogadores..." /> : searchResults.length === 0 ? <EmptyCard text="Nenhum jogador encontrado." /> : searchResults.map((item) => {
                const existing = existingByProfileId.get(item.id);
                return (
                  <ProfileCard key={item.id} profile={item} subtext={relationLabel(existing)}>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/profile/${item.id}`)} className="rounded-xl text-[10px] font-black uppercase">Perfil</Button>
                    {!existing && <Button size="sm" onClick={() => action(item.id, 'request')} disabled={busy === `request:${item.id}`} className="rounded-xl text-[10px] font-black uppercase"><UserPlus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>}
                    {existing?.status === 'pending' && existing.direction === 'incoming' && <Button size="sm" onClick={() => action(item.id, 'accept')} disabled={busy === `accept:${item.id}`} className="rounded-xl text-[10px] font-black uppercase"><Check className="mr-1 h-3.5 w-3.5" />Aceitar</Button>}
                    {existing?.status === 'pending' && <Button size="sm" variant="outline" onClick={() => action(item.id, existing.direction === 'incoming' ? 'decline' : 'cancel')} disabled={busy.includes(`:${item.id}`)} className="rounded-xl text-[10px] font-black uppercase">{existing.direction === 'incoming' ? 'Recusar' : 'Cancelar'}</Button>}
                    {existing?.status !== 'blocked' && <Button size="sm" variant="outline" onClick={() => action(item.id, 'block')} className="rounded-xl text-[10px] font-black uppercase text-rose-600"><Ban className="mr-1 h-3.5 w-3.5" />Bloquear</Button>}
                  </ProfileCard>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <SocialSection title="Pedidos recebidos" icon={<UserPlus className="h-5 w-5 text-amber-500" />} rows={incoming} empty="Nenhum pedido recebido.">
            {(row) => <>
              <Button size="sm" onClick={() => action(row.other_profile_id, 'accept')} className="rounded-xl text-[10px] font-black uppercase"><Check className="mr-1 h-3.5 w-3.5" />Aceitar</Button>
              <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'decline')} className="rounded-xl text-[10px] font-black uppercase"><X className="mr-1 h-3.5 w-3.5" />Recusar</Button>
            </>}
          </SocialSection>

          <SocialSection title="Pedidos enviados" icon={<Users className="h-5 w-5 text-indigo-500" />} rows={outgoing} empty="Nenhum pedido enviado.">
            {(row) => <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'cancel')} className="rounded-xl text-[10px] font-black uppercase">Cancelar</Button>}
          </SocialSection>

          <SocialSection title="Meus amigos" icon={<Users className="h-5 w-5 text-emerald-500" />} rows={friends} empty="Você ainda não tem amigos adicionados.">
            {(row) => <>
              <Button size="sm" variant="outline" onClick={() => router.push(`/profile/${row.other_profile_id}`)} className="rounded-xl text-[10px] font-black uppercase">Perfil</Button>
              <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'remove')} className="rounded-xl text-[10px] font-black uppercase">Remover</Button>
              <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'block')} className="rounded-xl text-[10px] font-black uppercase text-rose-600">Bloquear</Button>
            </>}
          </SocialSection>

          <SocialSection title="Bloqueados" icon={<Shield className="h-5 w-5 text-rose-500" />} rows={blocked} empty="Nenhum usuário bloqueado.">
            {(row) => <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'unblock')} className="rounded-xl text-[10px] font-black uppercase">Desbloquear</Button>}
          </SocialSection>
        </div>
      </div>
    </main>
  );
}

function SocialSection({ title, icon, rows, empty, children }: { title: string; icon: ReactNode; rows: SocialRow[]; empty: string; children: (row: SocialRow) => ReactNode }) {
  return (
    <section className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase">{icon}{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 ? <EmptyCard text={empty} /> : rows.map((row) => <ProfileCard key={row.id} profile={row.other_profile} subtext={relationLabel(row)}>{children(row)}</ProfileCard>)}
      </div>
    </section>
  );
}

function ProfileCard({ profile, subtext, children }: { profile: any; subtext?: string; children?: ReactNode }) {
  if (!profile) return <EmptyCard text="Perfil indisponível." />;
  return (
    <div className="rounded-2xl border-2 border-indigo-50 bg-indigo-50/30 p-3">
      <div className="flex items-center gap-3">
        <AvatarFigure avatarUrl={profile.avatar_url} label={profile.nickname} className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white bg-white" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black leading-tight text-indigo-950">{profile.nickname || 'Jogador'}</p>
          <p className="truncate text-[11px] font-black uppercase text-slate-500">{subtext || `${profile.wins || 0} vitórias · ${profile.played_matches || 0} partidas`}</p>
        </div>
      </div>
      <div className={cn('mt-3 flex flex-wrap gap-2', 'justify-start sm:justify-end')}>{children}</div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-4 text-center text-xs font-black uppercase text-slate-400">{text}</div>;
}

function relationLabel(row?: SocialRow) {
  if (!row) return 'Sem vínculo';
  if (row.status === 'accepted') return 'Amigos';
  if (row.status === 'blocked') return 'Bloqueado';
  if (row.status === 'pending' && row.direction === 'incoming') return 'Pedido recebido';
  if (row.status === 'pending' && row.direction === 'outgoing') return 'Pedido enviado';
  return row.status;
}
