'use client';

import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
import { cn } from '@/lib/utils';

type AvatarRendererProps = {
  config?: AvatarConfig | null;
  name?: string;
  className?: string;
};

const skinColors: Record<string, string> = {
  'skin-01': '#f3c7a4',
  'skin-02': '#c98247',
  'skin-03': '#a96535',
  'skin-04': '#704328',
  'skin-05': '#3c2418',
  'skin-06': '#38b764',
  'skin-07': '#8b5cf6',
  'skin-08': '#38bdf8',
  'skin-09': '#94a3b8',
};

const backgroundColors: Record<string, [string, string, string]> = {
  'bg-01': ['#111827', '#4f46e5', '#0f172a'],
  'bg-02': ['#450a0a', '#dc2626', '#f97316'],
  'bg-03': ['#082f49', '#38bdf8', '#e0f2fe'],
  'bg-04': ['#1e1b4b', '#7c3aed', '#22d3ee'],
  'bg-05': ['#020617', '#1e293b', '#475569'],
  'bg-06': ['#052e16', '#16a34a', '#bef264'],
  'bg-07': ['#3f0712', '#be123c', '#f8fafc'],
  'bg-08': ['#020617', '#312e81', '#f59e0b'],
  'bg-09': ['#020617', '#111827', '#64748b'],
  'bg-10': ['#064e3b', '#16a34a', '#facc15'],
  'bg-11': ['#1c120b', '#6b3a16', '#facc15'],
  'bg-12': ['#042f2e', '#0891b2', '#a5f3fc'],
  'bg-13': ['#020617', '#164e63', '#22d3ee'],
  'bg-14': ['#111827', '#7f1d1d', '#2563eb'],
};

const frameColors: Record<string, { main: string; glow: string; dark: string }> = {
  'frame-common': { main: '#e5e7eb', glow: '#6366f1', dark: '#111827' },
  'frame-rare': { main: '#60a5fa', glow: '#38bdf8', dark: '#172554' },
  'frame-epic': { main: '#a78bfa', glow: '#8b5cf6', dark: '#2e1065' },
  'frame-legendary': { main: '#facc15', glow: '#f59e0b', dark: '#422006' },
  'frame-horror': { main: '#ef4444', glow: '#dc2626', dark: '#450a0a' },
  'frame-speed': { main: '#facc15', glow: '#f97316', dark: '#7f1d1d' },
  'frame-tech': { main: '#22d3ee', glow: '#06b6d4', dark: '#083344' },
  'frame-ocean': { main: '#67e8f9', glow: '#0e7490', dark: '#042f2e' },
};

