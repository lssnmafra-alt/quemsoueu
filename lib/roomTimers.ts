export const ALLOWED_PICK_SECONDS = [15, 30, 45] as const;
export const ALLOWED_VOTE_SECONDS = [15, 30, 45] as const;
export const ALLOWED_REVEAL_SECONDS = [5, 8, 12] as const;

export function clampPickSeconds(value: unknown) {
  return clampAllowedSeconds(value, ALLOWED_PICK_SECONDS, 30);
}

export function clampVoteSeconds(value: unknown) {
  return clampAllowedSeconds(value, ALLOWED_VOTE_SECONDS, 30);
}

export function clampRevealSeconds(value: unknown) {
  return clampAllowedSeconds(value, ALLOWED_REVEAL_SECONDS, 8);
}

export function nextPickExpiresAt(value: unknown) {
  return new Date(Date.now() + clampPickSeconds(value) * 1000).toISOString();
}

export function nextVoteExpiresAt(value: unknown) {
  return new Date(Date.now() + clampVoteSeconds(value) * 1000).toISOString();
}

function clampAllowedSeconds<T extends readonly number[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.round(parsed);

  return (allowed as readonly number[]).includes(rounded) ? rounded : fallback;
}
