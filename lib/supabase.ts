// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { getPublicEnvValue, type PublicEnvKey } from './publicEnv';

function reportMissingEnv(key: PublicEnvKey): never {
  const message =
    `[Supabase config] Missing ${key}. Configure it in the Cloudflare Worker environment ` +
    '(Production and Preview, when used) or provide it during the Next/OpenNext build.';

  if (typeof console !== 'undefined') console.error(message);
  throw new Error(message);
}

function reportInvalidUrl(key: PublicEnvKey, value: string): never {
  const message = `[Supabase config] ${key} must be a valid http(s) URL. Received: ${value}`;

  if (typeof console !== 'undefined') console.error(message);
  throw new Error(message);
}

function requireEnv(key: PublicEnvKey) {
  return getPublicEnvValue(key) || reportMissingEnv(key);
}

function requireSupabaseUrl(key: PublicEnvKey) {
  const value = requireEnv(key);

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') reportInvalidUrl(key, value);
  } catch {
    reportInvalidUrl(key, value);
  }

  return value;
}

// Supabase 1 - Auth e Usuarios
const urlAuth = requireSupabaseUrl('NEXT_PUBLIC_SUPABASE_URL_AUTH');
const supabaseAnonKeyAuth = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH');

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
const urlGame = requireSupabaseUrl('NEXT_PUBLIC_SUPABASE_URL_GAME');
const supabaseAnonKeyGame = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME');

export const supabaseGame = createClient(urlGame, supabaseAnonKeyGame);
