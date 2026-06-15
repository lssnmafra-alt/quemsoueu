'use client';

import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
import { cn } from '@/lib/utils';

type AvatarRendererProps = {
  config?: AvatarConfig | null;
  name?: string;
  className?: string;
};

const skinColors: Record<string, string> = {
  'skin-01': '#f2c7a2',
  'skin-02': '#c78245',
  'skin-03': '#a76635',
  'skin-04': '#70432b',
  'skin-05': '#3f261a',
  'skin-06': '#2fbf64',
  'skin-07': '#8b5cf6',
  'skin-08': '#38bdf8',
  'skin-09': '#94a3b8',
};

const backgrounds: Record<string, [string, string, string]> = {
  'bg-01': ['#080b22', '#4338ca', '#020617'],
  'bg-02': ['#240202', '#991b1b', '#fb923c'],
  'bg-03': ['#082f49', '#0ea5e9', '#e0f2fe'],
  'bg-04': ['#13072e', '#6d28d9', '#22d3ee'],
  'bg-05': ['#020617', '#1e293b', '#475569'],
  'bg-06': ['#052e16', '#15803d', '#bef264'],
  'bg-07': ['#2a0308', '#9f1239', '#fca5a5'],
  'bg-08': ['#020617', '#312e81', '#f59e0b'],
  'bg-09': ['#020617', '#111827', '#64748b'],
  'bg-10': ['#064e3b', '#16a34a', '#facc15'],
  'bg-11': ['#1c120b', '#6b3a16', '#facc15'],
  'bg-12': ['#042f2e', '#0891b2', '#a5f3fc'],
  'bg-13': ['#020617', '#164e63', '#22d3ee'],
  'bg-14': ['#111827', '#7f1d1d', '#2563eb'],
};

const frames: Record<string, { light: string; main: string; dark: string; glow: string }> = {
  'frame-common': { light: '#f8fafc', main: '#cbd5e1', dark: '#334155', glow: '#94a3b8' },
  'frame-rare': { light: '#dbeafe', main: '#60a5fa', dark: '#1e3a8a', glow: '#38bdf8' },
  'frame-epic': { light: '#ede9fe', main: '#a78bfa', dark: '#4c1d95', glow: '#8b5cf6' },
  'frame-legendary': { light: '#fef3c7', main: '#facc15', dark: '#92400e', glow: '#f59e0b' },
  'frame-horror': { light: '#fee2e2', main: '#ef4444', dark: '#7f1d1d', glow: '#dc2626' },
  'frame-speed': { light: '#fef9c3', main: '#facc15', dark: '#991b1b', glow: '#fb923c' },
  'frame-tech': { light: '#cffafe', main: '#22d3ee', dark: '#155e75', glow: '#06b6d4' },
  'frame-ocean': { light: '#ccfbf1', main: '#2dd4bf', dark: '#115e59', glow: '#14b8a6' },
};

