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

type AvatarOption = {
  id: string;
  label: string;
  color?: string;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: 'skin-02',
  face: 'face-01',
  eyebrows: 'brows-01',
  eyes: 'eyes-01',
  nose: 'nose-01',
  mouth: 'mouth-04',
  hair: 'hair-01',
  hairColor: '#111827',
  facialHair: 'facial-none',
  headwear: 'headwear-none',
  body: 'body-02',
  clothes: 'clothes-01',
  clothesColor: '#2563eb',
  outerwear: 'outerwear-none',
  accessory: 'none',
  background: 'bg-01',
  frame: 'frame-rare',
};

export const AVATAR_OPTIONS = {
  skin: [
    { id: 'skin-01', label: 'Porcelana', color: '#f7d6bd' },
    { id: 'skin-02', label: 'Mel claro', color: '#d99a5b' },
    { id: 'skin-03', label: 'Dourada', color: '#b8733f' },
    { id: 'skin-04', label: 'Bronze', color: '#8b4f2f' },
    { id: 'skin-05', label: 'Ebano', color: '#5b2e1f' },
    { id: 'skin-06', label: 'Esmeralda', color: '#27c46b' },
    { id: 'skin-07', label: 'Nebulosa', color: '#8b5cf6' },
    { id: 'skin-08', label: 'Glacial', color: '#38bdf8' },
    { id: 'skin-09', label: 'Metal polido', color: '#94a3b8' },
  ],
  face: [
    { id: 'face-01', label: 'Heroica' },
    { id: 'face-02', label: 'Suave' },
    { id: 'face-03', label: 'Quadrada' },
    { id: 'face-04', label: 'Fina' },
    { id: 'face-05', label: 'Imponente' },
    { id: 'face-06', label: 'Mascarada' },
    { id: 'face-07', label: 'Angular' },
    { id: 'face-08', label: 'Nobre' },
    { id: 'face-09', label: 'Sintetica' },
    { id: 'face-10', label: 'Mistico aquatico' },
  ],
  eyebrows: [
    { id: 'brows-01', label: 'Natural' },
    { id: 'brows-02', label: 'Elegante' },
    { id: 'brows-03', label: 'Intensa' },
    { id: 'brows-04', label: 'Sombria' },
    { id: 'brows-05', label: 'Marcante' },
    { id: 'brows-06', label: 'Sem sobrancelha' },
  ],
  eyes: [
    { id: 'eyes-01', label: 'Determinado' },
    { id: 'eyes-02', label: 'Carismatico' },
    { id: 'eyes-03', label: 'Feroz' },
    { id: 'eyes-04', label: 'Calmo' },
    { id: 'eyes-05', label: 'Expressivo' },
    { id: 'eyes-06', label: 'Sombra' },
    { id: 'eyes-07', label: 'Assombrado' },
    { id: 'eyes-08', label: 'Robo' },
    { id: 'eyes-09', label: 'Visor neon' },
    { id: 'eyes-10', label: 'Oculos finos' },
    { id: 'eyes-11', label: 'Aquatico' },
    { id: 'eyes-12', label: 'Cibernetico' },
  ],
  nose: [
    { id: 'nose-01', label: 'Reto' },
    { id: 'nose-02', label: 'Pequeno' },
    { id: 'nose-03', label: 'Marcado' },
    { id: 'nose-04', label: 'Largo' },
    { id: 'nose-05', label: 'Pontudo' },
    { id: 'nose-06', label: 'Placa metalica' },
  ],
  mouth: [
    { id: 'mouth-01', label: 'Sorriso leve' },
    { id: 'mouth-02', label: 'Neutra' },
    { id: 'mouth-03', label: 'Seria' },
    { id: 'mouth-04', label: 'Confiante' },
    { id: 'mouth-05', label: 'Sombria' },
    { id: 'mouth-06', label: 'Feral' },
  ],
  hair: [
    { id: 'hair-01', label: 'Fade curto' },
    { id: 'hair-02', label: 'Espetado premium' },
    { id: 'hair-03', label: 'Cacheado' },
    { id: 'hair-04', label: 'Longo solto' },
    { id: 'hair-05', label: 'Topete' },
    { id: 'hair-06', label: 'Moicano' },
    { id: 'hair-07', label: 'Lateral assimetrico' },
    { id: 'hair-08', label: 'Careca' },
    { id: 'hair-09', label: 'Capuz baixo' },
    { id: 'hair-10', label: 'Pontas heroicas' },
    { id: 'hair-11', label: 'Goth moderno' },
    { id: 'hair-12', label: 'Trancas' },
    { id: 'hair-13', label: 'Baguncado mistico' },
    { id: 'hair-14', label: 'Surfista' },
    { id: 'hair-15', label: 'Executivo' },
  ],
  facialHair: [
    { id: 'facial-none', label: 'Nenhuma' },
    { id: 'facial-01', label: 'Barba curta' },
    { id: 'facial-02', label: 'Cavanhaque' },
    { id: 'facial-03', label: 'Bigode' },
    { id: 'facial-04', label: 'Barba cheia' },
    { id: 'facial-05', label: 'Barba estilizada' },
  ],
  headwear: [
    { id: 'headwear-none', label: 'Nenhum' },
    { id: 'headwear-01', label: 'Oculos na testa' },
    { id: 'headwear-02', label: 'Coroa original' },
    { id: 'headwear-03', label: 'Capuz tatico' },
    { id: 'headwear-04', label: 'Marca arcana' },
    { id: 'headwear-05', label: 'Capacete aberto' },
    { id: 'headwear-06', label: 'Bone urbano' },
  ],
  body: [
    { id: 'body-01', label: 'Equilibrado' },
    { id: 'body-02', label: 'Atletico' },
    { id: 'body-03', label: 'Forte' },
    { id: 'body-04', label: 'Elegante' },
    { id: 'body-05', label: 'Sintetico' },
  ],
  clothes: [
    { id: 'clothes-01', label: 'Casual premium' },
    { id: 'clothes-02', label: 'Atleta estrela' },
    { id: 'clothes-03', label: 'Guerreiro' },
    { id: 'clothes-04', label: 'Mago urbano' },
    { id: 'clothes-05', label: 'Jaqueta elite' },
    { id: 'clothes-06', label: 'Traje espacial' },
    { id: 'clothes-07', label: 'Velocidade' },
    { id: 'clothes-08', label: 'Vigilante' },
    { id: 'clothes-09', label: 'Performer sombrio' },
    { id: 'clothes-10', label: 'Monstro' },
    { id: 'clothes-11', label: 'Lutador' },
    { id: 'clothes-12', label: 'Ninja' },
    { id: 'clothes-13', label: 'Heroi urbano' },
    { id: 'clothes-14', label: 'DJ neon' },
    { id: 'clothes-15', label: 'Bruxo sombrio' },
    { id: 'clothes-16', label: 'Oceano real' },
    { id: 'clothes-17', label: 'Tech armor' },
    { id: 'clothes-18', label: 'Streamer' },
    { id: 'clothes-19', label: 'Detetive' },
    { id: 'clothes-20', label: 'Pirata nobre' },
    { id: 'clothes-21', label: 'Soldado futurista' },
  ],
  outerwear: [
    { id: 'outerwear-none', label: 'Sem camada' },
    { id: 'outerwear-cape', label: 'Capa curta' },
    { id: 'outerwear-robe', label: 'Manto' },
    { id: 'outerwear-armor', label: 'Ombreiras armor' },
    { id: 'outerwear-ruff', label: 'Gola dramatica' },
    { id: 'outerwear-jacket', label: 'Jaqueta aberta' },
  ],
  accessory: [
    { id: 'none', label: 'Nenhum' },
    { id: 'accessory-01', label: 'Oculos de sol' },
    { id: 'accessory-02', label: 'Mascara tática' },
    { id: 'accessory-03', label: 'Cicatriz' },
    { id: 'accessory-04', label: 'Energia eletrica' },
    { id: 'accessory-05', label: 'Joia real' },
    { id: 'accessory-06', label: 'Orelhas ferais' },
    { id: 'accessory-07', label: 'Orbe flutuante' },
    { id: 'accessory-08', label: 'Halo tech' },
    { id: 'accessory-09', label: 'Lamina' },
    { id: 'accessory-10', label: 'Microfone' },
    { id: 'accessory-11', label: 'Cajado' },
    { id: 'accessory-12', label: 'Tridente original' },
    { id: 'accessory-13', label: 'Luva de poder' },
    { id: 'accessory-14', label: 'Camera' },
    { id: 'accessory-15', label: 'Fones gamer' },
    { id: 'accessory-16', label: 'Patch detetive' },
  ],
  background: [
    { id: 'bg-01', label: 'Arena premium' },
    { id: 'bg-02', label: 'Inferno abstrato' },
    { id: 'bg-03', label: 'Gelo neon' },
    { id: 'bg-04', label: 'Energia' },
    { id: 'bg-05', label: 'Cidade noturna' },
    { id: 'bg-06', label: 'Selva' },
    { id: 'bg-07', label: 'Palco sombrio' },
    { id: 'bg-08', label: 'Cosmico' },
    { id: 'bg-09', label: 'Noite gotica' },
    { id: 'bg-10', label: 'Estadio' },
    { id: 'bg-11', label: 'Arquivo arcano' },
    { id: 'bg-12', label: 'Oceano' },
    { id: 'bg-13', label: 'Tecnologia' },
    { id: 'bg-14', label: 'Studio' },
    { id: 'bg-15', label: 'Porto pirata' },
    { id: 'bg-16', label: 'Distrito futurista' },
  ],
  frame: [
    { id: 'frame-common', label: 'Street' },
    { id: 'frame-rare', label: 'Elite' },
    { id: 'frame-epic', label: 'Epic' },
    { id: 'frame-legendary', label: 'Legendary' },
    { id: 'frame-horror', label: 'Dark' },
    { id: 'frame-speed', label: 'Pulse' },
    { id: 'frame-tech', label: 'Tech' },
    { id: 'frame-ocean', label: 'Ocean' },
    { id: 'frame-royal', label: 'Royal' },
    { id: 'frame-ice', label: 'Ice' },
  ],
} satisfies Record<string, AvatarOption[]>;

