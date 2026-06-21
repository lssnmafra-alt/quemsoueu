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
    if (user) {
      localStorage.setItem(APP_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(APP_USER_KEY);
    }
  }

  if (profile !== undefined) {
    if (profile) {
      localStorage.setItem(APP_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(APP_PROFILE_KEY);
    }
  }
}

function getStoredGuest() {
  if (typeof window === 'undefined') return { user: null, profile: null };
  const guestId = localStorage.getItem('guestId');
  const storedProfile = readJson(APP_PROFILE_KEY);
  const nickname = localStorage.getItem('guestNickname') || storedProfile?.nickname;
  if (!guestId || !nickname) return { user: null, profile: null };

  const baseProfile = { id: guestId, nickname, is_guest: true, played_matches: 0, wins: 0 };

  return {
    user: { id: guestId, email: `guest_${guestId}@guest.com` },
    profile: { ...baseProfile, ...(storedProfile || {}), id: guestId, nickname, is_guest: true }
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
    }

    try {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (session?.user) {
        const { data } = await supabaseAuth.from('profiles').select('*').eq('id', session.user.id).single();
        const profile = data || storedAppAuth.profile || { id: session.user.id, nickname: session.user.email?.split('@')[0] || 'Jogador', played_matches: 0, wins: 0 };
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
    const { data } = await supabaseAuth.from('profiles').select('*').eq('id', uid).single();
    const currentUser = useUserStore.getState().user;
    const profile = data || readJson(APP_PROFILE_KEY) || (currentUser ? { id: uid, nickname: currentUser.email?.split('@')[0] || 'Jogador', played_matches: 0, wins: 0 } : null);
    persistAuth(currentUser, profile);
    set({ profile, loading: false, initialized: true });
  },
  loginGuest: async (nickname: string) => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;
    const storedProfile = readJson(APP_PROFILE_KEY);
    const guestId = stored || crypto.randomUUID();
    if (!stored && typeof window !== 'undefined') {
      localStorage.setItem('guestId', guestId);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestNickname', nickname);
    }
    const guestUser = { id: guestId, email: `guest_${guestId}@guest.com` };
    const guestProfile = { id: guestId, nickname, is_guest: true, played_matches: 0, wins: 0, ...(storedProfile || {}) };
    persistAuth(guestUser, { ...guestProfile, id: guestId, nickname, is_guest: true });
    set({ user: guestUser, profile: { ...guestProfile, id: guestId, nickname, is_guest: true }, loading: false, initialized: true });
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
