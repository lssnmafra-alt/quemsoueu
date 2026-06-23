export const CARD_RARITIES = ['comum', 'rara', 'epica', 'lendaria', 'mitica', 'especial'] as const;

export type CardRarity = (typeof CARD_RARITIES)[number];

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  comum: 'Comum',
  rara: 'Rara',
  epica: 'Epica',
  lendaria: 'Lendaria',
  mitica: 'Mitica',
  especial: 'Especial',
};

export const CARD_RARITY_OPTIONS = CARD_RARITIES.map((value) => ({
  value,
  label: CARD_RARITY_LABELS[value],
}));

export function isCardRarity(value: unknown): value is CardRarity {
  return CARD_RARITIES.includes(value as CardRarity);
}

export function getCardRarity(value: unknown): CardRarity {
  if (isCardRarity(value)) return value;

  const configRarity = typeof value === 'object' && value !== null
    ? (value as any).cardRarity ?? (value as any).rarity
    : undefined;

  return isCardRarity(configRarity) ? configRarity : 'comum';
}

export function getCardRarityFrameUrl(rarity: unknown) {
  const safeRarity = getCardRarity(rarity);
  return `/api/r2-file?key=atuem%2FMolduras%2FRaridades%2Fmoldura_${safeRarity}.png`;
}
