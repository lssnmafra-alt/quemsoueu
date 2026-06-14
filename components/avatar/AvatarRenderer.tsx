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
  'skin-01': '#f8d6b3',
  'skin-02': '#d99a5b',
  'skin-03': '#b8733f',
  'skin-04': '#8b4f2f',
  'skin-05': '#5b2e1f',
  'skin-06': '#22c55e',
  'skin-07': '#7c3aed',
  'skin-08': '#38bdf8',
};

export default function AvatarRenderer({ config, name, className }: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config || DEFAULT_AVATAR_CONFIG);
  const skin = skinColors[avatar.skin] || skinColors['skin-02'];

  return (
    <svg viewBox="0 0 240 320" role="img" aria-label="Avatar do personagem" className={cn('w-full h-full', className)}>
      <defs>
        <linearGradient id={`bg-${avatar.background}`} x1="0" x2="1" y1="0" y2="1">
          {renderBackgroundGradient(avatar.background)}
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#111827" floodOpacity="0.3" />
        </filter>
      </defs>

      <rect width="240" height="320" rx="18" fill={`url(#bg-${avatar.background})`} />
      {renderBackgroundDetails(avatar.background)}

      <g filter="url(#softShadow)">
        {renderClothes(avatar.clothes, avatar.clothesColor)}
        {renderNeck(skin)}
        {renderFace(avatar.face, skin)}
        {renderEars(skin)}
        {renderEyes(avatar.eyes)}
        {renderNose(skin)}
        {renderMouth(avatar.eyes)}
        {renderHair(avatar.hair, avatar.hairColor)}
        {renderAccessory(avatar.accessory)}
      </g>

      {renderFrame(avatar.frame)}
      {name && renderCardName(name, avatar.frame)}
    </svg>
  );
}

function renderBackgroundGradient(background: string) {
  const gradients: Record<string, [string, string, string]> = {
    'bg-01': ['#1e1b4b', '#4338ca', '#0f172a'],
    'bg-02': ['#450a0a', '#dc2626', '#f97316'],
    'bg-03': ['#082f49', '#38bdf8', '#e0f2fe'],
    'bg-04': ['#2e1065', '#7c3aed', '#22d3ee'],
    'bg-05': ['#111827', '#334155', '#facc15'],
    'bg-06': ['#052e16', '#16a34a', '#bef264'],
    'bg-07': ['#450a0a', '#991b1b', '#f8fafc'],
    'bg-08': ['#020617', '#312e81', '#f59e0b'],
    'bg-09': ['#020617', '#1e1b4b', '#64748b'],
    'bg-10': ['#064e3b', '#16a34a', '#facc15'],
  };
  const [a, b, c] = gradients[background] || gradients['bg-01'];

  return (
    <>
      <stop offset="0%" stopColor={a} />
      <stop offset="55%" stopColor={b} />
      <stop offset="100%" stopColor={c} />
    </>
  );
}

