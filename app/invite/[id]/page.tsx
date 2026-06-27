'use client';

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Gamepad2, Loader2, Music, PartyPopper, Play, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import LoadingArena from '@/components/LoadingArena';
import { useUserStore } from '@/lib/store';
import { avatarSelectionToUrl, catalogItemToSelection, R2_AVATAR_CATALOG, selectionFromAvatarUrl, type AvatarSelection } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { moderateText } from '@/app/actions/moderate';

type InviteStep = 'choice' | 'login' | 'welcome' | 'nickname' | 'avatar' | 'music' | 'tutorial';

type RoomInvite = {
  id: string;
  room_id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  status: string;
  message?: string;
  room?: { id: string; code?: string; status?: string; max_players?: number } | null;
  sender?: { id: string; nickname?: string; avatar_url?: string } | null;
};

const PENDING_INVITE_KEY = 'quemSouEu:pendingInvite';
const defaultAvatar = catalogItemToSelection(R2_AVATAR_CATALOG[0]);

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const inviteId = String(params.id || '');
  const { user, profile, initialized, loading, loginGuest, setSessionUser } = useUserStore();
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [step, setStep] = useState<InviteStep>('choice');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarSelection>(defaultAvatar);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const autoAcceptedRef = useRef(false);

  const senderName = invite?.sender?.nickname || 'Um jogador';
  const roomLabel = invite?.room?.code ? `Sala #${invite.room.code}` : 'Partida';
  const canEnterRoom = Boolean(invite?.room?.id && (!invite.room.status || invite.room.status === 'LOBBY'));
  const inviteUnavailable = invite && (!invite.room?.id || invite.status === 'cancelled' || invite.status === 'declined' || (invite.room?.status && invite.room.status !== 'LOBBY'));

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setLoadingInvite(true);
      setError('');
      const response = await fetch(`/api/social/room-invites?inviteId=${encodeURIComponent(inviteId)}`, { cache: 'no-store' }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) : {};

      if (cancelled) return;

      if (!response?.ok || !result.invite) {
        setInvite(null);
        setError(result.error || 'Convite não encontrado.');
      } else {
        setInvite(result.invite);
      }

      setLoadingInvite(false);
    }

    if (inviteId) void loadInvite();
    return () => { cancelled = true; };
  }, [inviteId]);

  useEffect(() => {
    const current = selectionFromAvatarUrl(profile?.avatar_url);
    if (current) setSelectedAvatar(current);
    if (profile?.nickname) setNickname(profile.nickname);
    if (Array.isArray(profile?.music_genres)) setSelectedGenres(profile.music_genres);
  }, [profile?.avatar_url, profile?.nickname, profile?.music_genres]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/audio/genres', { cache: 'force-cache' })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setGenres(Array.isArray(result.genres) ? result.genres.slice(0, 8) : []);
      })
      .catch(() => {
        if (!cancelled) setGenres(['Disco', 'K-pop', 'Rock', 'Indie', 'Pop', 'Funk']);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!initialized || loading || loadingInvite || !invite || !user?.id || autoAcceptedRef.current) return;
    const pending = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_INVITE_KEY) : '';
    const shouldContinue = searchParams.get('continue') === '1' || pending === inviteId;
    if (!shouldContinue) return;
    autoAcceptedRef.current = true;
    void acceptInvite(user.id);
  }, [initialized, loading, loadingInvite, invite, user?.id, inviteId, searchParams]);

  async function acceptInvite(userId: string) {
    if (!invite?.id || !userId || busy) return;
    setBusy('accept');
    setError('');

    try {
      const response = await fetch('/api/social/room-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', inviteId: invite.id, userId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível aceitar o convite.');
      if (typeof window !== 'undefined') sessionStorage.removeItem(PENDING_INVITE_KEY);
      router.replace(`/room/${result.roomId || invite.room_id}`);
    } catch (acceptError: any) {
      setError(acceptError.message || 'Não foi possível entrar na partida.');
      setBusy('');
    }
  }

  function enterWithAccount() {
    if (!invite?.id || inviteUnavailable) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(PENDING_INVITE_KEY, invite.id);
    if (!user?.id) {
      setStep('login');
      return;
    }
    void acceptInvite(user.id);
  }

  async function saveProfilePatch(patch: Record<string, any>) {
    const currentUser = useUserStore.getState().user;
    const currentProfile = useUserStore.getState().profile || {};
    if (!currentUser?.id) throw new Error('Perfil não encontrado.');

    const response = await fetch('/api/player-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...currentProfile,
        ...patch,
        id: currentUser.id,
        nickname: patch.nickname || currentProfile.nickname || nickname || 'Visitante',
        is_guest: Boolean(currentProfile.is_guest || currentUser.email?.includes('@guest.com')),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar seu jogador.');
    setSessionUser(currentUser, result.profile);
    return result.profile;
  }

  async function submitNickname(event?: FormEvent) {
    event?.preventDefault();
    const cleanNickname = nickname.trim().replace(/\s+/g, ' ') || `Visitante ${Math.floor(100 + Math.random() * 900)}`;

    setBusy('nickname');
    setError('');

    try {
      const safe = await moderateText(cleanNickname);
      if (!safe) throw new Error('Use outro apelido.');
      await loginGuest(cleanNickname);
      setNickname(cleanNickname);
      setStep('avatar');
    } catch (nicknameError: any) {
      setError(nicknameError.message || 'Não foi possível salvar seu apelido.');
    } finally {
      setBusy('');
    }
  }

  async function saveAvatarAndContinue(skip = false) {
    setBusy('avatar');
    setError('');

    try {
      const avatar = skip ? selectedAvatar || defaultAvatar : selectedAvatar;
      await saveProfilePatch({ avatar_url: avatarSelectionToUrl(avatar), profile_completed: true });
      setStep('music');
    } catch (avatarError: any) {
      setError(avatarError.message || 'Não foi possível salvar seu avatar.');
    } finally {
      setBusy('');
    }
  }

  async function saveMusicAndContinue(skip = false) {
    setBusy('music');
    setError('');

    try {
      await saveProfilePatch({ music_genres: skip ? [] : selectedGenres, profile_completed: true });
      setStep('tutorial');
    } catch (musicError: any) {
      setError(musicError.message || 'Não foi possível salvar suas músicas.');
    } finally {
      setBusy('');
    }
  }

  async function finishGuestOnboarding() {
    const currentUser = useUserStore.getState().user;
    if (!currentUser?.id) {
      setStep('nickname');
      return;
    }
    await acceptInvite(currentUser.id);
  }

  const statusText = useMemo(() => {
    if (!invite) return 'Convite';
    if (!invite.room?.id) return 'Sala indisponível';
    if (invite.status === 'cancelled' || invite.status === 'declined') return 'Convite encerrado';
    if (invite.room.status && invite.room.status !== 'LOBBY') return 'Partida indisponível';
    if (invite.status === 'accepted') return 'Convite aceito';
    return 'Convite recebido';
  }, [invite]);

  if (!initialized || loading || loadingInvite) return <LoadingArena label="Carregando convite..." />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071a64] px-4 py-8 text-white font-sans">
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <section className="grid w-full gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/85 p-5 shadow-2xl backdrop-blur-xl">
            <button type="button" onClick={() => router.push('/')} className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-100 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
            <div className="rounded-3xl border-2 border-cyan-100/20 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">{statusText}</p>
              <h1 className="mt-2 text-3xl font-black uppercase text-white font-display">{senderName} convidou você para uma partida</h1>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-200/20 bg-white/10 p-3">
                <AvatarFigure avatarUrl={invite?.sender?.avatar_url} label={senderName} className="h-14 w-14 rounded-2xl border-2 border-white bg-white" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{senderName}</p>
                  <p className="text-xs font-bold text-cyan-100">{roomLabel}</p>
                </div>
              </div>
            </div>
            {inviteUnavailable && (
              <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
                {!invite?.room?.id ? 'A sala desse convite não existe mais.' : invite.status === 'cancelled' || invite.status === 'declined' ? 'Esse convite foi encerrado.' : 'Essa partida já começou ou não aceita novos jogadores.'}
              </div>
            )}
            {error && <div className="mt-4 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{error}</div>}
          </aside>

          <div className="rounded-3xl border-4 border-cyan-200/25 bg-white p-5 text-slate-950 shadow-2xl md:p-7">
            {!invite ? (
              <StateCard icon={<Gamepad2 className="h-7 w-7" />} title="Convite inválido" text="Não encontramos esse convite. Peça um novo link para quem criou a sala." />
            ) : step === 'login' ? (
              <StateCard icon={<UserRound className="h-7 w-7" />} title="Entrar com conta" text="Entre com Google para continuar o convite sem perder o link.">
                <GoogleLoginButton redirectTo={`/invite/${invite.id}?continue=1`} text="continue_with" />
                <Button type="button" variant="outline" onClick={() => setStep('choice')} className="mt-3 h-12 w-full rounded-2xl border-2 font-black uppercase">Voltar</Button>
              </StateCard>
            ) : step === 'welcome' ? (
              <StateCard icon={<PartyPopper className="h-7 w-7" />} title="Antes de entrar, personalize seu jogador." text="Leva menos de um minuto. Você pode pular partes e ajustar depois no perfil.">
                <Button type="button" onClick={() => setStep('nickname')} className="h-14 w-full rounded-2xl bg-yellow-300 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">Escolher apelido</Button>
                <Button type="button" variant="outline" onClick={submitNickname} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Pular por enquanto</Button>
              </StateCard>
            ) : step === 'nickname' ? (
              <StateCard icon={<UserRound className="h-7 w-7" />} title="Escolher apelido" text="Esse nome aparece para os outros jogadores na sala.">
                <form onSubmit={submitNickname} className="space-y-3">
                  <Input value={nickname} maxLength={16} onChange={(event) => setNickname(event.target.value)} placeholder="Seu apelido" className="h-14 rounded-2xl border-2 text-center text-lg font-black uppercase" />
                  <Button type="submit" disabled={busy === 'nickname'} className="h-14 w-full rounded-2xl bg-yellow-300 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">{busy === 'nickname' ? 'Salvando...' : 'Escolher avatar'}</Button>
                  <Button type="button" variant="outline" onClick={submitNickname} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Pular por enquanto</Button>
                </form>
              </StateCard>
            ) : step === 'avatar' ? (
              <StateCard icon={<UserRound className="h-7 w-7" />} title="Escolher avatar" text="Escolha um visual básico para entrar na partida.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {R2_AVATAR_CATALOG.slice(0, 8).map((avatar) => {
                    const selection = catalogItemToSelection(avatar);
                    const active = selectedAvatar.avatarId === selection.avatarId;
                    return (
                      <button key={avatar.avatarId} type="button" onClick={() => setSelectedAvatar(selection)} className={cn('rounded-2xl border-2 bg-white p-2 text-left transition', active ? 'border-yellow-400 ring-4 ring-yellow-200' : 'border-slate-200 hover:border-indigo-300')}>
                        <AvatarFigure selection={selection} className="aspect-square w-full rounded-xl bg-slate-50" imageClassName="object-cover" />
                        <p className="mt-2 truncate text-[10px] font-black uppercase text-slate-700">{avatar.displayName}</p>
                      </button>
                    );
                  })}
                </div>
                <Button type="button" onClick={() => saveAvatarAndContinue(false)} disabled={busy === 'avatar'} className="h-14 w-full rounded-2xl bg-yellow-300 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">{busy === 'avatar' ? 'Salvando...' : 'Escolher música'}</Button>
                <Button type="button" variant="outline" onClick={() => saveAvatarAndContinue(true)} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Pular por enquanto</Button>
              </StateCard>
            ) : step === 'music' ? (
              <StateCard icon={<Music className="h-7 w-7" />} title="Escolher música" text="Marque seus gêneros favoritos para a trilha da partida.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {genres.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return <button key={genre} type="button" onClick={() => setSelectedGenres((current) => active ? current.filter((item) => item !== genre) : [...current, genre])} className={cn('h-11 rounded-2xl border-2 px-3 text-xs font-black uppercase', active ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-600')}>{genre}</button>;
                  })}
                </div>
                <Button type="button" onClick={() => saveMusicAndContinue(false)} disabled={busy === 'music'} className="h-14 w-full rounded-2xl bg-yellow-300 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">{busy === 'music' ? 'Salvando...' : 'Ver tutorial'}</Button>
                <Button type="button" variant="outline" onClick={() => saveMusicAndContinue(true)} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Pular por enquanto</Button>
              </StateCard>
            ) : step === 'tutorial' ? (
              <StateCard icon={<BookOpen className="h-7 w-7" />} title="Ver tutorial" text="Um jogador pega uma carta secreta. Na sua vez, faça perguntas e tente adivinhar quem você é.">
                {showTutorial && (
                  <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 p-4 text-sm font-bold text-indigo-950">
                    Faça perguntas de sim ou não, observe as respostas e vote quando tiver certeza. Se errar, perde vida. O último jogador vivo vence.
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => setShowTutorial((value) => !value)} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Ver tutorial</Button>
                <Button type="button" onClick={finishGuestOnboarding} disabled={busy === 'accept'} className="h-14 w-full rounded-2xl bg-yellow-300 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">{busy === 'accept' ? 'Entrando...' : 'Entrar na partida'}</Button>
                <Button type="button" variant="outline" onClick={finishGuestOnboarding} className="h-12 w-full rounded-2xl border-2 font-black uppercase">Pular</Button>
              </StateCard>
            ) : (
              <StateCard icon={<Gamepad2 className="h-7 w-7" />} title="Escolha como entrar" text="Você pode usar sua conta ou entrar rapidamente como convidado.">
                <Button type="button" onClick={enterWithAccount} disabled={!canEnterRoom || busy === 'accept'} className="h-16 w-full rounded-2xl bg-yellow-300 text-base font-black uppercase text-slate-950 shadow-[0_6px_0_#b45309] hover:bg-yellow-200">
                  {busy === 'accept' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5 fill-current" />} Entrar com conta
                </Button>
                <Button type="button" onClick={() => setStep('welcome')} disabled={!canEnterRoom} className="h-14 w-full rounded-2xl bg-indigo-600 text-sm font-black uppercase text-white hover:bg-indigo-500">Entrar como convidado</Button>
              </StateCard>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StateCard({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[520px] flex-col justify-center rounded-3xl border-2 border-slate-100 bg-slate-50 p-5 text-center md:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg">{icon}</div>
      <h2 className="text-3xl font-black uppercase text-slate-950 font-display">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-slate-500">{text}</p>
      {children && <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-3">{children}</div>}
    </div>
  );
}
