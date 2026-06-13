import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getGroqClient } from "@/lib/groq";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    const imagePrompt = await buildPollinationsPrompt(prompt);
    const generated = await generatePollinationsImage(imagePrompt);
    if (generated) {
      const key = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
      const uploadedUrl = await uploadImageToR2(key, generated.bytes, generated.contentType);

      if (uploadedUrl) {
        return NextResponse.json({ url: uploadedUrl, prompt: imagePrompt });
      }

      const b64 = Buffer.from(generated.bytes).toString("base64");
      return NextResponse.json({ url: `data:${generated.contentType};base64,${b64}`, prompt: imagePrompt });
    }

    let t: any = {};
    const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY';

    if (hasGroq) {
      try {
        const groq = getGroqClient();
        const res = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a character visual designer. Given a character name or description, output ONLY a JSON object with their distinctive visual traits for a cartoon avatar silhouette. Never include real person names in output.

Output ONLY valid JSON (no markdown, no explanation):
{
  "skinTone": "#hex",
  "hairColor": "#hex",
  "hairStyle": "mohawk|low_fade_curly|short_wavy|long_straight|afro|bald|undercut|man_bun|short_spiky|medium_wavy",
  "beardStyle": "none|stubble|full_beard|goatee|short_beard",
  "eyeColor": "#hex",
  "eyeSize": "normal|big|small",
  "faceShape": "round|oval|square|chubby",
  "shirtColor": "#hex",
  "shirtAccentColor": "#hex",
  "outfitPattern": "solid|brazil|argentina|barca|muscle|armor|heroine|fluminense|atletico_mg",
  "headwear": "none|gold_tiara|iron_helmet",
  "badgeText": "1-3 letters or number",
  "accessories": ["none"|"earring_left"|"earring_both"|"glasses"|"headband"],
  "expression": "happy|big_smile|calm|confident|cool",
  "cheekBlush": true|false,
  "bgColor1": "#hex",
  "bgColor2": "#hex",
  "initials": "2 letters"
}

Examples of how to translate without using names:
- Soccer player from Brazil known for flair → mohawk or undercut hair, earring, dark skin, yellow/green shirt
- Short Argentine player with beard → short_wavy hair, full_beard, light-medium skin, blue/white shirt  
- Young Moroccan-Spanish teen winger → low_fade_curly, no beard, dark skin, red shirt`
            },
            { role: "user", content: `Character: ${prompt}` }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 300,
        });

        const raw = res.choices[0]?.message?.content?.trim() || "{}";
        t = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch (groqErr) {
        console.warn("Groq prompt trait translation failed, continuing with fallback:", groqErr);
      }
    }

    t = applyKnownTraits(prompt, t);
    const svg = buildAvatar(t);
    const key = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.svg`;

    // Try uploading to cloud storage if credentials exist, otherwise utilize high-performance Data URI
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: Buffer.from(svg),
          ContentType: "image/svg+xml",
          CacheControl: "public, max-age=31536000",
        }));

        const base = process.env.R2_PUBLIC_URL || "";
        return NextResponse.json({ url: base.endsWith("/") ? `${base}${key}` : `${base}/${key}` });
      } catch (s3Err) {
        console.warn("R2 upload failed, falling back to data URI:", s3Err);
      }
    }

    // High performance local fallback data URI
    const b64 = Buffer.from(svg).toString("base64");
    return NextResponse.json({ url: `data:image/svg+xml;base64,${b64}` });

  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