export default function AvatarRenderer({ config, name, className }: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config || DEFAULT_AVATAR_CONFIG);
  const uid = `avatar-${avatar.skin}-${avatar.face}-${avatar.hair}-${avatar.frame}-${avatar.clothes}`.replace(/[^a-z0-9-]/gi, '');
  const skin = skinColors[avatar.skin] || skinColors['skin-02'];
  const bg = backgroundColors[avatar.background] || backgroundColors['bg-01'];
  const frame = frameColors[avatar.frame] || frameColors['frame-common'];

  return (
    <svg
      viewBox="0 0 300 420"
      role="img"
      aria-label="Avatar do personagem"
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={bg[0]} />
          <stop offset="55%" stopColor={bg[1]} />
          <stop offset="100%" stopColor={bg[2]} />
        </linearGradient>

        <radialGradient id={`${uid}-light`} cx="45%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.58" />
        </radialGradient>

        <linearGradient id={`${uid}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(skin, 28)} />
          <stop offset="52%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, 30)} />
        </linearGradient>

        <linearGradient id={`${uid}-shirt`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(avatar.clothesColor, 18)} />
          <stop offset="55%" stopColor={avatar.clothesColor} />
          <stop offset="100%" stopColor={shade(avatar.clothesColor, 38)} />
        </linearGradient>

        <linearGradient id={`${uid}-hair`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(avatar.hairColor, 14)} />
          <stop offset="100%" stopColor={shade(avatar.hairColor, 28)} />
        </linearGradient>

        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#020617" floodOpacity="0.42" />
        </filter>

        <filter id={`${uid}-soft-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#020617" floodOpacity="0.26" />
        </filter>

        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={frame.glow} floodOpacity="0.65" />
        </filter>

        <clipPath id={`${uid}-card-clip`}>
          <rect x="24" y="24" width="252" height="372" rx="30" />
        </clipPath>

        <clipPath id={`${uid}-portrait-clip`}>
          <rect x="42" y="42" width="216" height="300" rx="24" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="300" height="420" rx="36" fill="#020617" />
      <rect x="8" y="8" width="284" height="404" rx="34" fill="#f8fafc" opacity="0.96" />
      <rect x="18" y="18" width="264" height="384" rx="32" fill="#020617" />
      <rect x="24" y="24" width="252" height="372" rx="30" fill={`url(#${uid}-bg)`} />

      <g clipPath={`url(#${uid}-card-clip)`}>
        <rect x="24" y="24" width="252" height="372" rx="30" fill={`url(#${uid}-light)`} />
        {renderScene(avatar.background)}
        <circle cx="74" cy="75" r="34" fill="#ffffff" opacity="0.13" />
        <circle cx="236" cy="284" r="50" fill="#ffffff" opacity="0.13" />
        <path d="M36 126 C92 52 210 48 268 98" stroke="#ffffff" strokeWidth="6" opacity="0.16" fill="none" />
        <path d="M54 284 C112 222 196 220 260 272" stroke="#ffffff" strokeWidth="7" opacity="0.17" fill="none" />
      </g>

      <rect
        x="36"
        y="36"
        width="228"
        height="316"
        rx="28"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        opacity="0.85"
      />
      <rect
        x="46"
        y="46"
        width="208"
        height="296"
        rx="22"
        fill="none"
        stroke={frame.main}
        strokeWidth="6"
        filter={`url(#${uid}-glow)`}
      />
      <rect
        x="56"
        y="56"
        width="188"
        height="276"
        rx="18"
        fill="none"
        stroke={frame.dark}
        strokeWidth="4"
        opacity="0.85"
      />

      <g clipPath={`url(#${uid}-portrait-clip)`} filter={`url(#${uid}-shadow)`}>
        {renderCape(avatar.outerwear, avatar.clothesColor, avatar.frame)}
        {renderBody(avatar.body, avatar.clothes, avatar.clothesColor, avatar.outerwear, uid)}
        {renderNeck(uid, skin)}
        {renderHead(avatar.face, uid)}
        {renderEars(uid)}
        {renderHairBack(avatar.hair, uid)}
        {renderFaceShadow(uid)}
        {renderFacialHair(avatar.facialHair, avatar.hairColor)}
        {renderMouth(avatar.mouth)}
        {renderNose(avatar.nose, skin)}
        {renderEyes(avatar.eyes)}
        {renderEyebrows(avatar.eyebrows, avatar.hairColor)}
        {renderHairFront(avatar.hair, uid)}
        {renderHeadwear(avatar.headwear, uid, frame.main)}
        {renderAccessory(avatar.accessory, frame.main)}
      </g>

      {renderFrame(avatar.frame, frame)}
      {renderNamePlate(name || 'PERSONAGEM', frame)}
    </svg>
  );
}

function renderScene(background: string) {
  if (background === 'bg-02') {
    return (
      <g opacity="0.58">
        <path d="M30 396 C62 302 38 246 86 176 C80 262 138 286 106 398 Z" fill="#fb923c" />
        <path d="M204 404 C246 318 208 252 246 184 C266 260 300 306 258 404 Z" fill="#facc15" />
      </g>
    );
  }

  if (background === 'bg-04') {
    return (
      <g stroke="#fef08a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" fill="none">
        <path d="M54 82 L88 142 L66 142 L116 228" />
        <path d="M244 72 L202 150 L232 146 L178 252" />
      </g>
    );
  }

  if (background === 'bg-05') {
    return (
      <g fill="#020617" opacity="0.76">
        <rect x="26" y="174" width="34" height="178" />
        <rect x="74" y="132" width="50" height="220" />
        <rect x="172" y="152" width="44" height="200" />
        <rect x="234" y="110" width="34" height="242" />
      </g>
    );
  }

  if (background === 'bg-08') {
    return (
      <g opacity="0.66">
        <circle cx="68" cy="68" r="2.5" fill="#fff" />
        <circle cx="120" cy="52" r="4" fill="#fff" />
        <circle cx="238" cy="98" r="2.5" fill="#fff" />
        <circle cx="222" cy="270" r="44" fill="#f59e0b" opacity="0.35" />
        <path d="M34 292 C108 234 200 230 270 270" stroke="#a78bfa" strokeWidth="6" fill="none" />
      </g>
    );
  }

  if (background === 'bg-10') {
    return (
      <g opacity="0.42">
        <rect x="24" y="284" width="252" height="112" fill="#14532d" />
        <path d="M30 320 H270 M70 284 V396 M230 284 V396" stroke="#f8fafc" strokeWidth="4" />
        <circle cx="150" cy="320" r="32" stroke="#f8fafc" strokeWidth="3" fill="none" />
      </g>
    );
  }

  if (background === 'bg-11') {
    return (
      <g opacity="0.48">
        <rect x="42" y="86" width="216" height="190" fill="#3f2414" />
        {Array.from({ length: 8 }).map((_, index) => (
          <rect key={index} x={54 + index * 25} y="100" width="16" height="150" fill={index % 2 ? '#7c2d12' : '#1e3a8a'} />
        ))}
      </g>
    );
  }

  if (background === 'bg-13') {
    return (
      <g opacity="0.58" stroke="#22d3ee" strokeWidth="3.5" fill="none">
        <path d="M30 116 H104 V68 H186 V146 H270" />
        <path d="M38 310 H122 V260 H204 V318 H270" />
        <circle cx="104" cy="68" r="6" fill="#22d3ee" />
        <circle cx="204" cy="260" r="6" fill="#22d3ee" />
      </g>
    );
  }

  return null;
}

