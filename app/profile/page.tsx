'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, Music, Pause, Play, Save, SlidersHorizontal, UserRound, Volume2, X } from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type AvatarOption = { key: string; name: string; url: string };
type MusicTrackOption = { key: string; title: string; genre: string; folder: string; url: string };
type MusicGenreGroup = { id: string; name: string; folder: string; tracks: MusicTrackOption[] };
type PreviewTrack = { key: string; genre: string; title: string; url: string };

const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, initialized: authInitialized, setSessionUser } = useUserStore();
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

  if (!authInitialized || authLoading || !user) return <LoadingArena label="Carregando perfil..." />;

  const totalTracks = musicGroups.reduce((total, group) => total + group.tracks.length, 0);

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 party-grid-bg">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 order-1">
            <Button type="button" variant="ghost" onClick={() => router.push('/')} className="h-12 w-12 rounded-2xl border-2 border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Perfil do jogador</p>
              <h1 className="font-display text-2xl md:text-3xl font-black text-indigo-950">Avatar, nickname e musicas</h1>
            </div>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving || !nickname.trim()} className="h-12 px-6 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center gap-2 order-2 sm:ml-auto">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar e entrar'}
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl space-y-5">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[2rem] border-4 border-indigo-100 bg-slate-50 overflow-hidden shadow-inner">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar selecionado" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-16 w-16 text-indigo-200" />}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-700">Seu nickname</label>
              <Input value={nickname} maxLength={16} onChange={(event) => setNickname(event.target.value)} placeholder="Seu nome no jogo" className="h-12 rounded-xl border-2 border-indigo-100 bg-slate-50 text-center text-lg font-black text-indigo-950 focus-visible:ring-indigo-100" />
            </div>

            {error && <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-600">{error}</div>}
          </section>

          <section className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-indigo-500" /><h2 className="text-xl font-black uppercase tracking-wide text-indigo-950">Avatares PNG</h2></div>
              {loadingOptions ? (
                <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-center text-xs font-black uppercase text-indigo-400">Carregando avatares do R2...</div>
              ) : avatars.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-700">Nenhum PNG encontrado em atuem/avatar/.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {avatars.map((avatar) => (
                    <button key={avatar.key} type="button" onClick={() => setAvatarUrl(avatar.url)} title={avatar.name} className={cn('aspect-square overflow-hidden rounded-2xl border-4 bg-slate-50 transition-all cursor-pointer relative', avatarUrl === avatar.url ? 'border-indigo-500 shadow-lg scale-[1.03]' : 'border-slate-100 hover:border-indigo-200')}>
                      <img src={avatar.url} alt={avatar.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      {avatarUrl === avatar.url && <span className="absolute right-1.5 top-1.5 rounded-full bg-indigo-600 p-1 text-white shadow-md"><Check className="h-3.5 w-3.5" /></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2"><Music className="h-5 w-5 text-amber-500" /><h2 className="text-xl font-black uppercase tracking-wide text-indigo-950">Musicas que voce gosta</h2></div>
                  <p className="text-xs font-bold text-slate-500 mt-1">Abra o genero, ouca cada musica e bloqueie as faixas que nao quer ouvir.</p>
                </div>
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase text-indigo-600">{totalTracks} musicas no R2</span>
              </div>

              {previewTrack && (
                <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-500 border border-amber-100">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Previa tocando</p>
                    <p className="truncate text-sm font-black text-indigo-950">{previewTrack.title}</p>
                    <p className="truncate text-xs font-bold text-slate-500">Categoria: {previewTrack.genre}</p>
                  </div>
                  <button type="button" onClick={stopPreview} className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {loadingOptions ? (
                <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-center text-xs font-black uppercase text-indigo-400">Carregando biblioteca de musicas...</div>
              ) : musicGroups.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-700">Nenhuma musica encontrada no R2.</div>
              ) : (
                <div className="space-y-3">
                  {musicGroups.map((group) => {
                    const active = isGenreSelected(group.name);
                    const expanded = expandedGenreIds.includes(group.id);
                    const blockedCount = group.tracks.filter((track) => isTrackBlocked(track.key)).length;
                    const availableCount = group.tracks.length - blockedCount;

                    return (
                      <div key={group.id} className={cn('rounded-3xl border-2 p-3 transition-all', active ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white')}>
                        <div className="flex items-center justify-between gap-3">
                          <button type="button" onClick={() => toggleGenre(group.name)} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2', active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent')}>
                              <Check className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black uppercase text-indigo-950">{group.name}</span>
                              <span className={cn('block text-[10px] font-black uppercase', active ? 'text-indigo-500' : 'text-slate-400')}>{active ? 'Vai tocar no jogo' : 'Nao tocar'} • {availableCount}/{group.tracks.length} liberadas</span>
                            </span>
                          </button>

                          <button type="button" onClick={() => playGenrePreview(group)} disabled={!group.tracks.length} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-40">
                            <Play className="h-4 w-4 fill-current" />
                          </button>

                          <button type="button" onClick={() => toggleExpanded(group.id)} className="flex h-10 shrink-0 items-center gap-1 rounded-xl border-2 border-slate-100 bg-white px-3 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Lista
                          </button>
                        </div>

                        {expanded && (
                          <div className="mt-3 space-y-2 border-t border-indigo-100 pt-3">
                            {group.tracks.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[10px] font-black uppercase text-slate-400">Pasta vazia no R2</div>
                            ) : group.tracks.map((track) => {
                              const blocked = isTrackBlocked(track.key);
                              const playing = playingTrackKey === track.key;
                              const loadingTrack = loadingTrackKey === track.key;

                              return (
                                <div key={track.key} className={cn('flex items-center gap-2 rounded-2xl border p-2', blocked ? 'border-rose-100 bg-rose-50/60' : 'border-slate-100 bg-white')}>
                                  <button type="button" onClick={() => playTrackPreview(track)} disabled={Boolean(loadingTrackKey && loadingTrackKey !== track.key)} className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 cursor-pointer disabled:opacity-50', playing ? 'border-rose-100 bg-rose-50 text-rose-600' : 'border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100')}>
                                    {loadingTrack ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <p className={cn('truncate text-sm font-black', blocked ? 'text-rose-700 line-through' : 'text-indigo-950')}>{track.title}</p>
                                    <p className="truncate text-[10px] font-bold text-slate-400">{track.key}</p>
                                  </div>

                                  <button type="button" onClick={() => toggleBlockedTrack(track)} className={cn('rounded-xl border px-3 py-2 text-[10px] font-black uppercase', blocked ? 'border-rose-200 bg-white text-rose-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700')}>
                                    {blocked ? 'Nao ouvir' : 'Liberada'}
                                  </button>
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

              <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Gêneros selecionados: {selectedGenres.length ? selectedGenres.join(', ') : 'nenhum genero.'} • Músicas bloqueadas: {blockedTrackKeys.length} {autoSavingMusic ? '• salvando...' : ''}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
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
