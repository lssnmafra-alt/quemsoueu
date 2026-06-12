// lib/supabase.ts
import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import { getPublicEnvNames, getPublicEnvValue, type PublicEnvKey } from './publicEnv';

function reportMissingEnv(key: PublicEnvKey): never {
  const acceptedNames = getPublicEnvNames(key).join(', ');
  const message =
    `[Supabase config] Missing ${key}. Accepted env names: ${acceptedNames}. Configure it in the Cloudflare Worker environment ` +
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

function createLazySupabaseClient(
  urlKey: PublicEnvKey,
  anonKeyKey: PublicEnvKey,
  options?: SupabaseClientOptions<'public'>,
) {
  let client: SupabaseClient | null = null;

  const getClient = () => {
    if (!client) {
      client = createClient(requireSupabaseUrl(urlKey), requireEnv(anonKeyKey), options);
    }

    return client;
  };

  return new Proxy(
    {},
    {
      get(_target, prop) {
        const value = (getClient() as any)[prop];
        return typeof value === 'function' ? value.bind(getClient()) : value;
      },
      set(_target, prop, value) {
        (getClient() as any)[prop] = value;
        return true;
      },
      has(_target, prop) {
        return prop in getClient();
      },
      ownKeys() {
        return Reflect.ownKeys(getClient() as any);
      },
      getOwnPropertyDescriptor(_target, prop) {
        const descriptor = Object.getOwnPropertyDescriptor(getClient() as any, prop);
        if (descriptor) descriptor.configurable = true;
        return descriptor;
      },
    },
  ) as SupabaseClient;
}

// Supabase 1 - Auth e Usuarios
export const supabaseAuth = createLazySupabaseClient(
  'NEXT_PUBLIC_SUPABASE_URL_AUTH',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'quem-sou-eu-auth-session',
  },
  },
);

// Supabase 2 - Dados do Jogo
export const supabaseGame = createLazySupabaseClient(
  'NEXT_PUBLIC_SUPABASE_URL_GAME',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME',
);