function renderCape(outerwear: string, color: string, frame: string) {
  if (outerwear === 'outerwear-cape') {
    const cape = frame === 'frame-speed' ? '#b91c1c' : '#020617';
    return <path d="M58 386 C54 270 88 216 132 204 L150 244 L168 204 C212 216 246 270 242 386 Z" fill={cape} opacity="0.92" />;
  }

  if (outerwear === 'outerwear-robe') {
    return <path d="M50 390 C64 282 96 218 150 204 C204 218 236 282 250 390 Z" fill="#020617" opacity="0.88" />;
  }

  if (outerwear === 'outerwear-jacket') {
    return (
      <g>
        <path d="M64 388 L102 240 L150 388 Z" fill={shade(color, 42)} opacity="0.94" />
        <path d="M236 388 L198 240 L150 388 Z" fill={shade(color, 42)} opacity="0.94" />
      </g>
    );
  }

  return null;
}

function renderBody(body: string, clothes: string, color: string, outerwear: string, uid: string) {
  const width = body === 'body-03' ? 190 : body === 'body-04' ? 136 : body === 'body-05' ? 162 : 164;
  const left = 150 - width / 2;
  const right = 150 + width / 2;
  const shoulderStroke = body === 'body-03' ? 36 : body === 'body-04' ? 22 : 28;

  return (
    <g>
      <path d={`M${left} 390 C${left + 10} 292 104 238 150 238 C196 238 ${right - 10} 292 ${right} 390 Z`} fill={`url(#${uid}-shirt)`} />
      <path
        d="M74 306 C86 260 112 238 150 238 C188 238 214 260 226 306"
        stroke={shade(color, 30)}
        strokeWidth={shoulderStroke}
        strokeLinecap="round"
        fill="none"
        opacity="0.76"
      />

      {renderClothesDetails(clothes, color)}

      {outerwear === 'outerwear-armor' && (
        <g>
          <path d="M94 252 H206 L190 360 H110 Z" fill="#1e293b" stroke="#cbd5e1" strokeWidth="6" strokeLinejoin="round" />
          <path d="M112 272 H188 M116 306 H184 M122 338 H178" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
          <circle cx="150" cy="290" r="18" fill="#e2e8f0" />
        </g>
      )}

      {outerwear === 'outerwear-ruff' && (
        <path
          d="M80 242 L98 218 L116 244 L134 218 L152 244 L170 218 L188 244 L206 220 L198 268 H90 Z"
          fill="#f8fafc"
          stroke="#dc2626"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function renderClothesDetails(clothes: string, color: string) {
  if (clothes === 'clothes-02') {
    return (
      <g>
        <path d="M118 248 H182 L174 390 H126 Z" fill="#f8fafc" opacity="0.88" />
        <circle cx="150" cy="304" r="20" fill="#f8fafc" opacity="0.9" />
      </g>
    );
  }

  if (clothes === 'clothes-03') {
    return (
      <g>
        <path d="M100 254 H200 L188 360 H112 Z" fill="#334155" opacity="0.9" />
        <circle cx="126" cy="286" r="11" fill="#cbd5e1" />
        <circle cx="174" cy="286" r="11" fill="#cbd5e1" />
      </g>
    );
  }

  if (clothes === 'clothes-07') {
    return <path d="M154 246 L126 312 H150 L122 388 L194 290 H164 L184 246 Z" fill="#facc15" />;
  }

  if (clothes === 'clothes-08') {
    return (
      <g>
        <path d="M106 254 L150 292 L194 254 L178 390 H122 Z" fill="#111827" />
        <path d="M116 266 Q150 296 184 266 Q166 280 150 254 Q134 280 116 266 Z" fill="#64748b" />
      </g>
    );
  }

  if (clothes === 'clothes-09') {
    return (
      <g>
        <path d="M90 390 L122 250 L150 390 Z M210 390 L178 250 L150 390 Z" fill={color} />
        <circle cx="150" cy="302" r="9" fill="#dc2626" />
        <circle cx="150" cy="338" r="9" fill="#dc2626" />
      </g>
    );
  }

  if (clothes === 'clothes-10') {
    return (
      <g opacity="0.95">
        <path d="M112 256 L136 294 L118 322 L150 390 L188 256 L164 314 L182 338 L132 390 Z" fill="#4c1d95" />
        <path d="M106 300 L122 292 M178 306 L196 294 M132 340 L150 330" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-12') {
    return (
      <g>
        <path d="M102 252 H198 L184 390 H116 Z" fill="#020617" opacity="0.88" />
        <path d="M106 282 H194" stroke="#ef4444" strokeWidth="8" />
      </g>
    );
  }

  if (clothes === 'clothes-14') {
    return (
      <g>
        <circle cx="116" cy="286" r="20" fill="#111827" stroke="#22d3ee" strokeWidth="5" />
        <circle cx="184" cy="286" r="20" fill="#111827" stroke="#22d3ee" strokeWidth="5" />
        <path d="M136 286 H164" stroke="#22d3ee" strokeWidth="5" />
      </g>
    );
  }

  if (clothes === 'clothes-15') {
    return (
      <g>
        <path d="M108 252 H192 L180 390 H120 Z" fill="#111827" opacity="0.92" />
        <path d="M130 252 L150 292 L170 252" fill="none" stroke="#facc15" strokeWidth="5" />
      </g>
    );
  }

  if (clothes === 'clothes-16') {
    return (
      <g>
        <path d="M110 250 H190 L178 390 H122 Z" fill="#0f766e" />
        <path d="M124 264 L150 300 L176 264" fill="none" stroke="#facc15" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-17') {
    return (
      <g>
        <path d="M104 250 H196 L188 390 H112 Z" fill="#334155" />
        <path d="M124 270 H176 M116 310 H184 M126 350 H174" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-18') {
    return (
      <g>
        <path d="M102 252 H198 L184 390 H116 Z" fill="#0f172a" />
        <path d="M118 284 H182 M126 318 H174" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g opacity="0.72">
      <path d="M118 252 L150 282 L182 252" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M150 284 V390" stroke="#ffffff" strokeWidth="4" opacity="0.35" />
    </g>
  );
}

function renderNeck(uid: string, skin: string) {
  return (
    <g>
      <path d="M126 204 H174 L180 250 C166 264 134 264 120 250 Z" fill={`url(#${uid}-skin)`} />
      <path d="M126 208 H174 V226 C160 236 140 236 126 226 Z" fill={shade(skin, 20)} opacity="0.42" />
    </g>
  );
}

function renderHead(face: string, uid: string) {
  const shapes: Record<string, string> = {
    'face-01': 'M92 116 C92 72 118 48 150 48 C182 48 208 72 208 116 V152 C208 192 184 220 150 220 C116 220 92 192 92 152 Z',
    'face-02': 'M88 126 C88 76 114 50 150 50 C186 50 212 76 212 126 C212 178 186 220 150 220 C114 220 88 178 88 126 Z',
    'face-03': 'M94 72 H206 V158 C206 198 182 222 150 222 C118 222 94 198 94 158 Z',
    'face-04': 'M104 92 C108 58 126 46 150 46 C174 46 192 58 196 92 L206 154 C206 194 180 224 150 224 C120 224 94 194 94 154 Z',
    'face-05': 'M86 106 C86 64 114 46 150 46 C186 46 214 64 214 106 V152 C214 198 188 226 150 226 C112 226 86 198 86 152 Z',
    'face-06': 'M96 78 H204 L216 150 C212 198 186 226 150 226 C114 226 88 198 84 150 Z',
    'face-07': 'M94 96 L118 52 H182 L206 96 L202 166 L150 226 L98 166 Z',
    'face-08': 'M96 92 C104 60 124 44 150 44 C176 44 196 60 204 92 L210 152 C210 198 184 226 150 226 C116 226 90 198 90 152 Z',
    'face-09': 'M96 66 H204 L218 122 L202 208 H98 L82 122 Z',
    'face-10': 'M92 100 C92 62 118 44 150 44 C182 44 208 62 208 100 L216 150 C208 198 184 224 150 224 C116 224 92 198 84 150 Z',
  };

  return <path d={shapes[face] || shapes['face-01']} fill={`url(#${uid}-skin)`} filter={`url(#${uid}-soft-shadow)`} />;
}

function renderEars(uid: string) {
  return (
    <g>
      <ellipse cx="86" cy="138" rx="15" ry="23" fill={`url(#${uid}-skin)`} />
      <ellipse cx="214" cy="138" rx="15" ry="23" fill={`url(#${uid}-skin)`} />
    </g>
  );
}

function renderFaceShadow(uid: string) {
  return (
    <g opacity="0.15">
      <path d="M150 52 C186 62 204 90 202 144 C200 188 178 216 150 222 C172 198 184 170 184 128 C184 88 172 64 150 52 Z" fill="#020617" />
    </g>
  );
}

function renderHairBack(hair: string, uid: string) {
  if (hair === 'hair-04') {
    return <path d="M80 102 C78 54 112 30 150 32 C188 30 222 54 220 102 L212 226 H88 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-09') {
    return <path d="M78 110 C76 54 112 26 150 26 C188 26 224 54 222 110 L214 246 H86 Z" fill="#020617" />;
  }

  if (hair === 'hair-11') {
    return <path d="M82 104 C82 46 116 28 150 28 C184 28 218 46 218 104 L206 226 H94 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-12') {
    return (
      <g fill={`url(#${uid}-hair)`}>
        <path d="M90 92 C90 52 118 34 150 34 C182 34 210 52 210 92 H90 Z" />
        <path d="M84 110 C64 150 66 204 86 246" stroke={`url(#${uid}-hair)`} strokeWidth="14" strokeLinecap="round" />
        <path d="M216 110 C236 150 234 204 214 246" stroke={`url(#${uid}-hair)`} strokeWidth="14" strokeLinecap="round" />
      </g>
    );
  }

  return null;
}

function renderHairFront(hair: string, uid: string) {
  if (hair === 'hair-08') return null;

  if (hair === 'hair-01') {
    return <path d="M90 102 C100 52 128 42 150 42 C176 42 202 54 210 104 C180 86 130 84 90 102 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-02') {
    return (
      <path
        d="M84 102 L104 48 L122 84 L142 38 L156 84 L180 42 L194 92 L216 76 L208 116 C174 92 124 88 84 102 Z"
        fill={`url(#${uid}-hair)`}
      />
    );
  }

  if (hair === 'hair-03') {
    return (
      <g fill={`url(#${uid}-hair)`}>
        <circle cx="100" cy="88" r="24" />
        <circle cx="126" cy="62" r="27" />
        <circle cx="158" cy="58" r="28" />
        <circle cx="190" cy="82" r="25" />
        <circle cx="210" cy="112" r="20" />
        <circle cx="86" cy="116" r="20" />
      </g>
    );
  }

  if (hair === 'hair-04') {
    return <path d="M86 108 C94 54 122 34 150 34 C178 34 206 54 214 108 C178 84 126 84 86 108 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-05') {
    return <path d="M86 112 C96 62 126 52 148 54 C176 56 198 46 216 32 C212 72 200 100 180 114 C146 96 116 96 86 112 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-06') {
    return <path d="M128 92 L150 26 L172 92 C158 84 142 84 128 92 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-07') {
    return <path d="M84 108 C98 60 136 42 188 62 C206 72 214 88 218 112 C174 92 132 88 84 108 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-09') {
    return (
      <g>
        <path d="M84 116 C84 62 112 34 150 34 C188 34 216 62 216 116 C192 94 108 94 84 116 Z" fill="#020617" />
        <path d="M104 116 C116 86 134 72 150 72 C166 72 184 86 196 116 C178 104 122 104 104 116 Z" fill="#1f2937" />
      </g>
    );
  }

  if (hair === 'hair-10') {
    return <path d="M76 112 L106 52 L130 86 L150 34 L172 86 L202 52 L224 112 C184 88 116 88 76 112 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-11') {
    return <path d="M82 110 C86 54 116 34 150 34 C184 34 214 54 218 110 C188 88 164 86 150 112 C136 86 112 88 82 110 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-12') {
    return <path d="M90 100 C94 58 122 38 150 38 C178 38 206 58 210 100 C176 84 124 84 90 100 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-13') {
    return <path d="M78 106 L102 62 L118 84 L136 48 L152 86 L176 48 L186 84 L214 60 L222 112 C180 88 126 86 78 106 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-14') {
    return <path d="M82 108 C90 66 126 40 172 52 C204 60 218 84 220 112 C178 92 122 94 82 108 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-15') {
    return <path d="M88 104 C100 62 128 48 150 48 C176 48 200 62 212 104 C178 90 128 90 88 104 Z" fill={`url(#${uid}-hair)`} />;
  }

  return null;
}

function renderEyes(eyes: string) {
  if (eyes === 'eyes-06') {
    return (
      <g>
        <path d="M104 128 H196 L186 156 H114 Z" fill="#020617" />
        <ellipse cx="126" cy="142" rx="14" ry="8" fill="#f8fafc" />
        <ellipse cx="174" cy="142" rx="14" ry="8" fill="#f8fafc" />
      </g>
    );
  }

  if (eyes === 'eyes-08' || eyes === 'eyes-09' || eyes === 'eyes-12') {
    const color = eyes === 'eyes-12' ? '#22d3ee' : '#ef4444';
    return (
      <g>
        <path d="M104 130 H196 L188 154 H112 Z" fill="#020617" opacity="0.82" />
        <rect x="116" y="136" width="24" height="8" rx="4" fill={color} />
        <rect x="160" y="136" width="24" height="8" rx="4" fill={color} />
      </g>
    );
  }

  if (eyes === 'eyes-10') {
    return (
      <g>
        <circle cx="124" cy="140" r="17" fill="none" stroke="#111827" strokeWidth="5" />
        <circle cx="176" cy="140" r="17" fill="none" stroke="#111827" strokeWidth="5" />
        <path d="M141 140 H159" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <circle cx="124" cy="140" r="5" fill="#111827" />
        <circle cx="176" cy="140" r="5" fill="#111827" />
      </g>
    );
  }

  if (eyes === 'eyes-07') {
    return (
      <g>
        <path d="M106 136 Q124 122 142 136" stroke="#111827" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M158 136 Q176 122 194 136" stroke="#111827" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="124" cy="146" r="5" fill="#111827" />
        <circle cx="176" cy="146" r="5" fill="#111827" />
      </g>
    );
  }

  if (eyes === 'eyes-05') {
    return (
      <g>
        <ellipse cx="124" cy="142" rx="12" ry="18" fill="#ffffff" />
        <ellipse cx="176" cy="142" rx="12" ry="18" fill="#ffffff" />
        <circle cx="124" cy="144" r="6" fill="#111827" />
        <circle cx="176" cy="144" r="6" fill="#111827" />
        <circle cx="120" cy="136" r="3" fill="#ffffff" />
        <circle cx="172" cy="136" r="3" fill="#ffffff" />
      </g>
    );
  }

  const angry = eyes === 'eyes-03';
  const happy = eyes === 'eyes-02';
  const sleepy = eyes === 'eyes-04';

  return (
    <g>
      {sleepy ? (
        <>
          <path d="M112 142 Q124 148 136 142" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M164 142 Q176 148 188 142" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : happy ? (
        <>
          <path d="M112 144 Q124 132 136 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M164 144 Q176 132 188 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="124" cy="142" rx="10" ry="11" fill="#ffffff" />
          <ellipse cx="176" cy="142" rx="10" ry="11" fill="#ffffff" />
          <circle cx={angry ? 128 : 124} cy="143" r="5" fill="#111827" />
          <circle cx={angry ? 172 : 176} cy="143" r="5" fill="#111827" />
        </>
      )}
    </g>
  );
}

function renderEyebrows(eyebrows: string, color: string) {
  if (eyebrows === 'brows-06') return null;

  if (eyebrows === 'brows-02') {
    return (
      <g stroke={shade(color, 25)} strokeWidth="6" strokeLinecap="round">
        <path d="M108 124 Q124 114 140 122" />
        <path d="M160 122 Q176 114 192 124" />
      </g>
    );
  }

  if (eyebrows === 'brows-03') {
    return (
      <g stroke={shade(color, 30)} strokeWidth="7" strokeLinecap="round">
        <path d="M106 122 L140 132" />
        <path d="M194 122 L160 132" />
      </g>
    );
  }

  if (eyebrows === 'brows-04') {
    return (
      <g stroke={shade(color, 30)} strokeWidth="7" strokeLinecap="round">
        <path d="M106 118 L142 130" />
        <path d="M194 118 L158 130" />
      </g>
    );
  }

  if (eyebrows === 'brows-05') {
    return (
      <g stroke={shade(color, 35)} strokeWidth="8" strokeLinecap="round">
        <path d="M108 124 H140" />
        <path d="M160 124 H192" />
      </g>
    );
  }

  return (
    <g stroke={shade(color, 24)} strokeWidth="5" strokeLinecap="round">
      <path d="M110 124 H138" />
      <path d="M162 124 H190" />
    </g>
  );
}

function renderNose(nose: string, skin: string) {
  if (nose === 'nose-06') {
    return <path d="M150 150 L164 178 H136 Z" fill="#64748b" opacity="0.75" />;
  }

  if (nose === 'nose-02') {
    return <path d="M150 152 Q144 168 154 170" stroke={shade(skin, 35)} strokeWidth="4" strokeLinecap="round" fill="none" />;
  }

  if (nose === 'nose-03') {
    return <path d="M152 148 L140 178 Q150 184 162 178" stroke={shade(skin, 42)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }

  if (nose === 'nose-04') {
    return <path d="M144 150 Q134 178 150 182 Q166 178 156 150" stroke={shade(skin, 38)} strokeWidth="5" strokeLinecap="round" fill="none" />;
  }

  if (nose === 'nose-05') {
    return <path d="M152 150 L132 178 L158 176" stroke={shade(skin, 38)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }

  return <path d="M150 150 Q142 172 154 176" stroke={shade(skin, 35)} strokeWidth="5" strokeLinecap="round" fill="none" />;
}

function renderMouth(mouth: string) {
  if (mouth === 'mouth-01') {
    return <path d="M124 184 Q150 204 176 184" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-02') {
    return <path d="M128 190 H172" stroke="#3f1f16" strokeWidth="5" strokeLinecap="round" />;
  }

  if (mouth === 'mouth-03') {
    return <path d="M126 196 Q150 180 174 196" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-04') {
    return <path d="M126 186 Q150 198 174 186" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-05') {
    return (
      <g>
        <path d="M120 186 Q150 214 180 186" fill="#111827" />
        <path d="M128 188 L136 202 L144 188 L152 204 L160 188 L168 202 L176 188" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  if (mouth === 'mouth-06') {
    return <path d="M118 184 Q150 212 182 184" stroke="#3f1f16" strokeWidth="7" strokeLinecap="round" fill="none" />;
  }

  return null;
}

function renderFacialHair(facialHair: string, color: string) {
  if (facialHair === 'facial-none') return null;

  if (facialHair === 'facial-01') {
    return <path d="M118 184 Q150 218 182 184 Q174 220 150 226 Q126 220 118 184 Z" fill={shade(color, 10)} opacity="0.82" />;
  }

  if (facialHair === 'facial-02') {
    return (
      <g fill={shade(color, 12)}>
        <path d="M134 184 Q150 198 166 184 Q164 220 150 226 Q136 220 134 184 Z" />
        <path d="M130 176 Q150 170 170 176 Q150 184 130 176 Z" />
      </g>
    );
  }

  if (facialHair === 'facial-03') {
    return <path d="M126 178 Q144 170 150 180 Q156 170 174 178 Q158 190 150 182 Q142 190 126 178 Z" fill={shade(color, 12)} />;
  }

  if (facialHair === 'facial-04' || facialHair === 'facial-05') {
    return (
      <g fill={shade(color, 10)}>
        <path d="M108 170 Q150 202 192 170 Q188 224 150 232 Q112 224 108 170 Z" opacity="0.86" />
        {facialHair === 'facial-05' && <path d="M124 176 Q150 164 176 176 Q150 188 124 176 Z" fill={tint(color, 10)} />}
      </g>
    );
  }

  return null;
}

function renderHeadwear(headwear: string, uid: string, accent: string) {
  if (headwear === 'headwear-01') {
    return (
      <g>
        <circle cx="124" cy="88" r="15" fill="none" stroke="#111827" strokeWidth="5" />
        <circle cx="176" cy="88" r="15" fill="none" stroke="#111827" strokeWidth="5" />
        <path d="M139 88 H161" stroke="#111827" strokeWidth="5" />
      </g>
    );
  }

  if (headwear === 'headwear-02') {
    return (
      <path
        d="M100 72 L120 42 L142 70 L150 34 L158 70 L180 42 L200 72 L194 96 H106 Z"
        fill="#facc15"
        stroke="#92400e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    );
  }

  if (headwear === 'headwear-03') {
    return (
      <path
        d="M82 114 L100 54 L130 86 L150 50 L170 86 L200 54 L218 114 C186 94 114 94 82 114 Z"
        fill="#020617"
      />
    );
  }

  if (headwear === 'headwear-04') {
    return <path d="M146 74 L160 92 H150 L160 118 L136 88 H148 Z" fill="#facc15" stroke="#111827" strokeWidth="2" />;
  }

  if (headwear === 'headwear-05') {
    return (
      <g>
        <path d="M88 112 C92 64 116 40 150 40 C184 40 208 64 212 112 H88 Z" fill="#334155" stroke="#cbd5e1" strokeWidth="4" />
        <path d="M112 108 H188" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (headwear === 'headwear-06') {
    return (
      <g>
        <path d="M92 106 C96 66 120 48 150 48 C180 48 204 66 208 106 H92 Z" fill={`url(#${uid}-hair)`} />
        <path d="M102 100 H224 C218 120 186 126 154 120 Z" fill="#111827" />
      </g>
    );
  }

  return null;
}

function renderAccessory(accessory: string, accent: string) {
  if (accessory === 'accessory-01') {
    return (
      <g>
        <circle cx="124" cy="142" r="18" fill="none" stroke="#020617" strokeWidth="5" />
        <circle cx="176" cy="142" r="18" fill="none" stroke="#020617" strokeWidth="5" />
        <path d="M142 142 H158" stroke="#020617" strokeWidth="5" />
      </g>
    );
  }

  if (accessory === 'accessory-02') {
    return <path d="M96 126 H204 L194 166 H106 Z" fill="#020617" opacity="0.8" />;
  }

  if (accessory === 'accessory-03') {
    return <path d="M178 116 L164 152 M190 142 L166 170" stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-04') {
    return <path d="M232 86 L202 146 H226 L178 236" stroke="#facc15" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }

  if (accessory === 'accessory-05') {
    return (
      <path
        d="M104 76 L124 46 L146 76 L150 40 L154 76 L176 46 L196 76 L190 98 H110 Z"
        fill="#facc15"
        stroke="#92400e"
        strokeWidth="4"
      />
    );
  }

  if (accessory === 'accessory-06') {
    return (
      <g fill="#020617">
        <path d="M96 62 L76 24 L126 52 Z" />
        <path d="M204 62 L224 24 L174 52 Z" />
      </g>
    );
  }

  if (accessory === 'accessory-07') {
    return (
      <g>
        <circle cx="226" cy="210" r="26" fill="#facc15" stroke="#b45309" strokeWidth="5" />
        <circle cx="216" cy="202" r="4" fill="#fff" opacity="0.8" />
        <path d="M216 236 C208 262 200 284 214 302" stroke="#facc15" strokeWidth="4" fill="none" />
      </g>
    );
  }

  if (accessory === 'accessory-08') {
    return (
      <g>
        <path d="M82 116 C88 56 116 30 150 30 C184 30 212 56 218 116" fill="#334155" stroke="#cbd5e1" strokeWidth="4" />
        <rect x="108" y="124" width="84" height="30" rx="10" fill="#020617" />
        <rect x="120" y="136" width="60" height="7" rx="4" fill="#22d3ee" />
      </g>
    );
  }

  if (accessory === 'accessory-09') {
    return <path d="M224 108 L258 52 M248 48 L264 64 M218 118 L238 138" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-10') {
    return (
      <g>
        <rect x="218" y="206" width="16" height="70" rx="8" fill="#111827" />
        <circle cx="226" cy="198" r="18" fill="#334155" stroke="#cbd5e1" strokeWidth="4" />
      </g>
    );
  }

  if (accessory === 'accessory-11') {
    return <path d="M218 94 L252 42 M246 44 L258 32 M238 58 L254 66" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-12') {
    return (
      <path
        d="M226 74 V242 M206 98 C206 78 226 78 226 98 C226 78 246 78 246 98"
        stroke="#facc15"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (accessory === 'accessory-13') {
    return (
      <g>
        <circle cx="228" cy="242" r="26" fill="#facc15" stroke="#92400e" strokeWidth="5" />
        <circle cx="220" cy="236" r="5" fill={accent} />
        <circle cx="232" cy="234" r="5" fill="#22d3ee" />
        <circle cx="238" cy="248" r="5" fill="#ef4444" />
      </g>
    );
  }

  if (accessory === 'accessory-14') {
    return (
      <g>
        <rect x="205" y="232" width="52" height="34" rx="8" fill="#111827" />
        <circle cx="232" cy="249" r="12" fill="#38bdf8" />
        <rect x="214" y="222" width="22" height="12" rx="4" fill="#334155" />
      </g>
    );
  }

  return null;
}

function renderFrame(frameId: string, frame: { main: string; glow: string; dark: string }) {
  if (frameId === 'frame-tech') {
    return (
      <g fill="none" stroke={frame.main} strokeWidth="4" opacity="0.9">
        <path d="M38 64 H76 M224 64 H262 M38 356 H76 M224 356 H262" />
        <path d="M64 38 V76 M236 38 V76 M64 344 V382 M236 344 V382" />
      </g>
    );
  }

  if (frameId === 'frame-speed') {
    return (
      <g stroke={frame.main} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.92">
        <path d="M44 88 L76 88 L58 124 H88" />
        <path d="M256 332 H224 L242 296 H212" />
      </g>
    );
  }

  if (frameId === 'frame-horror') {
    return (
      <g fill={frame.main} opacity="0.82">
        <path d="M40 50 C48 76 28 88 42 116 C58 88 48 72 62 50 Z" />
        <path d="M258 50 C250 76 270 88 256 116 C240 88 250 72 236 50 Z" />
      </g>
    );
  }

  return (
    <g fill="none" stroke={frame.main} strokeWidth="3.5" opacity="0.78">
      <rect x="32" y="32" width="236" height="356" rx="30" />
      <rect x="52" y="52" width="196" height="276" rx="17" opacity="0.55" />
    </g>
  );
}

function renderNamePlate(name: string, frame: { main: string; glow: string; dark: string }) {
  return (
    <g filter="url(#none)">
      <rect x="48" y="336" width="204" height="40" rx="13" fill="#020617" opacity="0.72" />
      <rect x="56" y="344" width="188" height="24" rx="8" fill={frame.dark} opacity="0.82" />
      <text
        x="150"
        y="362"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="16"
        fontWeight="900"
        fill="#ffffff"
      >
        {truncateName(name)}
      </text>
    </g>
  );
}

function truncateName(name: string) {
  const clean = String(name || 'PERSONAGEM').trim().toUpperCase();
  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function tint(hex: string, amount: number) {
  return mix(hex, '#ffffff', amount);
}

function shade(hex: string, amount: number) {
  return mix(hex, '#000000', amount);
}

function mix(hex: string, target: string, amount: number) {
  const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#888888';
  const safeTarget = /^#[0-9a-f]{6}$/i.test(target) ? target : '#000000';

  const value = safeHex.replace('#', '');
  const targetValue = safeTarget.replace('#', '');

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  const tr = parseInt(targetValue.slice(0, 2), 16);
  const tg = parseInt(targetValue.slice(2, 4), 16);
  const tb = parseInt(targetValue.slice(4, 6), 16);

  const ratio = Math.max(0, Math.min(100, amount)) / 100;

  const nr = Math.round(r + (tr - r) * ratio);
  const ng = Math.round(g + (tg - g) * ratio);
  const nb = Math.round(b + (tb - b) * ratio);

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}