async function buildPollinationsPrompt(input: string) {
  const base = createVisualBrief(input);
  const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "MY_GROQ_API_KEY";

  if (!hasGroq) return base;

  try {
    const groq = getGroqClient();
    const res = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You write image prompts for a guessing-card game.
Return only one concise English prompt, no markdown.
Goal: polished illustrated collectible character card, expressive likeness when a public figure or fictional character is named, not a flat icon.
Style: modern sports/comic trading card illustration, crisp vector-like digital painting, clean face, dynamic pose, thick black outer frame with gold trim, dark bottom stat panels, high contrast, professional mobile game asset.
Avoid: ugly anatomy, extra fingers, readable text, random letters, watermarks, logos, official team crests, blurry image, low detail, photorealism.`
        },
        { role: "user", content: base }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.45,
      max_tokens: 220,
    });

    const refined = res.choices[0]?.message?.content?.trim();
    return refined ? clampPrompt(refined) : base;
  } catch (err) {
    console.warn("Groq image prompt refinement failed, using deterministic prompt:", err);
    return base;
  }
}

function createVisualBrief(input: string) {
  const raw = String(input || "").trim();
  const p = normalizeText(raw);
  const common = "vertical 400x500 collectible character card portrait, thick black outer card frame with gold trim, dark top name plate without readable letters, dark bottom stat panels without readable letters, centered bust portrait, clean cartoon-comic digital illustration, sharp eyes, readable silhouette, detailed outfit, textured action background, no random text, no watermark, no logo, no official crest";

  if (p.includes("neymar")) {
    return `${common}. Character: Neymar Jr inspired Brazilian football star, recognizable stylized likeness, tan brown skin, short fade mohawk with blond tips, trimmed beard and mustache, earrings, confident side glance, yellow football jersey with green trim and number 10, Brazil colors, energetic gold and green paint streak background.`;
  }

  if (p.includes("messi")) {
    return `${common}. Character: Lionel Messi inspired football star, recognizable stylized likeness, light skin, short brown hair, full brown beard, calm focused expression, sky blue and white striped football jersey with number 10, soft blue stadium glow background.`;
  }

  if (p.includes("lamine") || p.includes("yamal")) {
    return `${common}. Character: Lamine Yamal inspired young football winger, dark skin, low curly fade, youthful face, big confident smile, red and blue football jersey with number 19, warm beige stadium background.`;
  }

  if (p.includes("thor")) {
    return `${common}. Character: Thor inspired thunder hero, handsome blond warrior, long blond hair, short beard, red cape, dark silver armor with round chest plates, holding a heavy hammer, lightning in the background, heroic comic-book pose.`;
  }

  if (p.includes("hulk") && (p.includes("jogador") || p.includes("futebol") || p.includes("fluminense") || p.includes("atletico") || p.includes("cam"))) {
    return `${common}. Character: strong Brazilian football striker nicknamed Hulk, muscular athletic man, dark hair, full beard, intense expression, football jersey described by the user, powerful stadium lighting, not a green monster. Details: ${raw}`;
  }

  if (p.includes("hulk")) {
    return `${common}. Character: Hulk inspired green super-strong giant, massive muscular body, green skin, angry confident expression, torn purple shorts, dramatic gray rubble background, comic-book action style.`;
  }

  return `${common}. Character request: ${raw}. Follow the appearance description exactly, emphasize recognizable clothing, hair, face shape, colors, accessories, and a playful card-game avatar style.`;
}

function clampPrompt(prompt: string) {
  return prompt
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 1200);
}

async function generatePollinationsImage(prompt: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
  url.searchParams.set("width", "400");
  url.searchParams.set("height", "500");
  url.searchParams.set("model", "flux");
  url.searchParams.set("quality", "high");
  url.searchParams.set("private", "true");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) {
      console.warn(`Pollinations image generation failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(`Pollinations returned non-image content-type: ${contentType}`);
      return null;
    }

    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType };
  } catch (err) {
    console.warn("Pollinations image generation request failed:", err);
    return null;
  }
}

async function uploadImageToR2(key: string, bytes: Uint8Array, contentType: string) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) return "";

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    }));

    const base = process.env.R2_PUBLIC_URL || "";
    return base.endsWith("/") ? `${base}${key}` : `${base}/${key}`;
  } catch (err) {
    console.warn("R2 image upload failed:", err);
    return "";
  }
}

