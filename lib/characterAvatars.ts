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

function standardPortrait(bg1: string, bg2: string, accent: string, label: string, symbol: string) {
  return svgUrl(base(bg1, bg2, `
    <g filter="url(#shadow)">
      <path d="M84 500 Q98 318 146 278 Q200 324 254 278 Q302 318 316 500 Z" fill="${accent}"/>
      <path d="M118 336 Q200 276 282 336 L262 500 H138 Z" fill="#f8fafc" opacity="0.9"/>
      <rect x="182" y="254" width="36" height="70" rx="17" fill="#b8794a"/>
      <ellipse cx="200" cy="204" rx="64" ry="68" fill="#c98a55"/>
      <ellipse cx="134" cy="208" rx="16" ry="22" fill="#c98a55"/>
      <ellipse cx="266" cy="208" rx="16" ry="22" fill="#c98a55"/>
      <path d="M142 174 Q164 130 202 140 Q238 130 258 176 Q222 160 200 168 Q174 160 142 174" fill="#2b1a10"/>
      <ellipse cx="176" cy="210" rx="12" ry="9" fill="#fff"/>
      <ellipse cx="224" cy="210" rx="12" ry="9" fill="#fff"/>
      <circle cx="180" cy="211" r="5" fill="#1f2937"/>
      <circle cx="228" cy="211" r="5" fill="#1f2937"/>
      <path d="M170 190 Q186 183 198 192 M202 192 Q216 183 232 190" stroke="#2b1a10" stroke-width="7" stroke-linecap="round"/>
      <path d="M180 248 Q200 262 220 248" stroke="#3a1f13" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="200" cy="382" r="44" fill="${accent}" stroke="#f8fafc" stroke-width="8"/>
      <text x="200" y="397" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="36" fill="#fff">${label}</text>
      <text x="308" y="112" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="42" fill="#fff" opacity="0.9">${symbol}</text>
    </g>`));
}

