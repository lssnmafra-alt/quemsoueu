export type AvatarConfig = {
  skin: string;
  face: string;
  eyebrows: string;
  eyes: string;
  nose: string;
  mouth: string;
  hair: string;
  hairColor: string;
  facialHair: string;
  headwear: string;
  body: string;
  clothes: string;
  clothesColor: string;
  outerwear: string;
  accessory: string;
  background: string;
  frame: string;
};

export type AvatarCategory = keyof typeof AVATAR_OPTIONS;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: 'skin-02',
  face: 'face-01',
  eyebrows: 'brows-01',
  eyes: 'eyes-01',
  nose: 'nose-01',
  mouth: 'mouth-01',
  hair: 'hair-01',
  hairColor: '#1f2937',
  facialHair: 'facial-none',
  headwear: 'headwear-none',
  body: 'body-01',
  clothes: 'clothes-01',
  clothesColor: '#2563eb',
  outerwear: 'outerwear-none',
  accessory: 'none',
  background: 'bg-01',
  frame: 'frame-common',
};

export const AVATAR_PRESETS: Array<{ id: string; label: string; config: AvatarConfig }> = [
  preset('wizard', 'Harry Potter', {
    skin: 'skin-01',
    face: 'face-01',
    eyebrows: 'brows-02',
    eyes: 'eyes-10',
    nose: 'nose-02',
    mouth: 'mouth-02',
    hair: 'hair-13',
    hairColor: '#2f1b12',
    body: 'body-04',
    clothes: 'clothes-15',
    clothesColor: '#111827',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    background: 'bg-11',
    frame: 'frame-rare',
    headwear: 'headwear-04',
  }),
  preset('atlantean', 'Namor', {
    skin: 'skin-03',
    face: 'face-10',
    eyebrows: 'brows-03',
    eyes: 'eyes-11',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-15',
    hairColor: '#020617',
    body: 'body-02',
    clothes: 'clothes-16',
    clothesColor: '#0f766e',
    outerwear: 'outerwear-none',
    accessory: 'accessory-12',
    background: 'bg-12',
    frame: 'frame-ocean',
  }),
  preset('tech-villain', 'Ultron', {
    skin: 'skin-09',
    face: 'face-09',
    eyebrows: 'brows-06',
    eyes: 'eyes-12',
    nose: 'nose-06',
    mouth: 'mouth-03',
    hair: 'hair-08',
    hairColor: '#94a3b8',
    body: 'body-05',
    clothes: 'clothes-17',
    clothesColor: '#64748b',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-08',
    background: 'bg-13',
    frame: 'frame-tech',
  }),
  preset('cosmic-brute', 'Thanos', {
    skin: 'skin-07',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    nose: 'nose-04',
    mouth: 'mouth-03',
    hair: 'hair-08',
    hairColor: '#111827',
    body: 'body-03',
    clothes: 'clothes-03',
    clothesColor: '#6d28d9',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-13',
    background: 'bg-08',
    frame: 'frame-legendary',
  }),
  preset('streamer', 'Casimiro', {
    skin: 'skin-02',
    face: 'face-02',
    eyebrows: 'brows-05',
    eyes: 'eyes-01',
    nose: 'nose-04',
    mouth: 'mouth-04',
    hair: 'hair-01',
    hairColor: '#111827',
    facialHair: 'facial-04',
    body: 'body-01',
    clothes: 'clothes-18',
    clothesColor: '#0f172a',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-14',
    background: 'bg-14',
    frame: 'frame-common',
    headwear: 'headwear-06',
  }),
  preset('speedster', 'The Flash', {
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    mouth: 'mouth-03',
    hair: 'hair-02',
    hairColor: '#7f1d1d',
    body: 'body-02',
    clothes: 'clothes-07',
    clothesColor: '#dc2626',
    accessory: 'accessory-04',
    background: 'bg-04',
    frame: 'frame-speed',
  }),
  preset('night-hero', 'Batman', {
    face: 'face-03',
    eyebrows: 'brows-03',
    eyes: 'eyes-06',
    mouth: 'mouth-03',
    hair: 'hair-01',
    hairColor: '#020617',
    body: 'body-02',
    clothes: 'clothes-08',
    clothesColor: '#111827',
    outerwear: 'outerwear-cape',
    headwear: 'headwear-03',
    background: 'bg-05',
    frame: 'frame-epic',
  }),
  preset('clown-horror', 'Pennywise', {
    skin: 'skin-01',
    face: 'face-02',
    eyebrows: 'brows-04',
    eyes: 'eyes-07',
    nose: 'nose-05',
    mouth: 'mouth-05',
    hair: 'hair-07',
    hairColor: '#ea580c',
    clothes: 'clothes-09',
    clothesColor: '#e5e7eb',
    outerwear: 'outerwear-ruff',
    accessory: 'accessory-07',
    background: 'bg-07',
    frame: 'frame-horror',
  }),
  preset('monster', 'Hulk', {
    skin: 'skin-06',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    nose: 'nose-04',
    mouth: 'mouth-03',
    hair: 'hair-08',
    hairColor: '#064e3b',
    body: 'body-03',
    clothes: 'clothes-10',
    clothesColor: '#4c1d95',
    background: 'bg-02',
    frame: 'frame-legendary',
  }),
];