function renderBackgroundDetails(background: string) {
  if (background === 'bg-02') {
    return (
      <g opacity="0.45">
        <path d="M22 285 C45 220 20 180 62 130 C62 185 110 188 86 270 Z" fill="#facc15" />
        <path d="M178 300 C215 250 182 210 212 150 C224 215 248 235 222 310 Z" fill="#fb923c" />
      </g>
    );
  }

  if (background === 'bg-03') {
    return (
      <g stroke="#e0f2fe" strokeWidth="3" opacity="0.55">
        <path d="M24 64 L68 96 M52 48 L54 106 M86 48 L42 108" />
        <path d="M174 72 L216 112 M202 60 L198 124 M220 70 L176 118" />
      </g>
    );
  }

  if (background === 'bg-04') {
    return (
      <g stroke="#fef08a" strokeWidth="5" opacity="0.75" fill="none">
        <path d="M45 72 L75 112 L55 112 L92 170" />
        <path d="M185 52 L152 104 L178 100 L140 180" />
      </g>
    );
  }

  if (background === 'bg-05') {
    return (
      <g fill="#0f172a" opacity="0.72">
        <rect x="18" y="150" width="34" height="120" />
        <rect x="62" y="112" width="46" height="158" />
        <rect x="134" y="132" width="38" height="138" />
        <rect x="184" y="92" width="34" height="178" />
      </g>
    );
  }

  if (background === 'bg-06') {
    return (
      <g fill="#bbf7d0" opacity="0.35">
        <path d="M28 248 C60 166 84 190 92 110 C128 180 106 216 74 278 Z" />
        <path d="M184 286 C154 210 178 166 214 128 C218 194 238 226 212 298 Z" />
      </g>
    );
  }

  if (background === 'bg-07') {
    return (
      <g opacity="0.42">
        <path d="M0 320 C58 230 76 160 32 88 C92 136 126 210 82 320 Z" fill="#ef4444" />
        <path d="M240 320 C182 230 164 160 208 88 C148 136 114 210 158 320 Z" fill="#f8fafc" />
        <circle cx="195" cy="70" r="26" fill="#dc2626" />
      </g>
    );
  }

  if (background === 'bg-08') {
    return (
      <g opacity="0.55">
        <circle cx="50" cy="68" r="2" fill="#fff" />
        <circle cx="94" cy="42" r="3" fill="#fff" />
        <circle cx="190" cy="88" r="2" fill="#fff" />
        <circle cx="180" cy="230" r="36" fill="#f59e0b" opacity="0.35" />
        <path d="M34 245 C96 200 156 190 222 226" stroke="#a78bfa" strokeWidth="4" fill="none" />
      </g>
    );
  }

  if (background === 'bg-09') {
    return (
      <g fill="#020617" opacity="0.72">
        <path d="M42 88 Q56 74 70 88 Q56 84 42 88 Z" />
        <path d="M162 76 Q178 60 194 76 Q178 72 162 76 Z" />
        <path d="M150 132 Q170 112 190 132 Q170 126 150 132 Z" />
      </g>
    );
  }

  if (background === 'bg-10') {
    return (
      <g opacity="0.45">
        <rect x="0" y="230" width="240" height="90" fill="#14532d" />
        <path d="M10 252 H230 M40 230 V320 M200 230 V320" stroke="#f8fafc" strokeWidth="4" />
        <circle cx="120" cy="250" r="28" stroke="#f8fafc" strokeWidth="3" fill="none" />
      </g>
    );
  }

  return (
    <g opacity="0.25">
      <circle cx="44" cy="48" r="28" fill="#fff" />
      <circle cx="205" cy="252" r="35" fill="#fff" />
      <path d="M16 96 C78 44 158 34 224 76" stroke="#fff" strokeWidth="5" fill="none" />
    </g>
  );
}

function renderFace(face: string, skin: string) {
  const shapes: Record<string, ReactNode> = {
    'face-01': <path d="M75 118 C75 74 165 74 165 118 L160 164 C154 199 86 199 80 164 Z" fill={skin} />,
    'face-02': <ellipse cx="120" cy="130" rx="48" ry="58" fill={skin} />,
    'face-03': <path d="M76 92 H164 L172 146 C168 190 72 190 68 146 Z" fill={skin} />,
    'face-04': <path d="M82 105 C88 68 152 68 158 105 L150 172 C142 205 98 205 90 172 Z" fill={skin} />,
    'face-05': <path d="M70 104 C72 64 168 64 170 104 L162 174 C152 210 88 210 78 174 Z" fill={skin} />,
    'face-06': <path d="M74 92 H166 L160 172 C150 198 90 198 80 172 Z" fill={skin} />,
  };

  return shapes[face] || shapes['face-01'];
}

function renderEars(skin: string) {
  return (
    <g fill={skin}>
      <ellipse cx="72" cy="132" rx="10" ry="16" />
      <ellipse cx="168" cy="132" rx="10" ry="16" />
    </g>
  );
}

