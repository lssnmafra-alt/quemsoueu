export type AvatarConfig = {
  skin: string;
  face: string;
  eyes: string;
  hair: string;
  hairColor: string;
  clothes: string;
  clothesColor: string;
  accessory: string;
  background: string;
  frame: string;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: 'skin-02',
  face: 'face-01',
  eyes: 'eyes-01',
  hair: 'hair-01',
  hairColor: '#1f2937',
  clothes: 'clothes-01',
  clothesColor: '#7c3aed',
  accessory: 'none',
  background: 'bg-01',
  frame: 'frame-common',
};

export const AVATAR_OPTIONS = {
  skin: [
    { id: 'skin-01', label: 'Clara', color: '#f8d6b3' },
    { id: 'skin-02', label: 'Mel', color: '#d99a5b' },
    { id: 'skin-03', label: 'Dourada', color: '#b8733f' },
    { id: 'skin-04', label: 'Marrom', color: '#8b4f2f' },
    { id: 'skin-05', label: 'Escura', color: '#5b2e1f' },
  ],
  face: [
    { id: 'face-01', label: 'Oval' },
    { id: 'face-02', label: 'Redondo' },
    { id: 'face-03', label: 'Quadrado' },
    { id: 'face-04', label: 'Fino' },
  ],
  eyes: [
    { id: 'eyes-01', label: 'Heroico' },
    { id: 'eyes-02', label: 'Feliz' },
    { id: 'eyes-03', label: 'Bravo' },
    { id: 'eyes-04', label: 'Sono' },
    { id: 'eyes-05', label: 'Anime' },
    { id: 'eyes-06', label: 'Mascara' },
  ],
  hair: [
    { id: 'hair-01', label: 'Curto' },
    { id: 'hair-02', label: 'Espetado' },
    { id: 'hair-03', label: 'Cacheado' },
    { id: 'hair-04', label: 'Longo' },
    { id: 'hair-05', label: 'Topete' },
    { id: 'hair-06', label: 'Moicano' },
  ],
  clothes: [
    { id: 'clothes-01', label: 'Casual' },
    { id: 'clothes-02', label: 'Futebol' },
    { id: 'clothes-03', label: 'Guerreiro' },
    { id: 'clothes-04', label: 'Mago' },
    { id: 'clothes-05', label: 'Jaqueta' },
    { id: 'clothes-06', label: 'Espacial' },
  ],
  accessory: [
    { id: 'none', label: 'Nenhum' },
    { id: 'accessory-01', label: 'Oculos' },
    { id: 'accessory-02', label: 'Mascara' },
    { id: 'accessory-03', label: 'Cicatriz' },
    { id: 'accessory-04', label: 'Raio' },
    { id: 'accessory-05', label: 'Coroa' },
  ],
  background: [
    { id: 'bg-01', label: 'Arena' },
    { id: 'bg-02', label: 'Fogo' },
    { id: 'bg-03', label: 'Gelo' },
    { id: 'bg-04', label: 'Energia' },
    { id: 'bg-05', label: 'Cidade' },
    { id: 'bg-06', label: 'Natureza' },
  ],
  frame: [
    { id: 'frame-common', label: 'Comum' },
    { id: 'frame-rare', label: 'Rara' },
    { id: 'frame-epic', label: 'Epica' },
    { id: 'frame-legendary', label: 'Lendaria' },
  ],
};

export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== 'object') return DEFAULT_AVATAR_CONFIG;

  const draft = value as Partial<AvatarConfig>;

  return {
    skin: pickOption('skin', draft.skin),
    face: pickOption('face', draft.face),
    eyes: pickOption('eyes', draft.eyes),
    hair: pickOption('hair', draft.hair),
    hairColor: isHexColor(draft.hairColor) ? draft.hairColor! : DEFAULT_AVATAR_CONFIG.hairColor,
    clothes: pickOption('clothes', draft.clothes),
    clothesColor: isHexColor(draft.clothesColor) ? draft.clothesColor! : DEFAULT_AVATAR_CONFIG.clothesColor,
    accessory: pickOption('accessory', draft.accessory),
    background: pickOption('background', draft.background),
    frame: pickOption('frame', draft.frame),
  };
}

export function randomAvatarConfig(): AvatarConfig {
  const colors = ['#111827', '#7c2d12', '#92400e', '#facc15', '#6d28d9', '#be123c'];
  const clothes = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0f766e'];

  return {
    skin: randomOption('skin'),
    face: randomOption('face'),
    eyes: randomOption('eyes'),
    hair: randomOption('hair'),
    hairColor: colors[Math.floor(Math.random() * colors.length)],
    clothes: randomOption('clothes'),
    clothesColor: clothes[Math.floor(Math.random() * clothes.length)],
    accessory: randomOption('accessory'),
    background: randomOption('background'),
    frame: randomOption('frame'),
  };
}

function pickOption(category: keyof typeof AVATAR_OPTIONS, value?: string) {
  return AVATAR_OPTIONS[category].some((option) => option.id === value)
    ? value!
    : DEFAULT_AVATAR_CONFIG[category as keyof AvatarConfig];
}

function randomOption(category: keyof typeof AVATAR_OPTIONS) {
  const options = AVATAR_OPTIONS[category];
  return options[Math.floor(Math.random() * options.length)].id;
}

function isHexColor(value?: string) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}
