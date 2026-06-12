export const PUBLIC_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL_AUTH',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH',
  'NEXT_PUBLIC_SUPABASE_URL_GAME',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME',
] as const;

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
export type PublicRuntimeEnv = Partial<Record<PublicEnvKey, string>>;

export const PUBLIC_ENV_ALIASES: Record<PublicEnvKey, string[]> = {
  NEXT_PUBLIC_SUPABASE_URL_AUTH: ['SUPABASE_URL_AUTH', 'SUPABASE_AUTH_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH: ['SUPABASE_ANON_KEY_AUTH', 'SUPABASE_AUTH_ANON_KEY'],
  NEXT_PUBLIC_SUPABASE_URL_GAME: ['SUPABASE_URL_GAME', 'SUPABASE_GAME_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME: ['SUPABASE_ANON_KEY_GAME', 'SUPABASE_GAME_ANON_KEY'],
};

declare global {
  interface Window {
    __QUEM_SOU_EU_ENV__?: PublicRuntimeEnv;
  }
}

function normalizeEnvValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readProcessEnv(key: PublicEnvKey) {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return normalizeEnvValue((process.env as Record<string, string | undefined>)[key]);
}

function readProcessEnvWithAliases(key: PublicEnvKey) {
  const canonicalValue = readProcessEnv(key);
  if (canonicalValue) return canonicalValue;

  for (const alias of PUBLIC_ENV_ALIASES[key]) {
    const value = normalizeEnvValue((process.env as Record<string, string | undefined> | undefined)?.[alias]);
    if (value) return value;
  }

  return undefined;
}

export function getPublicEnvValue(key: PublicEnvKey) {
  const browserValue =
    typeof window !== 'undefined'
      ? normalizeEnvValue(window.__QUEM_SOU_EU_ENV__?.[key])
      : undefined;

  return browserValue || readProcessEnvWithAliases(key);
}

export function getPublicRuntimeEnv() {
  return PUBLIC_ENV_KEYS.reduce<PublicRuntimeEnv>((env, key) => {
    const value = readProcessEnvWithAliases(key);
    if (value) env[key] = value;
    return env;
  }, {});
}

export function getPublicEnvNames(key: PublicEnvKey) {
  return [key, ...PUBLIC_ENV_ALIASES[key]];
}

export function getPublicRuntimeEnvScript() {
  const serialized = JSON.stringify(getPublicRuntimeEnv())
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `window.__QUEM_SOU_EU_ENV__=${serialized};`;
}