export const AVATAR_OPTIONS = {
  skin: [
    { id: 'skin-01', label: 'Clara', color: '#f8d6b3' },
    { id: 'skin-02', label: 'Mel', color: '#d99a5b' },
    { id: 'skin-03', label: 'Dourada', color: '#b8733f' },
    { id: 'skin-04', label: 'Marrom', color: '#8b4f2f' },
    { id: 'skin-05', label: 'Escura', color: '#5b2e1f' },
    { id: 'skin-06', label: 'Verde' , color: '#22c55e' },
    { id: 'skin-07', label: 'Roxa', color: '#7c3aed' },
    { id: 'skin-08', label: 'Azul', color: '#38bdf8' },
    { id: 'skin-09', label: 'Metal', color: '#94a3b8' },
  ],
  face: [
    { id: 'face-01', label: 'Oval' },
    { id: 'face-02', label: 'Redondo' },
    { id: 'face-03', label: 'Quadrado' },
    { id: 'face-04', label: 'Fino' },
    { id: 'face-05', label: 'Forte' },
    { id: 'face-06', label: 'Mascara' },
    { id: 'face-07', label: 'Angular' },
    { id: 'face-08', label: 'Nobre' },
    { id: 'face-09', label: 'Robótico' },
    { id: 'face-10', label: 'Atlante' },
  ],
  eyebrows: [
    { id: 'brows-01', label: 'Natural' },
    { id: 'brows-02', label: 'Arqueada' },
    { id: 'brows-03', label: 'Intensa' },
    { id: 'brows-04', label: 'Sinistra' },
    { id: 'brows-05', label: 'Grossa' },
    { id: 'brows-06', label: 'Sem sobrancelha' },
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
    { id: 'eyes-10', label: 'Oculos redondos' },
    { id: 'eyes-11', label: 'Atlante' },
    { id: 'eyes-12', label: 'Cibernetico' },
  ],
  nose: [
    { id: 'nose-01', label: 'Reto' },
    { id: 'nose-02', label: 'Pequeno' },
    { id: 'nose-03', label: 'Marcado' },
    { id: 'nose-04', label: 'Largo' },
    { id: 'nose-05', label: 'Pontudo' },
    { id: 'nose-06', label: 'Robotico' },
  ],
  mouth: [
    { id: 'mouth-01', label: 'Sorriso' },
    { id: 'mouth-02', label: 'Neutra' },
    { id: 'mouth-03', label: 'Seria' },
    { id: 'mouth-04', label: 'Confiante' },
    { id: 'mouth-05', label: 'Assustadora' },
    { id: 'mouth-06', label: 'Boca larga' },
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
    { id: 'hair-11', label: 'Gotico' },
    { id: 'hair-12', label: 'Trancas' },
    { id: 'hair-13', label: 'Bruxo baguncado' },
    { id: 'hair-14', label: 'Surfista' },
    { id: 'hair-15', label: 'Executivo' },
  ],
  facialHair: [
    { id: 'facial-none', label: 'Nenhuma' },
    { id: 'facial-01', label: 'Barba curta' },
    { id: 'facial-02', label: 'Cavanhaque' },
    { id: 'facial-03', label: 'Bigode' },
    { id: 'facial-04', label: 'Barba cheia' },
    { id: 'facial-05', label: 'Influencer' },
  ],
  headwear: [
    { id: 'headwear-none', label: 'Nenhum' },
    { id: 'headwear-01', label: 'Oculos na testa' },
    { id: 'headwear-02', label: 'Coroa' },
    { id: 'headwear-03', label: 'Capuz morcego' },
    { id: 'headwear-04', label: 'Cicatriz raio' },
    { id: 'headwear-05', label: 'Capacete' },
    { id: 'headwear-06', label: 'Bone' },
  ],
  body: [
    { id: 'body-01', label: 'Medio' },
    { id: 'body-02', label: 'Atletico' },
    { id: 'body-03', label: 'Forte' },
    { id: 'body-04', label: 'Fino' },
    { id: 'body-05', label: 'Robotico' },
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
    { id: 'clothes-15', label: 'Bruxo' },
    { id: 'clothes-16', label: 'Atlante' },
    { id: 'clothes-17', label: 'Cibernetico' },
    { id: 'clothes-18', label: 'Streamer' },
  ],
  outerwear: [
    { id: 'outerwear-none', label: 'Sem camada' },
    { id: 'outerwear-cape', label: 'Capa' },
    { id: 'outerwear-robe', label: 'Manto' },
    { id: 'outerwear-armor', label: 'Armadura' },
    { id: 'outerwear-ruff', label: 'Gola circo' },
    { id: 'outerwear-jacket', label: 'Jaqueta' },
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
    { id: 'accessory-11', label: 'Varinha' },
    { id: 'accessory-12', label: 'Tridente' },
    { id: 'accessory-13', label: 'Manopla' },
    { id: 'accessory-14', label: 'Camera' },
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
    { id: 'bg-11', label: 'Biblioteca' },
    { id: 'bg-12', label: 'Oceano' },
    { id: 'bg-13', label: 'Tecnologia' },
    { id: 'bg-14', label: 'Studio' },
  ],
  frame: [
    { id: 'frame-common', label: 'Comum' },
    { id: 'frame-rare', label: 'Rara' },
    { id: 'frame-epic', label: 'Epica' },
    { id: 'frame-legendary', label: 'Lendaria' },
    { id: 'frame-horror', label: 'Terror' },
    { id: 'frame-speed', label: 'Raio' },
    { id: 'frame-tech', label: 'Tech' },
    { id: 'frame-ocean', label: 'Oceano' },
  ],
};

