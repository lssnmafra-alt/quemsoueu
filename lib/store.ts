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
    if (profile) {
      localStorage.setItem(APP_PROFILE_KEY, JSON.stringify(profile));
      if (Array.isArray(profile.music_genres)) {
        localStorage.setItem(MUSIC_GENRES_KEY, JSON.stringify(profile.music_genres));
      }
      if (Array.isArray(profile.music_blocked_tracks)) {
        localStorage.setItem(MUSIC_BLOCKED_TRACKS_KEY, JSON.stringify(profile.music_blocked_tracks));
      }
    } else {
      localStorage.removeItem(APP_PROFILE_KEY);
      localStorage.removeItem(MUSIC_GENRES_KEY);
      localStorage.removeItem(MUSIC_BLOCKED_TRACKS_KEY);
    }
  }
}

async function getAuthHeaders() {
  if (typeof window === 'undefined') return {};

  try {
    const { data: { session } } = await supabaseAuth.auth.getSession();
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
    return response.ok && result.profile ? result.profile : null;
  } catch {
    return null;
  }
}

async function saveServerProfile(profile: any) {
  if (typeof window === 'undefined' || !profile?.id) return null;
  const currentUser = useUserStore.getState().user;
  const response = await fetch('/api/player-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({
      ...profile,
      email: profile.email || currentUser?.email || '',
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Nao foi possivel salvar o perfil.');
  return result.profile || profile;
}

function getStoredGuest() {
  if (typeof window === 'undefined') return { user: null, profile: null };
  const guestId = localStorage.getItem('guestId');
  const storedProfile = readJson(APP_PROFILE_KEY);
  const nickname = localStorage.getItem('guestNickname') || storedProfile?.nickname;
  if (!guestId || !nickname) return { user: null, profile: null };

  const baseProfile = { id: guestId, nickname, is_guest: true, played_matches: 0, wins: 0, profile_completed: true };
  return {
    user: { id: guestId, email: `guest_${guestId}@guest.com` },
    profile: { ...baseProfile, ...(storedProfile || {}), id: guestId, nickname, is_guest: true, profile_completed: true }
  };
}

function getStoredAppAuth() {
  const user = readJson(APP_USER_KEY);
  const profile = readJson(APP_PROFILE_KEY);
  if (!user?.id) return getStoredGuest();

  return {
    user,
    profile: profile || {
      id: user.id,
      nickname: user.email?.split('@')[0] || 'Jogador',
      played_matches: 0,
      wins: 0,
    },
  };
}

function fallbackProfileFor(user: any, storedProfile: any = null) {
  if (!user?.id) return null;
  return storedProfile || {
    id: user.id,
    nickname: user.email?.split('@')[0] || 'Jogador',
    played_matches: 0,
    wins: 0,
  };
}

export const useUserStore = create<UserState>((set) => ({
  ...getStoredAppAuth(),
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, loading: false, initialized: true }),
  setSessionUser: (user, profile = null) => {
    const existingProfile = useUserStore.getState().profile;
    const resolvedProfile = profile || existingProfile;
    persistAuth(user, resolvedProfile);
    set({ user, profile: resolvedProfile, loading: false, initialized: true });
  },
  initializeAuth: async () => {
    const storedAppAuth = getStoredAppAuth();

    if (storedAppAuth.user) {
      set({ ...storedAppAuth, loading: false, initialized: true });
      const serverProfile = await loadServerProfile(storedAppAuth.user.id);
      if (serverProfile) {
        const mergedProfile = { ...(storedAppAuth.profile || {}), ...serverProfile };
        persistAuth(storedAppAuth.user, mergedProfile);
        set({ user: storedAppAuth.user, profile: mergedProfile, loading: false, initialized: true });
      }
    }

    try {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (session?.user) {
        const serverProfile = await loadServerProfile(session.user.id);
        const profile = serverProfile || fallbackProfileFor(session.user, storedAppAuth.profile);
        persistAuth(session.user, profile);
        set({ user: session.user, profile, loading: false, initialized: true });
        return;
      }
    } catch (err) {
      console.warn('Supabase auth getSession error, relying on local storage fallback:', err);
    }

    if (storedAppAuth.user) {
      persistAuth(storedAppAuth.user, storedAppAuth.profile);
      set({ user: storedAppAuth.user, profile: storedAppAuth.profile, loading: false, initialized: true });
      return;
    }

    persistAuth(null, null);
    set({ user: null, profile: null, loading: false, initialized: true });
  },
  fetchProfile: async (uid: string) => {
    const currentUser = useUserStore.getState().user;
    const serverProfile = await loadServerProfile(uid);
    const profile = serverProfile || readJson(APP_PROFILE_KEY) || fallbackProfileFor(currentUser);
    persistAuth(currentUser, profile);
    set({ profile, loading: false, initialized: true });
  },
  loginGuest: async (nickname: string) => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;
    const storedProfile = readJson(APP_PROFILE_KEY);
    const guestId = stored || crypto.randomUUID();

    const guestUser = { id: guestId, email: `guest_${guestId}@guest.com` };
    const guestProfile = {
      ...(storedProfile || {}),
      id: guestId,
      nickname,
      is_guest: true,
      avatar_url: storedProfile?.avatar_url || '',
      music_genres: Array.isArray(storedProfile?.music_genres) ? storedProfile.music_genres : [],
      music_blocked_tracks: Array.isArray(storedProfile?.music_blocked_tracks) ? storedProfile.music_blocked_tracks : [],
      profile_completed: true,
      played_matches: storedProfile?.played_matches || 0,
      wins: storedProfile?.wins || 0,
    };

    const savedProfile = await saveServerProfile(guestProfile);

    if (!stored && typeof window !== 'undefined') localStorage.setItem('guestId', guestId);
    if (typeof window !== 'undefined') localStorage.setItem('guestNickname', savedProfile.nickname || nickname);

    persistAuth(guestUser, savedProfile);
    set({ user: guestUser, profile: savedProfile, loading: false, initialized: true });
  },
  logout: async () => {
    await supabaseAuth.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guestId');
      localStorage.removeItem('guestNickname');
    }
    persistAuth(null, null);
    set({ user: null, profile: null, loading: false, initialized: true });
  }
}));