export default function AvatarRenderer({ config, name, className }: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config || DEFAULT_AVATAR_CONFIG);
  const skin = skinColors[avatar.skin] || skinColors['skin-02'];
  const bg = backgrounds[avatar.background] || backgrounds['bg-01'];
  const frame = frames[avatar.frame] || frames['frame-rare'];
  const uid = `avatar-${avatar.skin}-${avatar.face}-${avatar.hair}-${avatar.clothes}-${avatar.frame}`.replace(/[^a-z0-9-]/gi, '');

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
          <stop offset="52%" stopColor={bg[1]} />
          <stop offset="100%" stopColor={bg[2]} />
        </linearGradient>

        <radialGradient id={`${uid}-spot`} cx="50%" cy="24%" r="76%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.72" />
        </radialGradient>

        <linearGradient id={`${uid}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(skin, 26)} />
          <stop offset="52%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, 34)} />
        </linearGradient>

        <linearGradient id={`${uid}-hair`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(avatar.hairColor, 16)} />
          <stop offset="100%" stopColor={shade(avatar.hairColor, 34)} />
        </linearGradient>

        <linearGradient id={`${uid}-clothes`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(avatar.clothesColor, 22)} />
          <stop offset="56%" stopColor={avatar.clothesColor} />
          <stop offset="100%" stopColor={shade(avatar.clothesColor, 42)} />
        </linearGradient>

        <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#020617" floodOpacity="0.5" />
        </filter>

        <filter id={`${uid}-small-shadow`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#020617" floodOpacity="0.28" />
        </filter>

        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={frame.glow} floodOpacity="0.72" />
        </filter>

        <clipPath id={`${uid}-portrait`}>
          <rect x="42" y="42" width="216" height="306" rx="28" />
        </clipPath>

        <clipPath id={`${uid}-face`}>
          {faceClipPath(avatar.face)}
        </clipPath>
      </defs>

      <rect x="0" y="0" width="300" height="420" rx="38" fill="#020617" />
      <rect x="8" y="8" width="284" height="404" rx="35" fill="#f8fafc" />
      <rect x="18" y="18" width="264" height="384" rx="33" fill="#020617" />

      <rect x="26" y="26" width="248" height="368" rx="30" fill={`url(#${uid}-bg)`} />
      <rect x="26" y="26" width="248" height="368" rx="30" fill={`url(#${uid}-spot)`} />

      <g clipPath={`url(#${uid}-portrait)`}>
        {renderBackgroundDetails(avatar.background)}
        <circle cx="84" cy="74" r="35" fill="#ffffff" opacity="0.12" />
        <circle cx="236" cy="284" r="52" fill="#ffffff" opacity="0.12" />
        <path d="M38 128 C94 64 204 54 268 104" stroke="#ffffff" strokeWidth="7" opacity="0.14" fill="none" />
        <path d="M42 296 C108 228 200 224 266 276" stroke="#ffffff" strokeWidth="8" opacity="0.13" fill="none" />
      </g>

      {renderCardFrame(frame, avatar.frame)}

      <g clipPath={`url(#${uid}-portrait)`} filter={`url(#${uid}-shadow)`}>
        {renderBackLayer(avatar.outerwear, avatar.clothesColor, avatar.frame)}
        {renderBody(avatar.body, avatar.clothes, avatar.outerwear, uid)}
        {renderNeck(uid, skin)}
        {renderHeadBase(avatar.face, uid)}
        {renderEars(uid)}
        <g clipPath={`url(#${uid}-face)`}>
          {renderFaceDepth()}
          {renderHairBack(avatar.hair, uid)}
          {renderFaceShading()}
          {renderFacialHair(avatar.facialHair, avatar.hairColor)}
          {renderNose(avatar.nose, skin)}
          {renderMouth(avatar.mouth)}
          {renderEyes(avatar.eyes)}
          {renderEyebrows(avatar.eyebrows, avatar.hairColor)}
          {renderHairFront(avatar.hair, uid)}
        </g>
        {renderHeadwear(avatar.headwear, uid, frame)}
        {renderAccessory(avatar.accessory, frame)}
      </g>

      {renderFrameDecor(avatar.frame, frame)}
      {renderNamePlate(name || 'PERSONAGEM', frame)}
    </svg>
  );
}

