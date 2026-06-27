import { AVATAR_FRAMES } from './avatar-colors';

export type AvatarState = 'idle' | 'walk' | 'attack' | 'defense' | 'vote' | 'eliminated' | 'victory' | 'defeat';
export type AvatarAccessType = 'free' | 'premium' | 'admin' | 'event';
export type AvatarAnimationMap = Partial<Record<'home' | 'lobby' | 'intro' | 'victory' | 'defeat' | 'vote' | 'custom', string>>;

export type AvatarSelection = {
  avatarId: string;
  primaryColor: string;
  secondaryColor: string;
  frameId: string;
  imageUrl?: string;
  imageKey?: string;
  animationSlug?: string;
  animations?: AvatarAnimationMap;
  avatarSetId?: string;
  skinCode?: string;
  skinName?: string;
  accessType?: AvatarAccessType;
  displayName?: string;
};

export type AvatarCatalogItem = {
  avatarId: string;
  avatarKey: string;
  displayName: string;
  skinCode: string;
  skinName: string;
  imageUrl: string;
  imageKey?: string;
  animationSlug: string;
  animations?: AvatarAnimationMap;
  avatarSetId?: string;
  accessType: AvatarAccessType;
  locked: boolean;
  sortOrder: number;
};

export const AVATAR_STATES: AvatarState[] = ['idle', 'walk', 'attack', 'defense', 'vote', 'eliminated', 'victory', 'defeat'];

export const R2_AVATAR_CATALOG: AvatarCatalogItem[] = [
  r2Avatar('Arlecchino', 10),
  r2Avatar('Cybegirl', 20),
  r2Avatar('Drbolhas', 30),
  r2Avatar('Melanie', 40),
  r2Avatar('Popboy', 50),
  r2Avatar('Rainha traida', 60, 'Rainha traída'),
  r2Avatar('Rayan', 70),
  r2Avatar('Selena', 80),
];

export const AVATARS = [
  { id: 'renegado', name: 'Renegado', description: 'Um combatente veloz de arena urbana.', rarity: 'common', defaultPrimaryColor: '#EF4444', defaultSecondaryColor: '#111827', states: AVATAR_STATES },
  { id: 'falcao', name: 'Falcao', description: 'Patrulheiro agil com visor angular.', rarity: 'common', defaultPrimaryColor: '#2563EB', defaultSecondaryColor: '#F59E0B', states: AVATAR_STATES },
  { id: 'sombra', name: 'Sombra', description: 'Especialista silencioso de capa curta.', rarity: 'rare', defaultPrimaryColor: '#111827', defaultSecondaryColor: '#64748B', states: AVATAR_STATES },
  { id: 'vulcano', name: 'Vulcano', description: 'Defensor pesado com nucleo quente.', rarity: 'rare', defaultPrimaryColor: '#DC2626', defaultSecondaryColor: '#F97316', states: AVATAR_STATES },
  { id: 'neon', name: 'Neon', description: 'Corredor de arena com placas luminosas.', rarity: 'rare', defaultPrimaryColor: '#06B6D4', defaultSecondaryColor: '#0F172A', states: AVATAR_STATES },
  { id: 'tita', name: 'Tita', description: 'Guardiao robusto com ombreiras largas.', rarity: 'epic', defaultPrimaryColor: '#7C3AED', defaultSecondaryColor: '#D97706', states: AVATAR_STATES },
  { id: 'caveira', name: 'Caveira', description: 'Mascara fria e presenca intimidadora.', rarity: 'epic', defaultPrimaryColor: '#F8FAFC', defaultSecondaryColor: '#111827', states: AVATAR_STATES },
  { id: 'fantasma', name: 'Fantasma', description: 'Silhueta leve com visor opaco.', rarity: 'common', defaultPrimaryColor: '#CBD5E1', defaultSecondaryColor: '#1E3A8A', states: AVATAR_STATES },
  { id: 'mecanico', name: 'Mecanico', description: 'Construtor de arena com bracos reforcados.', rarity: 'common', defaultPrimaryColor: '#F59E0B', defaultSecondaryColor: '#334155', states: AVATAR_STATES },
  { id: 'hacker', name: 'Hacker', description: 'Estrategista de visor fechado.', rarity: 'rare', defaultPrimaryColor: '#16A34A', defaultSecondaryColor: '#0F172A', states: AVATAR_STATES },
  { id: 'samurai-urbano', name: 'Samurai Urbano', description: 'Duelista moderno com placa frontal.', rarity: 'epic', defaultPrimaryColor: '#B45309', defaultSecondaryColor: '#111827', states: AVATAR_STATES },
  { id: 'robo-sucata', name: 'Robo Sucata', description: 'Automato improvisado de muitas pecas.', rarity: 'common', defaultPrimaryColor: '#64748B', defaultSecondaryColor: '#F97316', states: AVATAR_STATES },
];

