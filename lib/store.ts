import { create } from 'zustand';
import { supabaseAuth } from './supabase';

interface UserState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: any) => void;
  setSessionUser: (user: any, profile?: any | null) => void;
  initializeAuth: () => Promise<void>;
  fetchProfile: (uid: string) => Promise<void>;
  loginGuest: (nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}

const APP_USER_KEY = 'quemSouEu:user';
const APP_PROFILE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';
const DEFAULT_PLAYER_EMOJI = '🙂';

function normalizeEmoji(value: unknown) {
  const emoji = String(value || '').trim();
  return Array.from(emoji).slice(0, 2).join('') || DEFAULT_PLAYER_EMOJI;
}

function normalizeAvatarUrl(value: unknown) {
  const v = String(value || '').trim();
  return v.startsWith('avatar:') ||
    v.startsWith('/api/r2-file?key=') ||
    v.startsWith('http')
    ? v
    : '';
}

function profileHasRequiredSetup(profile: any) {
  return Boolean(String(profile?.nickname || '').trim() && normalizeAvatarUrl(profile?.avatar_url));
}

function normalizeProfile(profile: any | null | undefined) {
  if (!profile) return profile;

  const avatarUrl = normalizeAvatarUrl(profile.avatar_url);
  const nickname = String(profile.nickname || '').trim();

  return {
    ...profile,
    nickname,
    emoji: normalizeEmoji(profile.emoji),
    avatar_url: avatarUrl,
    avatar_animation_set_id: profile.avatar_animation_set_id || null,
    profile_completed: Boolean(profile.profile_completed && nickname && avatarUrl),
  };
}

function mergeProfile(base: any | null | undefined, next: any | null | undefined) {
  if (!next) return normalizeProfile(base);

  const merged = { ...(base || {}), ...next };

  if (!normalizeAvatarUrl(merged.avatar_url) && normalizeAvatarUrl(base?.avatar_url)) {
    merged.avatar_url = base.avatar_url;
  }

  if (!merged.avatar_animation_set_id && base?.avatar_animation_set_id) {
    merged.avatar_animation_set_id = base.avatar_animation_set_id;
  }

  return normalizeProfile(merged);
}

