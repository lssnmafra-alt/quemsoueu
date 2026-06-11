// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase 1 - Auth e Usuários
let urlAuth = process.env.NEXT_PUBLIC_SUPABASE_URL_AUTH || 'https://dummy1.supabase.co';
if (!urlAuth.startsWith('http')) urlAuth = 'https://dummy1.supabase.co';
const supabaseAnonKeyAuth = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH || 'dummy';

export const supabaseAuth = createClient(urlAuth, supabaseAnonKeyAuth, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'quem-sou-eu-auth-session',
  },
});

// Supabase 2 - Dados do Jogo
let urlGame = process.env.NEXT_PUBLIC_SUPABASE_URL_GAME || 'https://dummy2.supabase.co';
if (!urlGame.startsWith('http')) urlGame = 'https://dummy2.supabase.co';
const supabaseAnonKeyGame = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME || 'dummy';

export const supabaseGame = createClient(urlGame, supabaseAnonKeyGame);
