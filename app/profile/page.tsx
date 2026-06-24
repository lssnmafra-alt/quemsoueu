'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, Music, Pause, Play, Save, SlidersHorizontal, UserRound, Volume2, X } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import GameTopNav from '@/components/navigation/GameTopNav';
import { isProjectAdmin } from '@/lib/admin';

type AvatarOption = { key: string; name: string; url: string };
type MusicTrackOption = { key: string; title: string; genre: string; folder: string; url: string };
type MusicGenreGroup = { id: string; name: string; folder: string; tracks: MusicTrackOption[] };
type PreviewTrack = { key: string; genre: string; title: string; url: string };

const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, initialized: authInitialized, setSessionUser, logout } = useUserStore();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewObjectUrlRef = useRef('');

  const [nextPath, setNextPath] = useState('/');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [musicGroups, setMusicGroups] = useState<MusicGenreGroup[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [blockedTrackKeys, setBlockedTrackKeys] = useState<string[]>([]);
  const [expandedGenreIds, setExpandedGenreIds] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSavingMusic, setAutoSavingMusic] = useState(false);
  const [error, setError] = useState('');
  const [playingTrackKey, setPlayingTrackKey] = useState('');
  const [loadingTrackKey, setLoadingTrackKey] = useState('');
  const [previewTrack, setPreviewTrack] = useState<PreviewTrack | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';
    setNextPath(next.startsWith('/') ? next : '/');
  }, []);

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    setNickname(profile?.nickname || user.email?.split('@')[0] || 'Jogador');
    setAvatarUrl(profile?.avatar_url || '');
    setSelectedGenres(Array.isArray(profile?.music_genres) ? profile.music_genres : []);
    setBlockedTrackKeys(Array.isArray(profile?.music_blocked_tracks) ? profile.music_blocked_tracks : []);
  }, [authInitialized, authLoading, router, user, profile]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user?.id) return;

    let cancelled = false;
    const currentUser = user;

    async function loadOptions() {
      setLoadingOptions(true);
      const [avatarResult, libraryResult, profileResult] = await Promise.all([
        fetch('/api/avatar-options', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ avatars: [] })),
        fetch('/api/audio/library', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ genres: [] })),
        fetch(`/api/player-profile?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ profile: null })),
      ]);

      if (cancelled) return;

      const nextMusicGroups = Array.isArray(libraryResult.genres) ? libraryResult.genres : [];
      setAvatars(Array.isArray(avatarResult.avatars) ? avatarResult.avatars : []);
      setMusicGroups(nextMusicGroups);
      setExpandedGenreIds((current) => current.length ? current : nextMusicGroups.filter((group: MusicGenreGroup) => group.tracks.length > 0).slice(0, 2).map((group: MusicGenreGroup) => group.id));

      if (profileResult.profile) {
        const savedProfile = { ...profile, ...profileResult.profile };
        setNickname(savedProfile.nickname || 'Jogador');
        setAvatarUrl(savedProfile.avatar_url || '');
        setSelectedGenres(Array.isArray(savedProfile.music_genres) ? savedProfile.music_genres : []);
        setBlockedTrackKeys(Array.isArray(savedProfile.music_blocked_tracks) ? savedProfile.music_blocked_tracks : []);
        setSessionUser(currentUser, savedProfile);
      }

      setLoadingOptions(false);
    }

    void loadOptions();
    return () => { cancelled = true; };
  }, [authInitialized, authLoading, setSessionUser, user?.id]);

  useEffect(() => {
    return () => stopPreview();
  }, []);

  const isGenreSelected = (genre: string) => selectedGenres.some((item) => normalizeId(item) === normalizeId(genre));
  const isTrackBlocked = (key: string) => blockedTrackKeys.includes(key);

  const persistMusicPreferences = async (nextGenres: string[], nextBlockedTracks: string[]) => {
    if (!user?.id) return;

    const cleanNickname = normalizeNickname(nickname) || profile?.nickname || user.email?.split('@')[0] || 'Jogador';
    const nextProfile = {
      ...profile,
      id: user.id,
      nickname: cleanNickname,
      avatar_url: avatarUrl,
      music_genres: nextGenres,
      music_blocked_tracks: nextBlockedTracks,
      profile_completed: true,
      is_guest: Boolean(profile?.is_guest || user.email?.includes('@guest.com')),
    };

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(nextGenres));
    localStorage.setItem(MUSIC_BLOCKED_TRACKS_KEY, JSON.stringify(nextBlockedTracks));
    setSessionUser(user, nextProfile);

    setAutoSavingMusic(true);
    try {
      const response = await fetch('/api/player-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar suas musicas.');
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar suas musicas.');
    } finally {
      setAutoSavingMusic(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      const exists = current.some((item) => normalizeId(item) === normalizeId(genre));
      const next = exists ? current.filter((item) => normalizeId(item) !== normalizeId(genre)) : [...current, genre].slice(0, 8);
      void persistMusicPreferences(next, blockedTrackKeys);
      return next;
    });
  };

  const toggleExpanded = (genreId: string) => {
    setExpandedGenreIds((current) => current.includes(genreId) ? current.filter((item) => item !== genreId) : [...current, genreId]);
  };

  const toggleBlockedTrack = (track: MusicTrackOption) => {
    setBlockedTrackKeys((current) => {
      const next = current.includes(track.key) ? current.filter((key) => key !== track.key) : [...current, track.key];
      void persistMusicPreferences(selectedGenres, next);
      return next;
    });
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.removeAttribute('src');
      previewAudioRef.current.load();
      previewAudioRef.current = null;
    }
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
    setPlayingTrackKey('');
    setLoadingTrackKey('');
    setPreviewTrack(null);
  };

  const playTrackPreview = async (track: MusicTrackOption) => {
    if (playingTrackKey === track.key) {
      stopPreview();
      return;
    }

    stopPreview();
    setError('');
    setLoadingTrackKey(track.key);

    try {
      const response = await fetch(track.url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Nao foi possivel carregar ${track.title}.`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.volume = 0.58;
      audio.loop = false;
      audio.onended = () => stopPreview();
      audio.onerror = () => {
        setError(`Nao foi possivel tocar ${track.title}.`);
        stopPreview();
      };

      previewObjectUrlRef.current = objectUrl;
      previewAudioRef.current = audio;
      setPreviewTrack({ key: track.key, genre: track.genre, title: track.title, url: track.url });
      setPlayingTrackKey(track.key);
      await audio.play();
    } catch (previewError: any) {
      setError(previewError.message || 'Nao foi possivel tocar a previa.');
      stopPreview();
    } finally {
      setLoadingTrackKey('');
    }
  };

  const playGenrePreview = (group: MusicGenreGroup) => {
    const availableTrack = group.tracks.find((track) => !isTrackBlocked(track.key)) || group.tracks[0];
    if (!availableTrack) {
      setError(`Nao ha musicas cadastradas em ${group.name}.`);
      return;
    }
    void playTrackPreview(availableTrack);
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;

    const cleanNickname = normalizeNickname(nickname);
    setError('');

    if (!cleanNickname) {
      setError('Digite seu nickname.');
      return;
    }

    setSaving(true);

    try {
      const isSafe = await moderateText(cleanNickname);
      if (!isSafe) {
        setError('Esse nickname contem palavras improprias.');
        return;
      }

      const profilePayload = {
        id: user.id,
        nickname: cleanNickname,
        avatar_url: avatarUrl,
        music_genres: selectedGenres,
        music_blocked_tracks: blockedTrackKeys,
        profile_completed: true,
        is_guest: Boolean(profile?.is_guest || user.email?.includes('@guest.com')),
      };

      const response = await fetch('/api/player-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar o perfil.');

      const nextProfile = {
        ...profile,
        ...(result.profile || profilePayload),
        nickname: cleanNickname,
        avatar_url: avatarUrl,
        music_genres: selectedGenres,
        music_blocked_tracks: blockedTrackKeys,
        profile_completed: true,
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(selectedGenres));
      localStorage.setItem(MUSIC_BLOCKED_TRACKS_KEY, JSON.stringify(blockedTrackKeys));
      if (nextProfile.is_guest) localStorage.setItem('guestNickname', cleanNickname);

      setSessionUser(user, nextProfile);
      stopPreview();
      router.push(nextPath);
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!authInitialized || authLoading || !user) return <LoadingArena label="Carregando perfil..." />;

  const totalTracks = musicGroups.reduce((total, group) => total + group.tracks.length, 0);
  const isAdminUser = isProjectAdmin(user.id);

  return (
    <div className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={{ ...profile, nickname, avatar_url: avatarUrl }} isAdmin={isAdminUser} onLogout={handleLogout} />
      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-8 pt-28 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Perfil do jogador</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Avatar</h1>
            <p className="mt-2 text-sm font-bold text-blue-100">Escolha seu visual, nickname e músicas do jogo.</p>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving || !nickname.trim()} className="h-14 rounded-none bg-yellow-300 px-8 text-xs font-black uppercase text-slate-950 shadow-[0_6px_0_#b45309] hover:bg-yellow-200">
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar e entrar'}
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl space-y-5">
            <div className="mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2.5rem] border-4 border-white bg-white shadow-2xl">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar selecionado" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-16 w-16 text-indigo-300" />}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-cyan-200">Seu nickname</label>
              <Input value={nickname} maxLength={16} onChange={(event) => setNickname(event.target.value)} placeholder="Seu nome no jogo" className="h-14 rounded-none border-2 border-cyan-200/30 bg-white/10 text-center text-lg font-black text-white placeholder:text-blue-100/70 focus-visible:ring-yellow-300" />
            </div>

            {error && <div className="rounded-2xl border-2 border-rose-200/40 bg-rose-500/20 p-3 text-xs font-bold text-rose-100">{error}</div>}
          </section>

          <section className="rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-cyan-200" /><h2 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100">Avatares PNG</h2></div>
              {loadingOptions ? (
                <EmptyPanel text="Carregando avatares do R2..." />
              ) : avatars.length === 0 ? (
                <EmptyPanel text="Nenhum PNG encontrado em atuem/avatar/." tone="yellow" />
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {avatars.map((avatar) => (
                    <button key={avatar.key} type="button" onClick={() => setAvatarUrl(avatar.url)} title={avatar.name} className={cn('relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-4 bg-white transition-all', avatarUrl === avatar.url ? 'border-yellow-300 shadow-xl scale-[1.03]' : 'border-white/15 hover:border-cyan-200')}>
                      <img src={avatar.url} alt={avatar.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      {avatarUrl === avatar.url && <span className="absolute right-1.5 top-1.5 rounded-full bg-yellow-300 p-1 text-slate-950 shadow-md"><Check className="h-3.5 w-3.5" /></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2"><Music className="h-5 w-5 text-yellow-200" /><h2 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100">Musicas que voce gosta</h2></div>
                  <p className="mt-1 text-xs font-bold text-blue-100">Abra o gênero, ouça cada música e bloqueie as faixas que não quer ouvir.</p>
                </div>
                <span className="rounded-md border border-cyan-200/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-100">{totalTracks} musicas no R2</span>
              </div>

              {previewTrack && (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-yellow-200/30 bg-yellow-300/15 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-200/30 bg-white/10 text-yellow-200"><Volume2 className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-yellow-200">Previa tocando</p><p className="truncate text-sm font-black text-white">{previewTrack.title}</p><p className="truncate text-xs font-bold text-blue-100">Categoria: {previewTrack.genre}</p></div>
                  <button type="button" onClick={stopPreview} className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/30 bg-white/10 text-rose-100 hover:bg-rose-500/20"><X className="h-4 w-4" /></button>
                </div>
              )}

              {loadingOptions ? (
                <EmptyPanel text="Carregando biblioteca de musicas..." />
              ) : musicGroups.length === 0 ? (
                <EmptyPanel text="Nenhuma musica encontrada no R2." tone="yellow" />
              ) : (
                <div className="space-y-3">
                  {musicGroups.map((group) => {
                    const active = isGenreSelected(group.name);
                    const expanded = expandedGenreIds.includes(group.id);
                    const blockedCount = group.tracks.filter((track) => isTrackBlocked(track.key)).length;
                    const availableCount = group.tracks.length - blockedCount;

                    return (
                      <div key={group.id} className={cn('rounded-3xl border-2 p-3 transition-all', active ? 'border-yellow-300 bg-white/15 shadow-sm' : 'border-cyan-200/20 bg-white/10')}>
                        <div className="flex items-center justify-between gap-3">
                          <button type="button" onClick={() => toggleGenre(group.name)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2', active ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-cyan-200/40 bg-white/10 text-transparent')}><Check className="h-4 w-4" /></span>
                            <span className="min-w-0"><span className="block truncate text-sm font-black uppercase text-white">{group.name}</span><span className={cn('block text-[10px] font-black uppercase', active ? 'text-yellow-200' : 'text-blue-100')}>{active ? 'Vai tocar no jogo' : 'Nao tocar'} • {availableCount}/{group.tracks.length} liberadas</span></span>
                          </button>

                          <button type="button" onClick={() => playGenrePreview(group)} disabled={!group.tracks.length} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-yellow-200/30 bg-yellow-300/15 text-yellow-200 hover:bg-yellow-300/25 disabled:opacity-40"><Play className="h-4 w-4 fill-current" /></button>
                          <button type="button" onClick={() => toggleExpanded(group.id)} className="flex h-10 shrink-0 items-center gap-1 rounded-xl border-2 border-white/15 bg-white/10 px-3 text-[10px] font-black uppercase text-blue-100 hover:bg-white/15">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Lista</button>
                        </div>

                        {expanded && (
                          <div className="mt-3 space-y-2 border-t border-cyan-200/20 pt-3">
                            {group.tracks.length === 0 ? (
                              <EmptyPanel text="Pasta vazia no R2" />
                            ) : group.tracks.map((track) => {
                              const blocked = isTrackBlocked(track.key);
                              const playing = playingTrackKey === track.key;
                              const loadingTrack = loadingTrackKey === track.key;

                              return (
                                <div key={track.key} className={cn('flex items-center gap-2 rounded-2xl border p-2', blocked ? 'border-rose-200/30 bg-rose-500/15' : 'border-white/10 bg-white/95 text-[#1e1b4b]')}>
                                  <button type="button" onClick={() => playTrackPreview(track)} disabled={Boolean(loadingTrackKey && loadingTrackKey !== track.key)} className={cn('flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 disabled:opacity-50', playing ? 'border-rose-100 bg-rose-50 text-rose-600' : 'border-yellow-100 bg-yellow-50 text-yellow-700 hover:bg-yellow-100')}>{loadingTrack ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button>
                                  <div className="min-w-0 flex-1"><p className={cn('truncate text-sm font-black', blocked ? 'text-rose-100 line-through' : 'text-indigo-950')}>{track.title}</p><p className={cn('truncate text-[10px] font-bold', blocked ? 'text-rose-100/70' : 'text-slate-400')}>{track.key}</p></div>
                                  <button type="button" onClick={() => toggleBlockedTrack(track)} className={cn('rounded-xl border px-3 py-2 text-[10px] font-black uppercase', blocked ? 'border-rose-200/30 bg-white/10 text-rose-100' : 'border-emerald-100 bg-emerald-50 text-emerald-700')}>{blocked ? 'Nao ouvir' : 'Liberada'}</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="flex items-center gap-2 text-[11px] font-bold text-blue-100"><SlidersHorizontal className="h-3.5 w-3.5" /> Gêneros selecionados: {selectedGenres.length ? selectedGenres.join(', ') : 'nenhum genero.'} • Músicas bloqueadas: {blockedTrackKeys.length} {autoSavingMusic ? '• salvando...' : ''}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function EmptyPanel({ text, tone = 'cyan' }: { text: string; tone?: 'cyan' | 'yellow' }) {
  return <div className={cn('rounded-2xl border-2 border-dashed p-5 text-center text-xs font-black uppercase', tone === 'yellow' ? 'border-yellow-200/30 bg-yellow-300/10 text-yellow-100' : 'border-cyan-200/25 bg-white/10 text-blue-100')}>{text}</div>;
}

function normalizeNickname(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeId(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}