function hex(h: string, amt: number) {
  try {
    const s = h.replace("#", "").padStart(6, "0");
    const n = parseInt(s, 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  } catch { return h; }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function applyKnownTraits(prompt: string, traits: any) {
  const p = normalizeText(prompt || "");
  const preset = (extra: any) => ({ ...traits, ...extra });

  if (p.includes("neymar")) {
    return preset({
      skinTone: "#9B5A16",
      hairColor: "#2B1A10",
      hairStyle: "mohawk",
      beardStyle: "goatee",
      eyeColor: "#3A1D08",
      eyeSize: "big",
      faceShape: "round",
      shirtColor: "#F6D94A",
      shirtAccentColor: "#168A3A",
      outfitPattern: "brazil",
      accessories: ["earring_both"],
      expression: "confident",
      cheekBlush: false,
      bgColor1: "#69C64A",
      bgColor2: "#2F8D38",
      initials: "NJ",
      badgeText: "10",
    });
  }

  if (p.includes("messi")) {
    return preset({
      skinTone: "#F0C08B",
      hairColor: "#4A2A16",
      hairStyle: "short_wavy",
      beardStyle: "full_beard",
      eyeColor: "#4A2A16",
      eyeSize: "normal",
      faceShape: "oval",
      shirtColor: "#75CDEB",
      shirtAccentColor: "#FFFFFF",
      outfitPattern: "argentina",
      accessories: ["none"],
      expression: "calm",
      cheekBlush: false,
      bgColor1: "#D8F5FF",
      bgColor2: "#93D8F0",
      initials: "LM",
      badgeText: "10",
    });
  }

  if (p.includes("lamine") || p.includes("yamal")) {
    return preset({
      skinTone: "#8A4B18",
      hairColor: "#2A1710",
      hairStyle: "low_fade_curly",
      beardStyle: "none",
      eyeColor: "#2A1710",
      eyeSize: "big",
      faceShape: "round",
      shirtColor: "#D90429",
      shirtAccentColor: "#2347A8",
      outfitPattern: "barca",
      accessories: ["earring_both"],
      expression: "big_smile",
      cheekBlush: false,
      bgColor1: "#E8E0D2",
      bgColor2: "#BFB7A8",
      initials: "LY",
      badgeText: "19",
    });
  }

  if (p.includes("hulk") && (p.includes("jogador") || p.includes("futebol") || p.includes("fluminense") || p.includes("atletico") || p.includes("atlético") || p.includes("cam"))) {
    const isFluminense = p.includes("fluminense");
    return preset({
      skinTone: "#B06B3A",
      hairColor: "#151515",
      hairStyle: "short_wavy",
      beardStyle: "full_beard",
      eyeColor: "#1F2937",
      eyeSize: "normal",
      faceShape: "square",
      shirtColor: isFluminense ? "#7A1021" : "#111827",
      shirtAccentColor: "#FFFFFF",
      outfitPattern: isFluminense ? "fluminense" : "atletico_mg",
      accessories: ["none"],
      expression: "confident",
      cheekBlush: false,
      bgColor1: isFluminense ? "#FFFFFF" : "#2E2E2E",
      bgColor2: isFluminense ? "#6E1423" : "#111111",
      initials: isFluminense ? "FLU" : "CAM",
      badgeText: "7",
    });
  }

  if (p.includes("hulk")) {
    return preset({
      skinTone: "#22B835",
      hairColor: "#101010",
      hairStyle: "short_wavy",
      beardStyle: "none",
      eyeColor: "#111111",
      eyeSize: "big",
      faceShape: "square",
      shirtColor: "#078A08",
      shirtAccentColor: "#5B2A86",
      outfitPattern: "muscle",
      accessories: ["none"],
      expression: "confident",
      cheekBlush: false,
      bgColor1: "#4B4B4B",
      bgColor2: "#111111",
      initials: "HG",
      badgeText: "H",
    });
  }

  if (p.includes("homem de ferro") || p.includes("iron man")) {
    return preset({
      skinTone: "#C62828",
      hairColor: "#7A1111",
      hairStyle: "bald",
      beardStyle: "none",
      eyeColor: "#8FEFFF",
      eyeSize: "small",
      faceShape: "square",
      shirtColor: "#B71C1C",
      shirtAccentColor: "#FFD54F",
      outfitPattern: "armor",
      headwear: "iron_helmet",
      accessories: ["none"],
      expression: "cool",
      cheekBlush: false,
      bgColor1: "#BDBDBD",
      bgColor2: "#505050",
      initials: "HF",
      badgeText: "A",
    });
  }

  if (p.includes("mulher maravilha") || p.includes("wonder woman")) {
    return preset({
      skinTone: "#F0B987",
      hairColor: "#171018",
      hairStyle: "long_straight",
      beardStyle: "none",
      eyeColor: "#1F4FA3",
      eyeSize: "big",
      faceShape: "oval",
      shirtColor: "#C91524",
      shirtAccentColor: "#F5C84C",
      outfitPattern: "heroine",
      headwear: "gold_tiara",
      accessories: ["earring_both"],
      expression: "confident",
      cheekBlush: true,
      bgColor1: "#DDF8FF",
      bgColor2: "#8CCBE8",
      initials: "MM",
      badgeText: "W",
    });
  }

  return traits;
}

function buildAvatar(t: any): string {
  const skin   = t.skinTone         || "#C68642";
  const hair   = t.hairColor        || "#1a1a1a";
  const eye    = t.eyeColor         || "#3d2200";
  const shirt  = t.shirtColor       || "#2196F3";
  const accent = t.shirtAccentColor || "#ffffff";
  const bg1    = t.bgColor1         || "#1565C0";
  const bg2    = t.bgColor2         || "#0D47A1";
  const inits  = (t.initials || "?").toUpperCase().replace(/[^A-Z0-9?]/g, "").slice(0, 2) || "?";
  const style  = t.hairStyle        || "short_wavy";
  const beard  = t.beardStyle       || "none";
  const expr   = t.expression       || "happy";
  const eyeSz  = t.eyeSize          || "normal";
  const face   = t.faceShape        || "oval";
  const blush  = t.cheekBlush !== false;
  const accs: string[] = Array.isArray(t.accessories) ? t.accessories : [t.accessories || "none"];
  const outfit = t.outfitPattern || "solid";
  const headwear = t.headwear || "none";
  const badgeText = (t.badgeText || inits).toUpperCase().replace(/[^A-Z0-9?]/g, "").slice(0, 3) || inits;

  const faceRx = face === "round" || face === "chubby" ? 40 : 36;
  const faceRy = face === "chubby" ? 44 : 42;
  const eyeRx  = eyeSz === "big" ? 11 : eyeSz === "small" ? 8 : 9;
  const eyeRy  = eyeSz === "big" ? 10 : eyeSz === "small" ? 7 : 8;
  const pupil  = eyeSz === "big" ? 6.5 : 5;
  const ex1 = 200 - faceRx + 14;
  const ex2 = 200 + faceRx - 14;
  const ey  = face === "chubby" ? 194 : 196;

  // ── Hair shapes ──
  const hairMap: Record<string, string> = {
    mohawk: `
      <ellipse cx="200" cy="188" rx="38" ry="32" fill="${skin}"/>
      <ellipse cx="200" cy="148" rx="14" ry="36" fill="${hair}"/>
      <ellipse cx="162" cy="200" rx="9" ry="14" fill="${hex(skin,-10)}"/>
      <ellipse cx="238" cy="200" rx="9" ry="14" fill="${hex(skin,-10)}"/>`,
    low_fade_curly: `
      <ellipse cx="200" cy="170" rx="40" ry="32" fill="${hair}"/>
      <ellipse cx="200" cy="158" rx="36" ry="18" fill="${hair}"/>
      <ellipse cx="162" cy="190" rx="11" ry="15" fill="${hex(hair,30)}"/>
      <ellipse cx="238" cy="190" rx="11" ry="15" fill="${hex(hair,30)}"/>`,
    short_wavy: `
      <ellipse cx="200" cy="172" rx="40" ry="34" fill="${hair}"/>
      <ellipse cx="200" cy="158" rx="38" ry="20" fill="${hair}"/>`,
    long_straight: `
      <ellipse cx="200" cy="172" rx="40" ry="34" fill="${hair}"/>
      <rect x="160" y="188" width="18" height="110" rx="9" fill="${hair}"/>
      <rect x="222" y="188" width="18" height="110" rx="9" fill="${hair}"/>`,
    afro: `
      <ellipse cx="200" cy="160" rx="56" ry="52" fill="${hair}"/>
      <circle cx="152" cy="185" r="20" fill="${hair}"/>
      <circle cx="248" cy="185" r="20" fill="${hair}"/>`,
    bald: ``,
    undercut: `
      <ellipse cx="200" cy="170" rx="40" ry="32" fill="${hair}"/>
      <rect x="160" y="178" width="80" height="14" fill="${hair}"/>
      <ellipse cx="162" cy="196" rx="8" ry="10" fill="${hex(skin,-5)}"/>
      <ellipse cx="238" cy="196" rx="8" ry="10" fill="${hex(skin,-5)}"/>`,
    man_bun: `
      <ellipse cx="200" cy="175" rx="38" ry="30" fill="${hair}"/>
      <ellipse cx="200" cy="148" rx="20" ry="20" fill="${hair}"/>
      <circle cx="200" cy="144" r="14" fill="${hex(hair,10)}"/>`,
    short_spiky: `
      <ellipse cx="200" cy="176" rx="38" ry="30" fill="${hair}"/>
      <path d="M180 158 L185 138 L190 158" fill="${hair}"/>
      <path d="M192 154 L197 132 L202 154" fill="${hair}"/>
      <path d="M204 154 L209 136 L214 154" fill="${hair}"/>
      <path d="M216 158 L220 140 L225 158" fill="${hair}"/>`,
    medium_wavy: `
      <ellipse cx="200" cy="168" rx="42" ry="36" fill="${hair}"/>
      <ellipse cx="200" cy="156" rx="40" ry="22" fill="${hair}"/>
      <rect x="160" y="185" width="16" height="60" rx="8" fill="${hair}"/>
      <rect x="224" y="185" width="16" height="60" rx="8" fill="${hair}"/>`,
  };

  // ── Beard shapes ──
  const beardMap: Record<string, string> = {
    none: ``,
    stubble: `<ellipse cx="200" cy="232" rx="26" ry="10" fill="${hex(hair, 40)}" fill-opacity="0.5"/>`,
    full_beard: `
      <ellipse cx="200" cy="234" rx="30" ry="16" fill="${hair}"/>
      <rect x="170" y="218" width="60" height="18" rx="4" fill="${hair}"/>
      <ellipse cx="200" cy="232" rx="24" ry="12" fill="${hex(hair,20)}"/>`,
    goatee: `
      <ellipse cx="200" cy="236" rx="16" ry="12" fill="${hair}"/>`,
    short_beard: `
      <ellipse cx="200" cy="232" rx="28" ry="13" fill="${hair}"/>
      <rect x="172" y="220" width="56" height="14" rx="3" fill="${hair}"/>`,
  };

  // ── Expressions ──
  const mouthY = beard !== "none" ? 222 : 224;
  const mouthMap: Record<string, string> = {
    happy:      `<path d="M${200-18} ${mouthY} Q200 ${mouthY+14} ${200+18} ${mouthY}" stroke="${hex(skin,-60)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    big_smile:  `<path d="M${200-22} ${mouthY} Q200 ${mouthY+18} ${200+22} ${mouthY}" stroke="${hex(skin,-60)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                 <ellipse cx="${200-12}" cy="${mouthY+5}" rx="5" ry="3" fill="#FF8A80" fill-opacity="0.5"/>
                 <ellipse cx="${200+12}" cy="${mouthY+5}" rx="5" ry="3" fill="#FF8A80" fill-opacity="0.5"/>`,
    calm:       `<path d="M${200-14} ${mouthY+2} Q200 ${mouthY+8} ${200+14} ${mouthY+2}" stroke="${hex(skin,-60)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    confident:  `<path d="M${200-16} ${mouthY} Q200 ${mouthY+12} ${200+16} ${mouthY}" stroke="${hex(skin,-60)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    cool:       `<line x1="${200-14}" y1="${mouthY+4}" x2="${200+14}" y2="${mouthY+4}" stroke="${hex(skin,-60)}" stroke-width="2.5" stroke-linecap="round"/>`,
  };

  // ── Accessories ──
  let accSVG = "";
  if (accs.includes("earring_left") || accs.includes("earring_both")) {
    accSVG += `<circle cx="${200-faceRx-8}" cy="210" r="5" fill="#FFD600"/>`;
  }
  if (accs.includes("earring_both")) {
    accSVG += `<circle cx="${200+faceRx+8}" cy="210" r="5" fill="#FFD600"/>`;
  }
  if (accs.includes("glasses")) {
    accSVG += `
      <rect x="${ex1-14}" y="${ey-10}" width="28" height="20" rx="6" fill="none" stroke="#555" stroke-width="3"/>
      <rect x="${ex2-14}" y="${ey-10}" width="28" height="20" rx="6" fill="none" stroke="#555" stroke-width="3"/>
      <line x1="${ex1+14}" y1="${ey}" x2="${ex2-14}" y2="${ey}" stroke="#555" stroke-width="2.5"/>`;
  }
  if (accs.includes("headband")) {
    accSVG += `<rect x="${200-faceRx-2}" y="204" width="${(faceRx+2)*2}" height="14" rx="7" fill="${accent}"/>`;
  }
  if (headwear === "gold_tiara") {
    accSVG += `
      <path d="M158 174 Q200 144 242 174 L230 188 Q200 174 170 188 Z" fill="#F5C84C"/>
      <path d="M190 170 L200 150 L210 170 Z" fill="#D7192A"/>
      <circle cx="200" cy="168" r="5" fill="#2F62C9"/>`;
  }
  if (headwear === "iron_helmet") {
    accSVG += `
      <path d="M160 174 Q200 136 240 174 L235 224 Q200 250 165 224 Z" fill="#B71C1C"/>
      <path d="M174 178 Q200 158 226 178 L220 220 Q200 236 180 220 Z" fill="#FFD54F"/>
      <rect x="${ex1-12}" y="${ey-6}" width="24" height="8" rx="4" fill="#8FEFFF"/>
      <rect x="${ex2-12}" y="${ey-6}" width="24" height="8" rx="4" fill="#8FEFFF"/>
      <line x1="186" y1="228" x2="214" y2="228" stroke="#7A1111" stroke-width="4" stroke-linecap="round"/>`;
  }

  const blushSVG = blush
    ? `<ellipse cx="${ex1-4}" cy="${ey+22}" rx="14" ry="8" fill="#FF8C8C" fill-opacity="0.22"/>
       <ellipse cx="${ex2+4}" cy="${ey+22}" rx="14" ry="8" fill="#FF8C8C" fill-opacity="0.22"/>`
    : "";

  const outfitSVG = outfit === "argentina" ? `
    <rect x="132" y="308" width="30" height="150" fill="${accent}" fill-opacity="0.95"/>
    <rect x="190" y="300" width="24" height="165" fill="${accent}" fill-opacity="0.95"/>
    <rect x="240" y="310" width="30" height="150" fill="${accent}" fill-opacity="0.95"/>`
    : outfit === "brazil" ? `
    <path d="M118 354 L200 302 L282 354 L200 408 Z" fill="${accent}" fill-opacity="0.9"/>
    <circle cx="200" cy="354" r="28" fill="#244CB5" fill-opacity="0.95"/>`
    : outfit === "barca" ? `
    <rect x="132" y="300" width="42" height="170" fill="${accent}" fill-opacity="0.95"/>
    <rect x="214" y="300" width="42" height="170" fill="${accent}" fill-opacity="0.95"/>
    <path d="M130 326 Q200 348 270 326" stroke="#F5C84C" stroke-width="10" fill="none"/>`
    : outfit === "muscle" ? `
    <ellipse cx="104" cy="364" rx="54" ry="48" fill="${hex(skin, -18)}"/>
    <ellipse cx="296" cy="364" rx="54" ry="48" fill="${hex(skin, -18)}"/>
    <circle cx="76" cy="410" r="34" fill="${hex(skin, -8)}"/>
    <circle cx="324" cy="410" r="34" fill="${hex(skin, -8)}"/>
    <path d="M98 320 Q200 250 302 320 L282 430 Q200 476 118 430 Z" fill="${hex(skin, -12)}"/>
    <path d="M150 328 Q200 370 250 328" stroke="${hex(skin, 46)}" stroke-width="10" fill="none"/>
    <path d="M156 380 Q200 410 244 380" stroke="${hex(skin, -42)}" stroke-width="7" fill="none"/>
    <path d="M118 420 L282 420 L264 500 H136 Z" fill="#5B2A86"/>
    <path d="M142 438 H258" stroke="#7E3FB0" stroke-width="14"/>`
    : outfit === "armor" ? `
    <path d="M116 306 L284 306 L262 470 L138 470 Z" fill="#B71C1C"/>
    <path d="M154 312 L200 352 L246 312 L224 430 L176 430 Z" fill="#FFD54F"/>
    <circle cx="200" cy="362" r="22" fill="#8FEFFF"/>
    <circle cx="200" cy="362" r="13" fill="#FFFFFF" fill-opacity="0.85"/>`
    : outfit === "heroine" ? `
    <path d="M120 310 L280 310 L250 470 L150 470 Z" fill="#C91524"/>
    <path d="M142 314 L200 358 L258 314" stroke="${accent}" stroke-width="16" fill="none"/>
    <path d="M166 360 L200 392 L234 360" stroke="${accent}" stroke-width="10" fill="none"/>`
    : outfit === "fluminense" ? `
    <path d="M116 302 L284 302 L262 470 L138 470 Z" fill="#7A1021"/>
    <rect x="128" y="302" width="34" height="170" fill="#FFFFFF"/>
    <rect x="190" y="292" width="28" height="180" fill="#FFFFFF"/>
    <rect x="246" y="302" width="34" height="170" fill="#FFFFFF"/>
    <path d="M116 350 H284" stroke="#0B6B3A" stroke-width="18"/>
    <circle cx="200" cy="390" r="28" fill="#FFFFFF"/>
    <text x="200" y="400" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#7A1021">FLU</text>`
    : outfit === "atletico_mg" ? `
    <path d="M116 302 L284 302 L262 470 L138 470 Z" fill="#111827"/>
    <rect x="132" y="308" width="34" height="170" fill="#FFFFFF"/>
    <rect x="190" y="292" width="28" height="180" fill="#FFFFFF"/>
    <rect x="238" y="308" width="34" height="170" fill="#FFFFFF"/>
    <path d="M116 376 H284" stroke="#111827" stroke-width="18"/>
    <circle cx="200" cy="390" r="28" fill="#111827"/>
    <text x="200" y="400" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#FFFFFF">CAM</text>`
    : "";

  const badgeSVG = outfit === "armor" || outfit === "fluminense" || outfit === "atletico_mg"
    ? ""
    : `<circle cx="200" cy="388" r="26" fill="${accent}" fill-opacity="0.95"/>
  <text x="200" y="396" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="16" font-weight="900" fill="${shirt}">${badgeText}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </radialGradient>
  </defs>

  <rect width="400" height="500" fill="url(#bg)"/>
  <circle cx="60" cy="80" r="55" fill="white" fill-opacity="0.06"/>
  <circle cx="350" cy="430" r="75" fill="white" fill-opacity="0.06"/>

  <!-- Neck -->
  <rect x="184" y="246" width="32" height="80" rx="13" fill="${skin}"/>

  <!-- Body -->
  <ellipse cx="200" cy="430" rx="142" ry="108" fill="${shirt}"/>
  <ellipse cx="200" cy="336" rx="118" ry="64" fill="${shirt}"/>
  <path d="M150 300 Q200 330 250 300" fill="${hex(shirt,-20)}"/>
  ${outfitSVG}

  <!-- Hair (back) -->
  ${hairMap[style] || hairMap.short_wavy}

  <!-- Face -->
  <ellipse cx="200" cy="210" rx="${faceRx}" ry="${faceRy}" fill="${skin}"/>

  <!-- Ears -->
  <ellipse cx="${200-faceRx-4}" cy="210" rx="12" ry="16" fill="${skin}"/>
  <ellipse cx="${200+faceRx+4}" cy="210" rx="12" ry="16" fill="${skin}"/>
  <ellipse cx="${200-faceRx-4}" cy="210" rx="7" ry="10" fill="${hex(skin,-18)}"/>
  <ellipse cx="${200+faceRx+4}" cy="210" rx="7" ry="10" fill="${hex(skin,-18)}"/>

  <!-- Beard (below face) -->
  ${beardMap[beard] || ""}

  <!-- Eyebrows -->
  <path d="M${ex1-4} ${ey-14} Q${ex1+9} ${ey-20} ${ex1+18} ${ey-13}" stroke="${hair}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M${ex2-18} ${ey-13} Q${ex2-9} ${ey-20} ${ex2+4} ${ey-14}" stroke="${hair}" stroke-width="3.5" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  <ellipse cx="${ex1}" cy="${ey}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
  <ellipse cx="${ex2}" cy="${ey}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
  <circle cx="${ex1+2}" cy="${ey+1}" r="${pupil}" fill="${eye}"/>
  <circle cx="${ex2+2}" cy="${ey+1}" r="${pupil}" fill="${eye}"/>
  <circle cx="${ex1+2}" cy="${ey+1}" r="${pupil*0.55}" fill="#111"/>
  <circle cx="${ex2+2}" cy="${ey+1}" r="${pupil*0.55}" fill="#111"/>
  <circle cx="${ex1+4}" cy="${ey-2}" r="${pupil*0.35}" fill="white"/>
  <circle cx="${ex2+4}" cy="${ey-2}" r="${pupil*0.35}" fill="white"/>

  <!-- Nose -->
  <path d="M${197} ${ey+12} Q200 ${ey+22} ${203} ${ey+12}" stroke="${hex(skin,-45)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M${194} ${ey+22} Q200 ${ey+27} ${206} ${ey+22}" stroke="${hex(skin,-45)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>

  <!-- Mouth -->
  ${mouthMap[expr] || mouthMap.happy}

  <!-- Cheek blush -->
  ${blushSVG}

  <!-- Accessories -->
  ${accSVG}

  <!-- Shirt badge -->
  ${badgeSVG}
</svg>`;
}
