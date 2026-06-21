'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Image as ImageIcon, Music, Save, Sparkles, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { moderateText } from '@/app/actions/moderate';
import LoadingArena from '@/components/LoadingArena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type AvatarOption = {
  key: string;
  name: string;
  url: string;
};

const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/lobby';
  const { user, profile, loading: authLoading, initialized: authInitialized, setSessionUser } = useUserStore();

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    setNickname(profile?.nickname || user.email?.split('@')[0] || 'Jogador');
    setAvatarUrl(profile?.avatar_url || '');
    setSelectedGenres(Array.isArray(profile?.music_genres) ? profile.music_genres : []);
  }, [authInitialized, authLoading, profile, router, user]);

  useEffect(() => {
    if (!authInitialized || authLoading || !user?.id) return;

    let cancelled = false;

    async function loadProfileAndOptions() {
      setLoadingOptions(true);

      const [avatarResult, genreResult, profileResult] = await Promise.all([
        fetch('/api/avatar-options', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ avatars: [] })),
        fetch('/api/audio/genres', { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ genres: [] })),
        fetch(`/api/player-profile?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ profile: null })),
      ]);

      if (cancelled) return;

      const loadedAvatars = Array.isArray(avatarResult.avatars) ? avatarResult.avatars : [];
      const loadedGenres = Array.isArray(genreResult.genres) ? genreResult.genres : [];
      const remoteProfile = profileResult.profile;

      setAvatars(loadedAvatars);
      setGenres(loadedGenres);

      if (remoteProfile) {
        setNickname(remoteProfile.nickname || profile?.nickname || 'Jogador');
        setAvatarUrl(remoteProfile.avatar_url || profile?.avatar_url || '');
        setSelectedGenres(Array.isArray(remoteProfile.music_genres) ? remoteProfile.music_genres : []);
        setSessionUser(user, { ...profile, ...remoteProfile });
      }

      setLoadingOptions(false);
    }

    void loadProfileAndOptions();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, authLoading, profile, setSessionUser, user]);

  const selectedAvatar = useMemo(() => avatars.find((avatar) => avatar.url === avatarUrl), [avatarUrl, avatars]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      return [...current, genre].slice(0, 8);
    });
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;

    const cleanNickname = nickname.trim();
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
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(selectedGenres));
        if (nextProfile.is_guest) localStorage.setItem('guestNickname', cleanNickname);
      }

      setSessionUser(user, nextProfile);
      router.push(nextPath.startsWith('/') ? nextPath : '/lobby');
    } catch (saveError: any) {
      setError(saveError.message || 'Nao foi possivel salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (!authInitialized || authLoading || !user) return <LoadingArena label="Carregando perfil..." />;

  return (
    <div className="min-h-screen bg-[#f5f6ff] text-[#1e1b4b] font-sans p-4 md:p-8 party-grid-bg">
      <div className="mx-auto max-w-5xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-4 border-indigo-100 bg-white p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/lobby')}
              className="h-12 w-12 rounded-2xl border-2 border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-indigo-50 text-indigo-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Perfil do jogador</p>
                <h1 className="font-display text-2xl md:text-3xl font-black text-indigo-950">Escolha seu avatar e nickname</h1>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="h-12 px-6 btn-squishy-indigo text-white font-black text-xs uppercase cursor-pointer flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar e entrar'}
          </Button>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <motion.section
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl space-y-5"
          >
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[2rem] border-4 border-indigo-100 bg-slate-50 overflow-hidden shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar selecionado" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-50 to-amber-50 text-indigo-300">
                  <UserRound className="h-14 w-14" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Sem avatar</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-700">Seu nickname</label>
              <Input
                value={nickname}
                maxLength={16}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Seu nome no jogo"
                className="h-12 rounded-xl border-2 border-indigo-100 bg-slate-50 text-center text-lg font-black text-indigo-950 focus-visible:ring-indigo-100"
              />
              <p className="text-[11px] font-bold text-slate-400">Esse nome aparece no lobby, nas salas e no ranking.</p>
            </div>

            {selectedAvatar && (
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-3 text-xs font-black text-emerald-700 flex items-center gap-2">
                <Check className="h-4 w-4" /> Avatar selecionado: {selectedAvatar.name}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-600">
                {error}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl space-y-6"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-black uppercase tracking-wide text-indigo-950">Avatares PNG</h2>
              </div>

              {loadingOptions ? (
                <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-8 text-center text-xs font-black uppercase text-indigo-400">
                  Carregando avatares do R2...
                </div>
              ) : avatars.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-700">
                  Nenhum PNG encontrado em atuem/avatar/. Envie os arquivos no R2 para eles aparecerem aqui automaticamente.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className={cn(
                      'aspect-square rounded-2xl border-4 bg-slate-50 flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer',
                      !avatarUrl ? 'border-indigo-500 text-indigo-600 shadow-lg' : 'border-slate-100 text-slate-400 hover:border-indigo-200',
                    )}
                  >
                    <UserRound className="h-6 w-6" />
                    Padrao
                  </button>

                  {avatars.map((avatar) => (
                    <button
                      key={avatar.key}
                      type="button"
                      onClick={() => setAvatarUrl(avatar.url)}
                      title={avatar.name}
                      className={cn(
                        'aspect-square overflow-hidden rounded-2xl border-4 bg-slate-50 transition-all cursor-pointer relative',
                        avatarUrl === avatar.url ? 'border-indigo-500 shadow-lg scale-[1.03]' : 'border-slate-100 hover:border-indigo-200',
                      )}
                    >
                      <img src={avatar.url} alt={avatar.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      {avatarUrl === avatar.url && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-indigo-600 p-1 text-white shadow-md">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-black uppercase tracking-wide text-indigo-950">Musicas que voce gosta</h2>
              </div>
              <p className="text-xs font-bold text-slate-500">
                Escolha os generos. Os efeitos sonoros continuam separados e podem ser mutados ou ajustados no controle de audio do jogo.
              </p>

              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => {
                  const active = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        'rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2',
                        active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600',
                      )}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
