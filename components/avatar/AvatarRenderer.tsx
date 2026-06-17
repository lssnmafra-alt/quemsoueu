'use client';

import { AVATAR_OPTIONS, DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig, type AvatarConfig, type AvatarHairline, type AvatarKind } from '@/lib/avatarConfig';
import { cn } from '@/lib/utils';

type AvatarRendererProps = {
  config?: AvatarConfig | null;
  name?: string;
  className?: string;
};

type Point = {
  x: number;
  y: number;
};

const backgroundThemes: Record<string, { from: string; mid: string; to: string; glow: string; line: string }> = {
  'bg-01': { from: '#0f172a', mid: '#312e81', to: '#020617', glow: '#38bdf8', line: '#818cf8' },
  'bg-02': { from: '#1c1917', mid: '#7f1d1d', to: '#020617', glow: '#f97316', line: '#fb7185' },
  'bg-03': { from: '#082f49', mid: '#075985', to: '#020617', glow: '#7dd3fc', line: '#bae6fd' },
  'bg-04': { from: '#111827', mid: '#4c1d95', to: '#020617', glow: '#a78bfa', line: '#f0abfc' },
  'bg-05': { from: '#020617', mid: '#1e293b', to: '#111827', glow: '#22d3ee', line: '#64748b' },
  'bg-06': { from: '#052e16', mid: '#166534', to: '#020617', glow: '#86efac', line: '#22c55e' },
  'bg-07': { from: '#1e1b4b', mid: '#831843', to: '#020617', glow: '#fb7185', line: '#f472b6' },
  'bg-08': { from: '#09090b', mid: '#581c87', to: '#020617', glow: '#c084fc', line: '#facc15' },
  'bg-09': { from: '#0f172a', mid: '#450a0a', to: '#020617', glow: '#ef4444', line: '#94a3b8' },
  'bg-10': { from: '#052e16', mid: '#0f766e', to: '#020617', glow: '#bef264', line: '#facc15' },
  'bg-11': { from: '#1c1917', mid: '#431407', to: '#020617', glow: '#f59e0b', line: '#fbbf24' },
  'bg-12': { from: '#082f49', mid: '#0f766e', to: '#020617', glow: '#67e8f9', line: '#2dd4bf' },
  'bg-13': { from: '#020617', mid: '#0f172a', to: '#111827', glow: '#22d3ee', line: '#38bdf8' },
  'bg-14': { from: '#111827', mid: '#312e81', to: '#020617', glow: '#e879f9', line: '#c084fc' },
  'bg-15': { from: '#1c1917', mid: '#7c2d12', to: '#020617', glow: '#fbbf24', line: '#38bdf8' },
  'bg-16': { from: '#020617', mid: '#172554', to: '#111827', glow: '#60a5fa', line: '#22d3ee' },
};

const frameThemes: Record<string, { a: string; b: string; c: string; text: string }> = {
  'frame-common': { a: '#64748b', b: '#e2e8f0', c: '#334155', text: 'STREET' },
  'frame-rare': { a: '#2563eb', b: '#67e8f9', c: '#1e3a8a', text: 'ELITE' },
  'frame-epic': { a: '#7c3aed', b: '#f0abfc', c: '#312e81', text: 'EPIC' },
  'frame-legendary': { a: '#f59e0b', b: '#fde68a', c: '#7c2d12', text: 'LEGEND' },
  'frame-horror': { a: '#dc2626', b: '#fb7185', c: '#450a0a', text: 'DARK' },
  'frame-speed': { a: '#06b6d4', b: '#fde047', c: '#155e75', text: 'PULSE' },
  'frame-tech': { a: '#22d3ee', b: '#a5f3fc', c: '#0f172a', text: 'TECH' },
  'frame-ocean': { a: '#0d9488', b: '#99f6e4', c: '#134e4a', text: 'OCEAN' },
  'frame-royal': { a: '#f59e0b', b: '#fef3c7', c: '#581c87', text: 'ROYAL' },
  'frame-ice': { a: '#38bdf8', b: '#e0f2fe', c: '#075985', text: 'ICE' },
};

export default function AvatarRenderer({ config, name = 'Personagem', className }: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config || DEFAULT_AVATAR_CONFIG);
  const ids = buildSvgIds(avatar, name);
  const skin = getOptionColor('skin', avatar.skin, '#d99a5b');
  const skinLight = shade(skin, 18);
  const skinShadow = shade(skin, -18);
  const skinDeep = shade(skin, -32);
  const outfit = avatar.clothesColor;
  const detail = avatar.detailColor || '#facc15';
  const detailLight = shade(detail, 20);
  const detailDark = shade(detail, -22);
  const accessoryAccent = avatar.accessoryColor || '#38bdf8';
  const outfitLight = shade(outfit, 22);
  const outfitDark = shade(outfit, -30);
  const hair = avatar.hairColor;
  const hairFill = `url(#${ids.hairGradient})`;
  const bg = backgroundThemes[avatar.background] || backgroundThemes['bg-01'];
  const frame = frameThemes[avatar.frame] || frameThemes['frame-rare'];
  const isCreature = avatar.kind === 'creature';
  const isRobot = avatar.skin === 'skin-09' || avatar.face === 'face-09' || avatar.body === 'body-05';
  const isFeral = isCreature || avatar.skin === 'skin-06' || avatar.mouth === 'mouth-06';
  const bodyShape = getBodyShape(avatar.body, avatar.kind, avatar.silhouette);
  const showCreatureBackParts = isCreature && (avatar.accessory === 'accessory-06' || avatar.accessory === 'accessory-08' || avatar.arms === 'arms-tentacle');
  const showCreatureHeadParts = isCreature && (avatar.accessory === 'accessory-06' || avatar.accessory === 'accessory-08' || avatar.accessory === 'accessory-12');
  const facePath = getFacePath(avatar.face);
  const displayName = name.trim() || 'Personagem';

  return (
    <div className={cn('relative aspect-[3/4] w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-slate-950', className)}>
      <svg viewBox="0 0 360 480" role="img" aria-label={displayName} preserveAspectRatio="xMidYMid meet" className="block h-full w-full">
        <defs>
          <linearGradient id={ids.avatarBg} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={bg.from} />
            <stop offset="52%" stopColor={bg.mid} />
            <stop offset="100%" stopColor={bg.to} />
          </linearGradient>
          <radialGradient id={ids.avatarGlow} cx="50%" cy="32%" r="60%">
            <stop offset="0%" stopColor={bg.glow} stopOpacity="0.72" />
            <stop offset="48%" stopColor={bg.glow} stopOpacity="0.18" />
            <stop offset="100%" stopColor={bg.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ids.frameGradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={frame.b} />
            <stop offset="45%" stopColor={frame.a} />
            <stop offset="100%" stopColor={frame.c} />
          </linearGradient>
          <linearGradient id={ids.skinGradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="55%" stopColor={skin} />
            <stop offset="100%" stopColor={skinShadow} />
          </linearGradient>
          <linearGradient id={ids.outfitGradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={outfitLight} />
            <stop offset="58%" stopColor={outfit} />
            <stop offset="100%" stopColor={outfitDark} />
          </linearGradient>
          <linearGradient id={ids.hairGradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={shade(hair, 25)} />
            <stop offset="50%" stopColor={hair} />
            <stop offset="100%" stopColor={shade(hair, -24)} />
          </linearGradient>
          <linearGradient id={ids.metalGradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <filter id={ids.softShadow} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000000" floodOpacity="0.36" />
          </filter>
          <filter id={ids.cardGlow} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={frame.a} floodOpacity="0.55" />
          </filter>
          <clipPath id={ids.cardClip}>
            <rect x="18" y="18" width="324" height="444" rx="30" />
          </clipPath>
          <clipPath id={ids.faceClip}>
            <path d={facePath} />
          </clipPath>
        </defs>

        <rect width="360" height="480" fill={`url(#${ids.avatarBg})`} />
        <rect width="360" height="480" fill={`url(#${ids.avatarGlow})`} />
        <BackgroundDetails background={avatar.background} glow={bg.glow} line={bg.line} />
        <Aura aura={avatar.aura} accent={frame.a} glow={bg.glow} />

        <g filter={`url(#${ids.cardGlow})`}>
          <rect x="16" y="16" width="328" height="448" rx="32" fill="none" stroke={`url(#${ids.frameGradient})`} strokeWidth="5.5" />
          <rect x="28" y="28" width="304" height="424" rx="24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.25" />
        </g>

        <g clipPath={`url(#${ids.cardClip})`}>
          <ellipse cx="180" cy="420" rx="112" ry="24" fill="#020617" opacity="0.42" />
          <g filter={`url(#${ids.softShadow})`}>
            {avatar.outerwear === 'outerwear-cape' && <Cape outfit={outfitDark} frame={frame.a} />}
            {avatar.outerwear === 'outerwear-robe' && <RobeBack color={outfitDark} accent={frame.a} />}
            {showCreatureBackParts && <CreatureBackParts skin={skin} accent={accessoryAccent} glow={bg.glow} isRobot={isRobot} />}

            <g transform="translate(0 -12)">
              <ArmsLayer
                arms={avatar.arms}
                sleeves={avatar.sleeves}
                phase="back"
                kind={avatar.kind}
                bodyShape={bodyShape}
                isRobot={isRobot}
                skinFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`}
                skinShadow={skinShadow}
                outfitFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.outfitGradient})`}
                outfitDark={outfitDark}
                accent={accessoryAccent}
                glow={bg.glow}
              />
              <NeckChestBase fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`} shadow={skinShadow} />
              <OutfitBase clothes={avatar.clothes} bodyShape={bodyShape} outfitFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.outfitGradient})`} color={outfit} dark={outfitDark} light={outfitLight} accent={detail} accentLight={detailLight} isRobot={isRobot} />
              <ClothingDetail detail={avatar.clothesDetail} text={avatar.clothesText} accent={detail} accentLight={detailLight} accentDark={detailDark} />
              <SleevesLayer sleeves={avatar.sleeves} arms={avatar.arms} bodyShape={bodyShape} outfitFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.outfitGradient})`} outfitDark={outfitDark} accent={detail} />
              <Outerwear outerwear={avatar.outerwear} color={outfitDark} accent={detail} />
              <ArmsLayer
                arms={avatar.arms}
                sleeves={avatar.sleeves}
                phase="front"
                kind={avatar.kind}
                bodyShape={bodyShape}
                isRobot={isRobot}
                skinFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`}
                skinShadow={skinShadow}
                outfitFill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.outfitGradient})`}
                outfitDark={outfitDark}
                accent={accessoryAccent}
                glow={bg.glow}
              />
            </g>

            <g transform="translate(0 -2)">
              <path d="M150 248 C150 276 160 296 180 296 C200 296 210 276 210 248 L150 248Z" fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`} />
              <path d="M156 276 C170 288 190 288 204 276 C200 300 160 300 156 276Z" fill={skinDeep} opacity="0.20" />
            </g>

            <g transform="translate(0 -10)">
              <HairSide hair={avatar.hair} side={avatar.hairSide} color={hair} fill={hairFill} />
              <HairBack hair={avatar.hair} kind={avatar.kind} color={hair} fill={hairFill} />
            </g>

            <g transform="translate(0 -2)">
              <path d={facePath} fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`} />
              <path d="M134 176 C144 150 164 136 188 140 C166 152 154 176 154 210 C154 238 164 258 184 270 C150 268 130 240 128 206 C127 194 129 184 134 176Z" fill="#ffffff" opacity="0.11" clipPath={`url(#${ids.faceClip})`} />
              <path d="M218 168 C228 190 228 230 214 254 C224 244 232 222 232 202 C232 184 227 173 218 168Z" fill="#020617" opacity="0.11" clipPath={`url(#${ids.faceClip})`} />
              <Marking marking={avatar.marking} accent={frame.a} glow={bg.glow} skinDeep={skinDeep} />
              {isRobot && <RobotFaceLines accent={frame.a} />}
              {avatar.face === 'face-10' && <AquaticMarks accent={bg.glow} />}
            </g>

            <g transform="translate(0 -10)">
              <Ears skin={isRobot ? '#94a3b8' : skin} shadow={skinShadow} feral={isFeral || avatar.accessory === 'accessory-06'} />
              {showCreatureHeadParts && <CreatureHeadParts skin={isRobot ? '#94a3b8' : skin} shadow={skinShadow} accent={accessoryAccent} isRobot={isRobot} />}
              <HairFoundation hair={avatar.hair} hairline={avatar.hairline} color={hair} fill={hairFill} />
              <HairTop hair={avatar.hair} color={hair} fill={hairFill} />
              <HairShine hair={avatar.hair} />
            </g>
            <g transform="translate(0 -10)">
              <Eyes eyes={avatar.eyes} accent={frame.a} glow={bg.glow} />
              <Eyebrows eyebrows={avatar.eyebrows} hairColor={hair} />
              <Nose nose={avatar.nose} color={skinDeep} isRobot={isRobot} accent={frame.a} />
              <Mouth mouth={avatar.mouth} color={skinDeep} feral={isFeral} />
              <FacialHair facialHair={avatar.facialHair} color={hair} />
              <Headwear headwear={avatar.headwear} hairColor={hair} accent={accessoryAccent} ids={ids} />
              <Accessory accessory={avatar.accessory} accent={accessoryAccent} glow={bg.glow} />
            </g>
          </g>
        </g>

        <g>
          <rect x="46" y="406" width="268" height="34" rx="13" fill="#020617" opacity="0.56" />
          <rect x="48" y="408" width="264" height="30" rx="11" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" />
          <text x="180" y="429" textAnchor="middle" fill="#ffffff" fontSize="17" fontWeight="900" letterSpacing="1.2" fontFamily="Arial, Helvetica, sans-serif">
            {displayName.toUpperCase().slice(0, 24)}
          </text>
        </g>
      </svg>
    </div>
  );
}

