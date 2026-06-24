import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuth } from './supabase';
import { getPublicEnvValue } from './publicEnv';

let adminClient: SupabaseClient | null = null;

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

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function hasSupabaseAuthServiceRole() {
  return Boolean(readPrivateEnv('SUPABASE_SERVICE_ROLE_KEY_AUTH', 'SUPABASE_AUTH_SERVICE_ROLE_KEY'));
}
