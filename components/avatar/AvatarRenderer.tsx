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
  'skin-09': '#94a3b8',
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
        {renderClothes(avatar.clothes, avatar.clothesColor, avatar.body)}
        {renderOuterwear(avatar.outerwear, avatar.clothesColor)}
        {renderNeck(skin)}
        {renderFace(avatar.face, skin)}
        {renderEars(skin)}
        {renderEyebrows(avatar.eyebrows, avatar.hairColor)}
        {renderEyes(avatar.eyes)}
        {renderNose(avatar.nose, skin)}
        {renderMouth(avatar.mouth, avatar.eyes)}
        {renderFacialHair(avatar.facialHair, avatar.hairColor)}
        {renderHair(avatar.hair, avatar.hairColor)}
        {renderHeadwear(avatar.headwear)}
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

  if (background === 'bg-11') {
    return (
      <g opacity="0.5">
        <rect x="18" y="70" width="204" height="172" fill="#3f2414" />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={26 + i * 28} y="82" width="18" height="136" fill={i % 2 ? '#7c2d12' : '#1e3a8a'} />
        ))}
        <path d="M42 54 C82 36 154 36 198 58" stroke="#facc15" strokeWidth="4" fill="none" />
      </g>
    );
  }

  if (background === 'bg-12') {
    return (
      <g opacity="0.5" fill="none" stroke="#e0f2fe" strokeWidth="4">
        <path d="M0 220 C40 200 80 240 120 220 C160 200 200 240 240 220" />
        <path d="M0 250 C40 230 80 270 120 250 C160 230 200 270 240 250" />
        <path d="M48 72 C78 54 110 54 140 72" />
      </g>
    );
  }

  if (background === 'bg-13') {
    return (
      <g opacity="0.55" stroke="#22d3ee" strokeWidth="3" fill="none">
        <path d="M24 92 H92 V52 H152 V112 H216" />
        <path d="M40 250 H104 V214 H170 V260 H220" />
        <circle cx="92" cy="52" r="5" fill="#22d3ee" />
        <circle cx="170" cy="214" r="5" fill="#22d3ee" />
      </g>
    );
  }

  if (background === 'bg-14') {
    return (
      <g opacity="0.45">
        <rect x="0" y="210" width="240" height="110" fill="#111827" />
        <circle cx="60" cy="70" r="28" fill="#ef4444" />
        <circle cx="180" cy="80" r="24" fill="#2563eb" />
        <path d="M52 260 H188" stroke="#f8fafc" strokeWidth="5" />
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
    'face-01': <path d="M78 116 C78 72 162 72 162 116 L156 168 C150 198 90 198 84 168 Z" fill={skin} />,
    'face-02': <ellipse cx="120" cy="132" rx="48" ry="58" fill={skin} />,
    'face-03': <path d="M76 92 H164 L170 146 L156 184 H84 L70 146 Z" fill={skin} />,
    'face-04': <path d="M84 104 C90 70 150 70 156 104 L150 174 C142 202 98 202 90 174 Z" fill={skin} />,
    'face-05': <path d="M68 104 C70 64 170 64 172 104 L164 176 C154 212 86 212 76 176 Z" fill={skin} />,
    'face-06': <path d="M74 94 H166 L160 172 C150 198 90 198 80 172 Z" fill={skin} />,
    'face-07': <path d="M76 104 C82 70 158 70 164 104 L156 166 L138 196 H102 L84 166 Z" fill={skin} />,
    'face-08': <path d="M80 106 C86 72 154 72 160 106 L154 162 C148 190 92 190 86 162 Z" fill={skin} />,
    'face-09': <path d="M74 94 H166 L174 146 L158 188 H82 L66 146 Z" fill={skin} stroke="#475569" strokeWidth="4" />,
    'face-10': <path d="M78 108 C82 72 158 72 162 108 L154 168 C148 196 92 196 86 168 Z" fill={skin} />,
  };

  return shapes[face] || shapes['face-01'];
}

function renderEars(skin: string) {
  return (
    <g fill={skin}>
      <ellipse cx="73" cy="132" rx="9" ry="15" />
      <ellipse cx="167" cy="132" rx="9" ry="15" />
    </g>
  );
}

function renderNeck(skin: string) {
  return <path d="M101 176 H139 V224 H101 Z" fill={skin} />;
}