export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== 'object') return DEFAULT_AVATAR_CONFIG;

  const draft = value as Partial<AvatarConfig>;

  return {
    skin: pickOption('skin', draft.skin),
    face: pickOption('face', draft.face),
    eyebrows: pickOption('eyebrows', draft.eyebrows),
    eyes: pickOption('eyes', draft.eyes),
    nose: pickOption('nose', draft.nose),
    mouth: pickOption('mouth', draft.mouth),
    hair: pickOption('hair', draft.hair),
    hairColor: isHexColor(draft.hairColor) ? draft.hairColor! : DEFAULT_AVATAR_CONFIG.hairColor,
    facialHair: pickOption('facialHair', draft.facialHair),
    headwear: pickOption('headwear', draft.headwear),
    body: pickOption('body', draft.body),
    clothes: pickOption('clothes', draft.clothes),
    clothesColor: isHexColor(draft.clothesColor) ? draft.clothesColor! : DEFAULT_AVATAR_CONFIG.clothesColor,
    outerwear: pickOption('outerwear', draft.outerwear),
    accessory: pickOption('accessory', draft.accessory),
    background: pickOption('background', draft.background),
    frame: pickOption('frame', draft.frame),
  };
}

export function randomAvatarConfig(): AvatarConfig {
  if (Math.random() < 0.4) {
    return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].config;
  }

  const hairColors = ['#111827', '#7c2d12', '#92400e', '#facc15', '#6d28d9', '#be123c', '#ea580c', '#16a34a', '#e5e7eb'];
  const clothesColors = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0f766e', '#111827', '#e11d48', '#64748b'];

  return {
    skin: randomOption('skin'),
    face: randomOption('face'),
    eyebrows: randomOption('eyebrows'),
    eyes: randomOption('eyes'),
    nose: randomOption('nose'),
    mouth: randomOption('mouth'),
    hair: randomOption('hair'),
    hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
    facialHair: randomOption('facialHair'),
    headwear: randomOption('headwear'),
    body: randomOption('body'),
    clothes: randomOption('clothes'),
    clothesColor: clothesColors[Math.floor(Math.random() * clothesColors.length)],
    outerwear: randomOption('outerwear'),
    accessory: randomOption('accessory'),
    background: randomOption('background'),
    frame: randomOption('frame'),
  };
}

function preset(id: string, label: string, patch: Partial<AvatarConfig>) {
  return {
    id,
    label,
    config: { ...DEFAULT_AVATAR_CONFIG, ...patch },
  };
}

function pickOption(category: AvatarCategory, value?: string) {
  return AVATAR_OPTIONS[category].some((option) => option.id === value)
    ? value!
    : DEFAULT_AVATAR_CONFIG[category];
}

function randomOption(category: AvatarCategory) {
  const options = AVATAR_OPTIONS[category];
  return options[Math.floor(Math.random() * options.length)].id;
}

function isHexColor(value?: string) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}
