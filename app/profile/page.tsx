'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Music,
  Pause,
  Play,
  Save,
  Shirt,
  SlidersHorizontal,
  Volume2,
  X,
} from 'lucide-react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import GameTopNav from '@/components/navigation/GameTopNav';
import { isProjectAdmin } from '@/lib/admin';

type MusicTrackOption = {
  key: string;
  title: string;
  genre: string;
  folder: string;
  url: string;
};

type MusicGenreGroup = {
  id: string;
  name: string;
  folder: string;
  tracks: MusicTrackOption[];
};

type PreviewTrack = {
  key: string;
  genre: string;
  title: string;
  url: string;
};

const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';

const PLAYER_EMOJIS = ['🙂', '😎', '🤠', '😺', '🐸', '🦊', '🐼', '👽', '🤖', '🔥', '⚡', '🎮'];

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    profile,
    loading: authLoading,
    initialized: authInitialized,
    setSessionUser,
    logout,
  } = useUserStore();

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewObjectUrlRef = useRef('');

  const [nextPath, setNextPath] = useState('/');
  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState('🙂');
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
    setEmoji(normalizeEmoji(profile?.emoji));
    setSelectedGenres(Array.isArray(profile?.music_genres) ? profile.music_genres : []);
    setBlockedTrackKeys(Array.isArray(profile?.music_blocked_tracks) ? profile.music_blocked_tracks : []);
  }, [authInitialized, authLoading, router, user, profile]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user?.id) return;

    let cancelled = false;
    const currentUser = user;

    async function loadOptions() {
      setLoadingOptions(true);

      const [libraryResult, profileResult] = await Promise.all([
        fetch('/api/audio/library', { cache: 'no-store' })
          .then((res) => res.json())
          .catch(() => ({ genres: [] })),
        fetch(`/api/player-profile?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' })
          .then((res) => res.json())
          .catch(() => ({ profile: null })),
      ]);

      if (cancelled) return;

      const nextMusicGroups = Array.isArray(libraryResult.genres) ? libraryResult.genres : [];

      setMusicGroups(nextMusicGroups);
      setExpandedGenreIds((current) =>
        current.length
          ? current
          : nextMusicGroups
              .filter((group: MusicGenreGroup) => group.tracks.length > 0)
              .slice(0, 2)
              .map((group: MusicGenreGroup) => group.id),
      );

      if (profileResult.profile) {
        const savedProfile = {
          ...profile,
          ...profileResult.profile,
          avatar_url: profileResult.profile.avatar_url || profile?.avatar_url || '',
          avatar_animation_set_id:
            profileResult.profile.avatar_animation_set_id ||
            profile?.avatar_animation_set_id ||
            null,
        };

        setNickname(savedProfile.nickname || 'Jogador');
        setEmoji(normalizeEmoji(savedProfile.emoji));
        setSelectedGenres(Array.isArray(savedProfile.music_genres) ? savedProfile.music_genres : []);
        setBlockedTrackKeys(
          Array.isArray(savedProfile.music_blocked_tracks) ? savedProfile.music_blocked_tracks : [],
        );
        setSessionUser(currentUser, savedProfile);
      }

      setLoadingOptions(false);
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, authLoading, setSessionUser, user?.id]);

  useEffect(() => {
    return () => stopPreview();
  }, []);

  const avatarUrl = profile?.avatar_url || '';
  const avatarEquipped = Boolean(avatarUrl);
  const isGenreSelected = (genre: string) => selectedGenres.some((item) => normalizeId(item) === normalizeId(genre));
  const isTrackBlocked = (key: string) => blockedTrackKeys.includes(key);

  const persistMusicPreferences = async (nextGenres: string[], nextBlockedTracks: string[]) => {
    if (!user?.id) return;

    const cleanNickname = normalizeNickname(nickname) || profile?.nickname || user.email?.split('@')[0] || 'Jogador';

    const nextProfile = {
      ...profile,
      id: user.id,
      email: profile?.email || user.email || '',
      nickname: cleanNickname,
      emoji: normalizeEmoji(emoji),
      avatar_url: profile?.avatar_url || '',
      avatar_animation_set_id: profile?.avatar_animation_set_id || null,
      music_genres: nextGenres,
      music_blocked_tracks: nextBlockedTracks,
      profile_completed: Boolean(profile?.avatar_url),
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

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel salvar suas musicas.');
      }
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar suas musicas.');
    } finally {
      setAutoSavingMusic(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      const exists = current.some((item) => normalizeId(item) === normalizeId(genre));
      const next = exists
        ? current.filter((item) => normalizeId(item) !== normalizeId(genre))
        : [...current, genre].slice(0, 8);

      void persistMusicPreferences(next, blockedTrackKeys);

      return next;
    });
  };

  const toggleExpanded = (genreId: string) => {
    setExpandedGenreIds((current) =>
      current.includes(genreId) ? current.filter((item) => item !== genreId) : [...current, genreId],
    );
  };

  const toggleBlockedTrack = (track: MusicTrackOption) => {
    setBlockedTrackKeys((current) => {
      const next = current.includes(track.key)
        ? current.filter((key) => key !== track.key)
        : [...current, track.key];

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

      if (!response.ok) {
        throw new Error(`Nao foi possivel carregar ${track.title}.`);
      }

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

      setPreviewTrack({
        key: track.key,
        genre: track.genre,
        title: track.title,
        url: track.url,
      });

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
    const cleanEmoji = normalizeEmoji(emoji);

    setError('');

    if (!cleanNickname) {
      setError('Digite seu nickname.');
      return;
    }

    if (!profile?.avatar_url) {
      setError('Escolha e equipe um avatar antes de entrar.');
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
        email: profile?.email || user.email || '',
        nickname: cleanNickname,
        emoji: cleanEmoji,
        avatar_url: profile?.avatar_url || '',
        avatar_animation_set_id: profile?.avatar_animation_set_id || null,
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

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel salvar o perfil.');
      }

      const nextProfile = {
        ...profile,
        ...(result.profile || profilePayload),
        nickname: cleanNickname,
        emoji: cleanEmoji,
        avatar_url: (result.profile || profilePayload).avatar_url || profile?.avatar_url || '',
        avatar_animation_set_id:
          (result.profile || profilePayload).avatar_animation_set_id ||
          profile?.avatar_animation_set_id ||
          null,
        music_genres: selectedGenres,
        music_blocked_tracks: blockedTrackKeys,
        profile_completed: true,
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(selectedGenres));
      localStorage.setItem(MUSIC_BLOCKED_TRACKS_KEY, JSON.stringify(blockedTrackKeys));

      if (nextProfile.is_guest) {
        localStorage.setItem('guestNickname', cleanNickname);
      }

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

  if (!authInitialized || authLoading || !user) {
    return <LoadingArena label="Carregando perfil..." />;
  }

  const totalTracks = musicGroups.reduce((total, group) => total + group.tracks.length, 0);
  const isAdminUser = isProjectAdmin(user.id);
  const safeEmoji = normalizeEmoji(emoji);

  return (
    <div className="min-h-screen overflow-hidden bg-[#071a64] text-white font-sans party-grid-bg">
      <GameTopNav profile={{ ...profile, nickname, emoji: safeEmoji }} isAdmin={isAdminUser} onLogout={handleLogout} />

      <div className="absolute inset-0 bg-[url('/api/branding/loading')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#071a64]/95 via-[#0b4fb8]/55 to-[#05091f]/95" />

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-8 pt-28 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Perfil do jogador</p>
            <h1 className="mt-1 text-4xl font-black uppercase italic text-white font-display md:text-6xl">Perfil</h1>
            <p className="mt-2 text-sm font-bold text-blue-100">
              Escolha seu nome, equipe seu avatar e ajuste as músicas do jogo.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="h-14 rounded-none bg-yellow-300 px-8 text-xs font-black uppercase text-slate-950 shadow-[0_6px_0_#b45309] hover:bg-yellow-200"
          >
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar e entrar'}
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <section className="space-y-5 rounded-3xl border-4 border-cyan-200/25 bg-[#082c7a]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl">
            <div className="rounded-3xl border-2 border-cyan-200/25 bg-white/10 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Seu avatar</p>

              {avatarEquipped ? (
                <div className="mt-3 rounded-2xl border border-emerald-200/40 bg-emerald-400/15 px-4 py-3 text-xs font-black uppercase text-emerald-100">
                  Avatar equipado
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-yellow-200/50 bg-yellow-300/15 px-4 py-3 text-xs font-black uppercase text-yellow-100">
                  Escolha um avatar para continuar
                </div>
              )}

              <Button
                type="button"
                onClick={() => router.push('/avatar-store')}
                className="mt-4 h-12 w-full rounded-none bg-fuchsia-500 px-4 text-xs font-black uppercase text-white hover:bg-fuchsia-400"
              >
                <Shirt className="mr-2 h-4 w-4" />
                Escolher avatar
              </Button>
            </div>

            <div className="rounded-3xl border-2 border-cyan-200/25 bg-white/10 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Seu emoji</p>

              <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-cyan-200/30 bg-white text-5xl shadow-inner">
                {safeEmoji}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {PLAYER_EMOJIS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEmoji(option)}
                    className={cn(
                      'flex h-12 items-center justify-center rounded-2xl border-2 bg-white/10 text-2xl transition hover:bg-white/20',
                      safeEmoji === option
                        ? 'border-yellow-300 bg-yellow-300/20 shadow-[0_0_0_2px_rgba(250,204,21,.25)]'
                        : 'border-cyan-200/20',
                    )}
                    aria-label={`Usar emoji ${option}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-cyan-200">
                Seu nickname
              </label>

              <Input
                value={nickname}
                maxLength={16}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Seu nome no jogo"
                className="h-14 rounded-none border-2 border-cyan-200/30 bg-white/10 text-center text-lg font-black text-white placeholder:text-blue-100/70 focus-visible:ring-yellow-300"
              />
            </div>

            {error && (
              <div className="rounded-2xl border-2 border-rose-200/40 bg-rose-500/20 p-3 text-xs font-bold text-rose-100">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-3xl border-4 border-white/10 bg-white/10 p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
                  Músicas da partida
                </p>
                <h2 className="text-2xl font-black uppercase italic font-display">
                  Escolha o clima do jogo
                </h2>
                <p className="text-xs font-bold text-blue-100">
                  Selecione até 8 estilos e bloqueie faixas que você não quer ouvir.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border-2 border-cyan-200/20 bg-black/20 px-3 py-2 text-xs font-black uppercase text-cyan-100">
                {autoSavingMusic ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" />
                )}
                {selectedGenres.length}/8 estilos · {totalTracks} faixas
              </div>
            </div>

            {loadingOptions ? (
              <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm font-black uppercase text-cyan-100">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando músicas...
              </div>
            ) : musicGroups.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-white/20 bg-black/20 p-8 text-center text-sm font-bold text-blue-100">
                Nenhuma música encontrada em public/music. Adicione arquivos MP3/WAV/OGG nas pastas de gênero.
              </div>
            ) : (
              <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
                {musicGroups.map((group) => {
                  const selected = isGenreSelected(group.name);
                  const expanded = expandedGenreIds.includes(group.id);
                  const blockedCount = group.tracks.filter((track) => isTrackBlocked(track.key)).length;

                  return (
                    <article
                      key={group.id}
                      className={cn(
                        'rounded-3xl border-2 p-4 transition',
                        selected
                          ? 'border-yellow-300 bg-yellow-300/15'
                          : 'border-white/10 bg-[#061b4d]/70',
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <button
                          type="button"
                          onClick={() => toggleGenre(group.name)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-black',
                              selected
                                ? 'border-yellow-200 bg-yellow-300 text-slate-950'
                                : 'border-cyan-200/30 bg-white/10 text-cyan-100',
                            )}
                          >
                            {selected ? <Check className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                          </span>

                          <span>
                            <span className="block text-lg font-black uppercase italic text-white font-display">
                              {group.name}
                            </span>
                            <span className="text-xs font-bold text-blue-100">
                              {group.tracks.length} faixas · {blockedCount} bloqueadas
                            </span>
                          </span>
                        </button>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => playGenrePreview(group)}
                            disabled={!group.tracks.length || loadingTrackKey === group.tracks[0]?.key}
                            className="h-10 rounded-none bg-cyan-300 px-3 text-[10px] font-black uppercase text-slate-950 shadow-[0_4px_0_#0e7490] hover:bg-cyan-200"
                          >
                            {previewTrack?.genre === group.name && playingTrackKey ? (
                              <Pause className="mr-1 h-3 w-3" />
                            ) : (
                              <Play className="mr-1 h-3 w-3" />
                            )}
                            Prévia
                          </Button>

                          <Button
                            type="button"
                            onClick={() => toggleExpanded(group.id)}
                            className="h-10 rounded-none bg-white/10 px-3 text-[10px] font-black uppercase text-white hover:bg-white/20"
                          >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {group.tracks.map((track) => {
                            const blocked = isTrackBlocked(track.key);
                            const playing = playingTrackKey === track.key;

                            return (
                              <div
                                key={track.key}
                                className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 p-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => playTrackPreview(track)}
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-100">
                                    {loadingTrackKey === track.key ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : playing ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Volume2 className="h-4 w-4" />
                                    )}
                                  </span>

                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-black uppercase text-white">
                                      {track.title}
                                    </span>
                                    <span className="block truncate text-[10px] font-bold text-blue-100">
                                      {track.folder}
                                    </span>
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleBlockedTrack(track)}
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black',
                                    blocked
                                      ? 'border-rose-200 bg-rose-500/30 text-rose-100'
                                      : 'border-emerald-200/40 bg-emerald-400/15 text-emerald-100',
                                  )}
                                  title={blocked ? 'Liberar musica' : 'Bloquear musica'}
                                >
                                  {blocked ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 16);
}

function normalizeId(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function normalizeEmoji(value: unknown) {
  const emoji = String(value || '').trim();
  return Array.from(emoji).slice(0, 2).join('') || '🙂';
}