export const DEFAULT_AVATAR_SELECTION: AvatarSelection = {
  avatarId: 'renegado',
  primaryColor: '#EF4444',
  secondaryColor: '#111827',
  frameId: 'none',
};

export function getAvatarById(id?: string) {
  return AVATARS.find((avatar) => avatar.id === id) || AVATARS[0];
}

export function catalogItemToSelection(item: AvatarCatalogItem): AvatarSelection {
  return normalizeAvatarSelection({
    avatarId: item.avatarId,
    imageUrl: item.imageUrl,
    imageKey: item.imageKey,
    animationSlug: item.animationSlug,
    animations: item.animations,
    avatarSetId: item.avatarSetId,
    skinCode: item.skinCode,
    skinName: item.skinName,
    accessType: item.accessType,
    displayName: item.displayName,
  });
}

export function isMediaAvatarSelection(selection?: Partial<AvatarSelection> | null) {
  return Boolean(selection?.imageUrl || selection?.imageKey || selection?.animationSlug || selection?.avatarSetId || selection?.animations);
}

export function normalizeAvatarSelection(selection?: Partial<AvatarSelection> | null): AvatarSelection {
  if (isMediaAvatarSelection(selection)) {
    return {
      avatarId: String(selection?.avatarId || selection?.animationSlug || 'r2-avatar'),
      primaryColor: selection?.primaryColor || '#2563EB',
      secondaryColor: selection?.secondaryColor || '#0F172A',
      frameId: selection?.frameId || 'none',
      imageUrl: selection?.imageUrl || '',
      imageKey: selection?.imageKey || '',
      animationSlug: selection?.animationSlug || selection?.avatarId || '',
      animations: normalizeAnimations(selection?.animations),
      avatarSetId: selection?.avatarSetId || '',
      skinCode: selection?.skinCode || 'skin-1',
      skinName: selection?.skinName || 'Padrão',
      accessType: selection?.accessType || 'free',
      displayName: selection?.displayName || selection?.avatarId || 'Avatar',
    };
  }

  const avatar = getAvatarById(selection?.avatarId);
  return {
    avatarId: avatar.id,
    primaryColor: selection?.primaryColor || avatar.defaultPrimaryColor,
    secondaryColor: selection?.secondaryColor || avatar.defaultSecondaryColor,
    frameId: selection?.frameId || 'none',
  };
}

export function readStoredAvatar(): AvatarSelection {
  if (typeof window === 'undefined') return DEFAULT_AVATAR_SELECTION;
  try {
    const raw = localStorage.getItem('mataMataAvatar');
    return normalizeAvatarSelection(raw ? JSON.parse(raw) : DEFAULT_AVATAR_SELECTION);
  } catch {
    return DEFAULT_AVATAR_SELECTION;
  }
}

