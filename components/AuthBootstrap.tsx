'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/lib/store';
import { supabaseAuth } from '@/lib/supabase';

export default function AuthBootstrap() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);
  const setSessionUser = useUserStore((state) => state.setSessionUser);
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, initializeAuth, setSessionUser]);

  return null;
}
