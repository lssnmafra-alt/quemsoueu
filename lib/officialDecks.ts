export const TEMP_OFFICIAL_DECK_EDITING_ENABLED = false;

export const OFFICIAL_DECK_IDS = new Set([
  '7743c471-0b7a-450d-bb34-11b8b8104d5b',
  '4ca45738-6741-44a5-8d06-87370edcdf06',
  'ea7b9559-ca49-49fe-8af6-5b3b7db7f661',
  '576dbfe5-3dbd-448f-9707-454c9d6387fd',
  '72bca5d4-7f18-4ca3-ac29-f3fc373114ba',
]);

export function isOfficialDeckId(deckId?: string | null) {
  return Boolean(deckId && OFFICIAL_DECK_IDS.has(deckId));
}

export function shouldUseOfficialDeckImages(deckOrRoom?: any) {
  if (!deckOrRoom) return false;

  const deckId = deckOrRoom.deck_id || deckOrRoom.id || null;
  if (!deckId) return true;

  const nestedDeck = deckOrRoom.deck || null;
  return Boolean(
    isOfficialDeckId(deckId)
    || deckOrRoom.is_official === true
    || deckOrRoom.deck_is_official === true
    || deckOrRoom.creator_id === null
    || deckOrRoom.deck_creator_id === null
    || nestedDeck?.is_official === true
    || nestedDeck?.creator_id === null,
  );
}