function faceClipPath(face: string) {
  const paths: Record<string, string> = {
    'face-01': 'M92 118 C92 72 116 48 150 48 C184 48 208 72 208 118 V152 C208 194 184 224 150 224 C116 224 92 194 92 152 Z',
    'face-02': 'M88 126 C88 78 114 50 150 50 C186 50 212 78 212 126 C212 180 186 224 150 224 C114 224 88 180 88 126 Z',
    'face-03': 'M94 72 H206 V158 C206 200 182 224 150 224 C118 224 94 200 94 158 Z',
    'face-04': 'M104 92 C108 58 126 46 150 46 C174 46 192 58 196 92 L206 154 C206 196 180 226 150 226 C120 226 94 196 94 154 Z',
    'face-05': 'M84 104 C84 62 112 44 150 44 C188 44 216 62 216 104 V152 C216 200 188 228 150 228 C112 228 84 200 84 152 Z',
    'face-06': 'M96 78 H204 L216 150 C212 200 186 228 150 228 C114 228 88 200 84 150 Z',
    'face-07': 'M94 96 L118 52 H182 L206 96 L202 166 L150 228 L98 166 Z',
    'face-08': 'M96 92 C104 58 124 44 150 44 C176 44 196 58 204 92 L210 152 C210 200 184 228 150 228 C116 228 90 200 90 152 Z',
    'face-09': 'M96 66 H204 L218 122 L202 212 H98 L82 122 Z',
    'face-10': 'M92 100 C92 62 118 44 150 44 C182 44 208 62 208 100 L216 150 C208 200 184 226 150 226 C116 226 92 200 84 150 Z',
  };

  return <path d={paths[face] || paths['face-01']} />;
}