function buildSvgIds(avatar: AvatarConfig, name: string) {
  const seed = `${name}-${avatar.kind}-${avatar.skin}-${avatar.face}-${avatar.hair}-${avatar.hairSide}-${avatar.silhouette}-${avatar.clothes}-${avatar.clothesDetail}-${avatar.clothesText}-${avatar.sleeves}-${avatar.arms}-${avatar.accessoryColor}-${avatar.background}-${avatar.frame}-${avatar.aura}-${avatar.marking}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000000007;
  }

  const prefix = `av-${Math.abs(hash).toString(36)}`;

  return {
    avatarBg: `${prefix}-bg`,
    avatarGlow: `${prefix}-glow`,
    frameGradient: `${prefix}-frame`,
    skinGradient: `${prefix}-skin`,
    outfitGradient: `${prefix}-outfit`,
    hairGradient: `${prefix}-hair`,
    metalGradient: `${prefix}-metal`,
    softShadow: `${prefix}-shadow`,
    cardGlow: `${prefix}-card-glow`,
    cardClip: `${prefix}-card-clip`,
    faceClip: `${prefix}-face-clip`,
  };
}

function BackgroundDetails({ background, glow, line }: { background: string; glow: string; line: string }) {
  if (background === 'bg-10') {
    return (
      <g opacity="0.46">
        <path d="M42 278 C98 250 258 250 318 278" fill="none" stroke={line} strokeWidth="2.4" opacity="0.42" />
        <path d="M64 312 C116 292 244 292 296 312" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.12" />
      </g>
    );
  }

  if (background === 'bg-13' || background === 'bg-16') {
    return (
      <g opacity="0.76">
        {Array.from({ length: 8 }).map((_, index) => (
          <path key={index} d={`M${34 + index * 42} 68 V340`} stroke={line} strokeWidth="1" opacity="0.16" />
        ))}
        <path d="M54 132 H306 M34 214 H326 M70 316 H292" stroke={line} strokeWidth="1.5" opacity="0.24" />
        <circle cx="286" cy="116" r="18" fill="none" stroke={glow} strokeWidth="2" opacity="0.5" />
      </g>
    );
  }

  if (background === 'bg-08') {
    return (
      <g opacity="0.38">
        <ellipse cx="180" cy="238" rx="118" ry="164" fill="none" stroke={line} strokeWidth="1.4" opacity="0.22" />
        <path d="M58 208 C112 168 248 168 304 210" fill="none" stroke={line} strokeWidth="1.8" opacity="0.28" />
      </g>
    );
  }

  if (background === 'bg-03') {
    return (
      <g opacity="0.62">
        <path d="M62 118 L94 90 L126 118 M250 90 L282 122 L314 90" fill="none" stroke={line} strokeWidth="2" />
        <path d="M74 328 L106 290 L136 328 M224 330 L258 286 L292 330" fill="none" stroke="#e0f2fe" strokeWidth="2" opacity="0.4" />
      </g>
    );
  }

  return (
    <g opacity="0.64">
      <circle cx="76" cy="112" r="54" fill={glow} opacity="0.14" />
      <circle cx="292" cy="282" r="78" fill={glow} opacity="0.12" />
      <path d="M42 112 C112 76 242 74 316 118" fill="none" stroke={line} strokeWidth="2" opacity="0.34" />
      <path d="M50 344 C124 304 248 304 312 346" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.16" />
    </g>
  );
}

function Aura({ aura, accent, glow }: { aura: string; accent: string; glow: string }) {
  if (aura === 'aura-none') return null;

  if (aura === 'aura-neon') {
    return (
      <g opacity="0.42">
        <ellipse cx="180" cy="240" rx="106" ry="150" fill="none" stroke={accent} strokeWidth="2.2" />
        <ellipse cx="180" cy="240" rx="82" ry="120" fill={glow} opacity="0.08" />
      </g>
    );
  }

  if (aura === 'aura-embers') {
    return (
      <g fill={glow} opacity="0.82">
        {[72, 112, 244, 286, 308].map((x, index) => (
          <path key={x} d={`M${x} ${302 - index * 34} C${x - 10} ${282 - index * 34} ${x + 10} ${270 - index * 34} ${x} ${246 - index * 34} C${x + 18} ${270 - index * 34} ${x + 10} ${288 - index * 34} ${x} ${302 - index * 34}Z`} />
        ))}
      </g>
    );
  }

  if (aura === 'aura-frost') {
    return (
      <g stroke="#e0f2fe" strokeWidth="2" opacity="0.72">
        <path d="M70 142 L96 168 M83 130 V184 M108 142 L66 176" />
        <path d="M272 116 L300 144 M288 104 V160 M312 118 L264 154" />
        <path d="M70 332 L104 360 M88 318 V378 M116 332 L62 368" />
      </g>
    );
  }

  if (aura === 'aura-shadow') {
    return (
      <g fill="#020617" opacity="0.46">
        <path d="M72 438 C92 312 106 204 72 92 C126 164 124 326 118 438Z" />
        <path d="M288 438 C268 312 254 204 288 92 C234 164 236 326 242 438Z" />
      </g>
    );
  }

  if (aura === 'aura-cosmic') {
    return (
      <g opacity="0.44">
        <ellipse cx="180" cy="246" rx="120" ry="158" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.32" />
        <path d="M48 214 C110 176 244 176 312 216" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.34" />
      </g>
    );
  }

  if (aura === 'aura-stadium') {
    return (
      <g opacity="0.36">
        <path d="M54 96 L132 248 M306 96 L228 248" stroke="#fef3c7" strokeWidth="3" opacity="0.2" />
        <circle cx="88" cy="104" r="4" fill="#fef3c7" opacity="0.72" />
        <circle cx="272" cy="104" r="4" fill="#fef3c7" opacity="0.72" />
      </g>
    );
  }

  if (aura === 'aura-tech') {
    return (
      <g stroke={glow} fill="none" opacity="0.7">
        <path d="M54 154 H112 V116 H164" strokeWidth="2" />
        <path d="M306 292 H246 V328 H188" strokeWidth="2" />
        <circle cx="112" cy="116" r="5" fill={glow} />
        <circle cx="246" cy="328" r="5" fill={glow} />
      </g>
    );
  }

  return <ellipse cx="180" cy="250" rx="118" ry="168" fill={glow} opacity="0.14" />;
}

function Cape({ outfit, frame }: { outfit: string; frame: string }) {
  return <path d="M112 282 C86 328 72 382 62 444 L298 444 C288 382 274 328 248 282 C218 302 142 302 112 282Z" fill={outfit} opacity="0.88" stroke={frame} strokeOpacity="0.28" strokeWidth="2" />;
}

function Marking({ marking, accent, glow, skinDeep }: { marking: string; accent: string; glow: string; skinDeep: string }) {
  if (marking === 'marking-none') return null;

  if (marking === 'marking-scar') return <path d="M208 172 L192 230 M202 184 L214 192 M196 210 L208 218" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" opacity="0.68" />;
  if (marking === 'marking-freckles') return <g fill={skinDeep} opacity="0.38"><circle cx="142" cy="224" r="2" /><circle cx="154" cy="232" r="1.8" /><circle cx="220" cy="224" r="2" /><circle cx="208" cy="234" r="1.8" /></g>;
  if (marking === 'marking-warpaint') return <g stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.72"><path d="M132 214 L166 206" /><path d="M194 206 L228 214" /></g>;
  if (marking === 'marking-arcane') return <g stroke={glow} fill="none" opacity="0.42"><path d="M170 160 C176 154 184 154 190 160" strokeWidth="2" strokeLinecap="round" /><circle cx="180" cy="162" r="3" fill={glow} stroke="none" opacity="0.55" /></g>;
  if (marking === 'marking-cyber') return <g stroke={glow} strokeWidth="2" opacity="0.44"><path d="M224 190 H238 V208" /><path d="M232 218 H244" /><circle cx="238" cy="208" r="2.5" fill={glow} /></g>;
  if (marking === 'marking-royal') return <path d="M166 154 C176 148 184 148 194 154 C190 162 170 162 166 154Z" fill={accent} opacity="0.72" />;
  if (marking === 'marking-shadow') return <path d="M132 176 C148 164 164 162 180 166 C160 184 148 210 146 242 C134 222 128 198 132 176Z" fill="#020617" opacity="0.16" />;

  return null;
}

function RobeBack({ color, accent }: { color: string; accent: string }) {
  return <path d="M114 288 C92 326 84 376 78 444 L282 444 C276 376 268 326 246 288 C216 304 144 304 114 288Z" fill={color} opacity="0.86" stroke={accent} strokeOpacity="0.22" strokeWidth="2" />;
}


function ArmsLayer({
  arms,
  sleeves,
  phase,
  kind,
  bodyShape,
  isRobot,
  skinFill,
  skinShadow,
  outfitFill,
  outfitDark,
  accent,
  glow,
}: {
  arms: string;
  sleeves: string;
  phase: 'back' | 'front';
  kind: AvatarKind;
  bodyShape: OutfitBodyShape;
  isRobot: boolean;
  skinFill: string;
  skinShadow: string;
  outfitFill: string;
  outfitDark: string;
  accent: string;
  glow: string;
}) {
  const armFill = sleeves === 'sleeves-none' || sleeves === 'sleeves-torn' ? skinFill : outfitFill;
  const handFill = isRobot ? '#cbd5e1' : skinFill;
  const creature = kind === 'creature' || arms === 'arms-creature' || arms === 'arms-tentacle';
  const shoulderWidth = bodyShape.rightShoulder - bodyShape.leftShoulder;
  const armWidth = creature ? 18 : Math.max(12, Math.min(17, shoulderWidth / 10.8));
  const handSize = creature ? 10.5 : Math.max(7.5, Math.min(9.5, shoulderWidth / 18));
  const leftStart = bodyShape.leftShoulder + 4;
  const rightStart = bodyShape.rightShoulder - 4;
  const leftDownX = Math.max(90, bodyShape.leftShoulder - 6);
  const rightDownX = Math.min(270, bodyShape.rightShoulder + 6);
  const robotStroke = isRobot || sleeves === 'sleeves-robot' || arms === 'arms-robot' ? accent : shade(outfitDark, -10);

  if (phase === 'back') {
    if (arms === 'arms-crossed' || arms === 'arms-waist' || arms === 'arms-holding') return null;

    if (arms === 'arms-open' || arms === 'arms-caster') {
      return (
        <g opacity="0.96">
          <path d={`M${leftStart} 290 C${leftStart - 18} 326 ${leftDownX - 20} 360 ${leftDownX - 28} 394`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
          <path d={`M${rightStart} 290 C${rightStart + 18} 326 ${rightDownX + 20} 360 ${rightDownX + 28} 394`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
          <circle cx={leftDownX - 28} cy="396" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
          <circle cx={rightDownX + 28} cy="396" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
          {arms === 'arms-caster' && <g fill={glow} opacity="0.75"><circle cx={leftDownX - 28} cy="396" r="3.5" /><circle cx={rightDownX + 28} cy="396" r="3.5" /></g>}
        </g>
      );
    }

    if (arms === 'arms-raised') {
      return (
        <g opacity="0.96">
          <path d={`M${leftStart} 290 C${leftDownX - 6} 332 ${leftDownX - 8} 370 ${leftDownX} 408`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
          <path d={`M${rightStart} 290 C${rightStart + 18} 274 ${rightStart + 22} 236 ${rightStart + 14} 196`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
          <circle cx={leftDownX} cy="410" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
          <circle cx={rightStart + 14} cy="196" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
        </g>
      );
    }

    if (arms === 'arms-tentacle') {
      return (
        <g fill="none" opacity="0.78">
          <path d="M116 306 C84 328 78 360 100 388 C118 410 92 428 70 414" stroke={shade(outfitDark, -6)} strokeWidth="14" strokeLinecap="round" />
          <path d="M244 306 C276 328 282 360 260 388 C242 410 268 428 290 414" stroke={shade(outfitDark, -6)} strokeWidth="14" strokeLinecap="round" />
          <path d="M94 390 C104 386 112 386 120 392 M266 390 C256 386 248 386 240 392" stroke={accent} strokeWidth="3" opacity="0.62" />
        </g>
      );
    }

    const fist = arms === 'arms-power' || creature;
    const leftHandY = arms === 'arms-down' ? 428 : 408;
    const rightHandY = arms === 'arms-down' ? 428 : 408;
    return (
      <g opacity="0.96">
        <path d={`M${leftStart} 290 C${leftDownX - 4} 334 ${leftDownX - 5} 372 ${leftDownX} ${leftHandY}`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <path d={`M${rightStart} 290 C${rightDownX + 4} 334 ${rightDownX + 5} 372 ${rightDownX} ${rightHandY}`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <circle cx={leftDownX} cy={leftHandY} r={fist ? handSize + 1.5 : handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
        <circle cx={rightDownX} cy={rightHandY} r={fist ? handSize + 1.5 : handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.35" />
        {creature && <g stroke={accent} strokeWidth="2.7" strokeLinecap="round" opacity="0.7"><path d="M92 412 L82 423 M101 417 L98 430 M110 412 L120 423" /><path d="M268 412 L278 423 M259 417 L262 430 M250 412 L240 423" /></g>}
        {(isRobot || sleeves === 'sleeves-robot' || arms === 'arms-robot') && <g stroke={robotStroke} strokeWidth="3.5" strokeLinecap="round"><path d="M101 344 H116 M244 344 H259" /><path d="M100 382 H114 M246 382 H260" /></g>}
      </g>
    );
  }

  if (arms === 'arms-crossed') {
    return (
      <g opacity="0.98">
        <path d={`M${leftStart} 338 C146 354 174 366 222 374`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <path d={`M${rightStart} 338 C214 354 186 366 138 374`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <circle cx="222" cy="374" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
        <circle cx="138" cy="374" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
        <path d="M140 365 C162 372 198 372 220 365" fill="none" stroke="#020617" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (arms === 'arms-waist') {
    return (
      <g opacity="0.98">
        <path d={`M${leftStart} 322 C${leftStart - 18} 346 ${leftStart - 8} 374 134 378`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <path d={`M${rightStart} 322 C${rightStart + 18} 346 ${rightStart + 8} 374 226 378`} fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <circle cx="134" cy="378" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
        <circle cx="226" cy="378" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
      </g>
    );
  }

  if (arms === 'arms-holding') {
    return (
      <g opacity="0.98">
        <path d="M188 326 V424" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M116 330 C140 352 158 370 174 386" fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <path d="M244 330 C220 352 202 370 186 386" fill="none" stroke={armFill} strokeWidth={armWidth} strokeLinecap="round" />
        <circle cx="174" cy="386" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
        <circle cx="186" cy="386" r={handSize} fill={handFill} stroke={skinShadow} strokeOpacity="0.32" />
        <circle cx="188" cy="320" r="8" fill={shade(accent, -18)} stroke={accent} strokeWidth="3" />
      </g>
    );
  }

  return null;
}

function SleevesLayer({ sleeves, arms, bodyShape, outfitFill, outfitDark, accent }: { sleeves: string; arms: string; bodyShape: OutfitBodyShape; outfitFill: string; outfitDark: string; accent: string }) {
  if (sleeves === 'sleeves-none' || arms === 'arms-crossed' || arms === 'arms-waist' || arms === 'arms-holding') return null;

  const left = bodyShape.leftShoulder + 2;
  const right = bodyShape.rightShoulder - 2;

  if (sleeves === 'sleeves-short') {
    return (
      <g opacity="0.86">
        <path d={`M${left - 10} 298 C${left + 4} 290 ${left + 20} 294 ${left + 28} 306 C${left + 14} 314 ${left - 2} 314 ${left - 14} 306Z`} fill={outfitFill} />
        <path d={`M${right + 10} 298 C${right - 4} 290 ${right - 20} 294 ${right - 28} 306 C${right - 14} 314 ${right + 2} 314 ${right + 14} 306Z`} fill={outfitFill} />
      </g>
    );
  }

  if (sleeves === 'sleeves-long' || sleeves === 'sleeves-jacket') {
    const detail = sleeves === 'sleeves-jacket' ? shade(outfitDark, -16) : shade(outfitDark, -6);
    return (
      <g opacity="0.66" stroke={detail} strokeLinecap="round">
        <path d={`M${left - 4} 316 C${left + 8} 306 ${left + 20} 306 ${left + 28} 314`} strokeWidth="3.5" />
        <path d={`M${right + 4} 316 C${right - 8} 306 ${right - 20} 306 ${right - 28} 314`} strokeWidth="3.5" />
        <path d="M102 392 C107 396 113 396 118 392" strokeWidth="2.8" />
        <path d="M258 392 C253 396 247 396 242 392" strokeWidth="2.8" />
      </g>
    );
  }

  if (sleeves === 'sleeves-armor' || sleeves === 'sleeves-robot') {
    const plate = shade(outfitDark, sleeves === 'sleeves-robot' ? 8 : 18);
    return (
      <g opacity="0.86">
        <path d={`M${left - 8} 306 C${left + 8} 294 ${left + 24} 300 ${left + 30} 316 C${left + 16} 324 ${left + 2} 324 ${left - 10} 314Z`} fill={plate} stroke={accent} strokeWidth="1.8" />
        <path d={`M${right + 8} 306 C${right - 8} 294 ${right - 24} 300 ${right - 30} 316 C${right - 16} 324 ${right - 2} 324 ${right + 10} 314Z`} fill={plate} stroke={accent} strokeWidth="1.8" />
        <path d="M102 352 H116 M244 352 H258" stroke={accent} strokeWidth="2.4" strokeLinecap="round" opacity="0.72" />
      </g>
    );
  }

  if (sleeves === 'sleeves-gloves') {
    return (
      <g opacity="0.82" stroke={shade(outfitDark, -18)} strokeLinecap="round">
        <path d="M100 392 C105 397 112 397 118 392" strokeWidth="7" />
        <path d="M260 392 C255 397 248 397 242 392" strokeWidth="7" />
      </g>
    );
  }

  if (sleeves === 'sleeves-torn') {
    return (
      <g fill={outfitFill} opacity="0.82">
        <path d={`M${left - 10} 300 L${left + 28} 298 L${left + 18} 320 L${left + 6} 312 L${left - 2} 324Z`} />
        <path d={`M${right + 10} 300 L${right - 28} 298 L${right - 18} 320 L${right - 6} 312 L${right + 2} 324Z`} />
      </g>
    );
  }

  return null;
}


function NeckChestBase({ fill, shadow }: { fill: string; shadow: string }) {
  return (
    <g>
      <path d="M150 246 C150 276 160 302 180 302 C200 302 210 276 210 246 L150 246Z" fill={fill} />
      <path d="M128 286 C146 272 214 272 232 286 L218 342 H142Z" fill={fill} opacity="0.92" />
      <path d="M154 280 C166 292 194 292 206 280 C202 306 158 306 154 280Z" fill={shadow} opacity="0.18" />
    </g>
  );
}

type OutfitBodyShape = {
  leftShoulder: number;
  rightShoulder: number;
  leftWaist: number;
  rightWaist: number;
};

function OutfitBase({
  clothes,
  bodyShape,
  outfitFill,
  color,
  dark,
  light,
  accent,
  accentLight,
  isRobot,
}: {
  clothes: string;
  bodyShape: OutfitBodyShape;
  outfitFill: string;
  color: string;
  dark: string;
  light: string;
  accent: string;
  accentLight: string;
  isRobot: boolean;
}) {
  const white = '#f8fafc';
  const black = '#020617';
  const leftS = bodyShape.leftShoulder;
  const rightS = bodyShape.rightShoulder;
  const leftW = bodyShape.leftWaist;
  const rightW = bodyShape.rightWaist;
  const torso = `M${leftS} 286 C${leftS - 16} 308 ${leftW - 16} 354 ${leftW} 434 L${rightW} 434 C${rightW + 16} 354 ${rightS + 16} 308 ${rightS} 286 C214 272 146 272 ${leftS} 286Z`;
  const core = `M${leftS + 16} 294 C150 314 210 314 ${rightS - 16} 294 L${rightW - 10} 434 H${leftW + 10}Z`;

  if (clothes === 'clothes-10') {
    return (
      <g>
        <path d={torso} fill={outfitFill} opacity="0.44" />
        <path d={`M${leftS + 14} 304 C150 318 210 318 ${rightS - 14} 304 L${rightW - 16} 434 H${leftW + 16}Z`} fill={shade(color, -18)} opacity="0.36" />
      </g>
    );
  }

  if (clothes === 'clothes-31') {
    return (
      <g>
        <path d={`M${leftS + 18} 292 C154 310 206 310 ${rightS - 18} 292 L${rightW - 18} 434 H${leftW + 18}Z`} fill={outfitFill} opacity="0.92" />
        <path d="M150 300 C164 318 196 318 210 300" fill="none" stroke={white} strokeOpacity="0.26" strokeWidth="4" />
      </g>
    );
  }

  if (clothes === 'clothes-13' || clothes === 'clothes-07') {
    return (
      <g>
        <path d={`M${leftS + 8} 286 C148 304 212 304 ${rightS - 8} 286 C232 328 222 382 220 434 H140 C138 382 128 328 ${leftS + 8} 286Z`} fill={outfitFill} opacity="0.94" />
        <path d="M142 300 C158 316 202 316 218 300 L206 434 H154Z" fill={shade(color, -10)} opacity="0.38" />
        {clothes === 'clothes-07' && <path d="M180 314 V434" stroke={shade(dark, -12)} strokeWidth="4" strokeLinecap="round" opacity="0.5" />}
      </g>
    );
  }

  if (clothes === 'clothes-18') {
    return (
      <g>
        <path d={torso} fill={outfitFill} opacity="0.9" />
        <path d="M126 304 C148 328 212 328 234 304 L220 434 H140Z" fill={shade(color, -8)} opacity="0.55" />
        <path d="M132 312 L180 354 L228 312" fill="none" stroke={white} strokeOpacity="0.52" strokeWidth="5" strokeLinecap="round" />
        <path d="M158 344 C168 358 192 358 202 344" fill="none" stroke={shade(dark, -10)} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-05' || clothes === 'clothes-32' || clothes === 'clothes-19') {
    const closed = clothes === 'clothes-32';
    const suit = clothes === 'clothes-19';
    return (
      <g>
        <path d={torso} fill={closed ? outfitFill : shade(color, -10)} opacity="0.88" />
        <path d="M118 294 L158 314 L180 354 L202 314 L242 294 L226 434 H134Z" fill={closed ? shade(color, -14) : shade(color, -18)} opacity="0.78" />
        <path d="M158 316 L180 354 L202 316" fill={suit ? white : light} opacity={suit ? 0.46 : 0.24} />
        <path d="M180 354 V434" stroke={suit ? black : white} strokeOpacity={suit ? 0.36 : 0.24} strokeWidth="4" />
        {!closed && <path d="M136 322 L162 350 M224 322 L198 350" stroke={accentLight} strokeWidth="3" strokeLinecap="round" opacity="0.34" />}
      </g>
    );
  }

  if (clothes === 'clothes-33' || clothes === 'clothes-03') {
    const heavy = clothes === 'clothes-03';
    const plate = isRobot ? '#64748b' : shade(color, heavy ? -18 : -10);
    return (
      <g>
        <path d={torso} fill={plate} opacity={heavy ? 0.9 : 0.82} />
        <path d={`M${leftS + 10} 296 L150 286 L180 314 L210 286 L${rightS - 10} 296 L${rightW - 10} 434 H${leftW + 10}Z`} fill={isRobot ? '#94a3b8' : shade(color, heavy ? -10 : 4)} opacity="0.78" />
        <path d="M136 320 H224 L214 408 H146Z" fill={isRobot ? '#334155' : shade(color, -26)} opacity="0.48" />
        <path d={`M${leftS - 8} 294 C${leftS + 10} 284 ${leftS + 34} 290 ${leftS + 44} 308 C${leftS + 24} 316 ${leftS + 4} 314 ${leftS - 8} 294Z`} fill={shade(color, heavy ? 8 : 14)} opacity="0.76" />
        <path d={`M${rightS + 8} 294 C${rightS - 10} 284 ${rightS - 34} 290 ${rightS - 44} 308 C${rightS - 24} 316 ${rightS - 4} 314 ${rightS + 8} 294Z`} fill={shade(color, heavy ? 8 : 14)} opacity="0.76" />
        <path d="M146 332 H214 M150 368 H210" stroke={accentLight} strokeWidth="3" strokeLinecap="round" opacity="0.36" />
      </g>
    );
  }

  if (clothes === 'clothes-04') {
    return (
      <g>
        <path d={`M${leftS - 6} 286 C126 318 118 374 112 434 H248 C242 374 234 318 ${rightS + 6} 286 C218 300 142 300 ${leftS - 6} 286Z`} fill={shade(color, -18)} opacity="0.9" />
        <path d="M126 292 L180 340 L234 292 L220 434 H140Z" fill={outfitFill} opacity="0.7" />
      </g>
    );
  }

  if (clothes === 'clothes-02') {
    return (
      <g>
        <path d={torso} fill={outfitFill} opacity="0.92" />
        <path d="M132 300 C152 318 208 318 228 300 L216 434 H144Z" fill={shade(color, -8)} opacity="0.42" />
        <path d="M130 314 C152 330 208 330 230 314" fill="none" stroke={white} strokeOpacity="0.28" strokeWidth="5" />
      </g>
    );
  }

  if (clothes === 'clothes-12') {
    return (
      <g>
        <path d={torso} fill={shade(color, -24)} opacity="0.9" />
        <path d="M122 306 L180 348 L238 306 L226 434 H134Z" fill={outfitFill} opacity="0.62" />
        <path d="M132 316 H228" stroke={black} strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <path d={torso} fill={outfitFill} opacity="0.9" />
      <path d={core} fill={light} opacity="0.16" />
    </g>
  );
}

function ClothingDetail({ detail, text, accent, accentLight, accentDark }: { detail: string; text: string; accent: string; accentLight: string; accentDark: string }) {
  if (detail === 'detail-none') return null;

  if (detail === 'detail-text') {
    return <text x="180" y="386" textAnchor="middle" fill={accent} fontSize={String(text || '').length > 1 ? 31 : 36} fontWeight="900" opacity="0.94" fontFamily="Arial, Helvetica, sans-serif">{String(text || '10').toUpperCase().slice(0, 2)}</text>;
  }

  if (detail === 'detail-number') {
    return <text x="180" y="386" textAnchor="middle" fill={accent} fontSize="34" fontWeight="900" opacity="0.94" fontFamily="Arial">10</text>;
  }

  if (detail === 'detail-lightning') {
    return <path d="M188 332 L164 374 H184 L166 416 L214 360 H194 L208 332Z" fill={accent} opacity="0.88" />;
  }

  if (detail === 'detail-star') {
    return <path d="M180 326 L190 356 L222 356 L196 374 L206 406 L180 386 L154 406 L164 374 L138 356 L170 356Z" fill={accent} opacity="0.9" />;
  }

  if (detail === 'detail-gem') {
    return <path d="M180 338 L198 364 L180 394 L162 364Z" fill={accent} opacity="0.82" stroke={accentLight} strokeWidth="2.2" />;
  }

  if (detail === 'detail-x') {
    return <g stroke={accent} strokeWidth="4.4" strokeLinecap="round" opacity="0.78"><path d="M154 336 L206 398" /><path d="M206 336 L154 398" /></g>;
  }

  if (detail === 'detail-stripes') {
    return <g stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.82"><path d="M136 336 H224" /><path d="M142 374 H218" /><path d="M150 412 H210" /></g>;
  }

  if (detail === 'detail-diagonal') {
    return <path d="M126 326 C154 350 192 376 228 410" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity="0.82" />;
  }

  if (detail === 'detail-circle') {
    return <circle cx="180" cy="364" r="20" fill="none" stroke={accent} strokeWidth="6" opacity="0.9" />;
  }

  if (detail === 'detail-heart') {
    return <path d="M180 398 C148 372 134 346 152 332 C164 322 176 330 180 342 C184 330 196 322 208 332 C226 346 212 372 180 398Z" fill={accent} opacity="0.92" />;
  }

  if (detail === 'detail-crown') {
    return <path d="M148 372 L158 336 L176 362 L192 336 L212 372Z" fill={accent} opacity="0.88" stroke={accentLight} strokeWidth="2" />;
  }

  if (detail === 'detail-wings') {
    return <g fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.82"><path d="M174 366 C148 334 128 338 116 366" /><path d="M186 366 C212 334 232 338 244 366" /></g>;
  }

  if (detail === 'detail-neon') {
    return <g stroke={accentLight} strokeWidth="4" strokeLinecap="round" opacity="0.86"><path d="M180 318 V430" /><path d="M142 344 H162 M198 344 H218" /><path d="M148 404 H212" /></g>;
  }

  if (detail === 'detail-magic') {
    return <g fill="none" stroke={accent} opacity="0.9"><circle cx="180" cy="366" r="22" strokeWidth="4" /><path d="M180 338 L202 382 H158Z" strokeWidth="4" /></g>;
  }

  return <path d="M146 386 H214" stroke={accentDark} strokeWidth="5" strokeLinecap="round" opacity="0.72" />;
}

function Outerwear({ outerwear, color, accent }: { outerwear: string; color: string; accent: string }) {
  if (outerwear === 'outerwear-none') return null;

  if (outerwear === 'outerwear-jacket') {
    return (
      <g>
        <path d="M110 300 C132 316 150 344 160 434 H120 C116 376 110 334 110 300Z" fill={color} opacity="0.76" />
        <path d="M250 300 C228 316 210 344 200 434 H240 C244 376 250 334 250 300Z" fill={color} opacity="0.76" />
        <path d="M128 322 L158 348 M232 322 L202 348" stroke={accent} strokeWidth="3" opacity="0.42" />
      </g>
    );
  }

  if (outerwear === 'outerwear-armor') {
    return (
      <g opacity="0.78">
        <path d="M100 298 C120 288 144 292 156 310 C136 316 116 314 100 298Z" fill={shade(color, 12)} stroke={accent} strokeWidth="1.8" opacity="0.72" />
        <path d="M260 298 C240 288 216 292 204 310 C224 316 244 314 260 298Z" fill={shade(color, 12)} stroke={accent} strokeWidth="1.8" opacity="0.72" />
      </g>
    );
  }

  if (outerwear === 'outerwear-ruff') {
    return <path d="M114 292 C142 318 218 318 246 292 C222 304 138 304 114 292Z" fill="#f8fafc" opacity="0.7" stroke={accent} strokeWidth="2" />;
  }

  if (outerwear === 'outerwear-robe') {
    return <path d="M130 304 C152 326 208 326 230 304 L220 434 H140Z" fill={color} opacity="0.4" stroke={accent} strokeOpacity="0.3" />;
  }

  return null;
}


function CreatureBackParts({ skin, accent, glow, isRobot }: { skin: string; accent: string; glow: string; isRobot: boolean }) {
  if (isRobot) {
    return (
      <g opacity="0.72">
        <path d="M92 310 C70 260 78 214 116 190 C102 244 114 286 150 324Z" fill="#475569" stroke={accent} strokeWidth="3" />
        <path d="M268 310 C290 260 282 214 244 190 C258 244 246 286 210 324Z" fill="#475569" stroke={accent} strokeWidth="3" />
        <path d="M96 254 H132 M228 254 H264" stroke={glow} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>
    );
  }

  return (
    <g opacity="0.86">
      <path d="M84 330 C48 286 54 232 112 194 C98 246 120 294 158 332Z" fill={shade(skin, -18)} stroke={accent} strokeWidth="2.5" opacity="0.72" />
      <path d="M276 330 C312 286 306 232 248 194 C262 246 240 294 202 332Z" fill={shade(skin, -18)} stroke={accent} strokeWidth="2.5" opacity="0.72" />
      <path d="M114 392 C70 384 70 342 106 336 C94 360 112 374 138 372" fill="none" stroke={shade(skin, -24)} strokeWidth="10" strokeLinecap="round" opacity="0.72" />
    </g>
  );
}

function HairBack({ hair, kind, color, fill }: { hair: string; kind: AvatarKind; color: string; fill: string }) {
  if (kind !== 'female') return null;
  if (hair === 'hair-08' || hair === 'hair-19') return null;

  if (hair === 'hair-12') {
    return (
      <g opacity="0.95">
        <path d="M116 162 C112 218 118 266 136 300" fill="none" stroke={shade(color, -14)} strokeWidth="14" strokeLinecap="round" />
        <path d="M244 162 C248 218 242 266 224 300" fill="none" stroke={shade(color, -14)} strokeWidth="14" strokeLinecap="round" />
      </g>
    );
  }

  if (hair === 'hair-17') {
    return (
      <g>
        <path d="M214 130 C270 116 292 168 254 208 C252 176 232 158 204 154Z" fill={fill} opacity="0.96" />
        <path d="M232 154 C264 166 258 198 234 222" fill="none" stroke={shade(color, -16)} strokeWidth="9" strokeLinecap="round" opacity="0.34" />
      </g>
    );
  }

  if (hair === 'hair-16') {
    return <path d="M116 164 C118 126 144 106 182 108 C224 110 246 138 246 184 C246 230 222 260 206 278 L190 242 C216 226 224 196 214 166 C194 154 164 154 144 166 C134 196 142 226 170 242 L154 278 C134 260 116 224 116 164Z" fill={fill} opacity="0.94" />;
  }

  return <path d="M112 170 C112 120 144 98 184 104 C226 110 250 140 248 190 C246 248 220 292 200 326 L184 280 C210 248 220 204 212 166 C190 152 160 154 144 168 C136 206 148 250 176 280 L160 326 C136 292 112 244 112 170Z" fill={fill} opacity="0.92" />;
}

function CreatureHeadParts({ skin, shadow, accent, isRobot }: { skin: string; shadow: string; accent: string; isRobot: boolean }) {
  if (isRobot) {
    return (
      <g opacity="0.85">
        <path d="M132 148 L112 116 M228 148 L248 116" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <circle cx="108" cy="110" r="7" fill={accent} />
        <circle cx="252" cy="110" r="7" fill={accent} />
      </g>
    );
  }

  return (
    <g>
      <path d="M140 142 C128 112 138 94 158 82 C154 112 166 128 180 138" fill={shade(skin, -12)} stroke={shadow} strokeWidth="2.5" />
      <path d="M220 142 C232 112 222 94 202 82 C206 112 194 128 180 138" fill={shade(skin, -12)} stroke={shadow} strokeWidth="2.5" />
      <path d="M154 98 C150 114 158 126 172 136 M206 98 C210 114 202 126 188 136" fill="none" stroke={accent} strokeWidth="2.2" opacity="0.5" />
    </g>
  );
}

function Ears({ skin, shadow, feral }: { skin: string; shadow: string; feral: boolean }) {
  if (feral) {
    return (
      <g>
        <path d="M126 183 L102 154 L110 204Z" fill={skin} stroke={shadow} strokeWidth="2" />
        <path d="M234 183 L258 154 L250 204Z" fill={skin} stroke={shadow} strokeWidth="2" />
      </g>
    );
  }

  return (
    <g>
      <path d="M126 190 C108 190 106 226 128 226" fill={skin} opacity="0.96" />
      <path d="M234 190 C252 190 254 226 232 226" fill={skin} opacity="0.96" />
    </g>
  );
}

function HairSide({ hair, side, color, fill }: { hair: string; side: string; color: string; fill: string }) {
  if (hair === 'hair-08' || hair === 'hair-09' || side === 'side-none') return null;
  if (side === 'side-long') return <path d="M118 160 C108 198 112 244 130 282 L150 268 C138 226 140 188 150 160 Z M242 160 C252 198 248 244 230 282 L210 268 C222 226 220 188 210 160 Z" fill={fill} />;
  if (side === 'side-braided') {
    return (
      <g fill={shade(color, -10)}>
        {[176, 202, 228, 254].map((y) => (
          <g key={y}>
            <circle cx="122" cy={y} r="9" />
            <circle cx="238" cy={y} r="9" />
          </g>
        ))}
      </g>
    );
  }
  if (side === 'side-undercut') return <path d="M118 170 C122 138 142 124 162 124 L152 224 C132 216 118 198 118 170Z M242 170 C238 138 218 124 198 124 L208 224 C228 216 242 198 242 170Z" fill={shade(color, -38)} />;
  if (side === 'side-shaved-line') {
    return (
      <g>
        <path d="M118 172 C122 138 144 124 162 124 L152 222 C132 214 118 198 118 172Z M242 172 C238 138 216 124 198 124 L208 222 C228 214 242 198 242 172Z" fill={shade(color, -34)} />
        <path d="M134 148 L126 202 M226 148 L234 202" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" opacity="0.78" />
      </g>
    );
  }
  if (side === 'side-fade-high') return <path d="M118 170 C122 138 144 124 164 126 L156 210 C136 206 120 190 118 170Z M242 170 C238 138 216 124 196 126 L204 210 C224 206 240 190 242 170Z" fill={shade(color, -42)} />;
  if (side === 'side-fade-low') return <path d="M122 188 C126 150 146 128 168 126 L160 236 C140 230 126 212 122 188Z M238 188 C234 150 214 128 192 126 L200 236 C220 230 234 212 238 188Z" fill={shade(color, -22)} />;
  if (side === 'side-taper') return <path d="M122 176 C128 140 150 126 170 128 L164 216 C144 214 126 198 122 176Z M238 176 C232 140 210 126 190 128 L196 216 C216 214 234 198 238 176Z" fill={shade(color, -18)} />;

  return <path d="M118 180 C122 140 146 122 168 124 L158 232 C136 226 120 204 118 180Z M242 180 C238 140 214 122 192 124 L202 232 C224 226 240 204 242 180Z" fill={shade(color, -30)} />;
}

function HairFoundation({ hair, hairline, color, fill }: { hair: string; hairline: AvatarHairline; color: string; fill: string }) {
  if (hair === 'hair-08' || hair === 'hair-09') return null;

  const bottomByHairline: Record<AvatarHairline, number> = {
    'hairline-low': 178,
    'hairline-medium': 168,
    'hairline-high': 158,
  };
  const bottom = bottomByHairline[hairline] || bottomByHairline['hairline-low'];
  const crownTop = ['hair-03', 'hair-18'].includes(hair) ? 106 : ['hair-02', 'hair-10'].includes(hair) ? 112 : 114;
  const left = ['hair-04', 'hair-11', 'hair-16', 'hair-20'].includes(hair) ? 114 : 118;
  const right = 360 - left;
  const sideBottom = Math.max(bottom - 4, 150);
  const innerY = Math.max(bottom - 18, 140);

  if (hair === 'hair-06') {
    return (
      <g>
        <path d={`M154 ${sideBottom} C158 128 168 100 180 88 C192 100 202 128 206 ${sideBottom} C190 ${innerY} 170 ${innerY} 154 ${sideBottom}Z`} fill={fill} />
        <path d={`M166 ${bottom - 8} C174 ${bottom - 14} 186 ${bottom - 14} 194 ${bottom - 8}`} fill="none" stroke={shade(color, -16)} strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      </g>
    );
  }

  if (hair === 'hair-05' || hair === 'hair-15' || hair === 'hair-17') {
    const sweepBottom = hairline === 'hairline-low' ? 170 : hairline === 'hairline-medium' ? 160 : 150;
    return (
      <g>
        <path d={`M122 ${sweepBottom} C130 128 164 108 210 116 C232 122 240 140 238 ${sweepBottom - 2} C216 ${sweepBottom - 14} 188 ${sweepBottom - 18} 160 ${sweepBottom - 10} C144 ${sweepBottom - 6} 132 ${sweepBottom - 2} 122 ${sweepBottom}Z`} fill={fill} />
        <path d={`M136 ${sweepBottom - 6} C162 ${sweepBottom - 28} 196 ${sweepBottom - 30} 226 ${sweepBottom - 14}`} fill="none" stroke={shade(color, 24)} strokeWidth="4" strokeLinecap="round" opacity="0.18" />
      </g>
    );
  }

  return (
    <g>
      <path d={`M${left} ${bottom} C${left + 2} 132 148 ${crownTop} 180 ${crownTop} C212 ${crownTop} ${right - 2} 132 ${right} ${bottom} C222 ${sideBottom} 204 ${innerY} 180 ${innerY} C156 ${innerY} 138 ${sideBottom} ${left} ${bottom}Z`} fill={fill} />
      <path d={`M126 ${bottom - 4} C146 ${bottom - 18} 164 ${bottom - 22} 180 ${bottom - 20} C198 ${bottom - 22} 218 ${bottom - 18} 234 ${bottom - 4}`} fill="none" stroke={shade(color, -18)} strokeWidth="3" strokeLinecap="round" opacity="0.16" />
    </g>
  );
}

function HairTop({ hair, color, fill }: { hair: string; color: string; fill: string }) {
  if (hair === 'hair-08') return null;

  if (hair === 'hair-01') {
    return (
      <g>
        <path d="M122 166 C130 132 158 116 194 118 C226 120 240 142 238 164 C214 156 190 154 170 158 C150 162 134 166 122 166Z" fill={fill} />
        <path d="M132 165 H228" fill="none" stroke={shade(color, -18)} strokeWidth="3" strokeLinecap="round" opacity="0.22" />
        <path d="M148 140 L138 160 M174 128 L168 156 M204 130 L196 156" stroke={shade(color, 24)} strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      </g>
    );
  }

  if (hair === 'hair-02') {
    return (
      <g>
        <path d="M122 166 L136 132 L148 158 L160 118 L176 154 L190 108 L204 154 L222 126 L238 166 C220 158 204 152 188 162 C172 152 148 166 122 166Z" fill={fill} />
        <path d="M130 165 C148 156 164 154 180 160 C198 152 216 156 232 164" fill="none" stroke={shade(color, -18)} strokeWidth="3" strokeLinecap="round" opacity="0.22" />
      </g>
    );
  }

  if (hair === 'hair-03') {
    const curls: Point[] = [
      { x: 128, y: 158 },
      { x: 146, y: 136 },
      { x: 170, y: 122 },
      { x: 198, y: 124 },
      { x: 222, y: 142 },
      { x: 234, y: 162 },
      { x: 158, y: 162 },
      { x: 190, y: 158 },
    ];

    return (
      <g>
        {curls.map((curl, index) => <circle key={`${curl.x}-${curl.y}-${index}`} cx={curl.x} cy={curl.y} r={index > 5 ? 17 : 20} fill={fill} />)}
        <path d="M132 168 C150 156 166 170 180 158 C196 170 214 156 230 168" fill="none" stroke={shade(color, -18)} strokeWidth="4" strokeLinecap="round" opacity="0.22" />
      </g>
    );
  }

  if (hair === 'hair-04') {
    return (
      <g>
        <path d="M124 162 C126 124 154 104 188 108 C222 114 240 140 236 166 C216 152 194 144 176 146 C156 148 140 156 124 162Z" fill={fill} />
        <path d="M138 160 C154 138 170 128 192 130" fill="none" stroke={shade(color, 22)} strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      </g>
    );
  }

  if (hair === 'hair-05') {
    return (
      <g>
        <path d="M132 160 C140 128 166 106 222 116 C204 124 194 137 188 152 C170 142 150 146 132 160Z" fill={fill} />
        <path d="M134 158 C150 124 180 108 218 116" fill="none" stroke={shade(color, 24)} strokeWidth="5" strokeLinecap="round" opacity="0.22" />
        <path d="M134 160 C122 154 118 148 120 138" fill="none" stroke={shade(color, -18)} strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      </g>
    );
  }

  if (hair === 'hair-06') {
    return <path d="M158 166 C160 136 168 108 180 88 C192 108 200 138 198 166 C186 158 170 158 158 166Z" fill={fill} />;
  }

  if (hair === 'hair-07') {
    return <path d="M120 168 C130 124 178 106 238 130 C214 136 188 146 160 170 C146 166 132 166 120 168Z" fill={fill} />;
  }

  if (hair === 'hair-09') {
    return (
      <path
        d="M104 206 C104 138 144 104 180 104 C216 104 256 138 256 206 L236 196 C226 164 204 148 180 148 C156 148 134 164 124 196Z"
        fill={shade(color, -25)}
      />
    );
  }

  if (hair === 'hair-10') return <path d="M116 166 L136 126 L150 158 L166 116 L180 162 L198 108 L210 158 L228 124 L244 166 C222 158 204 152 190 166 C174 152 146 168 116 166Z" fill={fill} />;

  if (hair === 'hair-11') {
    return <path d="M120 166 C140 112 220 110 240 166 C224 154 206 146 192 146 L186 180 C182 176 178 176 174 180 L168 146 C150 148 134 156 120 166Z" fill={fill} />;
  }

  if (hair === 'hair-12') {
    return (
      <g>
        <path d="M128 166 C140 122 220 122 232 166 C204 150 156 150 128 166Z" fill={fill} />
        {[136, 224].map((x) => <path key={x} d={`M${x} 170 C${x - (x < 180 ? 12 : -12)} 208 ${x - (x < 180 ? 4 : -4)} 242 ${x + (x < 180 ? 8 : -8)} 274`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />)}
        {[152, 208].map((x) => <path key={x} d={`M${x} 162 C${x - (x < 180 ? 6 : -6)} 198 ${x - (x < 180 ? 1 : -1)} 226 ${x + (x < 180 ? 7 : -7)} 252`} fill="none" stroke={shade(color, -12)} strokeWidth="6" strokeLinecap="round" />)}
      </g>
    );
  }

  if (hair === 'hair-13') {
    return <path d="M120 172 C128 128 160 112 186 124 L210 114 L238 136 L230 168 L214 162 L202 180 L184 162 L166 176 L150 164 L134 180 C128 176 124 174 120 172Z" fill={fill} />;
  }

  if (hair === 'hair-14') {
    return <path d="M122 172 C134 132 176 112 232 136 C214 146 194 148 172 162 C154 174 140 184 126 190 C122 184 120 178 122 172Z" fill={fill} />;
  }

  if (hair === 'hair-15') {
    return (
      <g>
        <path d="M124 158 C140 124 186 110 232 136 C210 132 184 134 162 144 C144 152 132 156 124 158Z" fill={fill} />
        <path d="M140 152 C164 132 198 126 224 136 M150 160 C174 140 202 136 224 142" fill="none" stroke={shade(color, 24)} strokeWidth="3.5" strokeLinecap="round" opacity="0.22" />
      </g>
    );
  }

  if (hair === 'hair-16') {
    return <path d="M122 164 C130 122 162 108 192 114 C226 124 240 154 234 194 C226 176 206 158 184 150 C166 160 150 178 140 196 C126 188 120 174 122 164Z" fill={fill} />;
  }

  if (hair === 'hair-17') {
    return (
      <g>
        <path d="M128 160 C144 124 216 124 234 160 C210 146 154 146 128 160Z" fill={fill} />
        <path d="M206 132 C232 104 272 126 264 164 C248 146 228 142 208 150Z" fill={fill} />
        <path d="M150 154 C170 138 196 138 216 152" fill="none" stroke={shade(color, 22)} strokeWidth="4" strokeLinecap="round" opacity="0.24" />
      </g>
    );
  }

  if (hair === 'hair-18') {
    const curls: Point[] = [
      { x: 132, y: 146 },
      { x: 154, y: 122 },
      { x: 184, y: 106 },
      { x: 214, y: 122 },
      { x: 236, y: 148 },
      { x: 180, y: 136 },
      { x: 152, y: 158 },
      { x: 208, y: 158 },
    ];

    return <g>{curls.map((curl, index) => <circle key={`${curl.x}-${curl.y}-${index}`} cx={curl.x} cy={curl.y} r={index > 4 ? 19 : 22} fill={fill} />)}</g>;
  }

  if (hair === 'hair-19') {
    return <path d="M124 168 C134 132 168 112 212 124 L204 138 L214 150 L196 160 L170 158 L148 166 L124 168Z" fill={fill} />;
  }

  if (hair === 'hair-20') {
    return <path d="M120 164 C128 118 158 104 188 112 C228 122 244 152 238 198 C226 176 206 158 186 152 L180 190 L174 152 C152 158 134 176 122 198 C116 184 116 172 120 164Z" fill={fill} />;
  }

  return null;
}

function HairShine({ hair }: { hair: string }) {
  if (hair === 'hair-08' || hair === 'hair-09') return null;
  if (['hair-04', 'hair-11', 'hair-16', 'hair-20'].includes(hair)) {
    return <path d="M144 142 C158 124 196 120 220 142" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.14" />;
  }
  return <path d="M144 132 C158 122 190 120 212 134" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.16" />;
}

function Headwear({ headwear, hairColor, accent, ids }: { headwear: string; hairColor: string; accent: string; ids: ReturnType<typeof buildSvgIds> }) {
  if (headwear === 'headwear-none') return null;

  if (headwear === 'headwear-01') {
    return (
      <g>
        <path d="M134 148 C160 138 202 138 228 148" fill="none" stroke="#020617" strokeWidth="8" strokeLinecap="round" />
        <circle cx="154" cy="148" r="13" fill="#0f172a" stroke={accent} strokeWidth="3" />
        <circle cx="208" cy="148" r="13" fill="#0f172a" stroke={accent} strokeWidth="3" />
      </g>
    );
  }

  if (headwear === 'headwear-02') {
    return <path d="M140 128 L156 92 L180 126 L204 92 L220 128 L140 128Z" fill={accent} stroke="#fef3c7" strokeWidth="3" />;
  }

  if (headwear === 'headwear-03') {
    return <path d="M112 192 C116 120 150 90 180 90 C210 90 244 120 248 192 C228 150 210 134 180 134 C150 134 132 150 112 192Z" fill={shade(hairColor, -30)} opacity="0.92" />;
  }

  if (headwear === 'headwear-04') {
    return <path d="M178 134 L190 158 L180 158 L188 184 L166 152 L178 152Z" fill={accent} opacity="0.95" />;
  }

  if (headwear === 'headwear-05') {
    return <path d="M112 178 C118 114 154 90 180 90 C206 90 242 114 248 178 L226 164 C202 146 158 146 134 164Z" fill={`url(#${ids.metalGradient})`} stroke={accent} strokeWidth="3" opacity="0.96" />;
  }

  if (headwear === 'headwear-06') {
    return (
      <g>
        <path d="M126 144 C150 112 208 112 234 144 L228 166 C198 154 160 154 132 166Z" fill="#0f172a" />
        <path d="M132 144 C156 136 204 136 228 144" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M220 150 L258 160" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" />
      </g>
    );
  }

  return null;
}

