function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const base = (bg1: string, bg2: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <radialGradient id="bg" cx="45%" cy="24%" r="75%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#111827" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="400" height="500" fill="url(#bg)"/>
  <circle cx="70" cy="76" r="55" fill="#fff" opacity="0.12"/>
  <circle cx="330" cy="420" r="72" fill="#fff" opacity="0.08"/>
  ${body}
</svg>`;

const soccerBall = `<g transform="translate(304 104)">
  <circle cx="0" cy="0" r="34" fill="#f8fafc" stroke="#111827" stroke-width="5"/>
  <polygon points="0,-13 13,-4 8,12 -8,12 -13,-4" fill="#111827"/>
  <path d="M0 -34 V-13 M32 -10 L13 -4 M20 27 L8 12 M-20 27 L-8 12 M-32 -10 L-13 -4" stroke="#111827" stroke-width="5"/>
</g>`;

export function getKnownCharacterAvatar(name: string) {
  const n = normalizeName(name);

  if (n.includes("neymar")) {
    return svgUrl(base("#60c646", "#15803d", `
      ${soccerBall}
      <g filter="url(#shadow)">
        <path d="M78 348 Q200 276 322 348 L294 500 H106 Z" fill="#f7d84b"/>
        <path d="M105 358 L200 304 L295 358 L200 426 Z" fill="#159447"/>
        <circle cx="200" cy="365" r="40" fill="#2446a8"/>
        <path d="M164 365 Q200 348 236 365" stroke="#fff" stroke-width="8" fill="none"/>
        <text x="200" y="381" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="32" fill="#fff">10</text>
        <rect x="181" y="258" width="38" height="72" rx="17" fill="#9b5a2e"/>
        <ellipse cx="200" cy="208" rx="63" ry="67" fill="#a66332"/>
        <ellipse cx="134" cy="211" rx="16" ry="23" fill="#a66332"/>
        <ellipse cx="266" cy="211" rx="16" ry="23" fill="#a66332"/>
        <circle cx="123" cy="224" r="8" fill="#facc15"/>
        <circle cx="277" cy="224" r="8" fill="#facc15"/>
        <path d="M146 178 Q176 145 205 160 Q232 145 254 178 Q224 165 202 174 Q172 164 146 178" fill="#2b1a10"/>
        <path d="M170 169 Q180 120 195 165 M188 162 Q202 90 218 162 M211 166 Q230 112 238 172" stroke="#f2c94c" stroke-width="13" stroke-linecap="round"/>
        <path d="M156 190 Q174 182 193 192 M207 192 Q226 182 244 190" stroke="#2b1a10" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="176" cy="214" rx="13" ry="10" fill="#fff"/>
        <ellipse cx="224" cy="214" rx="13" ry="10" fill="#fff"/>
        <circle cx="181" cy="215" r="6" fill="#32190c"/>
        <circle cx="229" cy="215" r="6" fill="#32190c"/>
        <path d="M176 243 Q200 261 224 243" stroke="#3a1f13" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M178 254 Q200 286 222 254" stroke="#2b1a10" stroke-width="13" fill="none" stroke-linecap="round"/>
        <path d="M188 238 Q200 246 212 238" stroke="#2b1a10" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("messi")) {
    return svgUrl(base("#d8f5ff", "#7cc9e6", `
      ${soccerBall}
      <g filter="url(#shadow)">
        <path d="M82 330 Q200 278 318 330 L296 500 H104 Z" fill="#75cdeb"/>
        <rect x="116" y="312" width="34" height="188" fill="#fff"/>
        <rect x="184" y="296" width="32" height="204" fill="#fff"/>
        <rect x="250" y="312" width="34" height="188" fill="#fff"/>
        <circle cx="200" cy="372" r="30" fill="#fff" opacity="0.9"/>
        <text x="200" y="383" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="28" fill="#5fb9db">10</text>
        <rect x="181" y="250" width="38" height="72" rx="17" fill="#e8ad77"/>
        <ellipse cx="200" cy="200" rx="62" ry="66" fill="#efbd83"/>
        <ellipse cx="136" cy="205" rx="16" ry="22" fill="#efbd83"/>
        <ellipse cx="264" cy="205" rx="16" ry="22" fill="#efbd83"/>
        <path d="M144 174 Q166 132 205 140 Q238 132 258 176 Q224 160 192 166 Q164 170 144 174" fill="#4b2a18"/>
        <path d="M160 160 Q190 132 230 148 Q210 152 178 172" fill="#6b3a1d"/>
        <path d="M151 224 Q200 294 249 224 Q238 282 200 302 Q162 282 151 224" fill="#4b2a18"/>
        <path d="M164 236 Q200 276 236 236 Q226 290 200 300 Q174 290 164 236" fill="#5a321d"/>
        <ellipse cx="177" cy="205" rx="12" ry="9" fill="#fff"/>
        <ellipse cx="223" cy="205" rx="12" ry="9" fill="#fff"/>
        <circle cx="181" cy="206" r="5" fill="#4b2a18"/>
        <circle cx="227" cy="206" r="5" fill="#4b2a18"/>
        <path d="M170 186 Q186 179 199 188 M201 188 Q216 179 232 186" stroke="#4b2a18" stroke-width="7" stroke-linecap="round"/>
        <path d="M182 246 Q200 258 218 246" stroke="#f8fafc" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("yamal") || n.includes("lamine")) {
    return svgUrl(base("#ebe3d5", "#bcb4a5", `
      ${soccerBall}
      <g filter="url(#shadow)">
        <path d="M92 334 Q200 282 308 334 L292 500 H108 Z" fill="#c8102e"/>
        <rect x="137" y="310" width="42" height="190" fill="#2347a8"/>
        <rect x="221" y="310" width="42" height="190" fill="#2347a8"/>
        <path d="M118 350 Q200 380 282 350" stroke="#f3c84b" stroke-width="13" fill="none"/>
        <text x="200" y="410" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="30" fill="#f3c84b">19</text>
        <rect x="182" y="254" width="36" height="70" rx="17" fill="#8b4c23"/>
        <ellipse cx="200" cy="204" rx="60" ry="63" fill="#965623"/>
        <ellipse cx="134" cy="209" rx="16" ry="22" fill="#965623"/>
        <ellipse cx="266" cy="209" rx="16" ry="22" fill="#965623"/>
        <circle cx="127" cy="219" r="7" fill="#facc15"/>
        <circle cx="273" cy="219" r="7" fill="#facc15"/>
        <path d="M142 174 Q165 138 200 146 Q236 136 258 174 Q221 158 200 170 Q177 158 142 174" fill="#24150e"/>
        <circle cx="164" cy="159" r="16" fill="#24150e"/>
        <circle cx="190" cy="146" r="17" fill="#24150e"/>
        <circle cx="218" cy="148" r="16" fill="#24150e"/>
        <circle cx="240" cy="162" r="15" fill="#24150e"/>
        <ellipse cx="176" cy="211" rx="15" ry="12" fill="#fff"/>
        <ellipse cx="224" cy="211" rx="15" ry="12" fill="#fff"/>
        <circle cx="180" cy="212" r="6" fill="#2a1710"/>
        <circle cx="228" cy="212" r="6" fill="#2a1710"/>
        <path d="M176 247 Q200 265 224 247" stroke="#3a1f13" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("thor")) {
    return svgUrl(base("#9fc8e8", "#344b7a", `
      <path d="M74 72 L118 118 L92 118 L138 178 L72 106 L102 106 Z" fill="#fef08a" opacity="0.9"/>
      <g transform="translate(290 208) rotate(-24)" filter="url(#shadow)">
        <rect x="-13" y="-8" width="26" height="178" rx="10" fill="#7c4a24"/>
        <rect x="-70" y="-62" width="140" height="62" rx="8" fill="#9ca3af" stroke="#475569" stroke-width="9"/>
        <path d="M-50 -48 H50 M-50 -20 H50" stroke="#e5e7eb" stroke-width="7"/>
      </g>
      <g filter="url(#shadow)">
        <path d="M72 292 Q118 250 166 286 Q116 372 104 500 H56 Q56 380 72 292" fill="#b91c1c"/>
        <path d="M328 292 Q282 250 234 286 Q284 372 296 500 H344 Q344 380 328 292" fill="#b91c1c"/>
        <path d="M104 326 Q200 260 296 326 L278 500 H122 Z" fill="#1f2937"/>
        <rect x="120" y="326" width="160" height="174" fill="#334155"/>
        <circle cx="158" cy="360" r="28" fill="#cbd5e1" stroke="#64748b" stroke-width="8"/>
        <circle cx="242" cy="360" r="28" fill="#cbd5e1" stroke="#64748b" stroke-width="8"/>
        <path d="M148 418 H252" stroke="#94a3b8" stroke-width="15"/>
        <rect x="181" y="254" width="38" height="70" rx="17" fill="#e7b983"/>
        <ellipse cx="200" cy="202" rx="67" ry="70" fill="#efc48d"/>
        <ellipse cx="132" cy="207" rx="17" ry="23" fill="#efc48d"/>
        <ellipse cx="268" cy="207" rx="17" ry="23" fill="#efc48d"/>
        <path d="M138 176 Q160 112 206 130 Q254 122 264 190 Q238 174 212 174 Q176 164 138 176" fill="#d7a22f"/>
        <path d="M139 176 Q116 254 154 308 Q170 250 160 196" fill="#d7a22f"/>
        <path d="M261 176 Q286 254 246 310 Q230 252 240 196" fill="#d7a22f"/>
        <path d="M151 228 Q200 292 249 228 Q238 282 200 300 Q162 282 151 228" fill="#b56a2d"/>
        <ellipse cx="177" cy="205" rx="12" ry="9" fill="#fff"/>
        <ellipse cx="223" cy="205" rx="12" ry="9" fill="#fff"/>
        <circle cx="180" cy="206" r="5" fill="#2563eb"/>
        <circle cx="226" cy="206" r="5" fill="#2563eb"/>
        <path d="M170 188 Q186 181 198 190 M202 190 Q216 181 232 188" stroke="#8a4d19" stroke-width="7" stroke-linecap="round"/>
        <path d="M182 248 Q200 260 218 248" stroke="#f8fafc" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("doutor destino") || n.includes("doctor doom") || n.includes("dr doom")) {
    return svgUrl(base("#18251f", "#050807", `
      <path d="M66 78 Q200 18 334 78 L292 166 Q200 118 108 166 Z" fill="#115e36" opacity="0.95"/>
      <g filter="url(#shadow)">
        <path d="M74 500 Q92 326 134 244 Q200 300 266 244 Q308 326 326 500 Z" fill="#166534"/>
        <path d="M112 500 Q126 326 200 256 Q274 326 288 500 Z" fill="#0f3f27"/>
        <path d="M128 306 Q200 234 272 306 L252 500 H148 Z" fill="#9ca3af"/>
        <path d="M154 328 H246 M146 370 H254 M154 412 H246" stroke="#d1d5db" stroke-width="10" opacity="0.75"/>
        <rect x="174" y="244" width="52" height="88" rx="18" fill="#6b7280"/>
        <path d="M128 168 Q200 84 272 168 L260 246 Q200 294 140 246 Z" fill="#166534"/>
        <path d="M156 162 Q200 122 244 162 L240 238 Q200 274 160 238 Z" fill="#cbd5e1" stroke="#6b7280" stroke-width="9"/>
        <path d="M170 188 H230 M166 212 H234 M178 238 H222" stroke="#64748b" stroke-width="7"/>
        <rect x="170" y="198" width="24" height="9" rx="4" fill="#86efac"/>
        <rect x="206" y="198" width="24" height="9" rx="4" fill="#86efac"/>
        <path d="M184 224 Q200 232 216 224" stroke="#475569" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="132" cy="334" r="20" fill="#d1d5db"/>
        <circle cx="268" cy="334" r="20" fill="#d1d5db"/>
      </g>`));
  }

  if (n.includes("sentinela") || n.includes("sentinel")) {
    return svgUrl(base("#3b174f", "#15091f", `
      <g filter="url(#shadow)">
        <path d="M80 500 Q92 320 132 266 H268 Q308 320 320 500 Z" fill="#7e22ce"/>
        <path d="M104 326 Q200 270 296 326 L278 500 H122 Z" fill="#a855f7"/>
        <path d="M132 346 H268 M128 398 H272 M140 450 H260" stroke="#4c1d95" stroke-width="14" opacity="0.55"/>
        <circle cx="112" cy="348" r="48" fill="#6d28d9"/>
        <circle cx="288" cy="348" r="48" fill="#6d28d9"/>
        <rect x="168" y="246" width="64" height="82" rx="18" fill="#7e22ce"/>
        <path d="M126 164 Q200 92 274 164 L258 248 Q200 296 142 248 Z" fill="#9333ea"/>
        <path d="M150 158 Q200 118 250 158 L240 232 Q200 262 160 232 Z" fill="#c084fc" stroke="#581c87" stroke-width="9"/>
        <rect x="158" y="190" width="84" height="18" rx="9" fill="#facc15"/>
        <rect x="176" y="194" width="48" height="10" rx="5" fill="#fef08a"/>
        <path d="M178 228 H222" stroke="#4c1d95" stroke-width="8" stroke-linecap="round"/>
        <path d="M152 144 L128 110 M248 144 L272 110" stroke="#a855f7" stroke-width="14" stroke-linecap="round"/>
        <circle cx="200" cy="378" r="30" fill="#facc15"/>
        <circle cx="200" cy="378" r="17" fill="#fde68a"/>
      </g>`));
  }

  if (n.includes("loki")) {
    return svgUrl(base("#24311f", "#0a0d09", `
      <g filter="url(#shadow)">
        <path d="M96 500 Q112 326 154 282 H246 Q288 326 304 500 Z" fill="#15803d"/>
        <path d="M126 324 Q200 270 274 324 L258 500 H142 Z" fill="#166534"/>
        <circle cx="158" cy="356" r="15" fill="#fbbf24"/>
        <circle cx="242" cy="356" r="15" fill="#fbbf24"/>
        <rect x="181" y="256" width="38" height="70" rx="17" fill="#e8bf8c"/>
        <ellipse cx="200" cy="204" rx="62" ry="66" fill="#efc995"/>
        <path d="M140 172 Q164 126 202 140 Q238 128 260 176 Q224 158 198 168 Q168 160 140 172" fill="#141414"/>
        <path d="M122 136 Q98 66 124 42 Q168 112 160 164" fill="none" stroke="#d6a72e" stroke-width="18" stroke-linecap="round"/>
        <path d="M278 136 Q302 66 276 42 Q232 112 240 164" fill="none" stroke="#d6a72e" stroke-width="18" stroke-linecap="round"/>
        <path d="M150 156 Q200 104 250 156 L238 184 Q200 160 162 184 Z" fill="#d6a72e"/>
        <circle cx="200" cy="158" r="13" fill="#16a34a" stroke="#854d0e" stroke-width="5"/>
        <ellipse cx="176" cy="207" rx="12" ry="9" fill="#fff"/>
        <ellipse cx="224" cy="207" rx="12" ry="9" fill="#fff"/>
        <circle cx="180" cy="208" r="5" fill="#1f2937"/>
        <circle cx="228" cy="208" r="5" fill="#1f2937"/>
        <path d="M166 188 Q184 178 198 188 M202 188 Q216 178 234 188" stroke="#141414" stroke-width="7" stroke-linecap="round"/>
        <path d="M178 246 Q200 260 222 246" stroke="#5b2b13" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  return null;
}

function isGenericGeneratedSvg(url?: string | null) {
  if (!url) return false;
  const value = url.trim().toLowerCase();
  return value.startsWith("data:image/svg") || value.includes(".svg");
}

export function getCharacterDisplayImageUrl(name: string, imageUrl?: string | null) {
  const knownAvatar = getKnownCharacterAvatar(name);
  if (knownAvatar && isGenericGeneratedSvg(imageUrl)) return knownAvatar;
  return imageUrl || knownAvatar || undefined;
}