export const AVATAR_PRESETS: Array<{ id: string; label: string; config: AvatarConfig }> = [
  preset('urban-hero', 'Heroi Urbano', {
    skin: 'skin-02',
    face: 'face-01',
    eyebrows: 'brows-03',
    eyes: 'eyes-01',
    nose: 'nose-01',
    mouth: 'mouth-04',
    hair: 'hair-05',
    hairColor: '#111827',
    body: 'body-02',
    clothes: 'clothes-13',
    clothesColor: '#2563eb',
    outerwear: 'outerwear-cape',
    background: 'bg-01',
    frame: 'frame-epic',
  }),
  preset('dark-wizard', 'Bruxo Sombrio', {
    skin: 'skin-01',
    face: 'face-04',
    eyebrows: 'brows-04',
    eyes: 'eyes-06',
    nose: 'nose-02',
    mouth: 'mouth-03',
    hair: 'hair-13',
    hairColor: '#2f1b12',
    body: 'body-04',
    clothes: 'clothes-15',
    clothesColor: '#111827',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    background: 'bg-11',
    frame: 'frame-horror',
    headwear: 'headwear-04',
  }),
  preset('cosmic-warrior', 'Guerreiro Cosmico', {
    skin: 'skin-07',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    nose: 'nose-04',
    mouth: 'mouth-03',
    hair: 'hair-08',
    hairColor: '#111827',
    body: 'body-03',
    clothes: 'clothes-06',
    clothesColor: '#6d28d9',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-13',
    background: 'bg-08',
    frame: 'frame-legendary',
  }),
  preset('star-athlete', 'Atleta Estrela', {
    skin: 'skin-03',
    face: 'face-01',
    eyebrows: 'brows-05',
    eyes: 'eyes-01',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-07',
    hairColor: '#0f172a',
    body: 'body-02',
    clothes: 'clothes-02',
    clothesColor: '#16a34a',
    accessory: 'none',
    background: 'bg-10',
    frame: 'frame-speed',
  }),
  preset('tech-villain', 'Vilao Tech', {
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
  preset('ninja', 'Ninja', {
    skin: 'skin-04',
    face: 'face-06',
    eyebrows: 'brows-03',
    eyes: 'eyes-06',
    nose: 'nose-03',
    mouth: 'mouth-02',
    hair: 'hair-09',
    hairColor: '#020617',
    body: 'body-02',
    clothes: 'clothes-12',
    clothesColor: '#111827',
    accessory: 'accessory-02',
    background: 'bg-05',
    frame: 'frame-rare',
  }),
  preset('fighter', 'Lutador', {
    skin: 'skin-04',
    face: 'face-03',
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    nose: 'nose-04',
    mouth: 'mouth-03',
    hair: 'hair-06',
    hairColor: '#111827',
    facialHair: 'facial-01',
    body: 'body-03',
    clothes: 'clothes-11',
    clothesColor: '#dc2626',
    background: 'bg-04',
    frame: 'frame-epic',
  }),
  preset('celebrity', 'Celebridade', {
    skin: 'skin-02',
    face: 'face-08',
    eyebrows: 'brows-02',
    eyes: 'eyes-10',
    nose: 'nose-02',
    mouth: 'mouth-04',
    hair: 'hair-15',
    hairColor: '#facc15',
    body: 'body-01',
    clothes: 'clothes-05',
    clothesColor: '#e11d48',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-01',
    background: 'bg-14',
    frame: 'frame-rare',
  }),
  preset('monster', 'Monstro', {
    skin: 'skin-06',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-07',
    nose: 'nose-04',
    mouth: 'mouth-06',
    hair: 'hair-08',
    hairColor: '#064e3b',
    body: 'body-03',
    clothes: 'clothes-10',
    clothesColor: '#4c1d95',
    accessory: 'accessory-06',
    background: 'bg-02',
    frame: 'frame-legendary',
  }),
  preset('royal', 'Rei/Rainha', {
    skin: 'skin-03',
    face: 'face-08',
    eyebrows: 'brows-02',
    eyes: 'eyes-01',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-04',
    hairColor: '#3b2415',
    body: 'body-01',
    clothes: 'clothes-16',
    clothesColor: '#7c3aed',
    outerwear: 'outerwear-cape',
    headwear: 'headwear-02',
    accessory: 'accessory-05',
    background: 'bg-01',
    frame: 'frame-royal',
  }),
  preset('robot', 'Robo', {
    skin: 'skin-09',
    face: 'face-09',
    eyebrows: 'brows-06',
    eyes: 'eyes-08',
    nose: 'nose-06',
    mouth: 'mouth-02',
    hair: 'hair-08',
    hairColor: '#94a3b8',
    body: 'body-05',
    clothes: 'clothes-17',
    clothesColor: '#475569',
    accessory: 'accessory-08',
    background: 'bg-13',
    frame: 'frame-tech',
  }),
  preset('vampire', 'Vampiro', {
    skin: 'skin-01',
    face: 'face-07',
    eyebrows: 'brows-04',
    eyes: 'eyes-07',
    nose: 'nose-05',
    mouth: 'mouth-05',
    hair: 'hair-11',
    hairColor: '#020617',
    body: 'body-04',
    clothes: 'clothes-15',
    clothesColor: '#7f1d1d',
    outerwear: 'outerwear-cape',
    background: 'bg-09',
    frame: 'frame-horror',
  }),
  preset('streamer', 'Streamer', {
    skin: 'skin-02',
    face: 'face-02',
    eyebrows: 'brows-05',
    eyes: 'eyes-02',
    nose: 'nose-04',
    mouth: 'mouth-04',
    hair: 'hair-01',
    hairColor: '#111827',
    facialHair: 'facial-04',
    body: 'body-01',
    clothes: 'clothes-18',
    clothesColor: '#0f172a',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-15',
    background: 'bg-14',
    frame: 'frame-common',
    headwear: 'headwear-06',
  }),
  preset('dj', 'DJ', {
    skin: 'skin-05',
    face: 'face-01',
    eyebrows: 'brows-02',
    eyes: 'eyes-10',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-03',
    hairColor: '#16a34a',
    body: 'body-01',
    clothes: 'clothes-14',
    clothesColor: '#7c3aed',
    accessory: 'accessory-15',
    background: 'bg-14',
    frame: 'frame-speed',
  }),
  preset('detective', 'Detetive', {
    skin: 'skin-02',
    face: 'face-03',
    eyebrows: 'brows-03',
    eyes: 'eyes-04',
    nose: 'nose-03',
    mouth: 'mouth-02',
    hair: 'hair-15',
    hairColor: '#3b2415',
    facialHair: 'facial-03',
    body: 'body-01',
    clothes: 'clothes-19',
    clothesColor: '#92400e',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-16',
    background: 'bg-05',
    frame: 'frame-rare',
  }),
  preset('pirate', 'Pirata', {
    skin: 'skin-03',
    face: 'face-07',
    eyebrows: 'brows-03',
    eyes: 'eyes-03',
    nose: 'nose-05',
    mouth: 'mouth-04',
    hair: 'hair-04',
    hairColor: '#111827',
    facialHair: 'facial-04',
    headwear: 'headwear-06',
    body: 'body-02',
    clothes: 'clothes-20',
    clothesColor: '#7f1d1d',
    accessory: 'accessory-09',
    background: 'bg-15',
    frame: 'frame-royal',
  }),
  preset('ice-mage', 'Mago de Gelo', {
    skin: 'skin-08',
    face: 'face-04',
    eyebrows: 'brows-02',
    eyes: 'eyes-11',
    nose: 'nose-02',
    mouth: 'mouth-02',
    hair: 'hair-04',
    hairColor: '#e0f2fe',
    body: 'body-04',
    clothes: 'clothes-04',
    clothesColor: '#38bdf8',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    background: 'bg-03',
    frame: 'frame-ice',
  }),
  preset('future-soldier', 'Soldado Futurista', {
    skin: 'skin-04',
    face: 'face-06',
    eyebrows: 'brows-03',
    eyes: 'eyes-09',
    nose: 'nose-03',
    mouth: 'mouth-03',
    hair: 'hair-08',
    hairColor: '#111827',
    body: 'body-02',
    clothes: 'clothes-21',
    clothesColor: '#475569',
    outerwear: 'outerwear-armor',
    headwear: 'headwear-05',
    accessory: 'accessory-02',
    background: 'bg-16',
    frame: 'frame-tech',
  }),
];

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
  const premiumHumanPresetIds = [
    'urban-hero',
    'star-athlete',
    'ninja',
    'fighter',
    'celebrity',
    'streamer',
    'dj',
    'detective',
    'pirate',
    'future-soldier',
  ];
  const cleanPresets = AVATAR_PRESETS.filter((presetItem) => premiumHumanPresetIds.includes(presetItem.id));

  if (Math.random() < 0.62) {
    return cleanPresets[Math.floor(Math.random() * cleanPresets.length)].config;
  }

  const humanSkins = ['skin-01', 'skin-02', 'skin-03', 'skin-04', 'skin-05'];
  const humanFaces = ['face-01', 'face-02', 'face-03', 'face-04', 'face-07', 'face-08'];
  const cleanBrows = ['brows-01', 'brows-02', 'brows-03', 'brows-05'];
  const cleanEyes = ['eyes-01', 'eyes-02', 'eyes-03', 'eyes-04', 'eyes-05', 'eyes-10'];
  const cleanNoses = ['nose-01', 'nose-02', 'nose-03', 'nose-04'];
  const cleanMouths = ['mouth-01', 'mouth-02', 'mouth-03', 'mouth-04'];
  const cleanHair = ['hair-01', 'hair-02', 'hair-03', 'hair-04', 'hair-05', 'hair-07', 'hair-12', 'hair-14', 'hair-15'];
  const cleanBodies = ['body-01', 'body-02', 'body-04'];
  const cleanClothes = ['clothes-01', 'clothes-02', 'clothes-05', 'clothes-11', 'clothes-13', 'clothes-14', 'clothes-18', 'clothes-19'];
  const cleanOuterwear = ['outerwear-none', 'outerwear-none', 'outerwear-jacket', 'outerwear-cape'];
  const cleanAccessories = ['none', 'none', 'none', 'accessory-01', 'accessory-10', 'accessory-14', 'accessory-15', 'accessory-16'];
  const cleanHeadwear = ['headwear-none', 'headwear-none', 'headwear-none', 'headwear-01', 'headwear-06'];
  const cleanBackgrounds = ['bg-01', 'bg-03', 'bg-04', 'bg-05', 'bg-06', 'bg-10', 'bg-14', 'bg-16'];
  const cleanFrames = ['frame-common', 'frame-rare', 'frame-epic', 'frame-speed', 'frame-tech'];
  const hairColors = ['#111827', '#1f2937', '#3b2415', '#7c2d12', '#92400e', '#facc15', '#6d28d9', '#be123c', '#16a34a', '#e5e7eb'];
  const clothesColors = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0f766e', '#111827', '#e11d48', '#64748b', '#facc15'];

  const selectedClothes = randomFrom(cleanClothes);

  return normalizeAvatarConfig({
    skin: randomFrom(humanSkins),
    face: randomFrom(humanFaces),
    eyebrows: randomFrom(cleanBrows),
    eyes: randomFrom(cleanEyes),
    nose: randomFrom(cleanNoses),
    mouth: randomFrom(cleanMouths),
    hair: randomFrom(cleanHair),
    hairColor: randomFrom(hairColors),
    facialHair: Math.random() < 0.76 ? 'facial-none' : randomFrom(['facial-01', 'facial-02', 'facial-03', 'facial-04', 'facial-05']),
    headwear: randomFrom(cleanHeadwear),
    body: selectedClothes === 'clothes-11' ? 'body-03' : randomFrom(cleanBodies),
    clothes: selectedClothes,
    clothesColor: randomFrom(clothesColors),
    outerwear: selectedClothes === 'clothes-05' ? 'outerwear-jacket' : randomFrom(cleanOuterwear),
    accessory: randomFrom(cleanAccessories),
    background: randomFrom(cleanBackgrounds),
    frame: randomFrom(cleanFrames),
  });
}

function preset(id: string, label: string, patch: Partial<AvatarConfig>) {
  return {
    id,
    label,
    config: normalizePreset({ ...DEFAULT_AVATAR_CONFIG, ...patch }),
  };
}

function normalizePreset(config: AvatarConfig): AvatarConfig {
  return {
    ...config,
    hairColor: isHexColor(config.hairColor) ? config.hairColor : DEFAULT_AVATAR_CONFIG.hairColor,
    clothesColor: isHexColor(config.clothesColor) ? config.clothesColor : DEFAULT_AVATAR_CONFIG.clothesColor,
  };
}

function pickOption(category: AvatarCategory, value?: string) {
  return AVATAR_OPTIONS[category].some((option) => option.id === value)
    ? value!
    : DEFAULT_AVATAR_CONFIG[category];
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function isHexColor(value?: string) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}