function readJson(key: string) {
  if (typeof window === 'undefined') return null;

  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function persistAuth(user: any | null | undefined, profile: any | null | undefined) {
  if (typeof window === 'undefined') return;

  if (user !== undefined) {
    if (user) localStorage.setItem(APP_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(APP_USER_KEY);
  }

  if (profile !== undefined) {
    const safeProfile = normalizeProfile(profile);

    if (safeProfile) {
      localStorage.setItem(APP_PROFILE_KEY, JSON.stringify(safeProfile));

      if (Array.isArray(safeProfile.music_genres)) {
        localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(safeProfile.music_genres));
      }

      if (Array.isArray(safeProfile.music_blocked_tracks)) {
        localStorage.setItem(MUSIC_BLOCKED_TRACKS_KEY, JSON.stringify(safeProfile.music_blocked_tracks));
      }
    } else {
      localStorage.removeItem(APP_PROFILE_KEY);
      localStorage.removeItem(MUSIC_GENRES_KEY);
      localStorage.removeItem(MUSIC_BLOCKED_TRACKS_KEY);
    }
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') return {};

  try {
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();

    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function loadServerProfile(userId: string) {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const response = await fetch(`/api/player-profile?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
      headers: await getAuthHeaders(),
    });

    const result = await response.json().catch(() => ({}));

    return response.ok && result.profile ? normalizeProfile(result.profile) : null;
  } catch {
    return null;
  }
}

async function saveServerProfile(profile: any) {
  if (typeof window === 'undefined' || !profile?.id) return null;

  const currentUser = useUserStore.getState().user;
  const safeProfile = mergeProfile(useUserStore.getState().profile, profile);

  const response = await fetch('/api/player-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({
      ...safeProfile,
      email: safeProfile.email || currentUser?.email || '',
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Nao foi possivel salvar o perfil.');
  }

  return mergeProfile(safeProfile, result.profile || safeProfile);
}

function getStoredGuest() {
  if (typeof window === 'undefined') return { user: null, profile: null };

  const guestId = localStorage.getItem('guestId');
  const storedProfile = normalizeProfile(readJson(APP_PROFILE_KEY));
  const nickname = localStorage.getItem('guestNickname') || storedProfile?.nickname;

  if (!guestId || !nickname) {
    return { user: null, profile: null };
  }

  const baseProfile = {
    id: guestId,
    nickname,
    emoji: storedProfile?.emoji || DEFAULT_PLAYER_EMOJI,
    is_guest: true,
    played_matches: 0,
    wins: 0,
    avatar_url: storedProfile?.avatar_url || '',
    avatar_animation_set_id: storedProfile?.avatar_animation_set_id || null,
    profile_completed: profileHasRequiredSetup(storedProfile),
  };

  return {
    user: {
      id: guestId,
      email: `guest_${guestId}@guest.com`,
    },
    profile: normalizeProfile({
      ...baseProfile,
      ...(storedProfile || {}),
      id: guestId,
      nickname,
      is_guest: true,
    }),
  };
}

function getStoredAppAuth() {
  const user = readJson(APP_USER_KEY);
  const profile = normalizeProfile(readJson(APP_PROFILE_KEY));

  if (!user?.id) return getStoredGuest();

  return {
    user,
    profile:
      profile || {
        id: user.id,
        nickname: '',
        emoji: DEFAULT_PLAYER_EMOJI,
        avatar_url: '',
        avatar_animation_set_id: null,
        profile_completed: false,
        played_matches: 0,
        wins: 0,
      },
  };
}

function fallbackProfileFor(user: any, storedProfile: any = null) {
  if (!user?.id) return null;

  return (
    normalizeProfile(storedProfile) || {
      id: user.id,
      nickname: '',
      emoji: DEFAULT_PLAYER_EMOJI,
      avatar_url: '',
      avatar_animation_set_id: null,
      profile_completed: false,
      played_matches: 0,
      wins: 0,
    }
  );
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false, initialized: true }),

  setSessionUser: (user, profile = null) => {
    const resolvedProfile = mergeProfile(
      useUserStore.getState().profile,
      profile || useUserStore.getState().profile,
    );

    persistAuth(user, resolvedProfile);

    set({
      user,
      profile: resolvedProfile,
      loading: false,
      initialized: true,
    });
  },

  initializeAuth: async () => {
    const storedAppAuth = getStoredAppAuth();

    if (storedAppAuth.user) {
      set({
        ...storedAppAuth,
        loading: false,
        initialized: true,
      });

      const serverProfile = await loadServerProfile(storedAppAuth.user.id);

      if (serverProfile) {
        const mergedProfile = mergeProfile(storedAppAuth.profile, serverProfile);
        persistAuth(storedAppAuth.user, mergedProfile);

        set({
          user: storedAppAuth.user,
          profile: mergedProfile,
          loading: false,
          initialized: true,
        });
      }
    }

    try {
      const {
        data: { session },
      } = await supabaseAuth.auth.getSession();

      if (session?.user) {
        const serverProfile = await loadServerProfile(session.user.id);

        const profile = mergeProfile(
          storedAppAuth.profile,
          serverProfile || fallbackProfileFor(session.user, storedAppAuth.profile),
        );

        persistAuth(session.user, profile);

        set({
          user: session.user,
          profile,
          loading: false,
          initialized: true,
        });

        return;
      }
    } catch (err) {
      console.warn('Supabase auth getSession error, relying on local storage fallback:', err);
    }

    if (storedAppAuth.user) {
      persistAuth(storedAppAuth.user, storedAppAuth.profile);

      set({
        user: storedAppAuth.user,
        profile: storedAppAuth.profile,
        loading: false,
        initialized: true,
      });

      return;
    }

    persistAuth(null, null);

    set({
      user: null,
      profile: null,
      loading: false,
      initialized: true,
    });
  },

  fetchProfile: async (uid: string) => {
    const currentUser = useUserStore.getState().user;

    const profile = mergeProfile(
      useUserStore.getState().profile,
      (await loadServerProfile(uid)) ||
        readJson(APP_PROFILE_KEY) ||
        fallbackProfileFor(currentUser),
    );

    persistAuth(currentUser, profile);

    set({
      profile,
      loading: false,
      initialized: true,
    });
  },

  loginGuest: async (nickname: string) => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;
    const storedProfile = normalizeProfile(readJson(APP_PROFILE_KEY));
    const guestId = stored || crypto.randomUUID();

    const guestUser = {
      id: guestId,
      email: `guest_${guestId}@guest.com`,
    };

    const guestProfile = normalizeProfile({
      ...(storedProfile || {}),
      id: guestId,
      nickname,
      emoji: storedProfile?.emoji || DEFAULT_PLAYER_EMOJI,
      is_guest: true,
      avatar_url: storedProfile?.avatar_url || '',
      avatar_animation_set_id: storedProfile?.avatar_animation_set_id || null,
      music_genres: Array.isArray(storedProfile?.music_genres) ? storedProfile.music_genres : [],
      music_blocked_tracks: Array.isArray(storedProfile?.music_blocked_tracks)
        ? storedProfile.music_blocked_tracks
        : [],
      profile_completed: Boolean(storedProfile?.avatar_url),
      played_matches: storedProfile?.played_matches || 0,
      wins: storedProfile?.wins || 0,
    });

    const savedProfile = await saveServerProfile(guestProfile);

    if (!stored && typeof window !== 'undefined') {
      localStorage.setItem('guestId', guestId);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('guestNickname', savedProfile.nickname || nickname);
    }

    persistAuth(guestUser, savedProfile);

    set({
      user: guestUser,
      profile: savedProfile,
      loading: false,
      initialized: true,
    });
  },

  logout: async () => {
    await supabaseAuth.auth.signOut();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('guestId');
      localStorage.removeItem('guestNickname');
    }

    persistAuth(null, null);

    set({
      user: null,
      profile: null,
      loading: false,
      initialized: true,
    });
  },
}));
