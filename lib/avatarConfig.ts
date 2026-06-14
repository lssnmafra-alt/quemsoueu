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

export const AVATAR_PRESETS: Array<{ id: string; label: string; config: AvatarConfig }> = [
  {
    id: 'speedster',
    label: 'The Flash',
    config: {
      skin: 'skin-02',
      face: 'face-01',
      eyes: 'eyes-03',
      hair: 'hair-02',
      hairColor: '#7f1d1d',
      clothes: 'clothes-07',
      clothesColor: '#dc2626',
      accessory: 'accessory-04',
      background: 'bg-04',
      frame: 'frame-rare',
    },
  },
  {
    id: 'night-hero',
    label: 'Batman',
    config: {
      skin: 'skin-02',
      face: 'face-03',
      eyes: 'eyes-06',
      hair: 'hair-01',
      hairColor: '#020617',
      clothes: 'clothes-08',
      clothesColor: '#111827',
      accessory: 'accessory-06',
      background: 'bg-05',
      frame: 'frame-epic',
    },
  },
  {
    id: 'clown-horror',
    label: 'Pennywise',
    config: {
      skin: 'skin-01',
      face: 'face-02',
      eyes: 'eyes-07',
      hair: 'hair-07',
      hairColor: '#ea580c',
      clothes: 'clothes-09',
      clothesColor: '#e5e7eb',
      accessory: 'accessory-07',
      background: 'bg-07',
      frame: 'frame-horror',
    },
  },
  {
    id: 'monster',
    label: 'Hulk',
    config: {
      skin: 'skin-06',
      face: 'face-05',
      eyes: 'eyes-03',
      hair: 'hair-08',
      hairColor: '#064e3b',
      clothes: 'clothes-10',
      clothesColor: '#4c1d95',
      accessory: 'accessory-03',
      background: 'bg-02',
      frame: 'frame-legendary',
    },
  },
  {
    id: 'space-armor',
    label: 'Armadura',
    config: {
      skin: 'skin-03',
      face: 'face-03',
      eyes: 'eyes-08',
      hair: 'hair-09',
      hairColor: '#111827',
      clothes: 'clothes-06',
      clothesColor: '#b91c1c',
      accessory: 'accessory-08',
      background: 'bg-08',
      frame: 'frame-legendary',
    },
  },
  {
    id: 'anime-warrior',
    label: 'Anime Energia',
    config: {
      skin: 'skin-02',
      face: 'face-01',
      eyes: 'eyes-05',
      hair: 'hair-10',
      hairColor: '#facc15',
      clothes: 'clothes-11',
      clothesColor: '#ea580c',
      accessory: 'none',
      background: 'bg-04',
      frame: 'frame-epic',
    },
  },
];

export const AVATAR_OPTIONS = {
  skin: [
    { id: 'skin-01', label: 'Clara', color: '#f8d6b3' },
    { id: 'skin-02', label: 'Mel', color: '#d99a5b' },
    { id: 'skin-03', label: 'Dourada', color: '#b8733f' },
    { id: 'skin-04', label: 'Marrom', color: '#8b4f2f' },
    { id: 'skin-05', label: 'Escura', color: '#5b2e1f' },
    { id: 'skin-06', label: 'Verde', color: '#22c55e' },
    { id: 'skin-07', label: 'Roxa', color: '#7c3aed' },
    { id: 'skin-08', label: 'Azul', color: '#38bdf8' },
  ],
  face: [
    { id: 'face-01', label: 'Oval' },
    { id: 'face-02', label: 'Redondo' },
    { id: 'face-03', label: 'Quadrado' },
    { id: 'face-04', label: 'Fino' },
    { id: 'face-05', label: 'Monstro' },
    { id: 'face-06', label: 'Mascara' },
  ],
  eyes: [
    { id: 'eyes-01', label: 'Heroico' },
    { id: 'eyes-02', label: 'Feliz' },
    { id: 'eyes-03', label: 'Bravo' },
    { id: 'eyes-04', label: 'Sono' },
    { id: 'eyes-05', label: 'Anime' },
    { id: 'eyes-06', label: 'Mascara' },
    { id: 'eyes-07', label: 'Terror' },
    { id: 'eyes-08', label: 'Robo' },
    { id: 'eyes-09', label: 'Visor' },
  ],
  hair: [
    { id: 'hair-01', label: 'Curto' },
    { id: 'hair-02', label: 'Espetado' },
    { id: 'hair-03', label: 'Cacheado' },
    { id: 'hair-04', label: 'Longo' },
    { id: 'hair-05', label: 'Topete' },
    { id: 'hair-06', label: 'Moicano' },
    { id: 'hair-07', label: 'Lateral' },
    { id: 'hair-08', label: 'Careca' },
    { id: 'hair-09', label: 'Capuz' },
    { id: 'hair-10', label: 'Anime' },
    { id: 'hair-11', label: 'Gótico' },
    { id: 'hair-12', label: 'Trancas' },
  ],
  clothes: [
    { id: 'clothes-01', label: 'Casual' },
    { id: 'clothes-02', label: 'Futebol' },
    { id: 'clothes-03', label: 'Guerreiro' },
    { id: 'clothes-04', label: 'Mago' },
    { id: 'clothes-05', label: 'Jaqueta' },
    { id: 'clothes-06', label: 'Espacial' },
    { id: 'clothes-07', label: 'Velocista' },
    { id: 'clothes-08', label: 'Morcego' },
    { id: 'clothes-09', label: 'Palhaco' },
    { id: 'clothes-10', label: 'Rasgada' },
    { id: 'clothes-11', label: 'Lutador' },
    { id: 'clothes-12', label: 'Ninja' },
    { id: 'clothes-13', label: 'Capa Heroi' },
    { id: 'clothes-14', label: 'DJ' },
  ],
  accessory: [
    { id: 'none', label: 'Nenhum' },
    { id: 'accessory-01', label: 'Oculos' },
    { id: 'accessory-02', label: 'Mascara' },
    { id: 'accessory-03', label: 'Cicatriz' },
    { id: 'accessory-04', label: 'Raio' },
    { id: 'accessory-05', label: 'Coroa' },
    { id: 'accessory-06', label: 'Orelhas' },
    { id: 'accessory-07', label: 'Balao' },
    { id: 'accessory-08', label: 'Capacete' },
    { id: 'accessory-09', label: 'Espada' },
    { id: 'accessory-10', label: 'Microfone' },
  ],
  background: [
    { id: 'bg-01', label: 'Arena' },
    { id: 'bg-02', label: 'Fogo' },
    { id: 'bg-03', label: 'Gelo' },
    { id: 'bg-04', label: 'Energia' },
    { id: 'bg-05', label: 'Cidade' },
    { id: 'bg-06', label: 'Natureza' },
    { id: 'bg-07', label: 'Circo' },
    { id: 'bg-08', label: 'Cosmico' },
    { id: 'bg-09', label: 'Morcegos' },
    { id: 'bg-10', label: 'Estadio' },
  ],
  frame: [
    { id: 'frame-common', label: 'Comum' },
    { id: 'frame-rare', label: 'Rara' },
    { id: 'frame-epic', label: 'Epica' },
    { id: 'frame-legendary', label: 'Lendaria' },
    { id: 'frame-horror', label: 'Terror' },
    { id: 'frame-speed', label: 'Raio' },
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
  if (Math.random() < 0.35) {
    return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].config;
  }

  const colors = ['#111827', '#7c2d12', '#92400e', '#facc15', '#6d28d9', '#be123c', '#ea580c', '#16a34a', '#e5e7eb'];
  const clothes = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0f766e', '#111827', '#e11d48'];

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
