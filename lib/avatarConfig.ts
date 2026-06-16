export type AvatarKind = 'male' | 'female' | 'creature';

export type AvatarConfig = {
  kind: AvatarKind;
  skin: string;
  face: string;
  eyebrows: string;
  eyes: string;
  nose: string;
  mouth: string;
  hair: string;
  hairSide: string;
  hairline: AvatarHairline;
  hairColor: string;
  facialHair: string;
  headwear: string;
  marking: string;
  body: string;
  silhouette: string;
  clothes: string;
  sleeves: string;
  arms: string;
  clothesColor: string;
  detailColor: string;
  outerwear: string;
  accessory: string;
  aura: string;
  background: string;
  frame: string;
};

export type AvatarCategory = keyof typeof AVATAR_OPTIONS;

type AvatarOption = {
  id: string;
  label: string;
  color?: string;
  kinds?: readonly AvatarKind[];
};

export const AVATAR_KIND_OPTIONS: Array<{ id: AvatarKind; label: string; hint: string }> = [
  { id: 'male', label: 'Masculino', hint: 'base masculina, barba e laterais' },
  { id: 'female', label: 'Feminino', hint: 'base feminina, cabelos longos e sem barba' },
  { id: 'creature', label: 'Criatura', hint: 'monstro, robo, alien, fera ou fantasia' },
];

export const AVATAR_HAIRLINE_OPTIONS = [
  { id: 'hairline-low', label: 'Baixa' },
  { id: 'hairline-medium', label: 'Media' },
  { id: 'hairline-high', label: 'Alta' },
] as const;