function renderNeck(skin: string) {
  return <path d="M100 178 H140 V220 H100 Z" fill={skin} />;
}

function renderEyes(eyes: string) {
  if (eyes === 'eyes-02') {
    return (
      <g stroke="#111827" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M92 124 Q102 116 112 124" />
        <path d="M128 124 Q138 116 148 124" />
      </g>
    );
  }

  if (eyes === 'eyes-03') {
    return (
      <g>
        <path d="M90 116 L112 124" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <path d="M150 116 L128 124" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <circle cx="102" cy="132" r="5" fill="#111827" />
        <circle cx="138" cy="132" r="5" fill="#111827" />
      </g>
    );
  }

  if (eyes === 'eyes-04') {
    return (
      <g stroke="#111827" strokeWidth="4" strokeLinecap="round">
        <path d="M93 130 H111" />
        <path d="M129 130 H147" />
      </g>
    );
  }

  if (eyes === 'eyes-05') {
    return (
      <g>
        <ellipse cx="102" cy="128" rx="9" ry="12" fill="#fff" />
        <ellipse cx="138" cy="128" rx="9" ry="12" fill="#fff" />
        <circle cx="102" cy="130" r="5" fill="#2563eb" />
        <circle cx="138" cy="130" r="5" fill="#2563eb" />
        <circle cx="100" cy="126" r="2" fill="#fff" />
        <circle cx="136" cy="126" r="2" fill="#fff" />
      </g>
    );
  }

  if (eyes === 'eyes-06') {
    return (
      <g>
        <path d="M82 116 C102 104 138 104 158 116 L150 142 C134 134 106 134 90 142 Z" fill="#111827" />
        <path d="M94 124 L112 121 L106 132 Z" fill="#e0f2fe" />
        <path d="M146 124 L128 121 L134 132 Z" fill="#e0f2fe" />
      </g>
    );
  }

  if (eyes === 'eyes-07') {
    return (
      <g>
        <circle cx="102" cy="128" r="9" fill="#f8fafc" />
        <circle cx="138" cy="128" r="9" fill="#f8fafc" />
        <circle cx="102" cy="128" r="3" fill="#dc2626" />
        <circle cx="138" cy="128" r="3" fill="#dc2626" />
        <path d="M94 110 L108 124 M146 110 L132 124" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === 'eyes-08') {
    return (
      <g>
        <path d="M86 118 H154 L146 138 H94 Z" fill="#facc15" stroke="#111827" strokeWidth="4" />
        <path d="M96 128 H116 M126 128 H146" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === 'eyes-09') {
    return <path d="M84 118 H156 L150 136 H90 Z" fill="#0f172a" stroke="#22d3ee" strokeWidth="4" />;
  }

  return (
    <g>
      <ellipse cx="102" cy="128" rx="8" ry="7" fill="#fff" />
      <ellipse cx="138" cy="128" rx="8" ry="7" fill="#fff" />
      <circle cx="102" cy="128" r="4" fill="#111827" />
      <circle cx="138" cy="128" r="4" fill="#111827" />
    </g>
  );
}

function renderNose(skin: string) {
  return <path d="M120 132 C116 145 112 154 124 154" stroke={shade(skin)} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

function renderMouth(eyes: string) {
  const angry = eyes === 'eyes-03' || eyes === 'eyes-06';
  return <path d={angry ? 'M104 166 Q120 156 136 166' : 'M102 164 Q120 178 138 164'} stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
}

function renderHair(hair: string, color: string) {
  const hairColor = color || '#111827';
  const shapes: Record<string, ReactNode> = {
    'hair-01': <path d="M76 113 C78 72 112 60 150 76 C166 84 170 104 166 122 C142 104 108 102 76 113 Z" fill={hairColor} />,
    'hair-02': <path d="M72 116 L86 72 L98 102 L112 62 L124 102 L142 66 L150 106 L170 90 L164 124 C136 104 104 104 72 116 Z" fill={hairColor} />,
    'hair-03': (
      <g fill={hairColor}>
        {Array.from({ length: 13 }).map((_, i) => <circle key={i} cx={72 + i * 8} cy={86 + (i % 3) * 8} r="13" />)}
        <path d="M76 108 C92 82 148 82 164 108 C138 100 104 100 76 108 Z" />
      </g>
    ),
    'hair-04': <path d="M74 110 C78 66 164 66 168 110 L178 196 C156 184 150 140 160 112 C134 104 106 104 80 112 C90 140 84 184 62 196 Z" fill={hairColor} />,
    'hair-05': <path d="M74 110 C86 70 124 60 166 82 C142 82 136 94 170 110 C136 100 106 102 74 118 Z" fill={hairColor} />,
    'hair-06': <path d="M102 110 L116 48 L128 110 C118 104 110 104 102 110 Z M80 118 C92 96 148 96 160 118 C132 104 108 104 80 118 Z" fill={hairColor} />,
    'hair-07': <path d="M60 118 C68 74 96 58 126 72 C154 84 160 104 158 130 C130 104 98 104 76 126 Z M158 118 C176 128 182 154 174 182 C160 154 152 132 158 118 Z" fill={hairColor} />,
    'hair-08': <path d="M86 106 C96 72 146 72 156 106 C132 98 110 98 86 106 Z" fill={shade(hairColor)} opacity="0.12" />,
    'hair-09': <path d="M66 116 C66 66 174 66 174 116 L162 174 C148 138 92 138 78 174 Z" fill={hairColor} />,
    'hair-10': <path d="M66 120 L86 66 L98 100 L118 42 L128 100 L154 52 L150 106 L176 82 L164 130 C136 104 102 104 66 120 Z" fill={hairColor} />,
    'hair-11': <path d="M72 112 C78 62 166 62 168 112 C150 98 130 96 120 112 C108 94 90 98 72 112 Z M78 112 L60 180 L88 156 Z M162 112 L180 180 L152 156 Z" fill={hairColor} />,
    'hair-12': (
      <g stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M84 104 C74 134 70 158 76 188" />
        <path d="M102 94 C94 132 94 162 102 198" />
        <path d="M138 94 C146 132 146 162 138 198" />
        <path d="M156 104 C166 134 170 158 164 188" />
        <path d="M82 100 C100 74 140 74 158 100" strokeWidth="18" />
      </g>
    ),
  };

  return shapes[hair] || shapes['hair-01'];
}

function renderClothes(clothes: string, color: string) {
  const base = color || '#7c3aed';
  const dark = shade(base);
  const shapes: Record<string, ReactNode> = {
    'clothes-01': <path d="M62 300 C70 226 92 204 120 204 C148 204 170 226 178 300 Z" fill={base} />,
    'clothes-02': (
      <g>
        <path d="M58 300 C66 224 92 204 120 204 C148 204 174 224 182 300 Z" fill={base} />
        <path d="M104 208 H136 L130 300 H110 Z" fill="#fff" opacity="0.85" />
        <circle cx="120" cy="242" r="18" fill="#fff" opacity="0.85" />
      </g>
    ),
    'clothes-03': (
      <g>
        <path d="M56 300 C72 222 92 204 120 204 C148 204 168 222 184 300 Z" fill={dark} />
        <path d="M84 214 H156 L146 272 H94 Z" fill={base} />
        <circle cx="100" cy="232" r="10" fill="#cbd5e1" />
        <circle cx="140" cy="232" r="10" fill="#cbd5e1" />
      </g>
    ),
    'clothes-04': (
      <g>
        <path d="M50 300 C76 222 96 204 120 204 C144 204 164 222 190 300 Z" fill={base} />
        <path d="M88 212 Q120 240 152 212 L162 300 H78 Z" fill={dark} opacity="0.65" />
      </g>
    ),
    'clothes-05': (
      <g>
        <path d="M58 300 C70 224 92 204 120 204 C148 204 170 224 182 300 Z" fill="#e5e7eb" />
        <path d="M58 300 L92 212 L118 300 Z M182 300 L148 212 L122 300 Z" fill={base} />
      </g>
    ),
    'clothes-06': (
      <g>
        <path d="M60 300 C72 222 92 204 120 204 C148 204 168 222 180 300 Z" fill={dark} />
        <path d="M90 224 H150 L144 286 H96 Z" fill={base} />
        <circle cx="120" cy="246" r="17" fill="#67e8f9" />
      </g>
    ),
    'clothes-07': (
      <g>
        <path d="M56 300 C68 222 92 204 120 204 C148 204 172 222 184 300 Z" fill={base} />
        <path d="M122 212 L104 252 H124 L106 292 L150 232 H128 L142 212 Z" fill="#facc15" />
      </g>
    ),
    'clothes-08': (
      <g>
        <path d="M48 300 C70 220 92 204 120 204 C148 204 170 220 192 300 Z" fill="#020617" />
        <path d="M86 218 L120 246 L154 218 L145 300 H95 Z" fill={base} />
        <path d="M96 228 Q120 250 144 228 Q132 236 120 224 Q108 236 96 228 Z" fill="#94a3b8" />
      </g>
    ),
    'clothes-09': (
      <g>
        <path d="M54 300 C70 222 92 204 120 204 C148 204 170 222 186 300 Z" fill="#f8fafc" />
        <path d="M62 300 L96 214 L118 300 Z M178 300 L144 214 L122 300 Z" fill={base} />
        <circle cx="120" cy="238" r="9" fill="#dc2626" />
        <circle cx="120" cy="266" r="9" fill="#dc2626" />
      </g>
    ),
    'clothes-10': (
      <g>
        <path d="M60 300 C72 222 92 204 120 204 C148 204 168 222 180 300 Z" fill={base} />
        <path d="M82 226 L110 246 L92 262 L124 286 L94 300 H62 Z" fill={dark} opacity="0.55" />
        <path d="M148 220 L132 252 L160 244 L138 286 L178 300 H178 Z" fill="#111827" opacity="0.25" />
      </g>
    ),
    'clothes-11': (
      <g>
        <path d="M58 300 C74 226 94 206 120 206 C146 206 166 226 182 300 Z" fill={base} />
        <path d="M84 210 L120 232 L156 210 L146 236 L160 300 H80 L94 236 Z" fill="#1d4ed8" opacity="0.85" />
      </g>
    ),
    'clothes-12': (
      <g>
        <path d="M56 300 C70 222 92 204 120 204 C148 204 170 222 184 300 Z" fill="#111827" />
        <path d="M82 214 H158 L148 300 H92 Z" fill={base} opacity="0.7" />
        <path d="M72 238 H168" stroke="#64748b" strokeWidth="8" />
      </g>
    ),
    'clothes-13': (
      <g>
        <path d="M40 300 C70 222 92 204 120 204 C148 204 170 222 200 300 Z" fill="#b91c1c" />
        <path d="M64 300 C74 226 94 206 120 206 C146 206 166 226 176 300 Z" fill={base} />
        <path d="M100 218 L120 246 L140 218 Z" fill="#facc15" />
      </g>
    ),
    'clothes-14': (
      <g>
        <path d="M60 300 C72 222 92 204 120 204 C148 204 168 222 180 300 Z" fill="#111827" />
        <path d="M86 218 H154 L148 300 H92 Z" fill={base} />
        <circle cx="102" cy="228" r="7" fill="#22d3ee" />
        <circle cx="138" cy="228" r="7" fill="#22d3ee" />
      </g>
    ),
  };

  return shapes[clothes] || shapes['clothes-01'];
}

function renderAccessory(accessory: string) {
  if (accessory === 'accessory-01') {
    return (
      <g fill="none" stroke="#111827" strokeWidth="5">
        <circle cx="102" cy="128" r="13" />
        <circle cx="138" cy="128" r="13" />
        <path d="M115 128 H125" />
      </g>
    );
  }

  if (accessory === 'accessory-02') {
    return <path d="M76 116 C104 100 136 100 164 116 L154 138 C132 128 108 128 86 138 Z" fill="#111827" opacity="0.9" />;
  }

  if (accessory === 'accessory-03') {
    return <path d="M146 104 L134 126 L150 123 L138 150" stroke="#7f1d1d" strokeWidth="4" fill="none" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-04') {
    return <path d="M178 74 L154 122 H174 L144 182" stroke="#fde047" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }

  if (accessory === 'accessory-05') {
    return <path d="M84 72 L102 44 L120 70 L138 44 L156 72 L148 88 H92 Z" fill="#facc15" stroke="#92400e" strokeWidth="4" />;
  }

  if (accessory === 'accessory-06') {
    return <path d="M78 78 L96 34 L112 82 M128 82 L144 34 L162 78" fill="#020617" stroke="#111827" strokeWidth="4" strokeLinejoin="round" />;
  }

  if (accessory === 'accessory-07') {
    return (
      <g>
        <circle cx="198" cy="74" r="20" fill="#dc2626" />
        <path d="M198 94 C200 128 184 148 190 178" stroke="#f8fafc" strokeWidth="3" fill="none" />
      </g>
    );
  }

  if (accessory === 'accessory-08') {
    return (
      <g>
        <path d="M70 112 C76 64 164 64 170 112 L160 146 H80 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="4" />
        <path d="M94 118 H146 L140 134 H100 Z" fill="#fde68a" />
      </g>
    );
  }

  if (accessory === 'accessory-09') {
    return <path d="M190 120 L212 220 M184 136 L202 128 M198 116 L220 108" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-10') {
    return (
      <g>
        <rect x="184" y="154" width="12" height="48" rx="6" fill="#111827" />
        <circle cx="190" cy="146" r="13" fill="#64748b" />
      </g>
    );
  }

  return null;
}

function renderFrame(frame: string) {
  const colors: Record<string, [string, string]> = {
    'frame-common': ['#e5e7eb', '#64748b'],
    'frame-rare': ['#60a5fa', '#1d4ed8'],
    'frame-epic': ['#c084fc', '#7e22ce'],
    'frame-legendary': ['#facc15', '#b45309'],
    'frame-horror': ['#ef4444', '#450a0a'],
    'frame-speed': ['#fde047', '#dc2626'],
  };
  const [light, dark] = colors[frame] || colors['frame-common'];

  return (
    <g fill="none">
      <rect x="6" y="6" width="228" height="308" rx="18" stroke="#111827" strokeWidth="8" />
      <rect x="14" y="14" width="212" height="292" rx="13" stroke={light} strokeWidth="5" />
      <rect x="22" y="22" width="196" height="276" rx="9" stroke={dark} strokeWidth="2" opacity="0.8" />
    </g>
  );
}

function renderCardName(name: string, frame: string) {
  const text = name.trim().slice(0, 18).toUpperCase();
  const frameColor = frame === 'frame-horror' ? '#fee2e2' : frame === 'frame-legendary' ? '#fef3c7' : '#eef2ff';

  return (
    <g>
      <rect x="26" y="270" width="188" height="32" rx="10" fill="#0f172a" opacity="0.86" />
      <rect x="30" y="274" width="180" height="24" rx="7" fill={frameColor} opacity="0.15" />
      <text
        x="120"
        y="291"
        textAnchor="middle"
        fontSize={text.length > 12 ? 12 : 14}
        fontFamily="Arial, sans-serif"
        fontWeight="900"
        letterSpacing="0"
        fill="#ffffff"
      >
        {text}
      </text>
    </g>
  );
}

function shade(hex: string) {
  const normalized = hex.replace('#', '');
  const r = Math.max(0, parseInt(normalized.slice(0, 2), 16) - 35);
  const g = Math.max(0, parseInt(normalized.slice(2, 4), 16) - 35);
  const b = Math.max(0, parseInt(normalized.slice(4, 6), 16) - 35);

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
