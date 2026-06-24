import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuth, supabaseGame } from './supabase';
import { getPublicEnvValue } from './publicEnv';

let authAdminClient: SupabaseClient | null = null;
let gameAdminClient: SupabaseClient | null = null;

function readPrivateEnv(...keys: string[]) {
  for (const key of keys) {
    const value = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function getSupabaseAuthServer() {
  const url = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_URL_AUTH');
  const serviceRoleKey = readPrivateEnv('SUPABASE_SERVICE_ROLE_KEY_AUTH', 'SUPABASE_AUTH_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) return supabaseAuth;

  if (!authAdminClient) {
    authAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return authAdminClient;
}

export function getSupabaseGameServer() {
  const url = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_URL_GAME');
  const serviceRoleKey = readPrivateEnv('SUPABASE_SERVICE_ROLE_KEY_GAME', 'SUPABASE_GAME_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) return supabaseGame;

  if (!gameAdminClient) {
    gameAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return gameAdminClient;
}

export function hasSupabaseAuthServiceRole() {
  return Boolean(readPrivateEnv('SUPABASE_SERVICE_ROLE_KEY_AUTH', 'SUPABASE_AUTH_SERVICE_ROLE_KEY'));
}

export function hasSupabaseGameServiceRole() {
  return Boolean(readPrivateEnv('SUPABASE_SERVICE_ROLE_KEY_GAME', 'SUPABASE_GAME_SERVICE_ROLE_KEY'));
}