function renderBackgroundDetails(background: string) {
  if (background === 'bg-02') {
    return (
      <g opacity="0.62">
        <path d="M28 394 C66 306 38 252 86 174 C80 260 140 286 106 398 Z" fill="#fb923c" />
        <path d="M204 404 C250 320 208 252 250 184 C268 262 300 306 258 404 Z" fill="#facc15" />
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
      <g fill="#020617" opacity="0.72">
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
      </g>
    );
  }

  if (background === 'bg-10') {
    return (
      <g opacity="0.44">
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

function renderCardFrame(frame: { light: string; main: string; dark: string; glow: string }, frameId: string) {
  return (
    <g>
      <rect x="36" y="36" width="228" height="322" rx="30" fill="none" stroke="#ffffff" strokeWidth="8" opacity="0.95" />
      <rect x="47" y="47" width="206" height="300" rx="24" fill="none" stroke="#020617" strokeWidth="10" opacity="0.92" />
      <rect x="58" y="58" width="184" height="278" rx="18" fill="none" stroke={frame.main} strokeWidth="6" filter={`url(#${frameId})`} />
      <rect x="68" y="68" width="164" height="258" rx="14" fill="none" stroke={frame.dark} strokeWidth="4" opacity="0.75" />
    </g>
  );
}

function renderBackLayer(outerwear: string, color: string, frame: string) {
  if (outerwear === 'outerwear-cape') {
    const cape = frame === 'frame-speed' ? '#991b1b' : '#020617';
    return <path d="M56 390 C50 272 88 216 132 204 L150 244 L168 204 C212 216 250 272 244 390 Z" fill={cape} opacity="0.94" />;
  }

  if (outerwear === 'outerwear-robe') {
    return <path d="M48 392 C64 282 96 218 150 204 C204 218 236 282 252 392 Z" fill="#020617" opacity="0.9" />;
  }

  if (outerwear === 'outerwear-jacket') {
    return (
      <g>
        <path d="M62 388 L102 240 L150 388 Z" fill={shade(color, 42)} opacity="0.94" />
        <path d="M238 388 L198 240 L150 388 Z" fill={shade(color, 42)} opacity="0.94" />
      </g>
    );
  }

  return null;
}

function renderBody(body: string, clothes: string, outerwear: string, uid: string) {
  const width = body === 'body-03' ? 196 : body === 'body-04' ? 138 : body === 'body-05' ? 164 : 170;
  const left = 150 - width / 2;
  const right = 150 + width / 2;
  const shoulderStroke = body === 'body-03' ? 38 : body === 'body-04' ? 23 : 30;

  return (
    <g>
      <path d={`M${left} 392 C${left + 10} 292 104 238 150 238 C196 238 ${right - 10} 292 ${right} 392 Z`} fill={`url(#${uid}-clothes)`} />

      <path
        d="M72 306 C86 260 112 238 150 238 C188 238 214 260 228 306"
        stroke="#020617"
        strokeWidth={shoulderStroke}
        strokeLinecap="round"
        fill="none"
        opacity="0.18"
      />

      {renderClothesDetails(clothes)}

      {outerwear === 'outerwear-armor' && (
        <g>
          <path d="M94 252 H206 L190 362 H110 Z" fill="#1e293b" stroke="#cbd5e1" strokeWidth="6" strokeLinejoin="round" />
          <path d="M112 274 H188 M116 308 H184 M122 340 H178" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
          <circle cx="150" cy="292" r="18" fill="#e2e8f0" />
        </g>
      )}

      {outerwear === 'outerwear-ruff' && (
        <path
          d="M80 244 L98 218 L116 244 L134 218 L152 244 L170 218 L188 244 L206 220 L198 270 H90 Z"
          fill="#f8fafc"
          stroke="#dc2626"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function renderClothesDetails(clothes: string) {
  if (clothes === 'clothes-02') {
    return (
      <g>
        <path d="M118 248 H182 L174 392 H126 Z" fill="#f8fafc" opacity="0.88" />
        <circle cx="150" cy="306" r="20" fill="#f8fafc" opacity="0.9" />
      </g>
    );
  }

  if (clothes === 'clothes-03') {
    return (
      <g>
        <path d="M100 254 H200 L188 362 H112 Z" fill="#334155" opacity="0.9" />
        <circle cx="126" cy="288" r="11" fill="#cbd5e1" />
        <circle cx="174" cy="288" r="11" fill="#cbd5e1" />
      </g>
    );
  }

  if (clothes === 'clothes-07') {
    return <path d="M154 246 L126 312 H150 L122 390 L194 290 H164 L184 246 Z" fill="#facc15" />;
  }

  if (clothes === 'clothes-08') {
    return (
      <g>
        <path d="M106 254 L150 292 L194 254 L178 392 H122 Z" fill="#111827" />
        <path d="M116 266 Q150 296 184 266 Q166 280 150 254 Q134 280 116 266 Z" fill="#64748b" />
      </g>
    );
  }

  if (clothes === 'clothes-09') {
    return (
      <g>
        <path d="M90 392 L122 250 L150 392 Z M210 392 L178 250 L150 392 Z" fill="#e5e7eb" />
        <circle cx="150" cy="304" r="9" fill="#dc2626" />
        <circle cx="150" cy="340" r="9" fill="#dc2626" />
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
        <path d="M102 252 H198 L184 392 H116 Z" fill="#020617" opacity="0.88" />
        <path d="M106 282 H194" stroke="#ef4444" strokeWidth="8" />
      </g>
    );
  }

  if (clothes === 'clothes-14') {
    return (
      <g>
        <circle cx="116" cy="288" r="20" fill="#111827" stroke="#22d3ee" strokeWidth="5" />
        <circle cx="184" cy="288" r="20" fill="#111827" stroke="#22d3ee" strokeWidth="5" />
        <path d="M136 288 H164" stroke="#22d3ee" strokeWidth="5" />
      </g>
    );
  }

  if (clothes === 'clothes-15') {
    return (
      <g>
        <path d="M108 252 H192 L180 392 H120 Z" fill="#111827" opacity="0.92" />
        <path d="M130 252 L150 292 L170 252" fill="none" stroke="#facc15" strokeWidth="5" />
      </g>
    );
  }

  if (clothes === 'clothes-16') {
    return (
      <g>
        <path d="M110 250 H190 L178 392 H122 Z" fill="#0f766e" />
        <path d="M124 264 L150 300 L176 264" fill="none" stroke="#facc15" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-17') {
    return (
      <g>
        <path d="M104 250 H196 L188 392 H112 Z" fill="#334155" />
        <path d="M124 270 H176 M116 310 H184 M126 350 H174" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (clothes === 'clothes-18') {
    return (
      <g>
        <path d="M102 252 H198 L184 392 H116 Z" fill="#0f172a" />
        <path d="M118 284 H182 M126 318 H174" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g opacity="0.56">
      <path d="M116 252 L150 286 L184 252" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M150 286 V392" stroke="#ffffff" strokeWidth="4" opacity="0.35" />
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

function renderHeadBase(face: string, uid: string) {
  const paths: Record<string, string> = {
    'face-01': 'M92 118 C92 72 116 48 150 48 C184 48 208 72 208 118 V152 C208 194 184 224 150 224 C116 224 92 194 92 152 Z',
    'face-02': 'M88 126 C88 78 114 50 150 50 C186 50 212 78 212 126 C212 180 186 224 150 224 C114 224 88 180 88 126 Z',
    'face-03': 'M94 72 H206 V158 C206 200 182 224 150 224 C118 224 94 200 94 158 Z',
    'face-04': 'M104 92 C108 58 126 46 150 46 C174 46 192 58 196 92 L206 154 C206 196 180 226 150 226 C120 226 94 196 94 154 Z',
    'face-05': 'M84 104 C84 62 112 44 150 44 C188 44 216 62 216 104 V152 C216 200 188 228 150 228 C112 228 84 200 84 152 Z',
    'face-06': 'M96 78 H204 L216 150 C212 200 186 228 150 228 C114 228 88 200 84 150 Z',
    'face-07': 'M94 96 L118 52 H182 L206 96 L202 166 L150 228 L98 166 Z',
    'face-08': 'M96 92 C104 58 124 44 150 44 C176 44 196 58 204 92 L210 152 C210 200 184 228 150 228 C116 228 90 200 90 152 Z',
    'face-09': 'M96 66 H204 L218 122 L202 212 H98 L82 122 Z',
    'face-10': 'M92 100 C92 62 118 44 150 44 C182 44 208 62 208 100 L216 150 C208 200 184 226 150 226 C116 226 92 200 84 150 Z',
  };

  return <path d={paths[face] || paths['face-01']} fill={`url(#${uid}-skin)`} filter={`url(#${uid}-small-shadow)`} />;
}

function renderEars(uid: string) {
  return (
    <g>
      <ellipse cx="86" cy="140" rx="14" ry="23" fill={`url(#${uid}-skin)`} />
      <ellipse cx="214" cy="140" rx="14" ry="23" fill={`url(#${uid}-skin)`} />
      <ellipse cx="86" cy="140" rx="6" ry="12" fill="#020617" opacity="0.12" />
      <ellipse cx="214" cy="140" rx="6" ry="12" fill="#020617" opacity="0.12" />
    </g>
  );
}

function renderFaceDepth() {
  return (
    <g opacity="0.15">
      <path d="M150 52 C184 62 202 90 202 144 C200 188 178 216 150 224 C172 198 184 170 184 128 C184 88 172 64 150 52 Z" fill="#020617" />
    </g>
  );
}

function renderFaceShading() {
  return (
    <g opacity="0.12">
      <path d="M92 116 C116 130 184 130 208 116 V150 C188 140 112 140 92 150 Z" fill="#ffffff" />
      <path d="M96 178 C120 212 180 212 204 178 C194 216 174 230 150 230 C126 230 106 216 96 178 Z" fill="#020617" />
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
    return <path d="M90 106 C98 58 126 46 150 46 C176 46 202 58 210 106 C180 90 130 88 90 106 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-02') {
    return <path d="M84 104 L104 48 L122 84 L142 38 L156 84 L180 42 L194 92 L216 76 L208 116 C174 94 124 90 84 104 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-03') {
    return (
      <g fill={`url(#${uid}-hair)`}>
        <circle cx="100" cy="90" r="24" />
        <circle cx="126" cy="64" r="27" />
        <circle cx="158" cy="60" r="28" />
        <circle cx="190" cy="84" r="25" />
        <circle cx="210" cy="114" r="20" />
        <circle cx="86" cy="118" r="20" />
      </g>
    );
  }

  if (hair === 'hair-04') {
    return <path d="M86 110 C94 56 122 36 150 36 C178 36 206 56 214 110 C178 86 126 86 86 110 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-05') {
    return <path d="M86 112 C96 62 126 52 148 54 C176 56 198 46 216 32 C212 72 200 100 180 114 C146 96 116 96 86 112 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-06') {
    return <path d="M128 94 L150 26 L172 94 C158 86 142 86 128 94 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-07') {
    return <path d="M84 110 C98 62 136 44 188 64 C206 74 214 90 218 114 C174 94 132 90 84 110 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-09') {
    return (
      <g>
        <path d="M84 116 C84 62 112 34 150 34 C188 34 216 62 216 116 C192 96 108 96 84 116 Z" fill="#020617" />
        <path d="M104 116 C116 88 134 74 150 74 C166 74 184 88 196 116 C178 106 122 106 104 116 Z" fill="#1f2937" />
      </g>
    );
  }

  if (hair === 'hair-10') {
    return <path d="M76 114 L106 52 L130 86 L150 34 L172 86 L202 52 L224 114 C184 90 116 90 76 114 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-11') {
    return <path d="M82 112 C86 56 116 36 150 36 C184 36 214 56 218 112 C188 90 164 88 150 114 C136 88 112 90 82 112 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-12') {
    return <path d="M90 102 C94 60 122 40 150 40 C178 40 206 60 210 102 C176 86 124 86 90 102 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-13') {
    return <path d="M78 108 L102 62 L118 84 L136 48 L152 86 L176 48 L186 84 L214 60 L222 114 C180 90 126 88 78 108 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-14') {
    return <path d="M82 110 C90 68 126 42 172 54 C204 62 218 86 220 114 C178 94 122 96 82 110 Z" fill={`url(#${uid}-hair)`} />;
  }

  if (hair === 'hair-15') {
    return <path d="M88 106 C100 64 128 50 150 50 C176 50 200 64 212 106 C178 92 128 92 88 106 Z" fill={`url(#${uid}-hair)`} />;
  }

  return null;
}

function renderEyes(eyes: string) {
  if (eyes === 'eyes-06') {
    return (
      <g>
        <path d="M104 130 H196 L186 156 H114 Z" fill="#020617" opacity="0.86" />
        <path d="M118 142 H138 M162 142 H182" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === 'eyes-08' || eyes === 'eyes-09' || eyes === 'eyes-12') {
    const color = eyes === 'eyes-12' ? '#22d3ee' : '#ef4444';

    return (
      <g>
        <path d="M104 132 H196 L188 154 H112 Z" fill="#020617" opacity="0.84" />
        <rect x="116" y="138" width="25" height="7" rx="4" fill={color} />
        <rect x="159" y="138" width="25" height="7" rx="4" fill={color} />
      </g>
    );
  }

  if (eyes === 'eyes-10') {
    return (
      <g>
        <circle cx="124" cy="142" r="16" fill="none" stroke="#111827" strokeWidth="5" />
        <circle cx="176" cy="142" r="16" fill="none" stroke="#111827" strokeWidth="5" />
        <path d="M140 142 H160" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <path d="M120 142 H128 M172 142 H180" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === 'eyes-05') {
    return (
      <g>
        <ellipse cx="124" cy="142" rx="12" ry="16" fill="#ffffff" opacity="0.94" />
        <ellipse cx="176" cy="142" rx="12" ry="16" fill="#ffffff" opacity="0.94" />
        <circle cx="124" cy="144" r="5" fill="#111827" />
        <circle cx="176" cy="144" r="5" fill="#111827" />
      </g>
    );
  }

  if (eyes === 'eyes-07') {
    return (
      <g>
        <path d="M108 140 Q124 128 140 140" stroke="#111827" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M160 140 Q176 128 192 140" stroke="#111827" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M119 148 H131 M169 148 H181" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === 'eyes-02') {
    return (
      <g>
        <path d="M112 144 Q124 134 136 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M164 144 Q176 134 188 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    );
  }

  if (eyes === 'eyes-03') {
    return (
      <g>
        <path d="M112 142 H136" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
        <path d="M164 142 H188" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
        <circle cx="126" cy="147" r="4" fill="#111827" />
        <circle cx="174" cy="147" r="4" fill="#111827" />
      </g>
    );
  }

  if (eyes === 'eyes-04') {
    return (
      <g>
        <path d="M112 144 Q124 150 136 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M164 144 Q176 150 188 144" stroke="#111827" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    );
  }

  return (
    <g>
      <path d="M114 142 H136" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
      <path d="M164 142 H186" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}

function renderEyebrows(eyebrows: string, color: string) {
  if (eyebrows === 'brows-06') return null;

  if (eyebrows === 'brows-02') {
    return (
      <g stroke={shade(color, 28)} strokeWidth="6" strokeLinecap="round">
        <path d="M108 124 Q124 114 140 122" />
        <path d="M160 122 Q176 114 192 124" />
      </g>
    );
  }

  if (eyebrows === 'brows-03') {
    return (
      <g stroke={shade(color, 34)} strokeWidth="7" strokeLinecap="round">
        <path d="M106 122 L140 130" />
        <path d="M194 122 L160 130" />
      </g>
    );
  }

  if (eyebrows === 'brows-04') {
    return (
      <g stroke={shade(color, 34)} strokeWidth="7" strokeLinecap="round">
        <path d="M106 118 L142 130" />
        <path d="M194 118 L158 130" />
      </g>
    );
  }

  if (eyebrows === 'brows-05') {
    return (
      <g stroke={shade(color, 36)} strokeWidth="8" strokeLinecap="round">
        <path d="M108 124 H140" />
        <path d="M160 124 H192" />
      </g>
    );
  }

  return (
    <g stroke={shade(color, 26)} strokeWidth="5" strokeLinecap="round">
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
    return <path d="M150 154 Q144 170 154 172" stroke={shade(skin, 34)} strokeWidth="4" strokeLinecap="round" fill="none" />;
  }

  if (nose === 'nose-03') {
    return <path d="M152 150 L140 178 Q150 184 162 178" stroke={shade(skin, 40)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }

  if (nose === 'nose-04') {
    return <path d="M144 150 Q134 180 150 184 Q166 180 156 150" stroke={shade(skin, 38)} strokeWidth="5" strokeLinecap="round" fill="none" />;
  }

  if (nose === 'nose-05') {
    return <path d="M152 150 L132 178 L158 176" stroke={shade(skin, 38)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }

  return <path d="M150 152 Q142 174 154 178" stroke={shade(skin, 35)} strokeWidth="5" strokeLinecap="round" fill="none" />;
}

function renderMouth(mouth: string) {
  if (mouth === 'mouth-01') {
    return <path d="M124 188 Q150 204 176 188" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-02') {
    return <path d="M128 192 H172" stroke="#3f1f16" strokeWidth="5" strokeLinecap="round" />;
  }

  if (mouth === 'mouth-03') {
    return <path d="M126 198 Q150 184 174 198" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-04') {
    return <path d="M126 190 Q150 200 174 190" stroke="#3f1f16" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (mouth === 'mouth-05') {
    return (
      <g>
        <path d="M120 188 Q150 212 180 188" fill="#111827" />
        <path d="M130 190 L138 202 L146 190 L154 204 L162 190 L170 202" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  if (mouth === 'mouth-06') {
    return <path d="M118 188 Q150 212 182 188" stroke="#3f1f16" strokeWidth="7" strokeLinecap="round" fill="none" />;
  }

  return null;
}

function renderFacialHair(facialHair: string, color: string) {
  if (facialHair === 'facial-none') return null;

  if (facialHair === 'facial-01') {
    return <path d="M118 184 Q150 218 182 184 Q174 222 150 228 Q126 222 118 184 Z" fill={shade(color, 10)} opacity="0.82" />;
  }

  if (facialHair === 'facial-02') {
    return (
      <g fill={shade(color, 12)}>
        <path d="M134 184 Q150 198 166 184 Q164 220 150 228 Q136 220 134 184 Z" />
        <path d="M130 178 Q150 172 170 178 Q150 186 130 178 Z" />
      </g>
    );
  }

  if (facialHair === 'facial-03') {
    return <path d="M126 180 Q144 172 150 182 Q156 172 174 180 Q158 192 150 184 Q142 192 126 180 Z" fill={shade(color, 12)} />;
  }

  if (facialHair === 'facial-04' || facialHair === 'facial-05') {
    return (
      <g fill={shade(color, 10)}>
        <path d="M108 172 Q150 204 192 172 Q188 226 150 234 Q112 226 108 172 Z" opacity="0.86" />
        {facialHair === 'facial-05' && <path d="M124 178 Q150 166 176 178 Q150 190 124 178 Z" fill={tint(color, 10)} />}
      </g>
    );
  }

  return null;
}

function renderHeadwear(headwear: string, uid: string, frame: { light: string; main: string; dark: string; glow: string }) {
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
    return <path d="M82 114 L100 54 L130 86 L150 50 L170 86 L200 54 L218 114 C186 94 114 94 82 114 Z" fill="#020617" />;
  }

  if (headwear === 'headwear-04') {
    return <path d="M146 74 L160 92 H150 L160 118 L136 88 H148 Z" fill="#facc15" stroke="#111827" strokeWidth="2" />;
  }

  if (headwear === 'headwear-05') {
    return (
      <g>
        <path d="M88 112 C92 64 116 40 150 40 C184 40 208 64 212 112 H88 Z" fill="#334155" stroke="#cbd5e1" strokeWidth="4" />
        <path d="M112 108 H188" stroke={frame.main} strokeWidth="5" strokeLinecap="round" />
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

function renderAccessory(accessory: string, frame: { light: string; main: string; dark: string; glow: string }) {
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
    return <path d="M104 76 L124 46 L146 76 L150 40 L154 76 L176 46 L196 76 L190 98 H110 Z" fill="#facc15" stroke="#92400e" strokeWidth="4" />;
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
    return <path d="M226 74 V242 M206 98 C206 78 226 78 226 98 C226 78 246 78 246 98" stroke="#facc15" strokeWidth="6" strokeLinecap="round" fill="none" />;
  }

  if (accessory === 'accessory-13') {
    return (
      <g>
        <circle cx="228" cy="242" r="26" fill="#facc15" stroke="#92400e" strokeWidth="5" />
        <circle cx="220" cy="236" r="5" fill={frame.main} />
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

function renderFrameDecor(frameId: string, frame: { light: string; main: string; dark: string; glow: string }) {
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
    <g fill="none" stroke={frame.light} strokeWidth="3" opacity="0.72">
      <path d="M40 42 H82 M218 42 H260 M40 378 H82 M218 378 H260" />
      <path d="M42 40 V82 M258 40 V82 M42 338 V380 M258 338 V380" />
    </g>
  );
}

function renderNamePlate(name: string, frame: { light: string; main: string; dark: string; glow: string }) {
  return (
    <g>
      <rect x="48" y="344" width="204" height="38" rx="13" fill="#020617" opacity="0.78" />
      <rect x="56" y="352" width="188" height="22" rx="8" fill={frame.dark} opacity="0.88" />
      <rect x="56" y="352" width="188" height="22" rx="8" fill={frame.main} opacity="0.12" />
      <text
        x="150"
        y="368"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="15"
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
