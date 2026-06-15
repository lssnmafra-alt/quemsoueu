'use client';

import { AVATAR_OPTIONS, DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
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
  const outfitLight = shade(outfit, 22);
  const outfitDark = shade(outfit, -30);
  const hair = avatar.hairColor;
  const bg = backgroundThemes[avatar.background] || backgroundThemes['bg-01'];
  const frame = frameThemes[avatar.frame] || frameThemes['frame-rare'];
  const isRobot = avatar.skin === 'skin-09' || avatar.face === 'face-09' || avatar.body === 'body-05';
  const isFeral = avatar.skin === 'skin-06' || avatar.mouth === 'mouth-06';
  const bodyShape = getBodyShape(avatar.body);
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
          <rect x="14" y="14" width="332" height="452" rx="34" fill="none" stroke={`url(#${ids.frameGradient})`} strokeWidth="8" />
          <rect x="28" y="28" width="304" height="424" rx="24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        </g>

        <g clipPath={`url(#${ids.cardClip})`}>
          <ellipse cx="180" cy="420" rx="112" ry="24" fill="#020617" opacity="0.42" />
          <g filter={`url(#${ids.softShadow})`}>
            {avatar.outerwear === 'outerwear-cape' && <Cape outfit={outfitDark} frame={frame.a} />}
            {avatar.outerwear === 'outerwear-robe' && <RobeBack color={outfitDark} accent={frame.a} />}

            <g>
              <path
                d={`M${bodyShape.leftShoulder} 292 C${bodyShape.leftShoulder - 28} 304 ${bodyShape.leftWaist - 28} 348 ${bodyShape.leftWaist} 434 L${bodyShape.rightWaist} 434 C${bodyShape.rightWaist + 28} 348 ${bodyShape.rightShoulder + 28} 304 ${bodyShape.rightShoulder} 292 C220 276 140 276 ${bodyShape.leftShoulder} 292Z`}
                fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.outfitGradient})`}
              />
              <path d="M132 298 C145 322 154 362 158 434 L202 434 C206 362 215 322 228 298 C203 288 157 288 132 298Z" fill="rgba(255,255,255,0.10)" />
              <OutfitDetails clothes={avatar.clothes} color={outfit} dark={outfitDark} light={outfitLight} accent={frame.a} isRobot={isRobot} />
              <Outerwear outerwear={avatar.outerwear} color={outfitDark} accent={frame.a} />
            </g>

            <g>
              <path d="M148 254 C148 282 158 304 180 304 C202 304 212 282 212 254 L148 254Z" fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`} />
              <path d="M154 282 C168 294 192 294 206 282 C201 306 159 306 154 282Z" fill={skinDeep} opacity="0.22" />
            </g>

            <g>
              <path d={facePath} fill={isRobot ? `url(#${ids.metalGradient})` : `url(#${ids.skinGradient})`} />
              <path d="M132 178 C142 148 164 134 188 138 C165 150 151 174 151 212 C151 242 163 266 184 278 C148 274 128 244 126 208 C125 198 127 187 132 178Z" fill="#ffffff" opacity="0.10" clipPath={`url(#${ids.faceClip})`} />
              <path d="M222 168 C232 190 232 236 215 260 C226 247 236 226 236 202 C236 184 231 173 222 168Z" fill="#020617" opacity="0.12" clipPath={`url(#${ids.faceClip})`} />
              <Marking marking={avatar.marking} accent={frame.a} glow={bg.glow} skinDeep={skinDeep} />
              {isRobot && <RobotFaceLines accent={frame.a} />}
              {avatar.face === 'face-10' && <AquaticMarks accent={bg.glow} />}
              {avatar.face === 'face-06' && <FaceMask accent={frame.a} />}
            </g>

            <Ears skin={isRobot ? '#94a3b8' : skin} shadow={skinShadow} feral={isFeral || avatar.accessory === 'accessory-06'} />
            <Eyes eyes={avatar.eyes} accent={frame.a} glow={bg.glow} />
            <Eyebrows eyebrows={avatar.eyebrows} hairColor={hair} />
            <Nose nose={avatar.nose} color={skinDeep} isRobot={isRobot} accent={frame.a} />
            <Mouth mouth={avatar.mouth} color={skinDeep} feral={isFeral} />
            <FacialHair facialHair={avatar.facialHair} color={hair} />
            <Hair hair={avatar.hair} side={avatar.hairSide} color={hair} ids={ids} />
            <Headwear headwear={avatar.headwear} hairColor={hair} accent={frame.a} ids={ids} />
            <Accessory accessory={avatar.accessory} accent={frame.a} glow={bg.glow} />
          </g>
        </g>

        <g>
          <rect x="38" y="398" width="284" height="44" rx="16" fill="#020617" opacity="0.58" />
          <rect x="40" y="400" width="280" height="40" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
          <text x="180" y="423" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="900" letterSpacing="1.8" fontFamily="Arial, Helvetica, sans-serif">
            {displayName.toUpperCase().slice(0, 24)}
          </text>
          <text x="180" y="438" textAnchor="middle" fill={frame.b} fontSize="8" fontWeight="900" letterSpacing="2.4" fontFamily="Arial, Helvetica, sans-serif">
            {frame.text} AVATAR
          </text>
        </g>
      </svg>
    </div>
  );
}

