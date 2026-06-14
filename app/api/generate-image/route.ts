import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const CARD_WIDTH = 400;
const CARD_HEIGHT = 500;
const PROMPT_VERSION = "unified-card-v7";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

type CharacterRequest = {
  prompt?: string;
  name?: string;
  description?: string;
};

type Palette = {
  bg1: string;
  bg2: string;
  skin: string;
  hair: string;
  suit: string;
  accent: string;
  symbol: string;
  vibe: string;
  headwear?: "horns" | "helmet" | "mask" | "crown" | "none";
  face?: "human" | "masked" | "robot" | "monster";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CharacterRequest;
    const input = normalizeInput(body);

    if (!input) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const prompt = buildUnifiedImagePrompt(input);
    const image = await generatePollinationsImage(prompt, stableSeed(`${PROMPT_VERSION}:${input}`));

    if (image) {
      const key = `characters/${slugify(input)}_${Date.now()}_${stableSeed(input).toString(36)}.${extensionFromContentType(image.contentType)}`;
      const uploadedUrl = await uploadImageToR2(key, image.bytes, image.contentType);

      if (uploadedUrl) {
        return NextResponse.json({ url: uploadedUrl, prompt, source: "pollinations-r2" });
      }

      const b64 = Buffer.from(image.bytes).toString("base64");

      return NextResponse.json({
        url: `data:${image.contentType};base64,${b64}`,
        prompt,
        source: "pollinations-data-uri",
      });
    }

    const svg = buildConsistentFallbackCard(input);
    const uploadedSvgUrl = await uploadImageToR2(
      `characters/${slugify(input)}_${Date.now()}_${stableSeed(input).toString(36)}.svg`,
      new TextEncoder().encode(svg),
      "image/svg+xml",
    );

    if (uploadedSvgUrl) {
      return NextResponse.json({ url: uploadedSvgUrl, prompt, source: "fallback-svg-r2" });
    }

    const b64 = Buffer.from(svg).toString("base64");

    return NextResponse.json({
      url: `data:image/svg+xml;base64,${b64}`,
      prompt,
      source: "fallback-svg-data-uri",
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeInput(body: CharacterRequest) {
  const raw = String(body.prompt || body.name || "").trim();
  const description = String(body.description || "").trim();
  const joined = description ? `${raw} — aparência: ${description}` : raw;

  return joined
    .replace(/\s+/g, " ")
    .replace(/\bRealistic and detailed character portrait\b/gi, "")
    .replace(/\bCharacter portrait\b/gi, "")
    .replace(/\bPortrait\b/gi, "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/[,.]\s*$/g, "")
    .trim();
}

function buildUnifiedImagePrompt(input: string) {
  const palette = inferPalette(input);
  const characterLine = buildCharacterLine(input, palette);

  return clampPrompt(`
Vertical 400x500 collectible guessing-game character card.
Use the SAME TEMPLATE for every card: rounded black outer frame, thin metallic gold trim, dark inner bevel, centered bust portrait from chest up, face and shoulders in the same position, dramatic rim light, soft vignette, dark empty bottom nameplate, no readable text anywhere.
Style must be consistent: polished semi-cartoon comic/sports trading card illustration, clean mobile game asset, crisp edges, expressive face, saturated colors, high contrast, painterly but not photorealistic, not a flat vector icon.
Character: ${characterLine}.
Main colors: background ${palette.bg1} to ${palette.bg2}, outfit ${palette.suit}, accent ${palette.accent}.
Important rules: no logo, no watermark, no official crest, no random letters, no readable words, no distorted hands, no extra faces, no cropped head, no photo realism, no plain square image, no flat emoji avatar.
`.trim());
}

function buildCharacterLine(input: string, palette: Palette) {
  const clean = input.replace(/\s+/g, " ").trim();

  return `${clean}; ${palette.vibe}; keep the character recognizable through hair, outfit, colors, accessories and silhouette while preserving the exact shared card frame style`;
}

function inferPalette(input: string): Palette {
  const n = normalizeText(input);

  if (hasAny(n, ["loki"])) {
    return {
      bg1: "#17351f",
      bg2: "#050706",
      skin: "#efc995",
      hair: "#101010",
      suit: "#12602d",
      accent: "#d6a72e",
      symbol: "♛",
      vibe: "sly trickster god, black hair, gold horned helmet, emerald armor, green magic glow",
      headwear: "horns",
    };
  }

  if (hasAny(n, ["thor"])) {
    return {
      bg1: "#6b7280",
      bg2: "#111827",
      skin: "#f0c28a",
      hair: "#e8c15b",
      suit: "#4b5563",
      accent: "#dc2626",
      symbol: "⚡",
      vibe: "blond thunder warrior, long hair, short beard, red cape, dark silver armor, lightning background",
      headwear: "none",
    };
  }

  if (hasAny(n, ["flash", "the flash"])) {
    return {
      bg1: "#7f1d1d",
      bg2: "#111827",
      skin: "#f0bd86",
      hair: "#f3d26a",
      suit: "#c91f25",
      accent: "#facc15",
      symbol: "⚡",
      vibe: "red speedster suit, gold lightning ear bolts, energetic motion streaks, confident young hero",
      headwear: "mask",
      face: "masked",
    };
  }

  if (hasAny(n, ["lanterna verde", "green lantern"])) {
    return {
      bg1: "#0b5132",
      bg2: "#03120d",
      skin: "#d6a06a",
      hair: "#2b1a10",
      suit: "#0f8a4b",
      accent: "#b7ff5a",
      symbol: "◎",
      vibe: "green cosmic hero suit, glowing chest emblem, emerald energy aura, determined expression",
      headwear: "mask",
      face: "masked",
    };
  }

  if (hasAny(n, ["emma frost", "rainha branca", "white queen"])) {
    return {
      bg1: "#f8fafc",
      bg2: "#94a3b8",
      skin: "#f3c7a0",
      hair: "#f8e7a7",
      suit: "#f8fafc",
      accent: "#94a3b8",
      symbol: "✦",
      vibe: "blonde telepath heroine, white elegant comic suit, icy diamond sparkle aura, confident expression",
      headwear: "none",
    };
  }

  if (hasAny(n, ["neymar"])) {
    return {
      bg1: "#6dcf45",
      bg2: "#0f7a34",
      skin: "#9b5a2e",
      hair: "#2b1a10",
      suit: "#f7d84b",
      accent: "#159447",
      symbol: "10",
      vibe: "Brazilian football star, tan skin, short fade mohawk with blond tips, trimmed beard, earrings, yellow and green football shirt",
    };
  }

  if (hasAny(n, ["messi"])) {
    return {
      bg1: "#d8f5ff",
      bg2: "#5fb9db",
      skin: "#efbd83",
      hair: "#4b2a18",
      suit: "#75cdeb",
      accent: "#ffffff",
      symbol: "10",
      vibe: "Argentine football star, short brown hair, full beard, calm focused face, sky blue and white football shirt",
    };
  }

  if (hasAny(n, ["yamal", "lamine"])) {
    return {
      bg1: "#ebe3d5",
      bg2: "#bcb4a5",
      skin: "#965623",
      hair: "#24150e",
      suit: "#c8102e",
      accent: "#2347a8",
      symbol: "19",
      vibe: "young football winger, dark skin, low curly fade, youthful confident smile, red and blue football shirt",
    };
  }

  if (hasAny(n, ["hulk"]) && hasAny(n, ["jogador", "futebol", "fluminense", "atletico", "atlético", "cam"])) {
    const flu = hasAny(n, ["fluminense"]);

    return {
      bg1: flu ? "#ffffff" : "#2e2e2e",
      bg2: flu ? "#6e1423" : "#111111",
      skin: "#b06b3a",
      hair: "#151515",
      suit: flu ? "#7a1021" : "#111827",
      accent: "#ffffff",
      symbol: flu ? "F" : "A",
      vibe: "strong Brazilian football striker, muscular athletic build, dark hair, full beard, intense expression, football shirt described by the user, not a green monster",
    };
  }

  if (hasAny(n, ["hulk"])) {
    return {
      bg1: "#4b4b4b",
      bg2: "#111111",
      skin: "#63c857",
      hair: "#101010",
      suit: "#2fb344",
      accent: "#5b2a86",
      symbol: "H",
      vibe: "green super-strong giant, huge muscular body, angry confident expression, torn purple shorts, rubble background",
      face: "monster",
    };
  }

  if (hasAny(n, ["homem de ferro", "iron man"])) {
    return {
      bg1: "#7f1d1d",
      bg2: "#451a03",
      skin: "#c62828",
      hair: "#7a1111",
      suit: "#b71c1c",
      accent: "#ffd54f",
      symbol: "◎",
      vibe: "red and gold armored hero, glowing blue chest reactor, metal helmet, tech lighting",
      headwear: "helmet",
      face: "masked",
    };
  }

  if (hasAny(n, ["batman"])) {
    return {
      bg1: "#111827",
      bg2: "#020617",
      skin: "#d6a06a",
      hair: "#111827",
      suit: "#1f2937",
      accent: "#facc15",
      symbol: "◆",
      vibe: "dark masked vigilante, pointed cowl ears, black cape, brooding expression, gothic night background",
      headwear: "mask",
      face: "masked",
    };
  }

  if (hasAny(n, ["superman"])) {
    return {
      bg1: "#1d4ed8",
      bg2: "#7f1d1d",
      skin: "#e0a46d",
      hair: "#111827",
      suit: "#1d4ed8",
      accent: "#dc2626",
      symbol: "S",
      vibe: "blue suited heroic man, red cape, black hair curl, bright hopeful expression, sky glow",
    };
  }

  if (hasAny(n, ["homem aranha", "homem-aranha", "spider", "aranha"])) {
    return {
      bg1: "#1d4ed8",
      bg2: "#0f172a",
      skin: "#dc2626",
      hair: "#dc2626",
      suit: "#dc2626",
      accent: "#1d4ed8",
      symbol: "✹",
      vibe: "red and blue spider hero suit, large white eye lenses, web pattern, agile friendly silhouette",
      headwear: "mask",
      face: "masked",
    };
  }

  if (hasAny(n, ["doutor destino", "doctor doom", "dr doom"])) {
    return {
      bg1: "#0f3d2e",
      bg2: "#111827",
      skin: "#9ca3af",
      hair: "#111827",
      suit: "#9ca3af",
      accent: "#15803d",
      symbol: "D",
      vibe: "armored ruler, emerald hooded cloak, silver medieval metal mask and armor, glowing eyes, gothic castle mood",
      headwear: "helmet",
      face: "masked",
    };
  }

  if (hasAny(n, ["sentinela", "sentinel"])) {
    return {
      bg1: "#581c87",
      bg2: "#111827",
      skin: "#a855f7",
      hair: "#fbbf24",
      suit: "#9333ea",
      accent: "#fbbf24",
      symbol: "▣",
      vibe: "giant purple and magenta robot, angular helmet, glowing yellow visor, square shoulders, sci-fi city background",
      headwear: "helmet",
      face: "robot",
    };
  }

  return paletteFromHash(n || input);
}

function paletteFromHash(value: string): Palette {
  const palettes = [
    ["#312e81", "#0f172a", "#1d4ed8", "#facc15"],
    ["#7f1d1d", "#111827", "#dc2626", "#f59e0b"],
    ["#064e3b", "#020617", "#059669", "#a7f3d0"],
    ["#581c87", "#111827", "#7c3aed", "#f5d0fe"],
    ["#0f766e", "#083344", "#14b8a6", "#ccfbf1"],
    ["#92400e", "#1c1917", "#d97706", "#fde68a"],
    ["#be123c", "#4c0519", "#e11d48", "#fecdd3"],
    ["#334155", "#020617", "#64748b", "#e2e8f0"],
  ];

  const selected = palettes[stableSeed(value) % palettes.length];
  const skinTones = ["#f0c28a", "#d6a06a", "#b8794a", "#8a4b2a", "#efbd83", "#c98a55"];
  const hairColors = ["#111827", "#2b1a10", "#4b2a18", "#e8c15b", "#6b3a1d"];
  const initials = getInitials(value);

  return {
    bg1: selected[0],
    bg2: selected[1],
    skin: skinTones[stableSeed(`${value}:skin`) % skinTones.length],
    hair: hairColors[stableSeed(`${value}:hair`) % hairColors.length],
    suit: selected[2],
    accent: selected[3],
    symbol: initials,
    vibe: "custom character based on the user request, with the exact described appearance, distinct hair, outfit colors and accessories",
  };
}

async function generatePollinationsImage(prompt: string, seed: number): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const urls = [
    buildPollinationsImageUrl(prompt, seed, "flux"),
    buildPollinationsImageUrl(prompt, seed, "turbo"),
    buildLegacyPollinationsImageUrl(prompt, seed),
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "image/*" },
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(`Pollinations image generation failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";

      if (!contentType.startsWith("image/")) {
        console.warn(`Pollinations returned non-image content-type: ${contentType}`);
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());

      if (bytes.byteLength < 1000) {
        console.warn("Pollinations returned an image that is too small to be valid.");
        continue;
      }

      return { bytes, contentType };
    } catch (err) {
      console.warn("Pollinations image generation request failed:", err);
    }
  }

  return null;
}

function buildPollinationsImageUrl(prompt: string, seed: number, model: "flux" | "turbo") {
  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);

  url.searchParams.set("width", String(CARD_WIDTH));
  url.searchParams.set("height", String(CARD_HEIGHT));
  url.searchParams.set("model", model);
  url.searchParams.set("quality", "high");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("private", "true");
  url.searchParams.set("enhance", "false");
  url.searchParams.set("seed", String(seed));

  if (process.env.POLLINATIONS_API_KEY) {
    url.searchParams.set("key", process.env.POLLINATIONS_API_KEY);
  }

  return url.toString();
}

function buildLegacyPollinationsImageUrl(prompt: string, seed: number) {
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);

  url.searchParams.set("width", String(CARD_WIDTH));
  url.searchParams.set("height", String(CARD_HEIGHT));
  url.searchParams.set("model", "flux");
  url.searchParams.set("quality", "high");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("private", "true");
  url.searchParams.set("enhance", "false");
  url.searchParams.set("seed", String(seed));

  if (process.env.POLLINATIONS_API_KEY) {
    url.searchParams.set("key", process.env.POLLINATIONS_API_KEY);
  }

  return url.toString();
}

async function uploadImageToR2(key: string, bytes: Uint8Array, contentType: string) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) return "";

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const base = process.env.R2_PUBLIC_URL || "";
    return base.endsWith("/") ? `${base}${key}` : `${base}/${key}`;
  } catch (err) {
    console.warn("R2 image upload failed:", err);
    return "";
  }
}

function buildConsistentFallbackCard(input: string) {
  const palette = inferPalette(input);
  const id = stableSeed(input);
  const initials = escapeXml(getInitials(input));
  const title = escapeXml(getDisplayName(input));
  const face = palette.face || "human";
  const normalized = normalizeText(input);
  const hasBeard = hasAny(normalized, ["barba", "beard", "messi", "thor", "hulk jogador", "fluminense", "atletico", "atlético"]);
  const longHair = hasAny(normalized, ["thor", "emma frost", "mulher maravilha", "wonder woman", "longo", "long"]);
  const smile = id % 3 !== 0;

  const faceSvg =
    face === "robot"
      ? robotFace(palette)
      : face === "masked"
        ? maskedFace(palette)
        : face === "monster"
          ? monsterFace(palette, smile)
          : humanFace(palette, { hasBeard, longHair, smile });

  const headwearSvg = buildHeadwear(palette);
  const lightning = palette.symbol === "⚡";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8e7a1"/>
      <stop offset="45%" stop-color="#d6a72e"/>
      <stop offset="100%" stop-color="#8a5a10"/>
    </linearGradient>
    <radialGradient id="spot" cx="50%" cy="28%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="400" height="500" rx="30" fill="#070707"/>
  <rect x="14" y="14" width="372" height="472" rx="24" fill="url(#gold)"/>
  <rect x="21" y="21" width="358" height="458" rx="20" fill="#090909"/>
  <rect x="30" y="32" width="340" height="405" rx="16" fill="url(#bg)"/>
  <rect x="30" y="32" width="340" height="405" rx="16" fill="url(#spot)"/>
  <circle cx="72" cy="82" r="52" fill="#ffffff" opacity="0.10"/>
  <circle cx="323" cy="360" r="88" fill="#ffffff" opacity="0.08"/>
  <path d="M55 396 C96 334 117 286 200 286 C283 286 304 334 345 396 L355 437 H45 Z" fill="#000000" opacity="0.22"/>
  ${lightning ? `<path d="M305 72 L260 188 H304 L268 300 L346 151 H302 Z" fill="${palette.accent}" opacity="0.35"/>` : ""}
  <g filter="url(#shadow)">
    <path d="M78 437 C91 326 127 280 162 262 C184 288 216 288 238 262 C273 280 309 326 322 437 Z" fill="${palette.suit}"/>
    <path d="M116 437 C129 335 151 302 200 284 C249 302 271 335 284 437 Z" fill="${palette.accent}" opacity="0.78"/>
    <path d="M145 336 C166 358 234 358 255 336" stroke="#ffffff" stroke-width="10" opacity="0.72" fill="none" stroke-linecap="round"/>
    <rect x="175" y="247" width="50" height="70" rx="20" fill="${shade(palette.skin, -12)}"/>
    ${faceSvg}
    ${headwearSvg}
    <circle cx="200" cy="365" r="38" fill="#080808" opacity="0.88" stroke="url(#gold)" stroke-width="5"/>
    <text x="200" y="378" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="28" fill="${palette.accent}">${escapeXml(palette.symbol).slice(0, 3) || initials}</text>
  </g>
  <rect x="75" y="442" width="250" height="32" rx="8" fill="#111111" stroke="url(#gold)" stroke-width="3"/>
  <text x="200" y="464" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="18" letter-spacing="1" fill="#f8e7a1">${initials}</text>
</svg>`;
}

function humanFace(palette: Palette, options: { hasBeard: boolean; longHair: boolean; smile: boolean }) {
  const hairBack = options.longHair
    ? `<path d="M136 169 C128 232 144 303 178 319 C164 266 166 210 158 178 Z" fill="${palette.hair}"/>
       <path d="M264 169 C272 232 256 303 222 319 C236 266 234 210 242 178 Z" fill="${palette.hair}"/>`
    : "";

  const beard = options.hasBeard
    ? `<path d="M151 225 C162 288 238 288 249 225 C239 271 161 271 151 225 Z" fill="${palette.hair}" opacity="0.95"/>
       <path d="M178 246 C190 258 210 258 222 246" stroke="${shade(palette.hair, 18)}" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : "";

  const mouth = options.smile
    ? `<path d="M178 246 C190 260 210 260 222 246" stroke="#5b2b13" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : `<path d="M181 250 C193 244 207 244 219 250" stroke="#5b2b13" stroke-width="7" fill="none" stroke-linecap="round"/>`;

  return `${hairBack}
    <ellipse cx="200" cy="195" rx="67" ry="72" fill="${palette.skin}"/>
    <ellipse cx="132" cy="204" rx="17" ry="24" fill="${shade(palette.skin, -5)}"/>
    <ellipse cx="268" cy="204" rx="17" ry="24" fill="${shade(palette.skin, -5)}"/>
    <path d="M136 169 C154 116 198 126 205 137 C238 119 263 146 266 178 C232 160 210 166 200 170 C178 160 157 162 136 169 Z" fill="${palette.hair}"/>
    <path d="M152 180 C174 165 190 168 198 181 M202 181 C214 168 235 166 248 181" stroke="${palette.hair}" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="176" cy="207" rx="13" ry="10" fill="#ffffff"/>
    <ellipse cx="224" cy="207" rx="13" ry="10" fill="#ffffff"/>
    <circle cx="180" cy="208" r="5.5" fill="#111827"/>
    <circle cx="228" cy="208" r="5.5" fill="#111827"/>
    <path d="M170 188 C184 180 193 181 200 188 M200 188 C211 181 224 180 236 188" stroke="${shade(palette.hair, -5)}" stroke-width="7" stroke-linecap="round"/>
    <path d="M200 211 C194 224 194 231 205 232" stroke="${shade(palette.skin, -40)}" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${beard}
    ${mouth}`;
}

function maskedFace(palette: Palette) {
  return `<ellipse cx="200" cy="195" rx="67" ry="72" fill="${palette.suit}"/>
    <ellipse cx="132" cy="204" rx="17" ry="24" fill="${palette.suit}"/>
    <ellipse cx="268" cy="204" rx="17" ry="24" fill="${palette.suit}"/>
    <path d="M142 155 C166 117 235 117 258 155 C238 143 217 138 200 139 C181 138 162 143 142 155 Z" fill="${shade(palette.suit, -25)}"/>
    <path d="M151 196 C172 178 192 184 198 199 C180 217 160 215 146 205 Z" fill="#f8fafc" stroke="#111111" stroke-width="6"/>
    <path d="M249 196 C228 178 208 184 202 199 C220 217 240 215 254 205 Z" fill="#f8fafc" stroke="#111111" stroke-width="6"/>
    <path d="M168 252 C186 263 214 263 232 252" stroke="${palette.accent}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M200 128 V263 M153 148 L178 263 M247 148 L222 263" stroke="${shade(palette.suit, -35)}" stroke-width="5" opacity="0.7"/>`;
}

function robotFace(palette: Palette) {
  return `<path d="M139 145 H261 L275 194 L248 270 H152 L125 194 Z" fill="${palette.suit}" stroke="${palette.accent}" stroke-width="6"/>
    <path d="M158 176 H242 L252 205 H148 Z" fill="#111827"/>
    <rect x="166" y="188" width="68" height="11" rx="5" fill="${palette.accent}"/>
    <path d="M158 226 H242" stroke="${shade(palette.suit, 40)}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="155" cy="156" r="10" fill="${palette.accent}"/>
    <circle cx="245" cy="156" r="10" fill="${palette.accent}"/>`;
}

function monsterFace(palette: Palette, smile: boolean) {
  return `<ellipse cx="200" cy="195" rx="78" ry="80" fill="${palette.skin}"/>
    <ellipse cx="120" cy="207" rx="21" ry="30" fill="${shade(palette.skin, -7)}"/>
    <ellipse cx="280" cy="207" rx="21" ry="30" fill="${shade(palette.skin, -7)}"/>
    <path d="M130 149 C153 91 200 115 207 126 C244 99 271 127 276 156 C238 142 212 148 200 152 C170 142 150 145 130 149 Z" fill="${palette.hair}"/>
    <path d="M150 178 C174 168 190 173 198 186 M202 186 C214 173 238 168 254 178" stroke="${palette.hair}" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="176" cy="207" rx="15" ry="11" fill="#ffffff"/>
    <ellipse cx="224" cy="207" rx="15" ry="11" fill="#ffffff"/>
    <circle cx="180" cy="208" r="6" fill="#111827"/>
    <circle cx="228" cy="208" r="6" fill="#111827"/>
    ${
      smile
        ? `<path d="M169 249 C187 270 213 270 231 249" stroke="#173318" stroke-width="12" fill="none" stroke-linecap="round"/>`
        : `<path d="M170 253 C188 235 212 235 230 253" stroke="#173318" stroke-width="12" fill="none" stroke-linecap="round"/>`
    }`;
}

function buildHeadwear(palette: Palette) {
  if (palette.headwear === "horns") {
    return `<path d="M126 137 C102 72 123 48 143 39 C178 98 169 135 158 172" fill="none" stroke="${palette.accent}" stroke-width="17" stroke-linecap="round"/>
      <path d="M274 137 C298 72 277 48 257 39 C222 98 231 135 242 172" fill="none" stroke="${palette.accent}" stroke-width="17" stroke-linecap="round"/>
      <path d="M151 154 C178 113 222 113 249 154 L238 184 C215 165 185 165 162 184 Z" fill="${palette.accent}"/>
      <circle cx="200" cy="156" r="12" fill="${palette.suit}" stroke="#7c520d" stroke-width="4"/>`;
  }

  if (palette.headwear === "helmet") {
    return `<path d="M136 153 C157 110 243 110 264 153 L251 191 C224 171 176 171 149 191 Z" fill="${palette.accent}" opacity="0.95"/>
      <path d="M151 152 C171 135 229 135 249 152" stroke="#ffffff" stroke-width="8" opacity="0.35" fill="none" stroke-linecap="round"/>`;
  }

  if (palette.headwear === "crown") {
    return `<path d="M150 154 L170 113 L198 151 L228 113 L250 154 Z" fill="${palette.accent}" stroke="#7c520d" stroke-width="5"/>`;
  }

  return "";
}

function stableSeed(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) || 42;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  const slug = normalizeText(value).replace(/\s+/g, "-").slice(0, 48);
  return slug || "character";
}

function getDisplayName(input: string) {
  return input.split(/[—,:]/)[0]?.trim() || input.trim() || "Personagem";
}

function getInitials(input: string) {
  const name = normalizeText(getDisplayName(input));
  const words = name.split(/\s+/).filter(Boolean);

  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] || ""}${words[words.length - 1][0] || ""}`.toUpperCase().slice(0, 2);
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(normalizeText(term)));
}

function clampPrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 1450);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("svg")) return "svg";
  return "jpg";
}

function shade(hexColor: string, amount: number) {
  const clean = hexColor.replace("#", "").padStart(6, "0").slice(0, 6);
  const value = parseInt(clean, 16);
  const r = clampChannel((value >> 16) + amount);
  const g = clampChannel(((value >> 8) & 0xff) + amount);
  const b = clampChannel((value & 0xff) + amount);

  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