export function getKnownCharacterAvatar(name: string) {
  const n = normalizeName(name);

  if (n.includes("hulk")) return "/standard-cards/hulk.png";
  if (n.includes("homem-aranha") || n.includes("homem aranha") || n.includes("spider") || n.includes("aranha")) return "/standard-cards/homem-aranha.png";
  if (n.includes("aquaman")) return "/standard-cards/aquaman.png";
  if (n.includes("thor")) return "/standard-cards/thor.png";
  if (n.includes("lucas moura") || n.includes("lucas mourea")) return "/standard-cards/lucas-moura.png";

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

  if (n.includes("hulk")) {
    return svgUrl(base("#6aa84f", "#1f2933", `
      <g filter="url(#shadow)">
        <path d="M56 500 Q76 324 130 268 Q200 326 270 268 Q324 324 344 500 Z" fill="#266534"/>
        <path d="M102 364 Q200 278 298 364 L282 500 H118 Z" fill="#4ade80"/>
        <path d="M120 500 L150 420 H250 L280 500 Z" fill="#5b2a86"/>
        <rect x="174" y="248" width="52" height="82" rx="20" fill="#5fbf56"/>
        <ellipse cx="200" cy="198" rx="75" ry="78" fill="#6bd162"/>
        <ellipse cx="122" cy="210" rx="20" ry="29" fill="#6bd162"/>
        <ellipse cx="278" cy="210" rx="20" ry="29" fill="#6bd162"/>
        <path d="M132 150 Q158 86 206 112 Q246 90 270 152 Q236 136 205 146 Q166 136 132 150" fill="#172016"/>
        <path d="M146 176 Q174 166 196 184 M204 184 Q226 166 254 176" stroke="#172016" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="176" cy="205" rx="14" ry="10" fill="#f8fafc"/>
        <ellipse cx="224" cy="205" rx="14" ry="10" fill="#f8fafc"/>
        <circle cx="180" cy="206" r="6" fill="#111827"/>
        <circle cx="228" cy="206" r="6" fill="#111827"/>
        <path d="M172 248 Q200 232 228 248" stroke="#193318" stroke-width="12" fill="none" stroke-linecap="round"/>
        <path d="M108 360 Q82 392 82 448 H138 Q146 392 166 352 Z" fill="#5fbf56"/>
        <path d="M292 360 Q318 392 318 448 H262 Q254 392 234 352 Z" fill="#5fbf56"/>
      </g>`));
  }

  if (n.includes("homem-aranha") || n.includes("homem aranha") || n.includes("spider") || n.includes("aranha")) {
    return svgUrl(base("#1d4ed8", "#0f172a", `
      <g filter="url(#shadow)">
        <path d="M76 500 Q90 320 142 270 Q200 322 258 270 Q310 320 324 500 Z" fill="#1d4ed8"/>
        <path d="M112 330 Q200 250 288 330 L268 500 H132 Z" fill="#dc2626"/>
        <path d="M148 500 L200 378 L252 500 Z" fill="#1d4ed8"/>
        <path d="M130 356 H270 M122 402 H278 M132 448 H268" stroke="#7f1d1d" stroke-width="8" opacity="0.7"/>
        <path d="M200 318 V500 M160 340 L132 500 M240 340 L268 500" stroke="#7f1d1d" stroke-width="7" opacity="0.75"/>
        <ellipse cx="200" cy="200" rx="72" ry="78" fill="#dc2626"/>
        <path d="M132 172 Q200 126 268 172 M126 206 Q200 170 274 206 M146 238 Q200 212 254 238" stroke="#7f1d1d" stroke-width="7" fill="none"/>
        <path d="M200 126 V278 M158 142 L182 278 M242 142 L218 278" stroke="#7f1d1d" stroke-width="7"/>
        <path d="M148 194 Q174 176 196 194 Q178 224 150 218 Z" fill="#f8fafc" stroke="#111827" stroke-width="7"/>
        <path d="M252 194 Q226 176 204 194 Q222 224 250 218 Z" fill="#f8fafc" stroke="#111827" stroke-width="7"/>
        <path d="M184 350 Q200 338 216 350 Q208 362 200 378 Q192 362 184 350 Z" fill="#111827"/>
        <path d="M200 356 L180 396 M200 356 L220 396 M190 374 H210 M184 392 H216" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("aquaman")) {
    return svgUrl(base("#0f766e", "#083344", `
      <path d="M314 78 V268" stroke="#facc15" stroke-width="12" stroke-linecap="round"/>
      <path d="M282 104 Q314 62 346 104 M314 64 V112" stroke="#facc15" stroke-width="12" fill="none" stroke-linecap="round"/>
      <g filter="url(#shadow)">
        <path d="M82 500 Q100 326 150 278 Q200 322 250 278 Q300 326 318 500 Z" fill="#15803d"/>
        <path d="M118 330 Q200 272 282 330 L264 500 H136 Z" fill="#f59e0b"/>
        <path d="M136 350 H264 M128 392 H272 M138 434 H262" stroke="#fde68a" stroke-width="9" opacity="0.85"/>
        <rect x="181" y="254" width="38" height="72" rx="17" fill="#e0a46d"/>
        <ellipse cx="200" cy="202" rx="66" ry="70" fill="#efbd83"/>
        <ellipse cx="132" cy="208" rx="17" ry="23" fill="#efbd83"/>
        <ellipse cx="268" cy="208" rx="17" ry="23" fill="#efbd83"/>
        <path d="M134 178 Q156 118 206 132 Q254 118 268 184 Q236 168 208 174 Q174 166 134 178" fill="#d7a22f"/>
        <path d="M140 178 Q120 260 158 314 Q174 248 160 198" fill="#d7a22f"/>
        <path d="M260 178 Q280 260 242 314 Q226 248 240 198" fill="#d7a22f"/>
        <path d="M150 226 Q200 292 250 226 Q238 282 200 302 Q162 282 150 226" fill="#9a5c25"/>
        <ellipse cx="177" cy="206" rx="12" ry="9" fill="#fff"/>
        <ellipse cx="223" cy="206" rx="12" ry="9" fill="#fff"/>
        <circle cx="180" cy="207" r="5" fill="#155e75"/>
        <circle cx="226" cy="207" r="5" fill="#155e75"/>
        <path d="M170 188 Q186 181 198 190 M202 190 Q216 181 232 188" stroke="#8a4d19" stroke-width="7" stroke-linecap="round"/>
        <path d="M182 248 Q200 260 218 248" stroke="#f8fafc" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>`));
  }

  if (n.includes("lucas moura") || n.includes("lucas mourea")) {
    return svgUrl(base("#b91c1c", "#0f172a", `
      ${soccerBall}
      <g filter="url(#shadow)">
        <path d="M88 334 Q200 282 312 334 L292 500 H108 Z" fill="#f8fafc"/>
        <path d="M120 344 H280 M116 390 H284 M128 436 H272" stroke="#cbd5e1" stroke-width="9" opacity="0.9"/>
        <path d="M132 334 Q200 382 268 334 L246 500 H154 Z" fill="#1d4ed8" opacity="0.88"/>
        <circle cx="200" cy="386" r="32" fill="#f8fafc"/>
        <text x="200" y="397" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="30" fill="#1d4ed8">7</text>
        <rect x="181" y="252" width="38" height="72" rx="17" fill="#9b5a2e"/>
        <ellipse cx="200" cy="202" rx="62" ry="66" fill="#a66332"/>
        <ellipse cx="136" cy="206" rx="16" ry="22" fill="#a66332"/>
        <ellipse cx="264" cy="206" rx="16" ry="22" fill="#a66332"/>
        <path d="M142 172 Q160 128 202 140 Q238 128 258 176 Q222 160 200 168 Q174 160 142 172" fill="#1b120c"/>
        <path d="M154 160 Q182 126 224 144 Q204 150 176 170" fill="#2b1a10"/>
        <ellipse cx="176" cy="208" rx="12" ry="9" fill="#fff"/>
        <ellipse cx="224" cy="208" rx="12" ry="9" fill="#fff"/>
        <circle cx="180" cy="209" r="5" fill="#2a1710"/>
        <circle cx="228" cy="209" r="5" fill="#2a1710"/>
        <path d="M170 188 Q186 181 198 190 M202 190 Q216 181 232 188" stroke="#2a1710" stroke-width="7" stroke-linecap="round"/>
        <path d="M178 246 Q200 262 222 246" stroke="#3a1f13" stroke-width="8" fill="none" stroke-linecap="round"/>
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

  if (n.includes("cristiano") || n.includes("ronaldo")) return standardPortrait("#0f5132", "#09251a", "#dc2626", "7", "CR");
  if (n.includes("mbappe")) return standardPortrait("#102a7a", "#081531", "#1d4ed8", "10", "KM");
  if (n.includes("vini") || n.includes("vinicius")) return standardPortrait("#f8fafc", "#9ca3af", "#2563eb", "7", "VJ");
  if (n.includes("haaland")) return standardPortrait("#9fd3ff", "#1d4ed8", "#facc15", "9", "EH");

  if (n.includes("mario")) return standardPortrait("#ef4444", "#7f1d1d", "#dc2626", "M", "!");
  if (n.includes("sonic")) return standardPortrait("#2563eb", "#0f172a", "#1d4ed8", "S", "*");
  if (n.includes("pikachu")) return standardPortrait("#fde047", "#ca8a04", "#f59e0b", "P", "Z");
  if (n.includes("naruto")) return standardPortrait("#fb923c", "#7c2d12", "#f97316", "N", "+");
  if (n.includes("goku")) return standardPortrait("#f97316", "#1d4ed8", "#f97316", "G", "*");
  if (n.includes("elsa")) return standardPortrait("#bae6fd", "#0ea5e9", "#38bdf8", "E", "*");
  if (n.includes("shrek")) return standardPortrait("#84cc16", "#365314", "#65a30d", "S", "!");
  if (n.includes("bob esponja") || n.includes("spongebob")) return standardPortrait("#fde047", "#0f766e", "#eab308", "B", "~~");

  if (n.includes("superman")) return standardPortrait("#1d4ed8", "#7f1d1d", "#dc2626", "S", "S");
  if (n.includes("homem de ferro") || n.includes("iron man")) return standardPortrait("#991b1b", "#451a03", "#dc2626", "Fe", "O");
  if (n.includes("mulher maravilha") || n.includes("wonder woman")) return standardPortrait("#1e3a8a", "#7f1d1d", "#dc2626", "W", "*");
  if (n.includes("capitao america") || n.includes("capitao america") || n.includes("captain america")) return standardPortrait("#1d4ed8", "#7f1d1d", "#2563eb", "A", "*");
  if (n.includes("pantera negra") || n.includes("black panther")) return standardPortrait("#111827", "#020617", "#4c1d95", "P", "^");
  if (n.includes("batman")) return standardPortrait("#111827", "#334155", "#1f2937", "B", "^");

  if (n.includes("anitta")) return standardPortrait("#f97316", "#831843", "#ec4899", "A", "♪");
  if (n.includes("beyonce")) return standardPortrait("#facc15", "#78350f", "#d97706", "B", "♪");
  if (n.includes("taylor")) return standardPortrait("#fbcfe8", "#7e22ce", "#db2777", "TS", "♪");
  if (n.includes("weeknd")) return standardPortrait("#991b1b", "#111827", "#dc2626", "W", "♪");
  if (n.includes("ariana")) return standardPortrait("#f5d0fe", "#581c87", "#c026d3", "A", "♪");
  if (n.includes("bruno mars")) return standardPortrait("#fdba74", "#7c2d12", "#ea580c", "BM", "♪");
  if (n.includes("michael jackson")) return standardPortrait("#f8fafc", "#111827", "#111827", "MJ", "♪");
  if (n.includes("rihanna")) return standardPortrait("#be123c", "#4c0519", "#e11d48", "R", "♪");

  if (n.includes("coringa") || n.includes("joker")) return standardPortrait("#4c1d95", "#052e16", "#7e22ce", "J", "!");
  if (n.includes("lex luthor") || n.includes("lex")) return standardPortrait("#166534", "#111827", "#16a34a", "L", "!");
  if (n.includes("thanos")) return standardPortrait("#6d28d9", "#312e81", "#7c3aed", "T", "*");
  if (n.includes("darth vader")) return standardPortrait("#111827", "#000000", "#1f2937", "DV", "!");
  if (n.includes("voldemort")) return standardPortrait("#e5e7eb", "#334155", "#64748b", "V", "!");
  if (n.includes("magneto")) return standardPortrait("#991b1b", "#312e81", "#dc2626", "M", "!");
  if (n.includes("duende verde")) return standardPortrait("#16a34a", "#4a044e", "#22c55e", "D", "!");

  return null;
}

function isGenericGeneratedSvg(url?: string | null) {
  if (!url) return false;
  const value = url.trim().toLowerCase();
  return value.startsWith("data:image/svg") || value.includes(".svg");
}

export function getCharacterDisplayImageUrl(name: string, imageUrl?: string | null) {
  const knownAvatar = getKnownCharacterAvatar(name);
  if (knownAvatar) return knownAvatar;
  if (isGenericGeneratedSvg(imageUrl)) return undefined;
  return imageUrl || knownAvatar || undefined;
}