function Eyes({ eyes, accent, glow }: { eyes: string; accent: string; glow: string }) {
  if (eyes === 'eyes-06') return <path d="M140 198 C156 188 204 188 220 198 C204 212 156 212 140 198Z" fill="#020617" opacity="0.82" />;
  if (eyes === 'eyes-08' || eyes === 'eyes-09' || eyes === 'eyes-12') {
    return (
      <g>
        <path d="M136 198 H224" stroke="#020617" strokeWidth="15" strokeLinecap="round" />
        <path d="M146 198 H214" stroke={eyes === 'eyes-12' ? accent : glow} strokeWidth="4" strokeLinecap="round" />
        {eyes === 'eyes-12' && <circle cx="198" cy="198" r="5" fill={glow} />}
      </g>
    );
  }
  if (eyes === 'eyes-10') {
    return (
      <g>
        <circle cx="158" cy="199" r="14" fill="rgba(255,255,255,0.16)" stroke="#0f172a" strokeWidth="3.5" />
        <circle cx="202" cy="199" r="14" fill="rgba(255,255,255,0.16)" stroke="#0f172a" strokeWidth="3.5" />
        <path d="M172 199 H188" stroke="#0f172a" strokeWidth="3.5" />
        <EyePair mood="calm" accent={accent} />
      </g>
    );
  }

  const mood = eyes === 'eyes-02' ? 'happy' : eyes === 'eyes-03' || eyes === 'eyes-07' ? 'intense' : eyes === 'eyes-04' ? 'calm' : eyes === 'eyes-05' ? 'open' : eyes === 'eyes-11' ? 'aqua' : 'focused';
  return <EyePair mood={mood} accent={eyes === 'eyes-11' ? glow : accent} />;
}

