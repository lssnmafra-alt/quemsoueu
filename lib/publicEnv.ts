export const PUBLIC_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL_AUTH',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH',
  'NEXT_PUBLIC_SUPABASE_URL_GAME',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME',
] as const;

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
export type PublicRuntimeEnv = Partial<Record<PublicEnvKey, string>>;

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

export function getPublicEnvValue(key: PublicEnvKey) {
  const browserValue =
    typeof window !== 'undefined'
      ? normalizeEnvValue(window.__QUEM_SOU_EU_ENV__?.[key])
      : undefined;

  return browserValue || readProcessEnv(key);
}

export function getPublicRuntimeEnv() {
  return PUBLIC_ENV_KEYS.reduce<PublicRuntimeEnv>((env, key) => {
    const value = readProcessEnv(key);
    if (value) env[key] = value;
    return env;
  }, {});
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
