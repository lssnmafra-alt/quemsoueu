export const PROJECT_ADMIN_USER_IDS = new Set([
  'a82ca4c4-ab3a-431d-87b9-530ba56457fe',
]);

export function isProjectAdmin(userId?: string | null) {
  return Boolean(userId && PROJECT_ADMIN_USER_IDS.has(userId));
}