function EyePair({ mood, accent }: { mood: string; accent: string }) {
  const iris = mood === 'aqua' ? accent : mood === 'open' ? '#2563eb' : mood === 'happy' ? '#0f766e' : '#334155';
  const pupil = '#020617';
  const eyeFill = '#fff7ed';
  const leftD = mood === 'happy' ? 'M144 198 C152 190 164 190 172 198 C164 203 152 203 144 198Z' : mood === 'calm' ? 'M144 200 C154 196 162 196 172 200' : mood === 'open' ? 'M143 198 C152 188 164 188 173 198 C164 206 152 206 143 198Z' : 'M144 198 C153 190 164 190 174 198 C164 205 153 205 144 198Z';
  const rightD = mood === 'happy' ? 'M188 198 C196 190 208 190 216 198 C208 203 196 203 188 198Z' : mood === 'calm' ? 'M188 200 C198 196 206 196 216 200' : mood === 'open' ? 'M187 198 C196 188 208 188 217 198 C208 206 196 206 187 198Z' : 'M186 198 C196 190 207 190 216 198 C207 205 196 205 186 198Z';

  if (mood === 'calm') {
    return (
      <g>
        <path d={leftD} fill="none" stroke="#020617" strokeWidth="3.4" strokeLinecap="round" />
        <path d={rightD} fill="none" stroke="#020617" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M144 194 C154 190 162 190 172 194 M188 194 C198 190 206 190 216 194" fill="none" stroke="#020617" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <path d={leftD} fill={eyeFill} stroke="#020617" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d={rightD} fill={eyeFill} stroke="#020617" strokeOpacity="0.18" strokeWidth="1.5" />
      <circle cx="158" cy="198" r={mood === 'open' ? 4.8 : 4.2} fill={iris} opacity={mood === 'intense' ? 0.78 : 0.92} />
      <circle cx="202" cy="198" r={mood === 'open' ? 4.8 : 4.2} fill={iris} opacity={mood === 'intense' ? 0.78 : 0.92} />
      <circle cx="158" cy="198" r="2.2" fill={pupil} />
      <circle cx="202" cy="198" r="2.2" fill={pupil} />
      <circle cx="159.5" cy="196.5" r="1.2" fill="#ffffff" opacity="0.95" />
      <circle cx="203.5" cy="196.5" r="1.2" fill="#ffffff" opacity="0.95" />
      <path d="M144 191 C154 186 164 186 174 191 M186 191 C196 186 206 186 216 191" fill="none" stroke="#020617" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      {mood === 'aqua' && <path d="M145 213 C160 224 200 224 215 213" fill="none" stroke={accent} strokeWidth="2" opacity="0.65" />}
    </g>
  );
}

function Eyebrows({ eyebrows, hairColor }: { eyebrows: string; hairColor: string }) {
  if (eyebrows === 'brows-06') return null;

  if (eyebrows === 'brows-02') return <g><path d="M142 182 C152 176 164 176 174 182" stroke={hairColor} strokeWidth="4.2" strokeLinecap="round" fill="none" /><path d="M186 182 C196 176 208 176 218 182" stroke={hairColor} strokeWidth="4.2" strokeLinecap="round" fill="none" /></g>;
  if (eyebrows === 'brows-03') return <g><path d="M140 184 L174 178" stroke={hairColor} strokeWidth="5" strokeLinecap="round" /><path d="M220 184 L186 178" stroke={hairColor} strokeWidth="5" strokeLinecap="round" /></g>;
  if (eyebrows === 'brows-04') return <g><path d="M140 180 L174 187" stroke={hairColor} strokeWidth="5" strokeLinecap="round" /><path d="M220 180 L186 187" stroke={hairColor} strokeWidth="5" strokeLinecap="round" /></g>;
  if (eyebrows === 'brows-05') return <g><path d="M140 181 H174" stroke={hairColor} strokeWidth="5.4" strokeLinecap="round" /><path d="M186 181 H220" stroke={hairColor} strokeWidth="5.4" strokeLinecap="round" /></g>;

  return <g><path d="M142 183 C152 180 164 180 174 183" stroke={hairColor} strokeWidth="4.2" strokeLinecap="round" fill="none" /><path d="M186 183 C196 180 208 180 218 183" stroke={hairColor} strokeWidth="4.2" strokeLinecap="round" fill="none" /></g>;
}

function Nose({ nose, color, isRobot, accent }: { nose: string; color: string; isRobot: boolean; accent: string }) {
  if (isRobot || nose === 'nose-06') return <path d="M176 216 L188 216 L191 238 L180 246 L169 238Z" fill="#64748b" stroke={accent} strokeWidth="2" opacity="0.82" />;
  if (nose === 'nose-02') return <path d="M181 216 C176 228 176 235 184 240" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity="0.48" />;
  if (nose === 'nose-03') return <path d="M180 214 C174 228 174 238 186 244" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.52" />;
  if (nose === 'nose-04') return <path d="M174 218 C168 234 172 244 180 244 C188 244 192 234 186 218" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />;
  if (nose === 'nose-05') return <path d="M181 214 C174 230 176 240 191 242" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.54" />;

  return <path d="M180 216 C176 228 176 238 186 242" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.46" />;
}

function Mouth({ mouth, color, feral }: { mouth: string; color: string; feral: boolean }) {
  if (mouth === 'mouth-01') return <path d="M160 258 C170 266 190 266 200 258" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />;
  if (mouth === 'mouth-02') return <path d="M164 260 H198" stroke={color} strokeWidth="3.2" strokeLinecap="round" />;
  if (mouth === 'mouth-03') return <path d="M162 264 C174 259 188 259 200 264" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />;
  if (mouth === 'mouth-05') return <path d="M156 258 C170 276 194 276 208 258 C192 266 172 266 156 258Z" fill="#450a0a" stroke={color} strokeWidth="1.8" />;
  if (mouth === 'mouth-06' || feral) {
    return (
      <g>
        <path d="M152 258 C168 280 196 280 212 258 C194 270 170 270 152 258Z" fill="#451a03" stroke={color} strokeWidth="2" />
        <path d="M166 266 L172 278 L178 266 M190 266 L196 278 L202 266" stroke="#ffffff" strokeWidth="2" fill="none" />
      </g>
    );
  }

  return <path d="M158 258 C168 266 192 266 202 258" fill="none" stroke={color} strokeWidth="3.3" strokeLinecap="round" />;
}

function FacialHair({ facialHair, color }: { facialHair: string; color: string }) {
  if (facialHair === 'facial-none') return null;
  if (facialHair === 'facial-01') return <path d="M150 254 C158 290 202 290 210 254 C202 274 158 274 150 254Z" fill={color} opacity="0.5" />;
  if (facialHair === 'facial-02') return <path d="M166 268 C170 294 190 294 194 268 C186 276 174 276 166 268Z" fill={color} opacity="0.72" />;
  if (facialHair === 'facial-03') return <path d="M150 252 C162 244 174 248 180 256 C186 248 198 244 210 252 C198 262 188 262 180 256 C172 262 162 262 150 252Z" fill={color} opacity="0.8" />;
  if (facialHair === 'facial-04') return <path d="M136 238 C146 304 214 304 224 238 C210 286 150 286 136 238Z" fill={color} opacity="0.62" />;
  return <path d="M146 248 C160 284 200 284 214 248 C198 272 162 272 146 248Z" fill={color} opacity="0.6" />;
}

function Accessory({ accessory, accent, glow }: { accessory: string; accent: string; glow: string }) {
  if (accessory === 'none') return null;

  if (accessory === 'accessory-eye-glasses') {
    return (
      <g fill="rgba(255,255,255,0.1)" stroke={accent} strokeWidth="3" opacity="0.96">
        <rect x="137" y="190" width="34" height="18" rx="8" />
        <rect x="189" y="190" width="34" height="18" rx="8" />
        <path d="M171 198 H189" />
      </g>
    );
  }
  if (accessory === 'accessory-eye-visor') {
    return (
      <g opacity="0.96">
        <path d="M134 193 C154 185 206 185 226 193 L220 207 C202 202 158 202 140 207Z" fill={accent} opacity="0.34" stroke={accent} strokeWidth="2.4" />
        <path d="M144 198 H216" stroke={glow} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      </g>
    );
  }
  if (accessory === 'accessory-eye-patch') {
    return <g><path d="M136 198 H224" stroke={shade(accent, -35)} strokeWidth="3" opacity="0.8" /><path d="M142 188 C154 180 170 186 172 200 C168 214 148 216 138 204 C136 198 138 192 142 188Z" fill={shade(accent, -35)} opacity="0.95" /></g>;
  }

  if (accessory === 'accessory-01') {
    return <g fill={shade(accent, -42)} opacity="0.9"><rect x="136" y="190" width="38" height="18" rx="8" /><rect x="186" y="190" width="38" height="18" rx="8" /><path d="M174 199 H186" stroke={shade(accent, -42)} strokeWidth="3" /></g>;
  }
  if (accessory === 'accessory-02') {
    return <path d="M138 226 C156 236 204 236 222 226 L216 244 C198 252 162 252 144 244Z" fill={shade(accent, -38)} opacity="0.92" stroke={accent} strokeWidth="1.8" />;
  }
  if (accessory === 'accessory-03') return <path d="M206 178 L194 218" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.72" />;
  if (accessory === 'accessory-04') return <path d="M266 132 L246 176 H266 L238 226" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.62" />;
  if (accessory === 'accessory-05') return <circle cx="224" cy="318" r="6" fill={accent} stroke="#fef3c7" strokeWidth="1.8" opacity="0.9" />;
  if (accessory === 'accessory-06') return null;
  if (accessory === 'accessory-07') return <circle cx="240" cy="150" r="8" fill={accent} opacity="0.62" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.3" />;
  if (accessory === 'accessory-08') return <path d="M134 126 C158 108 202 108 226 126" fill="none" stroke={accent} strokeWidth="3" opacity="0.48" />;
  if (accessory === 'accessory-09') return <path d="M236 344 L266 306" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.82" />;
  if (accessory === 'accessory-10') return <path d="M236 304 L270 338" stroke={shade(accent, -35)} strokeWidth="6" strokeLinecap="round" opacity="0.82" />;
  if (accessory === 'accessory-11') return <path d="M92 286 L116 420" stroke={shade(accent, -28)} strokeWidth="6" strokeLinecap="round" opacity="0.86" />;
  if (accessory === 'accessory-12') return <path d="M270 268 V406 M252 288 L270 268 L288 288" stroke={accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.82" />;
  if (accessory === 'accessory-13') return <circle cx="104" cy="356" r="10" fill={accent} opacity="0.82" stroke="#fef3c7" strokeWidth="1.8" />;
  if (accessory === 'accessory-14') return <rect x="238" y="330" width="30" height="20" rx="7" fill={shade(accent, -42)} stroke={accent} strokeWidth="2.2" opacity="0.9" />;
  if (accessory === 'accessory-15') return <path d="M126 198 C126 168 146 150 180 150 C214 150 234 168 234 198" fill="none" stroke={shade(accent, -36)} strokeWidth="5" strokeLinecap="round" opacity="0.86" />;
  if (accessory === 'accessory-16') return <path d="M220 322 L232 330 L220 338 L208 330Z" fill={accent} opacity="0.82" stroke="#fef3c7" strokeWidth="1.3" />;

  return null;
}


function RobotFaceLines({ accent }: { accent: string }) {
  return (
    <g opacity="0.66">
      <path d="M142 170 H218 M138 230 H222" stroke="#020617" strokeWidth="2" />
      <path d="M150 154 L132 190 M210 154 L228 190" stroke={accent} strokeWidth="2" />
      <circle cx="180" cy="164" r="5" fill={accent} />
    </g>
  );
}

function AquaticMarks({ accent }: { accent: string }) {
  return (
    <g opacity="0.7">
      <path d="M132 214 C122 226 120 238 126 250" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M228 214 C238 226 240 238 234 250" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function FaceMask({ accent }: { accent: string }) {
  return <path d="M126 188 C150 168 210 168 234 188 L226 224 C206 210 154 210 134 224Z" fill="#020617" opacity="0.28" stroke={accent} strokeOpacity="0.55" strokeWidth="2" />;
}

function getFacePath(face: string) {
  if (face === 'face-02') return 'M130 194 C130 150 152 128 180 128 C208 128 230 150 230 194 C230 240 208 274 180 274 C152 274 130 240 130 194Z';
  if (face === 'face-03') return 'M126 184 C126 146 150 126 180 126 C210 126 234 146 234 184 L226 240 C220 264 202 278 180 278 C158 278 140 264 134 240Z';
  if (face === 'face-04') return 'M134 190 C134 148 154 126 180 126 C206 126 226 148 226 190 C226 234 204 280 180 280 C156 280 134 234 134 190Z';
  if (face === 'face-05') return 'M122 186 C122 146 150 124 180 124 C210 124 238 146 238 186 L230 240 C222 268 202 282 180 282 C158 282 138 268 130 240Z';
  if (face === 'face-06') return 'M126 190 C126 148 150 126 180 126 C210 126 234 148 234 190 C234 240 212 276 180 276 C148 276 126 240 126 190Z';
  if (face === 'face-07') return 'M126 184 C134 144 156 124 180 124 C204 124 226 144 234 184 L222 246 L180 280 L138 246Z';
  if (face === 'face-08') return 'M130 188 C130 146 152 124 180 124 C208 124 230 146 230 188 C230 234 208 278 180 278 C152 278 130 234 130 188Z';
  if (face === 'face-09') return 'M124 180 C124 140 150 120 180 120 C210 120 236 140 236 180 L228 246 C220 270 202 282 180 282 C158 282 140 270 132 246Z';
  if (face === 'face-10') return 'M128 190 C128 148 150 126 180 126 C210 126 232 148 232 190 C232 240 210 278 180 278 C150 278 128 240 128 190Z';

  return 'M128 188 C128 146 152 126 180 126 C208 126 232 146 232 188 C232 236 210 278 180 278 C150 278 128 236 128 188Z';
}

function getBodyShape(body: string, kind: AvatarKind, silhouette = 'silhouette-balanced') {
  let shape = kind === 'female'
    ? { leftShoulder: 116, rightShoulder: 244, leftWaist: 132, rightWaist: 228 }
    : kind === 'creature'
      ? { leftShoulder: body === 'body-05' ? 100 : 96, rightShoulder: body === 'body-05' ? 260 : 264, leftWaist: 116, rightWaist: 244 }
      : { leftShoulder: 110, rightShoulder: 250, leftWaist: 124, rightWaist: 236 };

  if (body === 'body-02') shape = { leftShoulder: shape.leftShoulder - 4, rightShoulder: shape.rightShoulder + 4, leftWaist: shape.leftWaist - 2, rightWaist: shape.rightWaist + 2 };
  if (body === 'body-03') shape = { leftShoulder: shape.leftShoulder - 8, rightShoulder: shape.rightShoulder + 8, leftWaist: shape.leftWaist - 5, rightWaist: shape.rightWaist + 5 };
  if (body === 'body-04') shape = { leftShoulder: shape.leftShoulder + 6, rightShoulder: shape.rightShoulder - 6, leftWaist: shape.leftWaist + 6, rightWaist: shape.rightWaist - 6 };
  if (body === 'body-05') shape = { leftShoulder: 102, rightShoulder: 258, leftWaist: 118, rightWaist: 242 };

  if (silhouette === 'silhouette-slim') shape = { leftShoulder: shape.leftShoulder + 12, rightShoulder: shape.rightShoulder - 12, leftWaist: shape.leftWaist + 10, rightWaist: shape.rightWaist - 10 };
  if (silhouette === 'silhouette-hero') shape = { leftShoulder: shape.leftShoulder - 8, rightShoulder: shape.rightShoulder + 8, leftWaist: shape.leftWaist - 2, rightWaist: shape.rightWaist + 2 };
  if (silhouette === 'silhouette-wide') shape = { leftShoulder: shape.leftShoulder - 10, rightShoulder: shape.rightShoulder + 10, leftWaist: shape.leftWaist - 8, rightWaist: shape.rightWaist + 8 };
  if (silhouette === 'silhouette-armor') shape = { leftShoulder: shape.leftShoulder - 8, rightShoulder: shape.rightShoulder + 8, leftWaist: shape.leftWaist - 4, rightWaist: shape.rightWaist + 4 };
  if (silhouette === 'silhouette-dress') shape = { leftShoulder: shape.leftShoulder + 4, rightShoulder: shape.rightShoulder - 4, leftWaist: shape.leftWaist - 16, rightWaist: shape.rightWaist + 16 };
  if (silhouette === 'silhouette-monster') shape = { leftShoulder: 94, rightShoulder: 266, leftWaist: 108, rightWaist: 252 };
  if (silhouette === 'silhouette-robot') shape = { leftShoulder: 100, rightShoulder: 260, leftWaist: 116, rightWaist: 244 };
  if (silhouette === 'silhouette-alien') shape = { leftShoulder: 116, rightShoulder: 244, leftWaist: 124, rightWaist: 236 };

  return {
    leftShoulder: Math.max(94, Math.min(126, shape.leftShoulder)),
    rightShoulder: Math.max(234, Math.min(266, shape.rightShoulder)),
    leftWaist: Math.max(106, Math.min(142, shape.leftWaist)),
    rightWaist: Math.max(218, Math.min(254, shape.rightWaist)),
  };
}

function getOptionColor(category: keyof typeof AVATAR_OPTIONS, id: string, fallback: string) {
  const option = AVATAR_OPTIONS[category].find((item) => item.id === id) as { color?: string } | undefined;
  return option?.color || fallback;
}

function shade(hex: string, amount: number) {
  const cleanHex = hex.replace('#', '');
  const value = Number.parseInt(cleanHex.length === 3 ? cleanHex.split('').map((part) => part + part).join('') : cleanHex, 16);

  if (Number.isNaN(value)) return hex;

  const clamp = (input: number) => Math.max(0, Math.min(255, input));
  const r = clamp((value >> 16) + amount);
  const g = clamp(((value >> 8) & 0x00ff) + amount);
  const b = clamp((value & 0x0000ff) + amount);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