export function storeAvatar(selection: AvatarSelection) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mataMataAvatar', JSON.stringify(normalizeAvatarSelection(selection)));
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function avatarToSvg(selection: AvatarSelection, state: AvatarState = 'idle') {
  const avatar = getAvatarById(selection.avatarId);
  const frame = AVATAR_FRAMES.find((item) => item.id === selection.frameId) || AVATAR_FRAMES[0];
  const p = selection.primaryColor;
  const s = selection.secondaryColor;
  const frameStroke = frame.id === 'none' ? '#CBD5E1' : frame.color;
  const lean = state === 'attack' ? 'rotate(-5 100 110)' : state === 'defense' ? 'rotate(4 100 110)' : '';
  const eye = state === 'eliminated' ? '#64748B' : '#F8FAFC';
  const poseY = state === 'victory' ? -8 : state === 'defeat' ? 8 : 0;
  const visorWidth = avatar.id === 'falcao' || avatar.id === 'hacker' ? 64 : 46;
  const horn = avatar.id === 'samurai-urbano' ? '<path d="M69 45 L100 24 L131 45" fill="none" stroke="#F8FAFC" stroke-width="7" stroke-linecap="round"/>' : '';
  const scrap = avatar.id === 'robo-sucata' ? '<rect x="63" y="145" width="74" height="12" rx="4" fill="#475569"/><circle cx="75" cy="151" r="4" fill="#F97316"/><circle cx="125" cy="151" r="4" fill="#F97316"/>' : '';
  const skull = avatar.id === 'caveira' || state === 'eliminated'
    ? '<path d="M78 88 h12 M110 88 h12 M91 114 h18" stroke="#0F172A" stroke-width="6" stroke-linecap="round"/>'
    : '';
  const voteMark = state === 'vote' ? '<path d="M143 72 l14 14 l28 -32" fill="none" stroke="#16A34A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' : '';
  const victory = state === 'victory' ? '<path d="M49 91 C31 74 34 52 52 43" fill="none" stroke="#FACC15" stroke-width="8" stroke-linecap="round"/><path d="M151 91 C169 74 166 52 148 43" fill="none" stroke="#FACC15" stroke-width="8" stroke-linecap="round"/>' : '';
  const defeat = state === 'defeat' ? '<path d="M61 160 C82 175 118 175 139 160" fill="none" stroke="#475569" stroke-width="7" stroke-linecap="round"/>' : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="${avatar.name}">
      <rect x="10" y="10" width="200" height="200" rx="36" fill="#F8FAFC" stroke="${frameStroke}" stroke-width="10"/>
      <rect x="24" y="24" width="172" height="172" rx="28" fill="${s}" opacity=".12"/>
      <g transform="translate(0 ${poseY}) ${lean}">
        ${victory}
        <path d="M65 165 C69 129 76 111 100 111 C124 111 131 129 135 165 Z" fill="${p}" stroke="#0F172A" stroke-width="7" stroke-linejoin="round"/>
        <path d="M56 152 C43 139 39 118 51 105" fill="none" stroke="${s}" stroke-width="13" stroke-linecap="round"/>
        <path d="M144 152 C157 139 161 118 149 105" fill="none" stroke="${s}" stroke-width="13" stroke-linecap="round"/>
        <circle cx="100" cy="82" r="43" fill="${p}" stroke="#0F172A" stroke-width="7"/>
        ${horn}
        <rect x="${100 - visorWidth / 2}" y="72" width="${visorWidth}" height="24" rx="12" fill="${s}" stroke="#0F172A" stroke-width="5"/>
        <circle cx="86" cy="84" r="5" fill="${eye}"/>
        <circle cx="114" cy="84" r="5" fill="${eye}"/>
        <path d="M83 105 C93 113 107 113 117 105" fill="none" stroke="#0F172A" stroke-width="6" stroke-linecap="round"/>
        ${skull}
        ${scrap}
        ${voteMark}
        ${defeat}
      </g>
    </svg>`;
}

export function avatarToDataUri(selection: AvatarSelection, state: AvatarState = 'idle') {
  return encodeSvg(avatarToSvg(normalizeAvatarSelection(selection), state));
}

export function selectionFromAvatarUrl(url?: string | null): AvatarSelection | null {
  if (!url || !url.startsWith('avatar:')) return null;
  try {
    return normalizeAvatarSelection(JSON.parse(decodeURIComponent(url.slice(7))));
  } catch {
    return null;
  }
}

export function avatarSelectionToUrl(selection: AvatarSelection) {
  return `avatar:${encodeURIComponent(JSON.stringify(normalizeAvatarSelection(selection)))}`;
}

export const defaultAvatars = AVATARS.slice(0, 5).map((avatar) => ({
  name: avatar.name,
  url: avatarSelectionToUrl(normalizeAvatarSelection({ avatarId: avatar.id })),
}));

function r2Avatar(avatarKey: string, sortOrder: number, displayName = avatarKey): AvatarCatalogItem {
  const encodedKey = encodeURIComponent(`atuem/atuem/avatar/${avatarKey}.png`);
  return {
    avatarId: `${avatarKey}:skin-1`,
    avatarKey,
    displayName,
    skinCode: 'skin-1',
    skinName: 'Padrão',
    imageUrl: `/api/r2-file?key=${encodedKey}`,
    imageKey: `atuem/atuem/avatar/${avatarKey}.png`,
    animationSlug: `${avatarKey}/skin-1`,
    animations: {
      home: `atuem/atuem/Animacao/${avatarKey}-A.webm`,
      lobby: `atuem/atuem/Animacao/${avatarKey}-1.webm`,
      intro: `atuem/atuem/Animacao/${avatarKey}-A.webm`,
      victory: `atuem/atuem/Animacao/${avatarKey}-2.webm`,
      defeat: `atuem/atuem/Animacao/${avatarKey}-3.webm`,
    },
    accessType: 'free',
    locked: false,
    sortOrder,
  };
}

function normalizeAnimations(value: unknown): AvatarAnimationMap {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, String(item || '').trim()])
      .filter(([, item]) => Boolean(item)),
  ) as AvatarAnimationMap;
}
