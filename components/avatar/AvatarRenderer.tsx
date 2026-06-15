'use client';

import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig, type AvatarConfig } from '@/lib/avatarConfig';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type AvatarRendererProps = {
  config?: AvatarConfig | null;
  name?: string;
  className?: string;
};

const skinColors: Record<string, string> = {
  'skin-01': '#f1c59b',
  'skin-02': '#c47a43',
  'skin-03': '#a96432',
  'skin-04': '#724126',
  'skin-05': '#3f2418',
  'skin-06': '#20a855',
  'skin-07': '#7f42d9',
  'skin-08': '#34a4db',
  'skin-09': '#9aa7b5',
};

export default function AvatarRenderer({ config, name, className }: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config || DEFAULT_AVATAR_CONFIG);
  const skin = skinColors[avatar.skin] || skinColors['skin-02'];
  const uid = `avatar-${avatar.skin}-${avatar.face}-${avatar.hair}-${avatar.frame}`.replace(/[^a-z0-9-]/gi, '');

  return (
    <svg viewBox="0 0 260 360" role="img" aria-label="Avatar do personagem" className={cn('h-full w-full', className)}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" x2="1" y1="0" y2="1">
          {backgroundStops(avatar.background)}
        </linearGradient>
        <radialGradient id={`${uid}-spot`} cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.48" />
        </radialGradient>
        <linearGradient id={`${uid}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint(skin, 28)} />
          <stop offset="58%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, 36)} />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="13" stdDeviation="8" floodColor="#020617" floodOpacity="0.38" />
        </filter>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={frameAccent(avatar.frame)} floodOpacity="0.55" />
        </filter>
      </defs>

      <rect width="260" height="360" rx="22" fill={`url(#${uid}-bg)`} />
      <rect width="260" height="360" rx="22" fill={`url(#${uid}-spot)`} />
      {renderScene(avatar.background)}

      <g filter={`url(#${uid}-shadow)`}>
        {renderCapeAndBackLayer(avatar.outerwear, avatar.clothesColor, avatar.frame)}
        {renderBody(avatar.body, avatar.clothes, avatar.clothesColor, avatar.outerwear)}
        {renderNeck(skin, uid)}
        {renderHeadShape(avatar.face, skin, uid)}
        {renderEars(avatar.face, skin)}
        {renderFacialHair(avatar.facialHair, avatar.hairColor)}
        {renderMouth(avatar.mouth, avatar.eyes)}
        {renderNose(avatar.nose, skin)}
        {renderEyes(avatar.eyes)}
        {renderEyebrows(avatar.eyebrows, avatar.hairColor)}
        {renderHair(avatar.hair, avatar.hairColor, avatar.face)}
        {renderHeadwear(avatar.headwear)}
        {renderAccessory(avatar.accessory)}
      </g>

      {renderFrame(avatar.frame)}
      {name && renderNamePlate(name, avatar.frame)}
    </svg>
  );
}

function backgroundStops(background: string) {
  const gradients: Record<string, [string, string, string]> = {
    'bg-01': ['#10104a', '#4941d8', '#0b1024'],
    'bg-02': ['#3a0707', '#dc2626', '#f59e0b'],
    'bg-03': ['#082f49', '#38bdf8', '#e0f2fe'],
    'bg-04': ['#16043f', '#6d28d9', '#22d3ee'],
    'bg-05': ['#020617', '#1f2937', '#facc15'],
    'bg-06': ['#052e16', '#15803d', '#bef264'],
    'bg-07': ['#30040b', '#991b1b', '#f8fafc'],
    'bg-08': ['#020617', '#312e81', '#f59e0b'],
    'bg-09': ['#020617', '#111827', '#475569'],
    'bg-10': ['#064e3b', '#16a34a', '#facc15'],
    'bg-11': ['#1c120b', '#6b3a16', '#facc15'],
    'bg-12': ['#042f2e', '#0891b2', '#a5f3fc'],
    'bg-13': ['#020617', '#164e63', '#22d3ee'],
    'bg-14': ['#111827', '#7f1d1d', '#2563eb'],
  };
  const [a, b, c] = gradients[background] || gradients['bg-01'];
  return (
    <>
      <stop offset="0%" stopColor={a} />
      <stop offset="52%" stopColor={b} />
      <stop offset="100%" stopColor={c} />
    </>
  );
}

function renderScene(background: string) {
  if (background === 'bg-02') {
    return (
      <g opacity="0.55">
        <path d="M26 336 C50 268 24 208 70 150 C66 232 126 240 94 340 Z" fill="#fb923c" />
        <path d="M190 352 C232 286 196 220 232 164 C246 230 278 268 236 356 Z" fill="#facc15" />
      </g>
    );
  }
  if (background === 'bg-04') {
    return (
      <g stroke="#fef08a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" fill="none">
        <path d="M44 74 L78 124 L58 124 L104 198" />
        <path d="M214 56 L174 126 L202 122 L154 218" />
      </g>
    );
  }
  if (background === 'bg-05') {
    return (
      <g fill="#020617" opacity="0.72">
        <rect x="20" y="164" width="32" height="150" />
        <rect x="64" y="124" width="48" height="190" />
        <rect x="148" y="144" width="42" height="170" />
        <rect x="206" y="98" width="32" height="216" />
      </g>
    );
  }
  if (background === 'bg-08') {
    return (
      <g opacity="0.6">
        <circle cx="58" cy="62" r="2" fill="#fff" />
        <circle cx="102" cy="44" r="3" fill="#fff" />
        <circle cx="210" cy="84" r="2" fill="#fff" />
        <circle cx="202" cy="250" r="42" fill="#f59e0b" opacity="0.35" />
        <path d="M28 275 C98 218 172 214 238 252" stroke="#a78bfa" strokeWidth="5" fill="none" />
      </g>
    );
  }
  if (background === 'bg-10') {
    return (
      <g opacity="0.42">
        <rect x="0" y="256" width="260" height="104" fill="#14532d" />
        <path d="M12 286 H248 M48 256 V360 M212 256 V360" stroke="#f8fafc" strokeWidth="4" />
        <circle cx="130" cy="286" r="30" stroke="#f8fafc" strokeWidth="3" fill="none" />
      </g>
    );
  }
  if (background === 'bg-11') {
    return (
      <g opacity="0.48">
        <rect x="26" y="76" width="208" height="184" fill="#3f2414" />
        {Array.from({ length: 8 }).map((_, index) => (
          <rect key={index} x={36 + index * 24} y="88" width="15" height="144" fill={index % 2 ? '#7c2d12' : '#1e3a8a'} />
        ))}
      </g>
    );
  }
  if (background === 'bg-13') {
    return (
      <g opacity="0.55" stroke="#22d3ee" strokeWidth="3" fill="none">
        <path d="M22 100 H92 V56 H166 V126 H236" />
        <path d="M36 286 H112 V242 H184 V292 H236" />
        <circle cx="92" cy="56" r="6" fill="#22d3ee" />
        <circle cx="184" cy="242" r="6" fill="#22d3ee" />
      </g>
    );
  }
  return (
    <g opacity="0.22">
      <circle cx="52" cy="56" r="30" fill="#fff" />
      <circle cx="214" cy="272" r="40" fill="#fff" />
      <path d="M14 112 C80 48 174 42 246 84" stroke="#fff" strokeWidth="5" fill="none" />
    </g>
  );
}

function renderCapeAndBackLayer(outerwear: string, color: string, frame: string) {
  if (outerwear === 'outerwear-cape') {
    const cape = frame === 'frame-speed' ? '#b91c1c' : '#020617';
    return <path d="M58 344 C50 244 80 194 118 184 L132 224 L146 184 C184 194 214 244 204 344 Z" fill={cape} opacity="0.9" />;
  }
  if (outerwear === 'outerwear-robe') return <path d="M42 344 C58 242 86 194 130 184 C174 194 202 242 218 344 Z" fill="#020617" opacity="0.82" />;
  if (outerwear === 'outerwear-ruff') return <path d="M68 216 L86 194 L104 218 L122 194 L140 218 L158 194 L176 216 L164 238 H80 Z" fill="#f8fafc" stroke="#dc2626" strokeWidth="4" />;
  if (outerwear === 'outerwear-jacket') return <path d="M52 344 L88 222 L130 344 Z M208 344 L172 222 L130 344 Z" fill={shade(color, 36)} opacity="0.88" />;
  return null;
}

function renderBody(body: string, clothes: string, color: string, outerwear: string) {
  const base = color || '#2563eb';
  const dark = shade(base, 42);
  const width = body === 'body-03' ? 182 : body === 'body-04' ? 124 : body === 'body-05' ? 154 : 154;
  const left = 130 - width / 2;
  const right = 130 + width / 2;
  const shoulder = body === 'body-03' ? 218 : 202;

  return (
    <g>
      <path d={`M${left} 344 C${left + 12} 264 92 222 130 222 C168 222 ${right - 12} 264 ${right} 344 Z`} fill={base} />
      <path d={`M${left + 18} 344 C${left + 30} 272 98 230 130 230 C162 230 ${right - 30} 272 ${right - 18} 344 Z`} fill={clothingPanel(clothes, dark)} opacity="0.95" />
      <path d={`M66 278 C76 238 98 222 130 222 C162 222 184 238 194 278`} stroke={shade(base, 28)} strokeWidth={body === 'body-03' ? 34 : 24} strokeLinecap="round" fill="none" opacity="0.75" />
      {renderClothesDetails(clothes, base, shoulder)}
      {outerwear === 'outerwear-armor' && <path d="M82 238 H178 L166 330 H94 Z M98 254 H162 M100 282 H160" fill="none" stroke="#cbd5e1" strokeWidth="8" strokeLinejoin="round" opacity="0.95" />}
    </g>
  );
}

function renderClothesDetails(clothes: string, base: string, shoulder: number) {
  if (clothes === 'clothes-02') {
    return <><path d="M108 226 H152 L146 344 H114 Z" fill="#f8fafc" opacity="0.9" /><circle cx="130" cy="270" r="20" fill="#f8fafc" opacity="0.9" /></>;
  }
  if (clothes === 'clothes-03') {
    return <><path d="M92 236 H168 L158 322 H102 Z" fill="#334155" opacity="0.85" /><circle cx="112" cy="258" r="10" fill="#cbd5e1" /><circle cx="148" cy="258" r="10" fill="#cbd5e1" /></>;
  }
  if (clothes === 'clothes-07') {
    return <path d="M134 230 L110 286 H132 L108 340 L170 258 H144 L160 230 Z" fill="#facc15" />;
  }
  if (clothes === 'clothes-08') {
    return <><path d="M94 238 L130 272 L166 238 L154 344 H106 Z" fill="#111827" /><path d="M104 246 Q130 274 156 246 Q142 256 130 240 Q118 256 104 246 Z" fill="#64748b" /></>;
  }
  if (clothes === 'clothes-09') {
    return <><path d="M78 344 L106 232 L130 344 Z M182 344 L154 232 L130 344 Z" fill={base} /><circle cx="130" cy="268" r="9" fill="#dc2626" /><circle cx="130" cy="300" r="9" fill="#dc2626" /></>;
  }
  if (clothes === 'clothes-10') {
    return <><path d="M80 272 L118 244 L104 294 L142 286 L118 344 H78 Z" fill="#111827" opacity="0.28" /><path d="M156 246 L136 300 L178 286 L154 344 H206 Z" fill="#111827" opacity="0.22" /></>;
  }
  if (clothes === 'clothes-15') {
    return <><path d="M98 236 H162 L152 344 H108 Z" fill="#111827" /><path d="M102 252 H158" stroke="#facc15" strokeWidth="5" /></>;
  }
  if (clothes === 'clothes-16') {
    return <><path d="M96 232 L130 278 L164 232 L174 344 H86 Z" fill="#facc15" opacity="0.72" /><path d="M100 280 H160" stroke="#0f766e" strokeWidth="6" /></>;
  }
  if (clothes === 'clothes-17') {
    return <><path d="M96 238 H164 L156 344 H104 Z" fill="#64748b" /><path d="M100 264 H160 M104 294 H156" stroke="#e2e8f0" strokeWidth="5" opacity="0.8" /></>;
  }
  if (clothes === 'clothes-18') {
    return <><path d="M102 238 H158 L150 344 H110 Z" fill="#f8fafc" opacity="0.9" /><circle cx="130" cy="276" r="19" fill="#ef4444" /><path d="M122 266 L144 276 L122 286 Z" fill="#fff" /></>;
  }
  return <path d={`M86 ${shoulder} Q130 258 174 ${shoulder}`} stroke="#ffffff" strokeWidth="5" opacity="0.28" fill="none" />;
}

function renderNeck(skin: string, uid: string) {
  return <path d="M110 184 H150 L156 232 Q130 246 104 232 Z" fill={`url(#${uid}-skin)`} />;
}

function renderHeadShape(face: string, skin: string, uid: string) {
  const fill = `url(#${uid}-skin)`;
  const shapes: Record<string, ReactNode> = {
    'face-01': <path d="M78 104 C82 62 118 44 154 58 C180 68 188 104 176 150 C166 194 94 196 84 150 C78 130 76 116 78 104 Z" fill={fill} />,
    'face-02': <ellipse cx="130" cy="124" rx="54" ry="64" fill={fill} />,
    'face-03': <path d="M78 78 H182 L188 138 L168 188 H92 L72 138 Z" fill={fill} />,
    'face-04': <path d="M90 88 C96 56 164 56 170 88 L162 160 C154 194 106 194 98 160 Z" fill={fill} />,
    'face-05': <path d="M68 94 C70 52 190 52 192 94 L182 168 C168 212 92 212 78 168 Z" fill={fill} />,
    'face-06': <path d="M78 80 H182 L174 168 C162 198 98 198 86 168 Z" fill={fill} />,
    'face-07': <path d="M78 90 C84 54 176 54 182 90 L174 158 L150 198 H110 L86 158 Z" fill={fill} />,
    'face-08': <path d="M84 86 C94 54 166 54 176 86 L166 158 C158 194 102 194 94 158 Z" fill={fill} />,
    'face-09': <path d="M74 78 H186 L194 138 L172 190 H88 L66 138 Z" fill="#9aa7b5" stroke="#475569" strokeWidth="5" />,
    'face-10': <path d="M82 88 C88 52 172 52 178 88 L168 158 C160 194 100 194 92 158 Z" fill={fill} />,
  };
  return shapes[face] || shapes['face-01'];
}

function renderEars(face: string, skin: string) {
  if (face === 'face-09') return null;
  return (
    <g fill={skin}>
      <path d="M76 118 C58 112 58 152 78 150 Z" />
      <path d="M184 118 C202 112 202 152 182 150 Z" />
    </g>
  );
}

function renderEyes(eyes: string) {
  if (eyes === 'eyes-06') return <><path d="M82 112 C106 96 154 96 178 112 L168 142 C146 132 114 132 92 142 Z" fill="#0f172a" /><path d="M96 122 L118 118 L110 132 Z M164 122 L142 118 L150 132 Z" fill="#e0f2fe" /></>;
  if (eyes === 'eyes-08') return <><path d="M88 114 H172 L164 138 H96 Z" fill="#facc15" stroke="#111827" strokeWidth="4" /><path d="M102 126 H124 M136 126 H158" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" /></>;
  if (eyes === 'eyes-09') return <path d="M88 118 H172 L166 138 H94 Z" fill="#0f172a" stroke="#22d3ee" strokeWidth="4" />;
  if (eyes === 'eyes-10') return <><circle cx="112" cy="126" r="13" fill="none" stroke="#111827" strokeWidth="4" /><circle cx="148" cy="126" r="13" fill="none" stroke="#111827" strokeWidth="4" /><path d="M125 126 H135" stroke="#111827" strokeWidth="4" /></>;
  if (eyes === 'eyes-12') return <><path d="M94 118 H122 L116 136 H98 Z" fill="#ef4444" /><path d="M138 118 H166 L162 136 H144 Z" fill="#ef4444" /><path d="M94 118 H122 M138 118 H166" stroke="#7f1d1d" strokeWidth="4" /></>;
  if (eyes === 'eyes-03') return <><path d="M96 114 L122 122 M164 114 L138 122" stroke="#111827" strokeWidth="5" strokeLinecap="round" /><circle cx="112" cy="132" r="5" fill="#111827" /><circle cx="148" cy="132" r="5" fill="#111827" /></>;
  if (eyes === 'eyes-07') return <><ellipse cx="112" cy="126" rx="10" ry="8" fill="#fff" /><ellipse cx="148" cy="126" rx="10" ry="8" fill="#fff" /><circle cx="112" cy="126" r="4" fill="#dc2626" /><circle cx="148" cy="126" r="4" fill="#dc2626" /></>;
  if (eyes === 'eyes-02') return <><path d="M100 126 Q112 118 124 126 M136 126 Q148 118 160 126" stroke="#111827" strokeWidth="4" strokeLinecap="round" fill="none" /></>;
  return <><ellipse cx="112" cy="128" rx="10" ry="8" fill="#fff" /><ellipse cx="148" cy="128" rx="10" ry="8" fill="#fff" /><circle cx="112" cy="128" r="4" fill="#111827" /><circle cx="148" cy="128" r="4" fill="#111827" /></>;
}

function renderEyebrows(eyebrows: string, color: string) {
  if (eyebrows === 'brows-06') return null;
  const stroke = color || '#111827';
  if (eyebrows === 'brows-03') return <><path d="M96 106 L124 114 M164 106 L136 114" stroke={stroke} strokeWidth="6" strokeLinecap="round" /></>;
  if (eyebrows === 'brows-04') return <><path d="M96 104 L124 116 M136 116 L164 104" stroke={stroke} strokeWidth="6" strokeLinecap="round" /></>;
  if (eyebrows === 'brows-05') return <><path d="M96 108 H124 M136 108 H164" stroke={stroke} strokeWidth="7" strokeLinecap="round" /></>;
  return <><path d="M98 108 H122 M138 108 H162" stroke={stroke} strokeWidth="4" strokeLinecap="round" /></>;
}

function renderNose(nose: string, skin: string) {
  const line = shade(skin, 42);
  if (nose === 'nose-06') return <path d="M122 132 H138 L134 160 H126 Z" fill="#475569" opacity="0.78" />;
  if (nose === 'nose-04') return <path d="M122 134 C114 152 116 162 136 162 M118 162 C124 168 134 168 140 162" stroke={line} strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (nose === 'nose-05') return <path d="M130 130 L120 164 H138" stroke={line} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  return <path d="M130 132 C124 148 122 158 136 158" stroke={line} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
}

function renderMouth(mouth: string, eyes: string) {
  const serious = eyes === 'eyes-03' || eyes === 'eyes-06' || mouth === 'mouth-03';
  if (mouth === 'mouth-02') return <path d="M114 174 H148" stroke="#3f1f16" strokeWidth="4" strokeLinecap="round" />;
  if (mouth === 'mouth-05') return <path d="M106 166 C120 188 144 188 158 166 M116 168 L122 180 M142 168 L136 180" stroke="#7f1d1d" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (serious) return <path d="M112 174 Q130 164 148 174" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
  return <path d="M110 170 Q130 186 150 170" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
}

function renderFacialHair(facialHair: string, color: string) {
  const hair = color || '#111827';
  if (facialHair === 'facial-04') return <path d="M92 150 C106 198 154 198 168 150 L160 180 C146 214 114 214 100 180 Z" fill={hair} opacity="0.76" />;
  if (facialHair === 'facial-01') return <path d="M104 162 C116 184 144 184 156 162 C146 198 114 198 104 162 Z" fill={hair} opacity="0.62" />;
  if (facialHair === 'facial-02') return <path d="M118 174 Q130 204 142 174 C138 208 122 208 118 174 Z" fill={hair} opacity="0.75" />;
  if (facialHair === 'facial-03') return <path d="M106 164 C118 156 124 162 130 166 C136 162 144 156 156 164 C142 172 136 172 130 168 C124 172 118 172 106 164 Z" fill={hair} />;
  if (facialHair === 'facial-05') return <path d="M104 164 C118 180 142 180 156 164 L150 180 C140 194 120 194 110 180 Z" fill={hair} opacity="0.72" />;
  return null;
}

function renderHair(hair: string, color: string, face: string) {
  if (hair === 'hair-08') return null;
  const c = color || '#111827';
  if (hair === 'hair-02') return <path d="M76 112 L94 58 L108 98 L126 44 L138 98 L164 54 L162 108 L190 82 L178 128 C146 104 112 104 76 112 Z" fill={c} />;
  if (hair === 'hair-03') return <g fill={c}>{Array.from({ length: 15 }).map((_, index) => <circle key={index} cx={76 + index * 8} cy={72 + (index % 4) * 10} r="14" />)}<path d="M78 110 C96 78 164 78 182 110 C150 98 112 98 78 110 Z" /></g>;
  if (hair === 'hair-04') return <path d="M76 106 C78 52 184 52 186 106 L202 224 C174 210 166 152 176 112 C146 98 114 98 84 112 C94 152 86 210 58 224 Z" fill={c} />;
  if (hair === 'hair-06') return <><path d="M112 110 L128 36 L144 110 C132 104 124 104 112 110 Z" fill={c} /><path d="M82 118 C104 96 156 96 178 118 C142 104 112 104 82 118 Z" fill={c} /></>;
  if (hair === 'hair-07') return <path d="M62 116 C72 62 108 44 146 62 C176 76 186 104 176 136 C146 106 110 106 82 130 Z M176 118 C196 134 202 168 190 206 C174 168 166 140 176 118 Z" fill={c} />;
  if (hair === 'hair-09') return <path d="M60 116 C62 48 198 48 200 116 L180 214 C164 164 96 164 80 214 Z" fill={c} />;
  if (hair === 'hair-10') return <path d="M70 118 L94 54 L108 96 L132 34 L144 98 L174 48 L168 108 L198 78 L184 132 C150 104 108 104 70 118 Z" fill={c} />;
  if (hair === 'hair-11') return <path d="M72 112 C82 58 182 58 186 112 C164 98 142 98 130 116 C116 98 94 98 72 112 Z M80 112 L56 210 L94 164 Z M180 112 L204 210 L166 164 Z" fill={c} />;
  if (hair === 'hair-12') return <g stroke={c} strokeWidth="9" strokeLinecap="round" fill="none"><path d="M88 104 C74 140 70 174 78 214" /><path d="M108 88 C98 132 98 174 110 226" /><path d="M152 88 C162 132 162 174 150 226" /><path d="M172 104 C186 140 190 174 182 214" /><path d="M84 96 C106 58 154 58 176 96" strokeWidth="20" /></g>;
  if (hair === 'hair-13') return <path d="M70 118 C70 62 118 42 164 62 C190 74 198 106 184 138 C166 110 140 108 126 126 C114 106 92 106 70 118 Z" fill={c} />;
  if (hair === 'hair-14') return <path d="M72 112 C90 56 146 48 190 88 C160 88 142 102 128 128 C114 108 92 108 72 124 Z" fill={c} />;
  if (hair === 'hair-15') return <path d="M78 108 C92 62 172 62 184 108 C150 92 112 92 78 108 Z M92 96 C112 74 150 74 170 96" fill={c} />;
  return <path d={face === 'face-05' ? 'M68 112 C72 62 118 46 164 62 C190 72 196 100 186 126 C154 106 112 104 68 112 Z' : 'M76 112 C80 66 122 50 164 68 C184 78 190 104 182 126 C150 108 112 106 76 112 Z'} fill={c} />;
}

function renderHeadwear(headwear: string) {
  if (headwear === 'headwear-02') return <path d="M92 74 L108 42 L130 68 L152 42 L168 74 L158 92 H102 Z" fill="#facc15" stroke="#92400e" strokeWidth="4" />;
  if (headwear === 'headwear-03') return <path d="M66 110 L90 42 L112 92 C124 82 136 82 148 92 L170 42 L194 110 L180 174 C164 120 96 120 80 174 Z" fill="#020617" opacity="0.96" />;
  if (headwear === 'headwear-04') return <path d="M118 88 L106 114 L122 110 L112 138" stroke="#facc15" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  if (headwear === 'headwear-05') return <path d="M72 112 C82 58 178 58 188 112 L176 148 H84 Z" fill="#475569" stroke="#111827" strokeWidth="5" />;
  if (headwear === 'headwear-06') return <path d="M76 102 C90 60 170 60 184 102 H76 Z M176 100 L218 110" fill="#1d4ed8" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />;
  if (headwear === 'headwear-01') return <path d="M92 78 H168 L160 96 H100 Z" fill="#111827" stroke="#e0f2fe" strokeWidth="3" />;
  return null;
}

function renderAccessory(accessory: string) {
  if (accessory === 'accessory-01') return <><circle cx="112" cy="126" r="14" fill="none" stroke="#111827" strokeWidth="5" /><circle cx="148" cy="126" r="14" fill="none" stroke="#111827" strokeWidth="5" /><path d="M126 126 H134" stroke="#111827" strokeWidth="5" /></>;
  if (accessory === 'accessory-02') return <path d="M82 112 C110 94 150 94 178 112 L168 140 C146 128 114 128 92 140 Z" fill="#111827" opacity="0.9" />;
  if (accessory === 'accessory-03') return <path d="M156 104 L142 130 L160 126 L146 156" stroke="#7f1d1d" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (accessory === 'accessory-04') return <path d="M208 74 L174 134 H198 L154 228" stroke="#fde047" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  if (accessory === 'accessory-06') return <path d="M80 84 L100 32 L118 92 M142 92 L160 32 L180 84" fill="#020617" stroke="#111827" strokeWidth="5" strokeLinejoin="round" />;
  if (accessory === 'accessory-07') return <><circle cx="210" cy="78" r="22" fill="#dc2626" /><path d="M210 100 C212 136 196 156 202 190" stroke="#f8fafc" strokeWidth="3" fill="none" /></>;
  if (accessory === 'accessory-09') return <path d="M206 126 L230 242 M198 142 L220 132 M216 120 L238 110" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />;
  if (accessory === 'accessory-10') return <><rect x="196" y="176" width="13" height="54" rx="7" fill="#111827" /><circle cx="202" cy="166" r="15" fill="#64748b" stroke="#e5e7eb" strokeWidth="3" /></>;
  if (accessory === 'accessory-11') return <path d="M202 118 L236 44 M228 46 L240 52 M232 60 L244 66" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />;
  if (accessory === 'accessory-12') return <path d="M204 78 V240 M188 100 L204 78 L220 100 M190 126 H218" stroke="#facc15" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  if (accessory === 'accessory-13') return <><circle cx="206" cy="236" r="20" fill="#facc15" stroke="#92400e" strokeWidth="4" /><circle cx="196" cy="228" r="3" fill="#ef4444" /><circle cx="206" cy="226" r="3" fill="#22d3ee" /><circle cx="216" cy="228" r="3" fill="#a78bfa" /></>;
  if (accessory === 'accessory-14') return <><rect x="196" y="176" width="40" height="30" rx="6" fill="#111827" /><circle cx="216" cy="191" r="9" fill="#475569" stroke="#e5e7eb" strokeWidth="3" /></>;
  return null;
}

function renderFrame(frame: string) {
  const accent = frameAccent(frame);
  const dark = frame === 'frame-horror' ? '#3f0610' : '#050816';
  return (
    <g fill="none">
      <rect x="6" y="6" width="248" height="348" rx="22" stroke={dark} strokeWidth="10" />
      <rect x="16" y="16" width="228" height="328" rx="16" stroke={accent} strokeWidth="5" />
      <path d="M28 30 H94 M166 30 H232 M28 330 H94 M166 330 H232" stroke="#ffffff" strokeWidth="2" opacity="0.32" />
      <rect x="25" y="25" width="210" height="310" rx="11" stroke="#020617" strokeWidth="2" opacity="0.45" />
    </g>
  );
}

function renderNamePlate(name: string, frame: string) {
  const label = name.trim().slice(0, 18).toUpperCase();
  return (
    <g>
      <rect x="36" y="304" width="188" height="34" rx="10" fill="#020617" opacity="0.88" />
      <rect x="42" y="310" width="176" height="22" rx="7" fill={frameAccent(frame)} opacity="0.24" />
      <text x="130" y="326" textAnchor="middle" fontSize={label.length > 12 ? 12 : 14} fontFamily="Arial, sans-serif" fontWeight="900" fill="#ffffff">
        {label}
      </text>
    </g>
  );
}

function clothingPanel(clothes: string, fallback: string) {
  if (clothes === 'clothes-03' || clothes === 'clothes-17') return '#1f2937';
  if (clothes === 'clothes-08' || clothes === 'clothes-12' || clothes === 'clothes-15') return '#020617';
  if (clothes === 'clothes-09') return '#f8fafc';
  return fallback;
}

function frameAccent(frame: string) {
  const colors: Record<string, string> = {
    'frame-common': '#cbd5e1',
    'frame-rare': '#60a5fa',
    'frame-epic': '#a855f7',
    'frame-legendary': '#facc15',
    'frame-horror': '#ef4444',
    'frame-speed': '#fde047',
    'frame-tech': '#22d3ee',
    'frame-ocean': '#67e8f9',
  };
  return colors[frame] || colors['frame-common'];
}

function shade(hex: string, amount = 35) {
  return mix(hex, '#000000', amount);
}

function tint(hex: string, amount = 24) {
  return mix(hex, '#ffffff', amount);
}

function mix(hex: string, target: string, amount: number) {
  const source = normalizeHex(hex);
  const dest = normalizeHex(target);
  const ratio = Math.max(0, Math.min(100, amount)) / 100;
  const values = [0, 2, 4].map((index) => {
    const a = parseInt(source.slice(index, index + 2), 16);
    const b = parseInt(dest.slice(index, index + 2), 16);
    return Math.round(a + (b - a) * ratio);
  });
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeHex(hex: string) {
  const value = hex.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(value)) return value;
  return '111827';
}