function buildSvgIds(avatar: AvatarConfig, name: string) {
  const seed = `${name}-${avatar.skin}-${avatar.face}-${avatar.hair}-${avatar.hairSide}-${avatar.clothes}-${avatar.background}-${avatar.frame}-${avatar.aura}-${avatar.marking}`;
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
      <g opacity="0.72">
        <path d="M38 274 C94 244 262 244 322 274" fill="none" stroke={line} strokeWidth="3" opacity="0.55" />
        <path d="M58 304 C112 284 248 284 302 304" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.18" />
        <circle cx="78" cy="146" r="3" fill="#fef3c7" />
        <circle cx="280" cy="134" r="3" fill="#fef3c7" />
        <circle cx="180" cy="102" r="4" fill="#fef3c7" />
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
      <g opacity="0.75">
        <circle cx="82" cy="102" r="2" fill="#fff" />
        <circle cx="270" cy="88" r="2.5" fill="#fff" />
        <circle cx="296" cy="204" r="1.8" fill="#fff" />
        <circle cx="58" cy="250" r="1.8" fill="#fff" />
        <ellipse cx="272" cy="142" rx="34" ry="12" fill="none" stroke={line} strokeWidth="2" opacity="0.45" transform="rotate(-20 272 142)" />
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
      <g opacity="0.75">
        <ellipse cx="180" cy="238" rx="118" ry="162" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="10 12" />
        <ellipse cx="180" cy="238" rx="92" ry="134" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.55" />
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
      <g opacity="0.8">
        {[58, 96, 270, 304, 248, 80].map((x, index) => (
          <circle key={x} cx={x} cy={90 + index * 44} r={index % 2 ? 2.5 : 4} fill={index % 2 ? '#ffffff' : accent} />
        ))}
        <path d="M42 214 C102 168 246 166 318 218" fill="none" stroke={accent} strokeWidth="2" opacity="0.38" />
      </g>
    );
  }

  if (aura === 'aura-stadium') {
    return (
      <g opacity="0.58">
        <path d="M48 86 L130 246 M312 86 L230 246" stroke="#fef3c7" strokeWidth="5" opacity="0.22" />
        <circle cx="82" cy="96" r="8" fill="#fef3c7" />
        <circle cx="278" cy="96" r="8" fill="#fef3c7" />
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
  if (marking === 'marking-arcane') return <g stroke={glow} fill="none" opacity="0.78"><circle cx="180" cy="164" r="12" strokeWidth="2" /><path d="M180 152 L190 170 H170 Z" strokeWidth="2" /></g>;
  if (marking === 'marking-cyber') return <g stroke={glow} strokeWidth="2.5" opacity="0.82"><path d="M132 236 H156 V250 H172" /><path d="M228 236 H204 V250 H188" /><circle cx="172" cy="250" r="3" fill={glow} /><circle cx="188" cy="250" r="3" fill={glow} /></g>;
  if (marking === 'marking-royal') return <path d="M166 154 C176 148 184 148 194 154 C190 162 170 162 166 154Z" fill={accent} opacity="0.72" />;
  if (marking === 'marking-shadow') return <path d="M132 176 C148 164 164 162 180 166 C160 184 148 210 146 242 C134 222 128 198 132 176Z" fill="#020617" opacity="0.16" />;

  return null;
}

function RobeBack({ color, accent }: { color: string; accent: string }) {
  return <path d="M114 288 C92 326 84 376 78 444 L282 444 C276 376 268 326 246 288 C216 304 144 304 114 288Z" fill={color} opacity="0.86" stroke={accent} strokeOpacity="0.22" strokeWidth="2" />;
}

function OutfitDetails({ clothes, color, dark, light, accent, isRobot }: { clothes: string; color: string; dark: string; light: string; accent: string; isRobot: boolean }) {
  if (isRobot || clothes === 'clothes-17' || clothes === 'clothes-21') {
    return (
      <g>
        <path d="M118 316 H242 L224 434 H136Z" fill="none" stroke="#e2e8f0" strokeOpacity="0.35" strokeWidth="2" />
        <path d="M150 318 L180 350 L210 318" fill="none" stroke={accent} strokeWidth="4" opacity="0.8" />
        <circle cx="180" cy="366" r="15" fill="#020617" stroke={accent} strokeWidth="3" />
        <path d="M126 338 H156 M204 338 H234 M142 392 H218" stroke="#020617" strokeOpacity="0.34" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-02') {
    return (
      <g>
        <path d="M124 316 L180 344 L236 316" fill="none" stroke="#ffffff" strokeOpacity="0.62" strokeWidth="5" />
        <text x="180" y="388" textAnchor="middle" fill="#ffffff" fontSize="36" fontWeight="900" opacity="0.74" fontFamily="Arial">10</text>
        <path d="M118 334 C144 350 216 350 242 334" fill="none" stroke={light} strokeWidth="3" opacity="0.6" />
      </g>
    );
  }

  if (clothes === 'clothes-11') {
    return (
      <g>
        <path d="M124 306 C144 330 216 330 236 306 L228 372 C204 386 156 386 132 372Z" fill={shade(color, -18)} opacity="0.78" />
        <path d="M138 340 H222" stroke="#ffffff" strokeOpacity="0.42" strokeWidth="5" strokeLinecap="round" />
        <path d="M154 374 H206" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-12') {
    return (
      <g>
        <path d="M120 306 L180 350 L240 306 L230 434 H130Z" fill={dark} opacity="0.65" />
        <path d="M146 326 L214 394 M214 326 L146 394" stroke={accent} strokeWidth="4" opacity="0.68" />
      </g>
    );
  }

  if (clothes === 'clothes-14' || clothes === 'clothes-18') {
    return (
      <g>
        <path d="M120 322 C150 346 210 346 240 322" fill="none" stroke={accent} strokeWidth="4" opacity="0.75" />
        <circle cx="148" cy="372" r="8" fill={accent} opacity="0.75" />
        <circle cx="212" cy="372" r="8" fill={accent} opacity="0.75" />
        <path d="M150 410 H210" stroke="#ffffff" strokeOpacity="0.36" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-19' || clothes === 'clothes-20') {
    return (
      <g>
        <path d="M132 304 L180 342 L228 304 L242 434 H118Z" fill={dark} opacity="0.54" />
        <path d="M180 344 V432" stroke="#f8fafc" strokeOpacity="0.28" strokeWidth="3" />
        <path d="M142 334 H164 M196 334 H218" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.65" />
      </g>
    );
  }

  return (
    <g>
      <path d="M128 308 L180 342 L232 308" fill="none" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="5" />
      <path d="M150 332 L180 360 L210 332" fill="none" stroke={accent} strokeWidth="4" opacity="0.56" />
      <path d="M136 400 H224" stroke={light} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </g>
  );
}

function Outerwear({ outerwear, color, accent }: { outerwear: string; color: string; accent: string }) {
  if (outerwear === 'outerwear-none') return null;

  if (outerwear === 'outerwear-jacket') {
    return (
      <g>
        <path d="M108 300 C130 316 150 344 160 434 H118 C114 376 108 334 108 300Z" fill={color} opacity="0.82" />
        <path d="M252 300 C230 316 210 344 200 434 H242 C246 376 252 334 252 300Z" fill={color} opacity="0.82" />
        <path d="M126 322 L158 348 M234 322 L202 348" stroke={accent} strokeWidth="3" opacity="0.55" />
      </g>
    );
  }

  if (outerwear === 'outerwear-armor') {
    return (
      <g>
        <path d="M92 300 C116 284 144 290 158 310 C134 320 110 320 92 300Z" fill="#cbd5e1" opacity="0.88" />
        <path d="M268 300 C244 284 216 290 202 310 C226 320 250 320 268 300Z" fill="#cbd5e1" opacity="0.88" />
        <path d="M104 302 H148 M212 302 H256" stroke={accent} strokeWidth="3" opacity="0.65" />
      </g>
    );
  }

  if (outerwear === 'outerwear-ruff') {
    return <path d="M112 292 C140 322 220 322 248 292 C222 304 138 304 112 292Z" fill="#f8fafc" opacity="0.82" stroke={accent} strokeWidth="2" />;
  }

  if (outerwear === 'outerwear-robe') {
    return <path d="M130 304 C152 326 208 326 230 304 L220 434 H140Z" fill={color} opacity="0.46" stroke={accent} strokeOpacity="0.34" />;
  }

  return null;
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

function Hair({ hair, side, color, ids }: { hair: string; side: string; color: string; ids: ReturnType<typeof buildSvgIds> }) {
  if (hair === 'hair-08') return null;

  if (hair === 'hair-09') {
    return <path d="M106 206 C106 138 144 104 180 104 C216 104 254 138 254 206 C240 160 218 138 180 138 C142 138 120 160 106 206Z" fill={shade(color, -25)} />;
  }

  const hairFill = `url(#${ids.hairGradient})`;

  return (
    <g>
      <HairSide side={side} color={color} fill={hairFill} />
      <HairTop hair={hair} color={color} fill={hairFill} />
      <HairShine hair={hair} />
    </g>
  );
}

function HairSide({ side, color, fill }: { side: string; color: string; fill: string }) {
  if (side === 'side-none') return null;
  if (side === 'side-long') return <path d="M112 164 C100 206 102 258 122 304 L142 286 C128 236 130 190 144 160 Z M248 164 C260 206 258 258 238 304 L218 286 C232 236 230 190 216 160 Z" fill={fill} />;
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
  if (side === 'side-undercut') return <path d="M116 170 C120 136 140 122 162 122 L150 238 C130 228 116 200 116 170Z M244 170 C240 136 220 122 198 122 L210 238 C230 228 244 200 244 170Z" fill={shade(color, -38)} />;
  if (side === 'side-shaved-line') {
    return (
      <g>
        <path d="M116 172 C120 136 142 122 162 122 L150 234 C130 224 116 200 116 172Z M244 172 C240 136 218 122 198 122 L210 234 C230 224 244 200 244 172Z" fill={shade(color, -34)} />
        <path d="M132 148 L122 208 M228 148 L238 208" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.82" />
      </g>
    );
  }
  if (side === 'side-fade-high') return <path d="M116 172 C120 134 144 120 164 124 L154 218 C132 212 118 194 116 172Z M244 172 C240 134 216 120 196 124 L206 218 C228 212 242 194 244 172Z" fill={shade(color, -42)} />;
  if (side === 'side-fade-low') return <path d="M122 190 C124 148 146 126 168 124 L158 246 C138 238 124 218 122 190Z M238 190 C236 148 214 126 192 124 L202 246 C222 238 236 218 238 190Z" fill={shade(color, -22)} />;
  if (side === 'side-taper') return <path d="M120 176 C126 138 148 122 170 124 L162 224 C140 220 122 202 120 176Z M240 176 C234 138 212 122 190 124 L198 224 C220 220 238 202 240 176Z" fill={shade(color, -18)} />;

  return <path d="M118 180 C122 140 146 122 168 124 L158 232 C136 226 120 204 118 180Z M242 180 C238 140 214 122 192 124 L202 232 C224 226 240 204 242 180Z" fill={shade(color, -30)} />;
}

function HairTop({ hair, color, fill }: { hair: string; color: string; fill: string }) {
  if (hair === 'hair-01') return <path d="M122 174 C128 130 158 112 196 116 C226 120 242 142 242 176 C208 154 160 152 122 174Z" fill={fill} />;
  if (hair === 'hair-02') return <path d="M120 172 L138 116 L158 150 L178 102 L198 150 L224 112 L242 174 C206 154 156 154 120 172Z" fill={fill} />;
  if (hair === 'hair-03') {
    const circles: Point[] = [
      { x: 128, y: 164 },
      { x: 144, y: 134 },
      { x: 174, y: 126 },
      { x: 204, y: 132 },
      { x: 230, y: 160 },
      { x: 118, y: 190 },
      { x: 240, y: 190 },
    ];
    return <g>{circles.map((circle) => <circle key={`${circle.x}-${circle.y}`} cx={circle.x} cy={circle.y} r="25" fill={fill} />)}</g>;
  }
  if (hair === 'hair-04') return <path d="M116 164 C114 118 150 96 184 104 C226 112 250 146 246 194 C242 258 222 302 196 326 C212 246 212 178 180 146 C150 174 138 246 160 326 C130 298 116 232 116 164Z" fill={fill} />;
  if (hair === 'hair-05') return <path d="M126 168 C138 118 168 92 224 114 C206 122 194 136 188 156 C166 144 146 148 126 168Z" fill={fill} />;
  if (hair === 'hair-06') return <path d="M156 166 L174 84 L192 166 C180 158 168 158 156 166Z" fill={fill} />;
  if (hair === 'hair-07') return <path d="M116 176 C130 116 190 102 240 132 C206 136 172 158 134 206 C126 194 120 184 116 176Z" fill={fill} />;
  if (hair === 'hair-10') return <path d="M114 180 L142 116 L158 154 L180 92 L204 154 L234 114 L246 182 C210 152 150 152 114 180Z" fill={fill} />;
  if (hair === 'hair-11') return <path d="M114 168 C134 104 224 100 246 170 C236 158 218 150 200 148 L190 222 L174 148 C150 150 132 158 114 168Z" fill={fill} />;
  if (hair === 'hair-12') {
    return (
      <g>
        <path d="M126 168 C138 116 220 116 234 168 C198 150 162 150 126 168Z" fill={fill} />
        {[138, 154, 206, 222].map((x) => <path key={x} d={`M${x} 168 C${x - 12} 212 ${x - 10} 254 ${x + 2} 298`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />)}
      </g>
    );
  }
  if (hair === 'hair-13') return <path d="M118 172 C128 112 166 104 190 122 L214 104 L238 132 L228 180 C198 154 158 154 118 172Z" fill={fill} />;
  if (hair === 'hair-14') return <path d="M122 176 C132 126 182 106 238 134 C218 150 178 160 126 196Z" fill={fill} />;
  if (hair === 'hair-15') return <path d="M124 168 C138 122 186 108 232 134 C202 142 166 152 128 180Z" fill={fill} />;
  if (hair === 'hair-16') return <path d="M118 166 C126 116 160 100 192 108 C230 118 246 154 238 210 C230 260 208 294 180 308 C202 244 202 182 180 150 C154 180 154 246 180 308 C142 292 116 236 118 166Z" fill={fill} />;
  if (hair === 'hair-17') return <><path d="M124 168 C136 112 226 112 238 168 C204 146 158 146 124 168Z" fill={fill} /><path d="M218 144 C260 130 286 164 270 204 C256 174 234 164 214 166Z" fill={fill} /></>;
  if (hair === 'hair-18') return <g>{[{ x: 132, y: 156, r: 30 }, { x: 160, y: 126, r: 34 }, { x: 198, y: 126, r: 34 }, { x: 228, y: 158, r: 30 }, { x: 180, y: 106, r: 32 }].map((c) => <circle key={`${c.x}-${c.y}`} cx={c.x} cy={c.y} r={c.r} fill={fill} />)}</g>;
  if (hair === 'hair-19') return <path d="M122 170 C132 126 166 106 216 120 C204 130 198 146 196 164 C170 150 146 154 122 180Z" fill={fill} />;
  if (hair === 'hair-20') return <path d="M116 168 C124 112 154 96 186 104 C232 114 252 150 244 208 C240 246 226 284 206 310 C216 244 210 190 184 154 C162 188 146 238 154 310 C126 286 112 230 116 168Z" fill={fill} />;

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
  if (eyes === 'eyes-06') return <path d="M136 198 C154 184 206 184 224 198 C208 216 152 216 136 198Z" fill="#020617" opacity="0.86" />;
  if (eyes === 'eyes-08' || eyes === 'eyes-09' || eyes === 'eyes-12') {
    return (
      <g>
        <path d="M132 198 H228" stroke="#020617" strokeWidth="18" strokeLinecap="round" />
        <path d="M142 198 H218" stroke={eyes === 'eyes-12' ? accent : glow} strokeWidth="5" strokeLinecap="round" />
        {eyes === 'eyes-12' && <circle cx="198" cy="198" r="7" fill={glow} />}
      </g>
    );
  }
  if (eyes === 'eyes-10') {
    return (
      <g>
        <circle cx="156" cy="200" r="17" fill="none" stroke="#0f172a" strokeWidth="4" />
        <circle cx="204" cy="200" r="17" fill="none" stroke="#0f172a" strokeWidth="4" />
        <path d="M173 200 H187" stroke="#0f172a" strokeWidth="4" />
        <EyePair mood="calm" accent={accent} />
      </g>
    );
  }

  const mood = eyes === 'eyes-02' ? 'happy' : eyes === 'eyes-03' || eyes === 'eyes-07' ? 'angry' : eyes === 'eyes-04' ? 'calm' : eyes === 'eyes-05' ? 'wide' : eyes === 'eyes-11' ? 'aqua' : 'focused';
  return <EyePair mood={mood} accent={eyes === 'eyes-11' ? glow : accent} />;
}

function EyePair({ mood, accent }: { mood: string; accent: string }) {
  const pupil = mood === 'aqua' ? accent : '#020617';
  const eyeFill = mood === 'angry' ? '#f8fafc' : '#ffffff';
  const leftD = mood === 'happy' ? 'M140 198 C150 188 164 188 174 198 C164 204 150 204 140 198Z' : mood === 'calm' ? 'M140 201 C152 196 162 196 174 201' : 'M138 198 C150 186 164 186 176 198 C164 208 150 208 138 198Z';
  const rightD = mood === 'happy' ? 'M186 198 C196 188 210 188 220 198 C210 204 196 204 186 198Z' : mood === 'calm' ? 'M186 201 C198 196 208 196 220 201' : 'M184 198 C196 186 210 186 222 198 C210 208 196 208 184 198Z';

  if (mood === 'calm') {
    return <g><path d={leftD} fill="none" stroke="#020617" strokeWidth="4" strokeLinecap="round" /><path d={rightD} fill="none" stroke="#020617" strokeWidth="4" strokeLinecap="round" /></g>;
  }

  return (
    <g>
      <path d={leftD} fill={eyeFill} />
      <path d={rightD} fill={eyeFill} />
      <circle cx="158" cy="198" r={mood === 'wide' ? 5 : 4} fill={pupil} />
      <circle cx="204" cy="198" r={mood === 'wide' ? 5 : 4} fill={pupil} />
      {mood === 'aqua' && <path d="M145 213 C160 224 200 224 215 213" fill="none" stroke={accent} strokeWidth="2" opacity="0.65" />}
    </g>
  );
}

function Eyebrows({ eyebrows, hairColor }: { eyebrows: string; hairColor: string }) {
  if (eyebrows === 'brows-06') return null;

  if (eyebrows === 'brows-02') return <g><path d="M138 182 C150 174 164 174 176 182" stroke={hairColor} strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M184 182 C198 174 212 174 224 182" stroke={hairColor} strokeWidth="5" strokeLinecap="round" fill="none" /></g>;
  if (eyebrows === 'brows-03') return <g><path d="M136 184 L174 176" stroke={hairColor} strokeWidth="6" strokeLinecap="round" /><path d="M224 184 L186 176" stroke={hairColor} strokeWidth="6" strokeLinecap="round" /></g>;
  if (eyebrows === 'brows-04') return <g><path d="M136 178 L174 188" stroke={hairColor} strokeWidth="6" strokeLinecap="round" /><path d="M224 178 L186 188" stroke={hairColor} strokeWidth="6" strokeLinecap="round" /></g>;
  if (eyebrows === 'brows-05') return <g><path d="M136 180 H174" stroke={hairColor} strokeWidth="7" strokeLinecap="round" /><path d="M186 180 H224" stroke={hairColor} strokeWidth="7" strokeLinecap="round" /></g>;

  return <g><path d="M140 182 C152 178 164 178 174 182" stroke={hairColor} strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M186 182 C198 178 210 178 220 182" stroke={hairColor} strokeWidth="5" strokeLinecap="round" fill="none" /></g>;
}

function Nose({ nose, color, isRobot, accent }: { nose: string; color: string; isRobot: boolean; accent: string }) {
  if (isRobot || nose === 'nose-06') return <path d="M176 214 L188 214 L192 242 L180 250 L168 242Z" fill="#64748b" stroke={accent} strokeWidth="2" opacity="0.85" />;
  if (nose === 'nose-02') return <path d="M181 214 C174 228 174 236 184 242" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.55" />;
  if (nose === 'nose-03') return <path d="M180 212 C172 230 170 242 186 248" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.58" />;
  if (nose === 'nose-04') return <path d="M174 216 C164 236 170 248 180 248 C190 248 196 236 186 216" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.58" />;
  if (nose === 'nose-05') return <path d="M181 210 C170 232 172 244 192 246" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.62" />;

  return <path d="M180 212 C176 228 174 240 186 246" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.52" />;
}

function Mouth({ mouth, color, feral }: { mouth: string; color: string; feral: boolean }) {
  if (mouth === 'mouth-01') return <path d="M158 260 C168 272 194 272 204 260" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />;
  if (mouth === 'mouth-02') return <path d="M162 262 H202" stroke={color} strokeWidth="4" strokeLinecap="round" />;
  if (mouth === 'mouth-03') return <path d="M160 266 C174 260 190 260 204 266" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />;
  if (mouth === 'mouth-05') return <path d="M154 260 C168 282 196 282 210 260 C194 268 170 268 154 260Z" fill="#450a0a" stroke={color} strokeWidth="2" />;
  if (mouth === 'mouth-06' || feral) {
    return (
      <g>
        <path d="M150 258 C166 284 198 284 214 258 C194 272 170 272 150 258Z" fill="#451a03" stroke={color} strokeWidth="2" />
        <path d="M166 266 L172 280 L178 266 M190 266 L196 280 L202 266" stroke="#ffffff" strokeWidth="2" fill="none" />
      </g>
    );
  }

  return <path d="M156 260 C166 268 194 268 204 260" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />;
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

  if (accessory === 'accessory-01') {
    return <path d="M132 198 H228" stroke="#020617" strokeWidth="10" strokeLinecap="round" opacity="0.84" />;
  }
  if (accessory === 'accessory-02') {
    return <path d="M130 222 C154 236 206 236 230 222 L222 250 C198 264 162 264 138 250Z" fill="#020617" opacity="0.72" stroke={accent} strokeWidth="2" />;
  }
  if (accessory === 'accessory-03') return <path d="M208 172 L190 224" stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" opacity="0.7" />;
  if (accessory === 'accessory-04') return <path d="M276 108 L248 172 H274 L236 252" fill="none" stroke={glow} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.82" />;
  if (accessory === 'accessory-05') return <circle cx="238" cy="292" r="10" fill={accent} stroke="#fef3c7" strokeWidth="3" />;
  if (accessory === 'accessory-06') return null;
  if (accessory === 'accessory-07') return <circle cx="282" cy="174" r="20" fill={glow} opacity="0.74" stroke="#ffffff" strokeOpacity="0.62" strokeWidth="2" />;
  if (accessory === 'accessory-08') return <circle cx="180" cy="110" r="54" fill="none" stroke={accent} strokeWidth="4" opacity="0.48" />;
  if (accessory === 'accessory-09') return <path d="M264 304 L308 248" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />;
  if (accessory === 'accessory-10') return <path d="M244 292 L282 334" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />;
  if (accessory === 'accessory-11') return <path d="M82 250 L116 406" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />;
  if (accessory === 'accessory-12') return <path d="M280 240 V394 M260 262 L280 240 L300 262" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  if (accessory === 'accessory-13') return <circle cx="88" cy="328" r="18" fill={accent} opacity="0.82" stroke="#fef3c7" strokeWidth="3" />;
  if (accessory === 'accessory-14') return <rect x="252" y="312" width="38" height="26" rx="8" fill="#0f172a" stroke={accent} strokeWidth="3" />;
  if (accessory === 'accessory-15') return <path d="M118 198 C118 166 140 146 180 146 C220 146 242 166 242 198" fill="none" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />;
  if (accessory === 'accessory-16') return <path d="M224 326 L246 338 L224 350 L202 338Z" fill={accent} opacity="0.84" />;

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
  if (face === 'face-02') return 'M126 196 C126 148 148 124 180 124 C212 124 234 148 234 196 C234 250 212 284 180 284 C148 284 126 250 126 196Z';
  if (face === 'face-03') return 'M124 184 C124 142 150 122 180 122 C210 122 236 142 236 184 L228 246 C222 272 204 286 180 286 C156 286 138 272 132 246Z';
  if (face === 'face-04') return 'M132 190 C132 144 152 122 180 122 C208 122 228 144 228 190 C228 238 204 292 180 292 C156 292 132 238 132 190Z';
  if (face === 'face-05') return 'M118 186 C118 142 148 118 180 118 C212 118 242 142 242 186 L232 246 C224 276 204 292 180 292 C156 292 136 276 128 246Z';
  if (face === 'face-06') return 'M124 190 C124 144 150 120 180 120 C210 120 236 144 236 190 C236 246 212 284 180 284 C148 284 124 246 124 190Z';
  if (face === 'face-07') return 'M124 184 C132 138 154 118 180 118 C206 118 228 138 236 184 L222 252 L180 292 L138 252Z';
  if (face === 'face-08') return 'M128 188 C128 142 152 118 180 118 C208 118 232 142 232 188 C232 238 208 286 180 286 C152 286 128 238 128 188Z';
  if (face === 'face-09') return 'M122 180 C122 138 150 116 180 116 C210 116 238 138 238 180 L230 250 C222 274 204 288 180 288 C156 288 138 274 130 250Z';
  if (face === 'face-10') return 'M126 190 C126 144 150 120 180 120 C210 120 234 144 234 190 C234 246 210 286 180 286 C150 286 126 246 126 190Z';

  return 'M126 188 C126 142 150 120 180 120 C210 120 234 142 234 188 C234 240 212 286 180 286 C148 286 126 240 126 188Z';
}

function getBodyShape(body: string) {
  if (body === 'body-03') return { leftShoulder: 92, rightShoulder: 268, leftWaist: 112, rightWaist: 248 };
  if (body === 'body-04') return { leftShoulder: 122, rightShoulder: 238, leftWaist: 138, rightWaist: 222 };
  if (body === 'body-05') return { leftShoulder: 96, rightShoulder: 264, leftWaist: 116, rightWaist: 244 };
  if (body === 'body-01') return { leftShoulder: 112, rightShoulder: 248, leftWaist: 126, rightWaist: 234 };
  return { leftShoulder: 102, rightShoulder: 258, leftWaist: 120, rightWaist: 240 };
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
