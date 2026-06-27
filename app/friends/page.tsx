'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Check, Gamepad2, Search, Shield, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingArena from '@/components/LoadingArena';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import GameTopNav from '@/components/navigation/GameTopNav';
import { isProjectAdmin } from '@/lib/admin';

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
  const { user, profile, loading, initialized, logout } = useUserStore();
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
  const isAdminUser = isProjectAdmin(userId);

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

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
      router.push(`/invite/${invite.id}`);
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
    <main className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={profile} isAdmin={isAdminUser} onLogout={handleLogout} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 pb-8 pt-28 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Social</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Amigos</h1>
            <p className="mt-2 text-sm font-bold text-blue-100">Busque jogadores, aceite pedidos e veja convites de sala.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black uppercase sm:grid-cols-4">
            <StatPill label="Amigos" value={friends.length} />
            <StatPill label="Pedidos recebidos" value={incoming.length} highlight={incoming.length > 0} />
            <StatPill label="Pedidos enviados" value={outgoing.length} highlight={outgoing.length > 0} />
            <StatPill label="Convites de sala" value={roomInvites.length} highlight={roomInvites.length > 0} />
          </div>
        </header>

        <section className="mb-5 rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-100"><Search className="h-5 w-5 text-cyan-200" /> Procurar jogador</h2>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="DIGITE O NICKNAME..." className="h-14 rounded-none border-2 border-cyan-200/30 bg-white/10 text-sm font-black uppercase text-white placeholder:text-blue-100/70 focus-visible:ring-yellow-300" />
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

        <section className="mb-5 rounded-3xl border-4 border-amber-200/30 bg-[#082c7a]/80 p-4 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-yellow-200"><Gamepad2 className="h-5 w-5" /> Convites para sala</h2>
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

        <div className="grid gap-5 lg:grid-cols-2">
          <SocialSection title="Pedidos recebidos" icon={<UserPlus className="h-5 w-5 text-yellow-200" />} rows={incoming} empty="Nenhum pedido recebido.">
            {(row) => <><Button size="sm" variant="outline" onClick={() => router.push(`/profile/${row.other_profile_id}`)} className="rounded-xl text-[10px] font-black uppercase">Ver perfil</Button><Button size="sm" onClick={() => action(row.other_profile_id, 'accept')} className="rounded-xl text-[10px] font-black uppercase"><Check className="mr-1 h-3.5 w-3.5" />Aceitar</Button><Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'decline')} className="rounded-xl text-[10px] font-black uppercase"><X className="mr-1 h-3.5 w-3.5" />Recusar</Button></>}
          </SocialSection>

          <SocialSection title="Pedidos enviados" icon={<Users className="h-5 w-5 text-cyan-200" />} rows={outgoing} empty="Nenhum pedido enviado.">
            {(row) => <><Button size="sm" variant="outline" onClick={() => router.push(`/profile/${row.other_profile_id}`)} className="rounded-xl text-[10px] font-black uppercase">Ver perfil</Button><Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'cancel')} className="rounded-xl text-[10px] font-black uppercase">Cancelar</Button></>}
          </SocialSection>

          <SocialSection title="Meus amigos" icon={<Users className="h-5 w-5 text-emerald-300" />} rows={friends} empty="Você ainda não tem amigos adicionados.">
            {(row) => <><Button size="sm" variant="outline" onClick={() => router.push(`/profile/${row.other_profile_id}`)} className="rounded-xl text-[10px] font-black uppercase">Perfil</Button><Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'remove')} className="rounded-xl text-[10px] font-black uppercase">Remover</Button><Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'block')} className="rounded-xl text-[10px] font-black uppercase text-rose-600">Bloquear</Button></>}
          </SocialSection>

          <SocialSection title="Bloqueados" icon={<Shield className="h-5 w-5 text-rose-300" />} rows={blocked} empty="Nenhum usuário bloqueado.">
            {(row) => <Button size="sm" variant="outline" onClick={() => action(row.other_profile_id, 'unblock')} className="rounded-xl text-[10px] font-black uppercase">Desbloquear</Button>}
          </SocialSection>
        </div>
      </div>
    </main>
  );
}

function StatPill({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <div className={cn('rounded-xl border px-4 py-2 text-cyan-50', highlight ? 'border-yellow-200/70 bg-yellow-300 text-slate-950 shadow-[0_0_0_3px_rgba(250,204,21,.18)]' : 'border-cyan-200/30 bg-white/10')}><div className="text-lg font-black">{value}</div><div className={cn('text-[9px] tracking-wider', highlight ? 'text-slate-950' : 'text-cyan-200')}>{label}</div></div>;
}

function SocialSection({ title, icon, rows, empty, children }: { title: string; icon: ReactNode; rows: SocialRow[]; empty: string; children: (row: SocialRow) => ReactNode }) {
  return (
    <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-5 shadow-xl backdrop-blur-xl">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">{icon}{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 ? <EmptyCard text={empty} /> : rows.map((row) => <ProfileCard key={row.id} profile={row.other_profile} subtext={relationLabel(row)}>{children(row)}</ProfileCard>)}
      </div>
    </section>
  );
}

function ProfileCard({ profile, subtext, children }: { profile: any; subtext?: string; children?: ReactNode }) {
  if (!profile) return <EmptyCard text="Perfil indisponível." />;
  return (
    <div className="rounded-2xl border-2 border-cyan-200/20 bg-white/95 p-3 text-[#1e1b4b] shadow-lg">
      <div className="flex items-center gap-3">
        <AvatarFigure avatarUrl={profile.avatar_url} label={profile.nickname || 'Jogador'} className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white bg-indigo-50 shadow-inner" />
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
  return <div className="rounded-2xl border-2 border-dashed border-cyan-200/25 bg-white/10 p-4 text-center text-xs font-black uppercase text-blue-100">{text}</div>;
}

function relationLabel(row?: SocialRow) {
  if (!row) return 'Sem vínculo';
  if (row.status === 'accepted') return 'Amigos';
  if (row.status === 'blocked') return 'Bloqueado';
  if (row.status === 'pending' && row.direction === 'incoming') return 'Pedido recebido';
  if (row.status === 'pending' && row.direction === 'outgoing') return 'Pedido enviado';
  return row.status;
}
