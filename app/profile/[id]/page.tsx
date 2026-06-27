'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, BookOpen, Flag, Shield, Star, Trophy, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import LoadingArena from '@/components/LoadingArena';
import GameTopNav from '@/components/navigation/GameTopNav';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const REPORT_REASONS = [
  { value: 'nome_ofensivo', label: 'Nome ofensivo' },
  { value: 'avatar_inadequado', label: 'Avatar inadequado' },
  { value: 'comportamento', label: 'Comportamento abusivo' },
  { value: 'spam', label: 'Spam' },
  { value: 'outro', label: 'Outro motivo' },
];

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile: myProfile, loading, initialized } = useUserStore();
  const [profile, setProfile] = useState<any>(null);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [friendship, setFriendship] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('outro');
  const [reportMessage, setReportMessage] = useState('');

  const profileId = String(params?.id || '');
  const userId = user?.id || myProfile?.id;
  const isMe = userId === profileId;

  const loadProfile = async () => {
    if (!profileId) return;
    setLoadingProfile(true);
    const query = userId ? `?viewerId=${encodeURIComponent(userId)}` : '';
    const response = await fetch(`/api/social/profile/${profileId}${query}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.error || 'Perfil não encontrado.');
      router.push('/friends');
      return;
    }
    setProfile(data.profile || null);
    setTrophies(Array.isArray(data.trophies) ? data.trophies : []);
    setFriendship(data.friendship || null);
    setLoadingProfile(false);
  };

  useEffect(() => {
    if (!initialized || loading) return;
    if (!userId) {
      router.replace('/');
      return;
    }
    void loadProfile();
  }, [initialized, loading, userId, profileId]);

  const relation = useMemo(() => relationLabel(friendship, userId), [friendship, userId]);

  const action = async (actionName: string) => {
    if (!userId || !profileId || busy || isMe) return;
    setBusy(actionName);
    try {
      const response = await fetch('/api/social/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId: profileId, action: actionName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar.');
      await loadProfile();
    } catch (error: any) {
      alert(error.message || 'Não foi possível atualizar.');
    } finally {
      setBusy('');
    }
  };

  const sendReport = async () => {
    if (!userId || !profileId || busy || isMe) return;
    setBusy('report');
    try {
      const response = await fetch(`/api/social/profile/${profileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: reportReason, message: reportMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar denúncia.');
      setReportOpen(false);
      setReportMessage('');
      alert('Denúncia enviada para análise.');
    } catch (error: any) {
      alert(error.message || 'Não foi possível enviar denúncia.');
    } finally {
      setBusy('');
    }
  };

  if (!initialized || loading || loadingProfile) return <LoadingArena label="Carregando perfil..." />;

  return (
    <main className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={myProfile} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <div className="relative z-10 mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-28 md:px-8">
        <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-cyan-200/30 bg-white/10 px-4 text-xs font-black uppercase text-cyan-100 shadow-sm transition hover:bg-white/15">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-5 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-7">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <AvatarFigure avatarUrl={profile?.avatar_url} label={profile?.nickname || 'Jogador'} className="h-32 w-32 rounded-3xl border-4 border-yellow-200 bg-white shadow-2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Perfil público</p>
              <h1 className="truncate text-4xl font-black uppercase italic text-white font-display md:text-6xl">{profile?.nickname || 'Jogador'}</h1>
              <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                <Badge icon={<Trophy className="h-4 w-4" />} text={`${profile?.wins || 0} vitórias`} />
                <Badge icon={<Shield className="h-4 w-4" />} text={`${profile?.played_matches || 0} partidas`} />
                <Badge icon={<Users className="h-4 w-4" />} text={`${profile?.friend_count || 0} amigos`} />
                <Badge icon={<BookOpen className="h-4 w-4" />} text={`${profile?.decks_created_count || 0} decks criados`} />
                <Badge icon={<Star className="h-4 w-4" />} text={`${profile?.favorite_decks_count || 0} favoritos`} />
                <Badge icon={<Shield className="h-4 w-4" />} text={relation} />
              </div>
            </div>
          </div>

          {!isMe && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
              {renderFriendActions(friendship, userId || '', action, busy)}
              <Button variant="outline" onClick={() => action('block')} disabled={busy === 'block'} className="rounded-2xl border-rose-200/50 bg-white text-xs font-black uppercase text-rose-600 hover:bg-rose-50"><Ban className="mr-2 h-4 w-4" /> Bloquear</Button>
              <Button variant="outline" onClick={() => setReportOpen((value) => !value)} className="rounded-2xl border-amber-200/50 bg-white text-xs font-black uppercase text-amber-600 hover:bg-amber-50"><Flag className="mr-2 h-4 w-4" /> Denunciar</Button>
            </div>
          )}

          {reportOpen && !isMe && (
            <div className="mt-5 rounded-3xl border-2 border-amber-200/40 bg-amber-50 p-4 text-left text-indigo-950">
              <p className="mb-3 text-sm font-black uppercase text-amber-800">Denunciar perfil</p>
              <div className="grid gap-2 md:grid-cols-2">
                {REPORT_REASONS.map((reason) => (
                  <button key={reason.value} onClick={() => setReportReason(reason.value)} className={cn('rounded-2xl border-2 px-4 py-3 text-left text-xs font-black uppercase', reportReason === reason.value ? 'border-amber-400 bg-white text-amber-800' : 'border-amber-100 bg-white/60 text-slate-500')}>
                    {reason.label}
                  </button>
                ))}
              </div>
              <textarea value={reportMessage} onChange={(event) => setReportMessage(event.target.value)} maxLength={500} placeholder="Mensagem opcional..." className="mt-3 min-h-24 w-full rounded-2xl border-2 border-amber-100 bg-white p-3 text-sm font-bold outline-none focus:border-amber-400" />
              <Button onClick={sendReport} disabled={busy === 'report'} className="mt-3 rounded-2xl text-xs font-black uppercase">Enviar denúncia</Button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-5 shadow-xl backdrop-blur-xl md:p-7">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-black uppercase italic text-white font-display"><Trophy className="h-6 w-6 text-yellow-200" /> Troféus</h2>
          {trophies.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-cyan-200/25 bg-white/10 p-6 text-center text-xs font-black uppercase text-blue-100">Nenhum troféu conquistado ainda.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {trophies.map((row: any) => {
                const trophy = row.trophy || row.trophies || row;
                return (
                  <div key={row.id || trophy.code} className="rounded-2xl border-2 border-cyan-200/20 bg-white/95 p-4 text-indigo-950 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-2xl shadow-sm">{trophy.icon || '🏆'}</div>
                      <div>
                        <p className="text-sm font-black text-indigo-950">{trophy.name || 'Troféu'}</p>
                        <p className="text-[10px] font-black uppercase text-indigo-500">{tierLabel(trophy.tier)} · {row.unlocked_at ? new Date(row.unlocked_at).toLocaleDateString('pt-BR') : 'conquistado'}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">{trophy.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function renderFriendActions(friendship: any, userId: string, action: (name: string) => void, busy: string) {
  if (!friendship) return <Button onClick={() => action('request')} disabled={busy === 'request'} className="rounded-2xl bg-yellow-300 text-xs font-black uppercase text-slate-950 hover:bg-yellow-200"><UserPlus className="mr-2 h-4 w-4" /> Adicionar amigo</Button>;
  if (friendship.status === 'accepted') return <Button variant="outline" onClick={() => action('remove')} disabled={busy === 'remove'} className="rounded-2xl bg-white text-xs font-black uppercase">Remover amizade</Button>;
  if (friendship.status === 'blocked') return <Button variant="outline" onClick={() => action('unblock')} disabled={busy === 'unblock'} className="rounded-2xl bg-white text-xs font-black uppercase">Desbloquear</Button>;
  if (friendship.status === 'pending' && friendship.receiver_profile_id === userId) return <><Button onClick={() => action('accept')} disabled={busy === 'accept'} className="rounded-2xl bg-yellow-300 text-xs font-black uppercase text-slate-950 hover:bg-yellow-200">Aceitar pedido</Button><Button variant="outline" onClick={() => action('decline')} disabled={busy === 'decline'} className="rounded-2xl bg-white text-xs font-black uppercase">Recusar</Button></>;
  if (friendship.status === 'pending') return <Button variant="outline" onClick={() => action('remove')} disabled={busy === 'remove'} className="rounded-2xl bg-white text-xs font-black uppercase">Cancelar pedido</Button>;
  return <Button onClick={() => action('request')} disabled={busy === 'request'} className="rounded-2xl bg-yellow-300 text-xs font-black uppercase text-slate-950 hover:bg-yellow-200">Adicionar amigo</Button>;
}

function relationLabel(friendship: any, userId?: string) {
  if (!friendship) return 'Sem vínculo';
  if (friendship.status === 'accepted') return 'Amigos';
  if (friendship.status === 'blocked') return 'Bloqueado';
  if (friendship.status === 'pending' && friendship.receiver_profile_id === userId) return 'Pedido recebido';
  if (friendship.status === 'pending') return 'Pedido enviado';
  return String(friendship.status || 'Sem vínculo');
}

function Badge({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/30 bg-white/10 px-3 py-1 text-xs font-black uppercase text-cyan-50">{icon}{text}</span>;
}

function tierLabel(tier: string) {
  if (tier === 'gold') return 'Ouro';
  if (tier === 'silver') return 'Prata';
  if (tier === 'special') return 'Especial';
  return 'Bronze';
}