function renderEyebrows(eyebrows: string, color: string) {
  const browColor = color || '#111827';
  if (eyebrows === 'brows-06') return null;
  if (eyebrows === 'brows-02') return <g stroke={browColor} strokeWidth="4" strokeLinecap="round"><path d="M90 112 Q102 104 113 110" /><path d="M127 110 Q139 104 151 112" /></g>;
  if (eyebrows === 'brows-03') return <g stroke={browColor} strokeWidth="5" strokeLinecap="round"><path d="M90 110 L113 116" /><path d="M150 110 L127 116" /></g>;
  if (eyebrows === 'brows-04') return <g stroke={browColor} strokeWidth="5" strokeLinecap="round"><path d="M88 108 L114 116" /><path d="M126 116 L152 108" /></g>;
  if (eyebrows === 'brows-05') return <g stroke={browColor} strokeWidth="7" strokeLinecap="round"><path d="M88 112 H114" /><path d="M126 112 H152" /></g>;
  return <g stroke={browColor} strokeWidth="4" strokeLinecap="round"><path d="M90 112 H112" /><path d="M128 112 H150" /></g>;
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

  if (eyes === 'eyes-10') {
    return (
      <g fill="none" stroke="#111827" strokeWidth="4">
        <circle cx="102" cy="128" r="12" />
        <circle cx="138" cy="128" r="12" />
        <path d="M114 128 H126" />
      </g>
    );
  }

  if (eyes === 'eyes-11') {
    return (
      <g>
        <ellipse cx="102" cy="128" rx="9" ry="7" fill="#e0f2fe" />
        <ellipse cx="138" cy="128" rx="9" ry="7" fill="#e0f2fe" />
        <circle cx="102" cy="128" r="4" fill="#0e7490" />
        <circle cx="138" cy="128" r="4" fill="#0e7490" />
      </g>
    );
  }

  if (eyes === 'eyes-12') {
    return (
      <g>
        <path d="M88 120 H114 L108 136 H92 Z" fill="#ef4444" />
        <path d="M126 120 H152 L148 136 H132 Z" fill="#ef4444" />
        <path d="M88 120 H114 M126 120 H152" stroke="#7f1d1d" strokeWidth="4" />
      </g>
    );
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

function renderNose(nose: string, skin: string) {
  const line = shade(skin);
  if (nose === 'nose-02') return <path d="M119 134 C116 144 117 150 123 151" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (nose === 'nose-03') return <path d="M121 128 C116 144 113 154 126 156 M115 158 H128" stroke={line} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
  if (nose === 'nose-04') return <path d="M116 132 C110 148 112 158 128 158 M112 158 C116 162 124 162 130 158" stroke={line} strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (nose === 'nose-05') return <path d="M120 128 L112 158 H126" stroke={line} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  if (nose === 'nose-06') return <path d="M112 134 H128 L124 158 H116 Z" fill="#475569" opacity="0.65" />;
  return <path d="M120 132 C116 145 112 154 124 154" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

function renderMouth(mouth: string, eyes: string) {
  const angry = eyes === 'eyes-03' || eyes === 'eyes-06';
  if (mouth === 'mouth-02') return <path d="M105 166 H136" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (mouth === 'mouth-03' || angry) return <path d="M104 168 Q120 158 136 168" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (mouth === 'mouth-04') return <path d="M104 164 Q120 174 138 160" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (mouth === 'mouth-05') return <path d="M100 164 Q120 182 142 164 M108 166 L112 174 M130 166 L126 174" stroke="#7f1d1d" strokeWidth="4" fill="none" strokeLinecap="round" />;
  if (mouth === 'mouth-06') return <path d="M98 164 C110 176 132 176 144 164" stroke="#3f1f16" strokeWidth="5" fill="none" strokeLinecap="round" />;
  return <path d="M102 164 Q120 178 138 164" stroke="#3f1f16" strokeWidth="4" fill="none" strokeLinecap="round" />;
}

function renderFacialHair(facialHair: string, color: string) {
  const hairColor = color || '#111827';
  if (facialHair === 'facial-01') return <path d="M94 158 C106 180 134 180 146 158 C136 194 104 194 94 158 Z" fill={hairColor} opacity="0.62" />;
  if (facialHair === 'facial-02') return <path d="M108 166 Q120 190 132 166 C128 198 112 198 108 166 Z" fill={hairColor} opacity="0.75" />;
  if (facialHair === 'facial-03') return <path d="M98 158 C110 150 116 156 120 160 C124 156 132 150 144 158 C132 166 126 166 120 162 C114 166 108 166 98 158 Z" fill={hairColor} />;
  if (facialHair === 'facial-04') return <path d="M88 150 C100 182 140 182 152 150 L146 178 C136 206 104 206 94 178 Z" fill={hairColor} opacity="0.78" />;
  if (facialHair === 'facial-05') return <path d="M96 158 C110 174 132 174 146 158 L140 174 C130 188 110 188 100 174 Z" fill={hairColor} opacity="0.7" />;
  return null;
}

function renderHair(hair: string, color: string) {
  const hairColor = color || '#111827';
  const shapes: Record<string, ReactNode> = {
    'hair-01': <path d="M76 118 C78 80 112 66 150 82 C166 90 170 110 166 128 C142 110 108 108 76 118 Z" fill={hairColor} />,
    'hair-02': (
      <g fill={hairColor}>
        <path d="M72 120 L86 80 L98 108 L112 72 L124 108 L142 76 L150 112 L170 96 L164 128 C136 110 104 110 72 120 Z" />
        <path d="M78 124 C94 106 144 106 162 124 C138 116 104 116 78 124 Z" fill={shade(hairColor)} opacity="0.45" />
      </g>
    ),
    'hair-03': (
      <g fill={hairColor}>
        {Array.from({ length: 13 }).map((_, i) => <circle key={i} cx={72 + i * 8} cy={86 + (i % 3) * 8} r="13" />)}
        <path d="M76 108 C92 82 148 82 164 108 C138 100 104 100 76 108 Z" />
      </g>
    ),
    'hair-04': <path d="M74 110 C78 66 164 66 168 110 L178 196 C156 184 150 140 160 112 C134 104 106 104 80 112 C90 140 84 184 62 196 Z" fill={hairColor} />,
    'hair-05': <path d="M74 118 C86 80 124 70 166 90 C142 90 136 100 170 118 C136 108 106 110 74 126 Z" fill={hairColor} />,
    'hair-06': <path d="M102 116 L116 58 L128 116 C118 110 110 110 102 116 Z M80 124 C92 104 148 104 160 124 C132 112 108 112 80 124 Z" fill={hairColor} />,
    'hair-07': <path d="M60 118 C68 74 96 58 126 72 C154 84 160 104 158 130 C130 104 98 104 76 126 Z M158 118 C176 128 182 154 174 182 C160 154 152 132 158 118 Z" fill={hairColor} />,
    'hair-08': <path d="M86 106 C96 72 146 72 156 106 C132 98 110 98 86 106 Z" fill={shade(hairColor)} opacity="0.12" />,
    'hair-09': <path d="M66 116 C66 66 174 66 174 116 L162 174 C148 138 92 138 78 174 Z" fill={hairColor} />,
    'hair-10': (
      <g fill={hairColor}>
        <path d="M66 124 L86 76 L98 108 L118 54 L128 108 L154 64 L150 114 L176 92 L164 132 C136 110 102 110 66 124 Z" />
        <path d="M78 128 C100 112 140 112 162 128 C138 120 102 120 78 128 Z" fill={shade(hairColor)} opacity="0.42" />
      </g>
    ),
    'hair-11': <path d="M72 118 C78 70 166 70 168 118 C150 104 130 102 120 118 C108 100 90 104 72 118 Z M78 118 L60 180 L88 156 Z M162 118 L180 180 L152 156 Z" fill={hairColor} />,
    'hair-12': (
      <g stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M84 104 C74 134 70 158 76 188" />
        <path d="M102 94 C94 132 94 162 102 198" />
        <path d="M138 94 C146 132 146 162 138 198" />
        <path d="M156 104 C166 134 170 158 164 188" />
        <path d="M82 100 C100 74 140 74 158 100" strokeWidth="18" />
      </g>
    ),
    'hair-13': (
      <g fill={hairColor}>
        <path d="M70 120 C70 78 108 60 148 76 C168 84 174 106 166 132 C152 112 130 110 116 126 C106 108 88 108 70 120 Z" />
        <path d="M86 84 C94 112 82 128 70 146 M112 72 C116 104 104 124 92 140 M142 78 C134 108 144 124 158 140" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" />
      </g>
    ),
    'hair-14': <path d="M70 116 C82 76 126 64 168 90 C146 92 130 104 118 126 C106 112 88 112 70 126 Z" fill={hairColor} />,
    'hair-15': <path d="M76 116 C84 78 160 78 166 116 C138 100 106 100 76 116 Z M86 102 C104 82 136 82 154 102" fill={hairColor} />,
  };

  return shapes[hair] || shapes['hair-01'];
}

function renderHeadwear(headwear: string) {
  if (headwear === 'headwear-01') return <path d="M86 86 H154 L148 102 H92 Z" fill="#111827" stroke="#e0f2fe" strokeWidth="3" />;
  if (headwear === 'headwear-02') return <path d="M84 78 L102 48 L120 74 L138 48 L156 78 L148 92 H92 Z" fill="#facc15" stroke="#92400e" strokeWidth="4" />;
  if (headwear === 'headwear-03') return <path d="M68 104 L88 48 L108 88 C116 82 124 82 132 88 L152 48 L172 104 L160 162 C146 116 94 116 80 162 Z" fill="#020617" opacity="0.95" />;
  if (headwear === 'headwear-04') return <path d="M106 88 L96 110 L110 106 L100 130" stroke="#facc15" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  if (headwear === 'headwear-05') return <path d="M70 112 C76 66 164 66 170 112 L160 142 H80 Z" fill="#475569" stroke="#111827" strokeWidth="4" />;
  if (headwear === 'headwear-06') return <path d="M76 104 C86 72 154 72 164 104 H76 Z M156 102 L194 112" fill="#1d4ed8" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />;
  return null;
}

function renderClothes(clothes: string, color: string, body: string) {
  const base = color || '#7c3aed';
  const dark = shade(base);
  const wide = body === 'body-03';
  const slim = body === 'body-04';
  const left = wide ? 42 : slim ? 70 : 58;
  const right = wide ? 198 : slim ? 170 : 182;
  const shapes: Record<string, ReactNode> = {
    'clothes-01': <path d={`M${left} 300 C70 226 92 204 120 204 C148 204 170 226 ${right} 300 Z`} fill={base} />,
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
    'clothes-15': (
      <g>
        <path d="M54 300 C70 222 92 204 120 204 C148 204 170 222 186 300 Z" fill="#111827" />
        <path d="M92 212 H148 L140 300 H100 Z" fill={base} opacity="0.85" />
        <path d="M96 222 H144" stroke="#facc15" strokeWidth="5" />
      </g>
    ),
    'clothes-16': (
      <g>
        <path d="M54 300 C70 222 92 204 120 204 C148 204 170 222 186 300 Z" fill={base} />
        <path d="M92 210 L120 244 L148 210 L158 300 H82 Z" fill="#facc15" opacity="0.75" />
        <path d="M96 236 H144" stroke="#0f766e" strokeWidth="6" />
      </g>
    ),
    'clothes-17': (
      <g>
        <path d="M50 300 C66 220 92 204 120 204 C148 204 174 220 190 300 Z" fill="#334155" />
        <path d="M82 216 H158 L148 300 H92 Z" fill={base} />
        <path d="M90 236 H150 M96 260 H144" stroke="#e2e8f0" strokeWidth="5" opacity="0.8" />
      </g>
    ),
    'clothes-18': (
      <g>
        <path d="M58 300 C70 224 92 204 120 204 C148 204 170 224 182 300 Z" fill={base} />
        <path d="M92 214 H148 L142 300 H98 Z" fill="#f8fafc" opacity="0.9" />
        <circle cx="120" cy="240" r="18" fill="#ef4444" />
        <path d="M111 232 L134 240 L111 248 Z" fill="#fff" />
      </g>
    ),
  };

  return shapes[clothes] || shapes['clothes-01'];
}

function renderOuterwear(outerwear: string, color: string) {
  const base = color || '#7c3aed';
  if (outerwear === 'outerwear-cape') return <path d="M52 300 C58 230 80 204 106 198 L120 230 L134 198 C160 204 182 230 188 300 Z" fill="#111827" opacity="0.82" />;
  if (outerwear === 'outerwear-robe') return <path d="M44 300 C62 222 90 198 120 198 C150 198 178 222 196 300 H154 L140 220 H100 L86 300 Z" fill="#020617" opacity="0.78" />;
  if (outerwear === 'outerwear-armor') return <path d="M78 214 H162 L152 292 H88 Z M92 224 H148 M96 250 H144" fill="none" stroke="#cbd5e1" strokeWidth="8" strokeLinejoin="round" opacity="0.9" />;
  if (outerwear === 'outerwear-ruff') return <path d="M72 210 L88 192 L104 210 L120 192 L136 210 L152 192 L168 210 L156 226 H84 Z" fill="#f8fafc" stroke="#dc2626" strokeWidth="4" />;
  if (outerwear === 'outerwear-jacket') return <path d="M54 300 L88 210 L118 300 Z M186 300 L152 210 L122 300 Z" fill={shade(base)} opacity="0.85" />;
  return null;
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

  if (accessory === 'accessory-11') {
    return <path d="M178 112 L212 42 M205 44 L216 50 M208 56 L220 62" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />;
  }

  if (accessory === 'accessory-12') {
    return <path d="M190 78 V220 M176 96 L190 78 L204 96 M178 118 H202" stroke="#facc15" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }

  if (accessory === 'accessory-13') {
    return (
      <g>
        <circle cx="184" cy="210" r="18" fill="#facc15" stroke="#92400e" strokeWidth="4" />
        <circle cx="176" cy="204" r="3" fill="#ef4444" />
        <circle cx="184" cy="202" r="3" fill="#22d3ee" />
        <circle cx="192" cy="204" r="3" fill="#a78bfa" />
      </g>
    );
  }

  if (accessory === 'accessory-14') {
    return (
      <g>
        <rect x="178" y="156" width="36" height="26" rx="5" fill="#111827" />
        <circle cx="196" cy="169" r="8" fill="#475569" stroke="#e5e7eb" strokeWidth="3" />
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
    'frame-tech': ['#22d3ee', '#334155'],
    'frame-ocean': ['#67e8f9', '#0f766e'],
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