export type AvatarHairline = (typeof AVATAR_HAIRLINE_OPTIONS)[number]['id'];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  kind: 'male',
  skin: 'skin-02',
  face: 'face-01',
  eyebrows: 'brows-01',
  eyes: 'eyes-01',
  nose: 'nose-01',
  mouth: 'mouth-04',
  hair: 'hair-01',
  hairSide: 'side-fade-mid',
  hairline: 'hairline-low',
  hairColor: '#111827',
  facialHair: 'facial-none',
  headwear: 'headwear-none',
  marking: 'marking-none',
  body: 'body-02',
  silhouette: 'silhouette-balanced',
  clothes: 'clothes-01',
  sleeves: 'sleeves-short',
  arms: 'arms-neutral',
  clothesColor: '#2563eb',
  detailColor: '#facc15',
  outerwear: 'outerwear-none',
  accessory: 'none',
  aura: 'aura-backlight',
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
    { id: 'hair-01', label: 'Crop texturizado' },
    { id: 'hair-02', label: 'Spikes premium' },
    { id: 'hair-03', label: 'Cacheado volumoso' },
    { id: 'hair-04', label: 'Longo em camadas' },
    { id: 'hair-05', label: 'Topete alto' },
    { id: 'hair-06', label: 'Moicano limpo' },
    { id: 'hair-07', label: 'Franja lateral' },
    { id: 'hair-08', label: 'Careca' },
    { id: 'hair-09', label: 'Capuz baixo' },
    { id: 'hair-10', label: 'Pontas de anime' },
    { id: 'hair-11', label: 'Longo gotico' },
    { id: 'hair-12', label: 'Trancas laterais' },
    { id: 'hair-13', label: 'Messy medio' },
    { id: 'hair-14', label: 'Ondulado praia' },
    { id: 'hair-15', label: 'Executivo penteado' },
    { id: 'hair-16', label: 'Bob moderno' },
    { id: 'hair-17', label: 'Rabo alto' },
    { id: 'hair-18', label: 'Crespo alto' },
    { id: 'hair-19', label: 'Pixie elegante' },
    { id: 'hair-20', label: 'Cortina longa' },
  ],
  hairSide: [
    { id: 'side-none', label: 'Sem lateral' },
    { id: 'side-fade-low', label: 'Fade baixo' },
    { id: 'side-fade-mid', label: 'Fade medio' },
    { id: 'side-fade-high', label: 'Fade alto' },
    { id: 'side-taper', label: 'Taper classico' },
    { id: 'side-undercut', label: 'Undercut' },
    { id: 'side-shaved-line', label: 'Risco navalhado' },
    { id: 'side-long', label: 'Lateral longa' },
    { id: 'side-braided', label: 'Lateral trancada' },
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
  marking: [
    { id: 'marking-none', label: 'Sem marca' },
    { id: 'marking-scar', label: 'Cicatriz facial' },
    { id: 'marking-freckles', label: 'Sardas sutis' },
    { id: 'marking-warpaint', label: 'Pintura de guerra' },
    { id: 'marking-arcane', label: 'Selo arcano' },
    { id: 'marking-cyber', label: 'Linhas cyber' },
    { id: 'marking-royal', label: 'Brilho nobre' },
    { id: 'marking-shadow', label: 'Sombra dramatica' },
  ],
  body: [
    { id: 'body-01', label: 'Equilibrado' },
    { id: 'body-02', label: 'Atletico' },
    { id: 'body-03', label: 'Forte' },
    { id: 'body-04', label: 'Elegante' },
    { id: 'body-05', label: 'Sintetico' },
  ],
  silhouette: [
    { id: 'silhouette-balanced', label: 'Equilibrada' },
    { id: 'silhouette-slim', label: 'Fina' },
    { id: 'silhouette-hero', label: 'Heroi' },
    { id: 'silhouette-wide', label: 'Larga' },
    { id: 'silhouette-dress', label: 'Vestido' },
    { id: 'silhouette-armor', label: 'Armadura' },
    { id: 'silhouette-monster', label: 'Monstro' },
    { id: 'silhouette-robot', label: 'Robo' },
    { id: 'silhouette-alien', label: 'Alien' },
  ],
  clothes: [
    { id: 'clothes-01', label: 'Camiseta casual' },
    { id: 'clothes-02', label: 'Uniforme esportivo' },
    { id: 'clothes-03', label: 'Armadura guerreiro' },
    { id: 'clothes-04', label: 'Manto arcano' },
    { id: 'clothes-05', label: 'Jaqueta street' },
    { id: 'clothes-06', label: 'Traje espacial' },
    { id: 'clothes-07', label: 'Traje raio' },
    { id: 'clothes-08', label: 'Vigilante' },
    { id: 'clothes-09', label: 'Performer palco' },
    { id: 'clothes-10', label: 'Pele monstro' },
    { id: 'clothes-11', label: 'Lutador' },
    { id: 'clothes-12', label: 'Ninja' },
    { id: 'clothes-13', label: 'Heroi urbano' },
    { id: 'clothes-14', label: 'DJ neon' },
    { id: 'clothes-15', label: 'Bruxaria sombria' },
    { id: 'clothes-16', label: 'Realeza oceano' },
    { id: 'clothes-17', label: 'Armadura tech' },
    { id: 'clothes-18', label: 'Moletom streamer' },
    { id: 'clothes-19', label: 'Detetive blazer' },
    { id: 'clothes-20', label: 'Pirata nobre' },
    { id: 'clothes-21', label: 'Soldado futurista' },
    { id: 'clothes-22', label: 'Body heroina' },
    { id: 'clothes-23', label: 'Luxo branco' },
    { id: 'clothes-24', label: 'Vestido bruxa' },
    { id: 'clothes-25', label: 'Pop star' },
    { id: 'clothes-26', label: 'Academia magica' },
    { id: 'clothes-27', label: 'Vestido real' },
    { id: 'clothes-28', label: 'Vitoriano' },
    { id: 'clothes-29', label: 'Couro moto' },
    { id: 'clothes-30', label: 'Terno branco' },
  ],
  sleeves: [
    { id: 'sleeves-none', label: 'Sem manga' },
    { id: 'sleeves-short', label: 'Manga curta' },
    { id: 'sleeves-long', label: 'Manga longa' },
    { id: 'sleeves-jacket', label: 'Manga jaqueta' },
    { id: 'sleeves-armor', label: 'Braco armor' },
    { id: 'sleeves-gloves', label: 'Luvas longas' },
    { id: 'sleeves-torn', label: 'Rasgada' },
    { id: 'sleeves-robot', label: 'Robotica' },
  ],
  arms: [
    { id: 'arms-neutral', label: 'Neutros' },
    { id: 'arms-down', label: 'Para baixo' },
    { id: 'arms-open', label: 'Abertos' },
    { id: 'arms-crossed', label: 'Cruzados' },
    { id: 'arms-waist', label: 'Mao na cintura' },
    { id: 'arms-power', label: 'Punhos fechados' },
    { id: 'arms-raised', label: 'Um braco alto' },
    { id: 'arms-caster', label: 'Conjurando' },
    { id: 'arms-holding', label: 'Segurando item' },
    { id: 'arms-creature', label: 'Garras' },
    { id: 'arms-robot', label: 'Roboticos' },
    { id: 'arms-tentacle', label: 'Tentaculos' },
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
    { id: 'accessory-02', label: 'Mascara tatica' },
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
  aura: [
    { id: 'aura-none', label: 'Sem aura' },
    { id: 'aura-backlight', label: 'Luz de recorte' },
    { id: 'aura-neon', label: 'Anel neon' },
    { id: 'aura-embers', label: 'Brasas' },
    { id: 'aura-frost', label: 'Cristais de gelo' },
    { id: 'aura-shadow', label: 'Sombra viva' },
    { id: 'aura-cosmic', label: 'Particulas cosmicas' },
    { id: 'aura-stadium', label: 'Luzes de arena' },
    { id: 'aura-tech', label: 'Scan digital' },
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

const KIND_OPTION_RULES: Record<AvatarKind, Partial<Record<AvatarCategory, readonly string[]>>> = {
  male: {
    skin: ['skin-01', 'skin-02', 'skin-03', 'skin-04', 'skin-05', 'skin-09'],
    face: ['face-01', 'face-03', 'face-05', 'face-06', 'face-07', 'face-08', 'face-09'],
    eyebrows: ['brows-01', 'brows-02', 'brows-03', 'brows-04', 'brows-05', 'brows-06'],
    eyes: ['eyes-01', 'eyes-02', 'eyes-03', 'eyes-04', 'eyes-05', 'eyes-06', 'eyes-08', 'eyes-09', 'eyes-10', 'eyes-12'],
    nose: ['nose-01', 'nose-03', 'nose-04', 'nose-05', 'nose-06'],
    mouth: ['mouth-01', 'mouth-02', 'mouth-03', 'mouth-04', 'mouth-05'],
    hair: ['hair-01', 'hair-02', 'hair-03', 'hair-05', 'hair-06', 'hair-07', 'hair-08', 'hair-10', 'hair-13', 'hair-15', 'hair-18'],
    hairSide: ['side-none', 'side-fade-low', 'side-fade-mid', 'side-fade-high', 'side-taper', 'side-undercut', 'side-shaved-line'],
    facialHair: ['facial-none', 'facial-01', 'facial-02', 'facial-03', 'facial-04', 'facial-05'],
    body: ['body-01', 'body-02', 'body-03', 'body-05'],
    silhouette: ['silhouette-balanced', 'silhouette-slim', 'silhouette-hero', 'silhouette-wide', 'silhouette-armor'],
    sleeves: ['sleeves-none', 'sleeves-short', 'sleeves-long', 'sleeves-jacket', 'sleeves-armor', 'sleeves-gloves'],
    arms: ['arms-neutral', 'arms-down', 'arms-open', 'arms-crossed', 'arms-waist', 'arms-power', 'arms-raised', 'arms-holding', 'arms-robot'],
    clothes: ['clothes-01', 'clothes-02', 'clothes-03', 'clothes-05', 'clothes-06', 'clothes-07', 'clothes-08', 'clothes-11', 'clothes-12', 'clothes-13', 'clothes-14', 'clothes-17', 'clothes-18', 'clothes-19', 'clothes-20', 'clothes-21', 'clothes-28', 'clothes-29', 'clothes-30'],
    outerwear: ['outerwear-none', 'outerwear-cape', 'outerwear-armor', 'outerwear-jacket'],
  },
  female: {
    skin: ['skin-01', 'skin-02', 'skin-03', 'skin-04', 'skin-05', 'skin-08'],
    face: ['face-02', 'face-04', 'face-07', 'face-08', 'face-10'],
    eyebrows: ['brows-01', 'brows-02', 'brows-03', 'brows-04', 'brows-05'],
    eyes: ['eyes-01', 'eyes-02', 'eyes-04', 'eyes-05', 'eyes-06', 'eyes-10', 'eyes-11'],
    nose: ['nose-01', 'nose-02', 'nose-03', 'nose-05'],
    mouth: ['mouth-01', 'mouth-02', 'mouth-03', 'mouth-04', 'mouth-05'],
    hair: ['hair-04', 'hair-08', 'hair-11', 'hair-12', 'hair-14', 'hair-16', 'hair-17', 'hair-19', 'hair-20'],
    hairSide: ['side-none', 'side-long', 'side-braided'],
    facialHair: ['facial-none'],
    body: ['body-01', 'body-02', 'body-04'],
    silhouette: ['silhouette-balanced', 'silhouette-slim', 'silhouette-hero', 'silhouette-dress', 'silhouette-armor'],
    sleeves: ['sleeves-none', 'sleeves-short', 'sleeves-long', 'sleeves-jacket', 'sleeves-gloves', 'sleeves-torn'],
    arms: ['arms-neutral', 'arms-down', 'arms-open', 'arms-crossed', 'arms-waist', 'arms-raised', 'arms-caster', 'arms-holding'],
    clothes: ['clothes-01', 'clothes-04', 'clothes-05', 'clothes-06', 'clothes-08', 'clothes-13', 'clothes-14', 'clothes-15', 'clothes-16', 'clothes-18', 'clothes-19', 'clothes-22', 'clothes-23', 'clothes-24', 'clothes-25', 'clothes-26', 'clothes-27', 'clothes-28', 'clothes-30'],
    outerwear: ['outerwear-none', 'outerwear-cape', 'outerwear-robe', 'outerwear-ruff', 'outerwear-jacket'],
  },
  creature: {
    skin: ['skin-06', 'skin-07', 'skin-08', 'skin-09'],
    face: ['face-05', 'face-06', 'face-09', 'face-10'],
    eyebrows: ['brows-03', 'brows-04', 'brows-06'],
    eyes: ['eyes-03', 'eyes-06', 'eyes-07', 'eyes-08', 'eyes-09', 'eyes-11', 'eyes-12'],
    nose: ['nose-04', 'nose-05', 'nose-06'],
    mouth: ['mouth-03', 'mouth-05', 'mouth-06'],
    hair: ['hair-08', 'hair-09', 'hair-10', 'hair-11', 'hair-18'],
    hairSide: ['side-none', 'side-long'],
    facialHair: ['facial-none'],
    body: ['body-03', 'body-05'],
    silhouette: ['silhouette-wide', 'silhouette-armor', 'silhouette-monster', 'silhouette-robot', 'silhouette-alien'],
    sleeves: ['sleeves-none', 'sleeves-long', 'sleeves-armor', 'sleeves-torn', 'sleeves-robot'],
    arms: ['arms-neutral', 'arms-open', 'arms-power', 'arms-raised', 'arms-creature', 'arms-robot', 'arms-tentacle'],
    clothes: ['clothes-03', 'clothes-04', 'clothes-06', 'clothes-10', 'clothes-11', 'clothes-15', 'clothes-17', 'clothes-21', 'clothes-24', 'clothes-28'],
    outerwear: ['outerwear-none', 'outerwear-cape', 'outerwear-robe', 'outerwear-armor'],
  },
};

const KIND_DEFAULT_PATCHES: Record<AvatarKind, Partial<AvatarConfig>> = {
  male: {
    kind: 'male',
    skin: 'skin-02',
    face: 'face-01',
    eyebrows: 'brows-01',
    eyes: 'eyes-01',
    nose: 'nose-01',
    mouth: 'mouth-04',
    hair: 'hair-01',
    hairSide: 'side-fade-mid',
    hairline: 'hairline-low',
    hairColor: '#111827',
    facialHair: 'facial-none',
    headwear: 'headwear-none',
    marking: 'marking-none',
    body: 'body-02',
    silhouette: 'silhouette-balanced',
    clothes: 'clothes-01',
    sleeves: 'sleeves-short',
    arms: 'arms-neutral',
    clothesColor: '#2563eb',
    detailColor: '#facc15',
    outerwear: 'outerwear-none',
    accessory: 'none',
    aura: 'aura-backlight',
    background: 'bg-01',
    frame: 'frame-rare',
  },
  female: {
    kind: 'female',
    skin: 'skin-01',
    face: 'face-02',
    eyebrows: 'brows-02',
    eyes: 'eyes-05',
    nose: 'nose-02',
    mouth: 'mouth-01',
    hair: 'hair-16',
    hairSide: 'side-none',
    hairline: 'hairline-low',
    hairColor: '#3b2415',
    facialHair: 'facial-none',
    headwear: 'headwear-none',
    marking: 'marking-freckles',
    body: 'body-04',
    silhouette: 'silhouette-slim',
    clothes: 'clothes-05',
    sleeves: 'sleeves-jacket',
    arms: 'arms-neutral',
    clothesColor: '#db2777',
    detailColor: '#facc15',
    outerwear: 'outerwear-jacket',
    accessory: 'none',
    aura: 'aura-backlight',
    background: 'bg-14',
    frame: 'frame-rare',
  },
  creature: {
    kind: 'creature',
    skin: 'skin-06',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-07',
    nose: 'nose-04',
    mouth: 'mouth-06',
    hair: 'hair-08',
    hairSide: 'side-none',
    hairline: 'hairline-high',
    hairColor: '#064e3b',
    facialHair: 'facial-none',
    headwear: 'headwear-none',
    marking: 'marking-warpaint',
    body: 'body-03',
    silhouette: 'silhouette-monster',
    clothes: 'clothes-10',
    sleeves: 'sleeves-torn',
    arms: 'arms-creature',
    clothesColor: '#4c1d95',
    detailColor: '#facc15',
    outerwear: 'outerwear-none',
    accessory: 'accessory-06',
    aura: 'aura-embers',
    background: 'bg-02',
    frame: 'frame-legendary',
  },
};

export function getAvatarOptionsForKind(category: AvatarCategory, kind: AvatarKind = 'male') {
  const selectedKind = pickKind(kind);
  const allowedIds = KIND_OPTION_RULES[selectedKind][category];
  const options = AVATAR_OPTIONS[category];

  if (!allowedIds) return options;

  return options.filter((option) => allowedIds.includes(option.id));
}

export function getDefaultAvatarConfigForKind(kind: AvatarKind = 'male'): AvatarConfig {
  const selectedKind = pickKind(kind);
  return normalizeAvatarConfig({ ...DEFAULT_AVATAR_CONFIG, ...KIND_DEFAULT_PATCHES[selectedKind], kind: selectedKind });
}

export function switchAvatarKind(config: AvatarConfig, kind: AvatarKind): AvatarConfig {
  const selectedKind = pickKind(kind);
  const defaults = getDefaultAvatarConfigForKind(selectedKind);

  return normalizeAvatarConfig({
    ...config,
    kind: selectedKind,
    skin: defaults.skin,
    face: defaults.face,
    eyebrows: defaults.eyebrows,
    eyes: defaults.eyes,
    nose: defaults.nose,
    mouth: defaults.mouth,
    hair: defaults.hair,
    hairSide: defaults.hairSide,
    hairline: defaults.hairline,
    hairColor: defaults.hairColor,
    facialHair: defaults.facialHair,
    body: defaults.body,
    silhouette: defaults.silhouette,
    clothes: defaults.clothes,
    sleeves: defaults.sleeves,
    arms: defaults.arms,
    clothesColor: defaults.clothesColor,
    detailColor: defaults.detailColor,
    outerwear: defaults.outerwear,
    accessory: defaults.accessory,
    marking: defaults.marking,
  });
}

export const AVATAR_PRESETS: Array<{ id: string; label: string; config: AvatarConfig }> = [
  preset('female-studio', 'Heroina Studio', {
    kind: 'female',
    skin: 'skin-01',
    face: 'face-02',
    eyebrows: 'brows-02',
    eyes: 'eyes-05',
    nose: 'nose-02',
    mouth: 'mouth-01',
    hair: 'hair-16',
    hairSide: 'side-none',
    hairColor: '#3b2415',
    body: 'body-04',
    clothes: 'clothes-05',
    clothesColor: '#db2777',
    detailColor: '#facc15',
    outerwear: 'outerwear-jacket',
    marking: 'marking-freckles',
    aura: 'aura-backlight',
    background: 'bg-14',
    frame: 'frame-rare',
  }),
  preset('female-mage', 'Maga Arcana', {
    kind: 'female',
    skin: 'skin-08',
    face: 'face-04',
    eyebrows: 'brows-02',
    eyes: 'eyes-11',
    nose: 'nose-02',
    mouth: 'mouth-02',
    hair: 'hair-20',
    hairSide: 'side-none',
    hairColor: '#e0f2fe',
    body: 'body-04',
    clothes: 'clothes-04',
    clothesColor: '#38bdf8',
    detailColor: '#facc15',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    marking: 'marking-arcane',
    aura: 'aura-frost',
    background: 'bg-03',
    frame: 'frame-ice',
  }),
  preset('creature-feral', 'Criatura Feral', {
    kind: 'creature',
    skin: 'skin-06',
    face: 'face-05',
    eyebrows: 'brows-03',
    eyes: 'eyes-07',
    nose: 'nose-04',
    mouth: 'mouth-06',
    hair: 'hair-08',
    hairSide: 'side-none',
    hairColor: '#064e3b',
    body: 'body-03',
    clothes: 'clothes-10',
    clothesColor: '#4c1d95',
    detailColor: '#facc15',
    accessory: 'accessory-06',
    marking: 'marking-warpaint',
    aura: 'aura-embers',
    background: 'bg-02',
    frame: 'frame-legendary',
  }),
  preset('creature-android', 'Androide', {
    kind: 'creature',
    skin: 'skin-09',
    face: 'face-09',
    eyebrows: 'brows-06',
    eyes: 'eyes-12',
    nose: 'nose-06',
    mouth: 'mouth-02',
    hair: 'hair-08',
    hairSide: 'side-none',
    hairColor: '#94a3b8',
    body: 'body-05',
    clothes: 'clothes-17',
    clothesColor: '#475569',
    detailColor: '#facc15',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-08',
    marking: 'marking-cyber',
    aura: 'aura-tech',
    background: 'bg-13',
    frame: 'frame-tech',
  }),
  preset('urban-hero', 'Heroi Urbano', {
    skin: 'skin-02',
    face: 'face-01',
    eyebrows: 'brows-03',
    eyes: 'eyes-01',
    nose: 'nose-01',
    mouth: 'mouth-04',
    hair: 'hair-05',
    hairSide: 'side-fade-high',
    hairColor: '#111827',
    body: 'body-02',
    clothes: 'clothes-13',
    clothesColor: '#2563eb',
    detailColor: '#facc15',
    outerwear: 'outerwear-cape',
    aura: 'aura-backlight',
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
    hairSide: 'side-long',
    hairColor: '#2f1b12',
    body: 'body-04',
    clothes: 'clothes-15',
    clothesColor: '#111827',
    detailColor: '#facc15',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    marking: 'marking-arcane',
    aura: 'aura-shadow',
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
    detailColor: '#facc15',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-13',
    marking: 'marking-royal',
    aura: 'aura-cosmic',
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
    hairSide: 'side-shaved-line',
    hairColor: '#0f172a',
    body: 'body-02',
    clothes: 'clothes-02',
    clothesColor: '#16a34a',
    detailColor: '#facc15',
    accessory: 'none',
    aura: 'aura-stadium',
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
    detailColor: '#facc15',
    outerwear: 'outerwear-armor',
    accessory: 'accessory-08',
    marking: 'marking-cyber',
    aura: 'aura-tech',
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
    detailColor: '#facc15',
    accessory: 'accessory-02',
    marking: 'marking-shadow',
    aura: 'aura-shadow',
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
    detailColor: '#facc15',
    marking: 'marking-scar',
    aura: 'aura-embers',
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
    hairSide: 'side-taper',
    hairColor: '#facc15',
    body: 'body-01',
    clothes: 'clothes-05',
    clothesColor: '#e11d48',
    detailColor: '#facc15',
    outerwear: 'outerwear-jacket',
    accessory: 'none',
    marking: 'marking-royal',
    aura: 'aura-backlight',
    background: 'bg-14',
    frame: 'frame-rare',
  }),
  preset('monster', 'Monstro', {
    kind: 'creature',
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
    detailColor: '#facc15',
    accessory: 'accessory-06',
    marking: 'marking-warpaint',
    aura: 'aura-embers',
    background: 'bg-02',
    frame: 'frame-legendary',
  }),
  preset('royal', 'Rei/Rainha', {
    kind: 'female',
    skin: 'skin-03',
    face: 'face-08',
    eyebrows: 'brows-02',
    eyes: 'eyes-01',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-04',
    hairSide: 'side-long',
    hairColor: '#3b2415',
    body: 'body-01',
    clothes: 'clothes-16',
    clothesColor: '#7c3aed',
    detailColor: '#facc15',
    outerwear: 'outerwear-cape',
    headwear: 'headwear-02',
    accessory: 'accessory-05',
    marking: 'marking-royal',
    aura: 'aura-backlight',
    background: 'bg-01',
    frame: 'frame-royal',
  }),
  preset('robot', 'Robo', {
    kind: 'creature',
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
    detailColor: '#facc15',
    accessory: 'accessory-08',
    marking: 'marking-cyber',
    aura: 'aura-tech',
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
    hairSide: 'side-taper',
    hairColor: '#020617',
    body: 'body-04',
    clothes: 'clothes-15',
    clothesColor: '#7f1d1d',
    detailColor: '#facc15',
    outerwear: 'outerwear-cape',
    marking: 'marking-shadow',
    aura: 'aura-shadow',
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
    hairSide: 'side-fade-low',
    hairColor: '#111827',
    facialHair: 'facial-04',
    body: 'body-01',
    clothes: 'clothes-18',
    clothesColor: '#0f172a',
    detailColor: '#facc15',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-15',
    marking: 'marking-none',
    aura: 'aura-neon',
    background: 'bg-14',
    frame: 'frame-common',
    headwear: 'headwear-none',
  }),
  preset('dj', 'DJ', {
    skin: 'skin-05',
    face: 'face-01',
    eyebrows: 'brows-02',
    eyes: 'eyes-10',
    nose: 'nose-03',
    mouth: 'mouth-04',
    hair: 'hair-03',
    hairSide: 'side-undercut',
    hairColor: '#16a34a',
    body: 'body-01',
    clothes: 'clothes-14',
    clothesColor: '#7c3aed',
    detailColor: '#facc15',
    accessory: 'accessory-15',
    marking: 'marking-cyber',
    aura: 'aura-neon',
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
    hairSide: 'side-taper',
    hairColor: '#3b2415',
    facialHair: 'facial-03',
    body: 'body-01',
    clothes: 'clothes-19',
    clothesColor: '#92400e',
    detailColor: '#facc15',
    outerwear: 'outerwear-jacket',
    accessory: 'accessory-16',
    marking: 'marking-shadow',
    aura: 'aura-backlight',
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
    hair: 'hair-15',
    hairSide: 'side-taper',
    hairColor: '#111827',
    facialHair: 'facial-04',
    headwear: 'headwear-06',
    body: 'body-02',
    clothes: 'clothes-20',
    clothesColor: '#7f1d1d',
    detailColor: '#facc15',
    accessory: 'accessory-09',
    marking: 'marking-scar',
    aura: 'aura-backlight',
    background: 'bg-15',
    frame: 'frame-royal',
  }),
  preset('ice-mage', 'Mago de Gelo', {
    kind: 'female',
    skin: 'skin-08',
    face: 'face-04',
    eyebrows: 'brows-02',
    eyes: 'eyes-11',
    nose: 'nose-02',
    mouth: 'mouth-02',
    hair: 'hair-04',
    hairSide: 'side-long',
    hairColor: '#e0f2fe',
    body: 'body-04',
    clothes: 'clothes-04',
    clothesColor: '#38bdf8',
    detailColor: '#facc15',
    outerwear: 'outerwear-robe',
    accessory: 'accessory-11',
    marking: 'marking-arcane',
    aura: 'aura-frost',
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
    detailColor: '#facc15',
    outerwear: 'outerwear-armor',
    headwear: 'headwear-05',
    accessory: 'none',
    marking: 'marking-cyber',
    aura: 'aura-tech',
    background: 'bg-16',
    frame: 'frame-tech',
  }),
];

export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== 'object') return DEFAULT_AVATAR_CONFIG;

  const draft = value as Partial<AvatarConfig>;
  const kind = pickKind(draft.kind);

  return applyKindRules({
    kind,
    skin: pickOption('skin', draft.skin),
    face: pickOption('face', draft.face),
    eyebrows: pickOption('eyebrows', draft.eyebrows),
    eyes: pickOption('eyes', draft.eyes),
    nose: pickOption('nose', draft.nose),
    mouth: pickOption('mouth', draft.mouth),
    hair: pickOption('hair', draft.hair),
    hairSide: pickOption('hairSide', draft.hairSide),
    hairline: pickHairline(draft.hairline),
    hairColor: isHexColor(draft.hairColor) ? draft.hairColor! : DEFAULT_AVATAR_CONFIG.hairColor,
    facialHair: pickOption('facialHair', draft.facialHair),
    headwear: pickOption('headwear', draft.headwear),
    marking: pickOption('marking', draft.marking),
    body: pickOption('body', draft.body),
    silhouette: pickOption('silhouette', draft.silhouette),
    clothes: pickOption('clothes', draft.clothes),
    sleeves: pickOption('sleeves', draft.sleeves),
    arms: pickOption('arms', draft.arms),
    clothesColor: isHexColor(draft.clothesColor) ? draft.clothesColor! : DEFAULT_AVATAR_CONFIG.clothesColor,
    detailColor: isHexColor(draft.detailColor) ? draft.detailColor! : DEFAULT_AVATAR_CONFIG.detailColor,
    outerwear: pickOption('outerwear', draft.outerwear),
    accessory: pickOption('accessory', draft.accessory),
    aura: pickOption('aura', draft.aura),
    background: pickOption('background', draft.background),
    frame: pickOption('frame', draft.frame),
  });
}

export function randomAvatarConfig(kind?: AvatarKind): AvatarConfig {
  const targetKind = kind || randomWeightedKind();

  if (targetKind !== 'male') {
    return randomKindAvatar(targetKind);
  }

  const humanSkins = ['skin-01', 'skin-02', 'skin-03', 'skin-04', 'skin-05'];
  const humanFaces = ['face-01', 'face-03', 'face-05', 'face-07', 'face-08'];
  const humanBrows = ['brows-01', 'brows-02', 'brows-03', 'brows-05'];
  const humanEyes = ['eyes-01', 'eyes-02', 'eyes-04', 'eyes-05'];
  const humanNoses = ['nose-01', 'nose-03', 'nose-04', 'nose-05'];
  const humanMouths = ['mouth-01', 'mouth-02', 'mouth-03', 'mouth-04'];
  const safeHair = ['hair-01', 'hair-02', 'hair-03', 'hair-05', 'hair-06', 'hair-07', 'hair-10', 'hair-13', 'hair-15', 'hair-18'];
  const longHair = ['hair-13'];
  const shortHairSides = ['side-fade-low', 'side-fade-mid', 'side-fade-high', 'side-taper', 'side-undercut', 'side-shaved-line'];
  const hairColors = ['#111827', '#1f2937', '#3b2415', '#7c2d12', '#92400e', '#d97706', '#facc15', '#e5e7eb'];
  const urbanColors = ['#2563eb', '#7c3aed', '#0f766e', '#111827', '#e11d48'];
  const detailColors = ['#facc15', '#38bdf8', '#f8fafc', '#fb7185', '#a78bfa', '#22c55e'];
  const athleteColors = ['#16a34a', '#2563eb', '#dc2626', '#facc15', '#0f766e'];
  const elegantColors = ['#111827', '#334155', '#7f1d1d', '#92400e', '#581c87'];

  const isLongHair = (hair: string) => longHair.includes(hair) || hair === 'hair-12';
  const compatibleHairSide = (hair: string) => isLongHair(hair) ? randomFrom(['side-none', 'side-long']) : randomFrom(shortHairSides);
  const lightAccessories = ['none', 'none', 'none', 'accessory-10', 'accessory-14', 'accessory-16'];
  const noGlassesWithHair = (hair: string) => isLongHair(hair) ? randomFrom(lightAccessories) : randomFrom([...lightAccessories, 'accessory-15']);

  const humanBase = (patch: Partial<AvatarConfig> = {}): Partial<AvatarConfig> => {
    const hair = patch.hair || randomFrom([...safeHair, ...longHair]);

    return {
      kind: 'male',
      skin: randomFrom(humanSkins),
      face: randomFrom(humanFaces),
      eyebrows: randomFrom(humanBrows),
      eyes: randomFrom(humanEyes),
      nose: randomFrom(humanNoses),
      mouth: randomFrom(humanMouths),
      hair,
      hairSide: compatibleHairSide(hair),
      hairline: randomFrom<AvatarHairline>(['hairline-low', 'hairline-low', 'hairline-medium']),
      hairColor: randomFrom(hairColors),
      facialHair: Math.random() < 0.82 ? 'facial-none' : randomFrom(['facial-01', 'facial-02', 'facial-03', 'facial-04']),
      headwear: 'headwear-none',
      marking: randomFrom(['marking-none', 'marking-none', 'marking-none', 'marking-freckles', 'marking-royal']),
      body: randomFrom(['body-01', 'body-02', 'body-03']),
      silhouette: randomFrom(getAvatarOptionsForKind('silhouette', 'male').map((option) => option.id)),
      sleeves: randomFrom(getAvatarOptionsForKind('sleeves', 'male').map((option) => option.id)),
      arms: randomFrom(getAvatarOptionsForKind('arms', 'male').map((option) => option.id)),
      accessory: noGlassesWithHair(hair),
      aura: randomFrom(['aura-backlight', 'aura-backlight', 'aura-none', 'aura-neon']),
      background: randomFrom(['bg-01', 'bg-05', 'bg-06', 'bg-14', 'bg-16']),
      frame: randomFrom(['frame-common', 'frame-rare', 'frame-epic']),
      detailColor: randomFrom(detailColors),
      ...patch,
    };
  };

  const archetypes: Array<{ weight: number; build: () => Partial<AvatarConfig> }> = [
    {
      weight: 34,
      build: () => humanBase({
        body: randomFrom(['body-01', 'body-02']),
        clothes: randomFrom(['clothes-01', 'clothes-05', 'clothes-18', 'clothes-14', 'clothes-28', 'clothes-29', 'clothes-30']),
        clothesColor: randomFrom(urbanColors),
        detailColor: '#facc15',
        outerwear: randomFrom(['outerwear-none', 'outerwear-jacket']),
        background: randomFrom(['bg-01', 'bg-05', 'bg-14', 'bg-16']),
        frame: randomFrom(['frame-common', 'frame-rare', 'frame-epic']),
      }),
    },
    {
      weight: 24,
      build: () => humanBase({
        eyebrows: randomFrom(['brows-01', 'brows-03', 'brows-05']),
        eyes: randomFrom(['eyes-01', 'eyes-02', 'eyes-04']),
        hair: randomFrom(['hair-01', 'hair-05', 'hair-07', 'hair-15', 'hair-18']),
        body: randomFrom(['body-02', 'body-03']),
        clothes: randomFrom(['clothes-02', 'clothes-07', 'clothes-11']),
        clothesColor: randomFrom(athleteColors),
        detailColor: '#facc15',
        outerwear: 'outerwear-none',
        accessory: randomFrom(['none', 'none', 'accessory-10']),
        aura: 'aura-stadium',
        background: 'bg-10',
        frame: randomFrom(['frame-speed', 'frame-rare']),
      }),
    },
    {
      weight: 22,
      build: () => humanBase({
        eyebrows: randomFrom(['brows-01', 'brows-02']),
        eyes: randomFrom(['eyes-01', 'eyes-02', 'eyes-04', 'eyes-10']),
        hair: randomFrom(['hair-01', 'hair-03', 'hair-13', 'hair-15', 'hair-18']),
        body: randomFrom(['body-01', 'body-02']),
        clothes: randomFrom(['clothes-05', 'clothes-19', 'clothes-01', 'clothes-28', 'clothes-30']),
        clothesColor: randomFrom(elegantColors),
        detailColor: '#facc15',
        outerwear: randomFrom(['outerwear-jacket', 'outerwear-none']),
        accessory: randomFrom(['none', 'none', 'accessory-16']),
        aura: 'aura-backlight',
        background: randomFrom(['bg-05', 'bg-11', 'bg-14']),
        frame: randomFrom(['frame-rare', 'frame-royal']),
      }),
    },
    {
      weight: 6,
      build: () => normalizePreset({
        ...DEFAULT_AVATAR_CONFIG,
        skin: randomFrom(humanSkins),
        face: randomFrom(['face-06', 'face-09']),
        eyebrows: 'brows-06',
        eyes: randomFrom(['eyes-09', 'eyes-12']),
        nose: randomFrom(['nose-03', 'nose-06']),
        mouth: randomFrom(['mouth-02', 'mouth-03']),
        hair: 'hair-08',
        hairSide: 'side-none',
        hairColor: '#111827',
        body: randomFrom(['body-02', 'body-05']),
        clothes: randomFrom(['clothes-06', 'clothes-17', 'clothes-21']),
        clothesColor: randomFrom(['#334155', '#475569', '#0f766e', '#2563eb']),
        detailColor: '#facc15',
        outerwear: 'outerwear-armor',
        accessory: randomFrom(['none', 'accessory-08']),
        marking: 'marking-cyber',
        aura: 'aura-tech',
        background: randomFrom(['bg-13', 'bg-16']),
        frame: 'frame-tech',
      }),
    },
    {
      weight: 6,
      build: () => normalizePreset({
        ...DEFAULT_AVATAR_CONFIG,
        skin: randomFrom(['skin-01', 'skin-07', 'skin-08']),
        face: randomFrom(['face-04', 'face-07', 'face-10']),
        eyebrows: randomFrom(['brows-02', 'brows-04']),
        eyes: randomFrom(['eyes-06', 'eyes-11']),
        nose: randomFrom(['nose-02', 'nose-05']),
        mouth: randomFrom(['mouth-02', 'mouth-03', 'mouth-05']),
        hair: randomFrom(['hair-04', 'hair-11', 'hair-13', 'hair-20']),
        hairSide: randomFrom(['side-none', 'side-long']),
        hairColor: randomFrom(['#020617', '#2f1b12', '#e0f2fe', '#6d28d9']),
        body: randomFrom(['body-04', 'body-01']),
        clothes: randomFrom(['clothes-04', 'clothes-15', 'clothes-16', 'clothes-22', 'clothes-23', 'clothes-24', 'clothes-25', 'clothes-27']),
        clothesColor: randomFrom(['#111827', '#7c3aed', '#38bdf8', '#7f1d1d']),
        detailColor: '#facc15',
        outerwear: randomFrom(['outerwear-robe', 'outerwear-cape']),
        accessory: randomFrom(['none', 'accessory-11', 'accessory-05']),
        marking: randomFrom(['marking-arcane', 'marking-shadow', 'marking-royal']),
        aura: randomFrom(['aura-shadow', 'aura-frost', 'aura-cosmic']),
        background: randomFrom(['bg-03', 'bg-08', 'bg-09', 'bg-11']),
        frame: randomFrom(['frame-horror', 'frame-ice', 'frame-royal']),
      }),
    },
    {
      weight: 4,
      build: () => normalizePreset({
        ...DEFAULT_AVATAR_CONFIG,
        skin: 'skin-06',
        face: 'face-05',
        eyebrows: randomFrom(['brows-03', 'brows-04']),
        eyes: randomFrom(['eyes-07', 'eyes-06']),
        nose: 'nose-04',
        mouth: 'mouth-06',
        hair: randomFrom(['hair-08', 'hair-18']),
        hairSide: 'side-none',
        hairColor: '#064e3b',
        body: 'body-03',
        clothes: randomFrom(['clothes-10', 'clothes-11']),
        clothesColor: randomFrom(['#4c1d95', '#064e3b', '#7f1d1d']),
        detailColor: '#facc15',
        outerwear: 'outerwear-none',
        accessory: randomFrom(['none', 'accessory-06']),
        marking: randomFrom(['marking-warpaint', 'marking-scar']),
        aura: randomFrom(['aura-embers', 'aura-shadow']),
        background: randomFrom(['bg-02', 'bg-09']),
        frame: randomFrom(['frame-horror', 'frame-legendary']),
      }),
    },
    {
      weight: 4,
      build: () => normalizePreset({
        ...DEFAULT_AVATAR_CONFIG,
        skin: 'skin-09',
        face: 'face-09',
        eyebrows: 'brows-06',
        eyes: randomFrom(['eyes-08', 'eyes-12']),
        nose: 'nose-06',
        mouth: randomFrom(['mouth-02', 'mouth-03']),
        hair: 'hair-08',
        hairSide: 'side-none',
        hairColor: '#94a3b8',
        body: 'body-05',
        clothes: randomFrom(['clothes-17', 'clothes-21']),
        clothesColor: randomFrom(['#475569', '#64748b', '#334155']),
        detailColor: '#facc15',
        outerwear: 'outerwear-armor',
        accessory: randomFrom(['none', 'accessory-08']),
        marking: 'marking-cyber',
        aura: 'aura-tech',
        background: 'bg-13',
        frame: 'frame-tech',
      }),
    },
  ];

  const totalWeight = archetypes.reduce((sum, archetype) => sum + archetype.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const archetype of archetypes) {
    roll -= archetype.weight;
    if (roll <= 0) {
      return normalizeAvatarConfig(archetype.build());
    }
  }

  return normalizeAvatarConfig(archetypes[0].build());
}

function preset(id: string, label: string, patch: Partial<AvatarConfig>) {
  return {
    id,
    label,
    config: normalizePreset({ ...DEFAULT_AVATAR_CONFIG, ...patch }),
  };
}

function normalizePreset(config: AvatarConfig): AvatarConfig {
  return normalizeAvatarConfig({
    ...config,
    hairColor: isHexColor(config.hairColor) ? config.hairColor : DEFAULT_AVATAR_CONFIG.hairColor,
    clothesColor: isHexColor(config.clothesColor) ? config.clothesColor : DEFAULT_AVATAR_CONFIG.clothesColor,
    detailColor: isHexColor(config.detailColor) ? config.detailColor : DEFAULT_AVATAR_CONFIG.detailColor,
  });
}


function applyKindRules(config: AvatarConfig): AvatarConfig {
  const kind = pickKind(config.kind);
  const result = { ...config, kind } as AvatarConfig;
  const mutable = result as AvatarConfig & Record<AvatarCategory, string>;

  (Object.keys(AVATAR_OPTIONS) as AvatarCategory[]).forEach((category) => {
    if (!isOptionAllowedForKind(category, mutable[category], kind)) {
      const fallback = getFallbackOption(category, kind);
      mutable[category] = fallback;
    }
  });

  if (kind !== 'male') {
    result.facialHair = 'facial-none';
  }

  if (kind === 'female') {
    result.hairSide = ['side-long', 'side-braided'].includes(result.hairSide) ? result.hairSide : 'side-none';
  }

  if (kind === 'creature') {
    result.hairSide = ['side-long'].includes(result.hairSide) ? result.hairSide : 'side-none';
    result.hairline = 'hairline-high';
  }

  return result;
}

function getFallbackOption(category: AvatarCategory, kind: AvatarKind) {
  const kindDefault = KIND_DEFAULT_PATCHES[kind][category];
  const options = getAvatarOptionsForKind(category, kind);

  if (typeof kindDefault === 'string' && options.some((option) => option.id === kindDefault)) {
    return kindDefault;
  }

  return options[0]?.id || DEFAULT_AVATAR_CONFIG[category];
}

function isOptionAllowedForKind(category: AvatarCategory, value: string | undefined, kind: AvatarKind) {
  if (!value) return false;
  const options = getAvatarOptionsForKind(category, kind);
  return options.some((option) => option.id === value);
}

function pickKind(value?: string): AvatarKind {
  return value === 'female' || value === 'creature' ? value : 'male';
}

function randomWeightedKind(): AvatarKind {
  const roll = Math.random();
  if (roll < 0.42) return 'male';
  if (roll < 0.78) return 'female';
  return 'creature';
}

function randomKindAvatar(kind: AvatarKind): AvatarConfig {
  const skin = kind === 'female'
    ? randomFrom(['skin-01', 'skin-02', 'skin-03', 'skin-04', 'skin-05', 'skin-08'])
    : randomFrom(['skin-06', 'skin-07', 'skin-08', 'skin-09']);
  const hair = kind === 'female'
    ? randomFrom(['hair-04', 'hair-11', 'hair-12', 'hair-14', 'hair-16', 'hair-17', 'hair-19', 'hair-20'])
    : randomFrom(['hair-08', 'hair-08', 'hair-09', 'hair-10', 'hair-18']);
  const hairColors = kind === 'female'
    ? ['#111827', '#3b2415', '#7c2d12', '#92400e', '#facc15', '#e0f2fe', '#db2777']
    : ['#064e3b', '#111827', '#94a3b8', '#e0f2fe', '#7c3aed'];
  const clothesColors = kind === 'female'
    ? ['#db2777', '#7c3aed', '#0f766e', '#111827', '#38bdf8', '#e11d48', '#f8fafc']
    : ['#4c1d95', '#064e3b', '#7f1d1d', '#475569', '#38bdf8'];
  const detailColors = kind === 'female'
    ? ['#facc15', '#f8fafc', '#38bdf8', '#fb7185', '#a78bfa']
    : ['#facc15', '#94a3b8', '#38bdf8', '#ef4444'];

  return normalizeAvatarConfig({
    ...getDefaultAvatarConfigForKind(kind),
    skin,
    face: randomFrom(getAvatarOptionsForKind('face', kind).map((option) => option.id)),
    eyebrows: randomFrom(getAvatarOptionsForKind('eyebrows', kind).map((option) => option.id)),
    eyes: randomFrom(getAvatarOptionsForKind('eyes', kind).map((option) => option.id)),
    nose: randomFrom(getAvatarOptionsForKind('nose', kind).map((option) => option.id)),
    mouth: randomFrom(getAvatarOptionsForKind('mouth', kind).map((option) => option.id)),
    hair,
    hairSide: kind === 'female' ? randomFrom(['side-none', 'side-none', 'side-long', 'side-braided']) : randomFrom(['side-none', 'side-long']),
    hairColor: randomFrom(hairColors),
    body: randomFrom(getAvatarOptionsForKind('body', kind).map((option) => option.id)),
    silhouette: randomFrom(getAvatarOptionsForKind('silhouette', kind).map((option) => option.id)),
    clothes: randomFrom(getAvatarOptionsForKind('clothes', kind).map((option) => option.id)),
    sleeves: randomFrom(getAvatarOptionsForKind('sleeves', kind).map((option) => option.id)),
    arms: randomFrom(getAvatarOptionsForKind('arms', kind).map((option) => option.id)),
    clothesColor: randomFrom(clothesColors),
    detailColor: randomFrom(detailColors),
    outerwear: randomFrom(getAvatarOptionsForKind('outerwear', kind).map((option) => option.id)),
    accessory: kind === 'female'
      ? randomFrom(['none', 'none', 'accessory-05', 'accessory-10', 'accessory-11', 'accessory-15'])
      : randomFrom(['none', 'accessory-06', 'accessory-07', 'accessory-08', 'accessory-12', 'accessory-13']),
    marking: kind === 'female'
      ? randomFrom(['marking-none', 'marking-freckles', 'marking-arcane', 'marking-royal'])
      : randomFrom(['marking-warpaint', 'marking-cyber', 'marking-arcane', 'marking-shadow']),
    aura: kind === 'female'
      ? randomFrom(['aura-backlight', 'aura-neon', 'aura-frost', 'aura-cosmic'])
      : randomFrom(['aura-embers', 'aura-shadow', 'aura-tech', 'aura-cosmic']),
    background: kind === 'female'
      ? randomFrom(['bg-01', 'bg-03', 'bg-05', 'bg-11', 'bg-14'])
      : randomFrom(['bg-02', 'bg-08', 'bg-09', 'bg-13']),
    frame: kind === 'female'
      ? randomFrom(['frame-rare', 'frame-epic', 'frame-royal', 'frame-ice'])
      : randomFrom(['frame-horror', 'frame-tech', 'frame-legendary']),
  });
}

function pickOption(category: AvatarCategory, value?: string) {
  return AVATAR_OPTIONS[category].some((option) => option.id === value)
    ? value!
    : DEFAULT_AVATAR_CONFIG[category];
}

function pickHairline(value?: string): AvatarHairline {
  return AVATAR_HAIRLINE_OPTIONS.some((option) => option.id === value)
    ? (value as AvatarHairline)
    : DEFAULT_AVATAR_CONFIG.hairline;
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function isHexColor(value?: string) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}
