import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getKnownCharacterCard } from '@/lib/knownCharacterCards';

const PROMPT_VERSION = 'groq-pollinations-recognizable-card-v3';
const CARD_SIZE = process.env.POLLINATIONS_IMAGE_SIZE || '1024x1280';
const [CARD_WIDTH = '1024', CARD_HEIGHT = '1280'] = CARD_SIZE.split('x');

const r2AccountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

type CharacterRequest = {
  prompt?: string;
  name?: string;
  description?: string;
};

type NormalizedCharacterInput = {
  displayName: string;
  description: string;
  fullText: string;
  normalizedName: string;
};

type GeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  provider: 'pollinations-post' | 'pollinations-get';
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

type PollinationsImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

type CharacterHint = {
  aliases: string[];
  visual: string;
};

const CHARACTER_HINTS: CharacterHint[] = [
  {
    aliases: ['the flash', 'flash'],
    visual:
      'DC speedster superhero in a sleek deep red full-body suit, white eye lenses or visible determined face, gold lightning ear bolts, gold belt, lightning electricity trails, running-energy background, heroic youthful expression',
  },
  {
    aliases: ['loki'],
    visual:
      'Loki, sly Norse trickster villain, black slicked hair, pale face, sharp mischievous smile, emerald green and gold armor, large curved golden horned helmet, green magical glow, elegant villain posture',
  },
  {
    aliases: ['thor'],
    visual:
      'Thor, muscular Norse thunder god superhero, long blond hair, short blond beard, red cape, dark silver Asgardian armor with round metal discs, storm clouds and blue lightning, powerful noble expression, hammer-inspired thunder energy',
  },
  {
    aliases: ['lanterna verde', 'green lantern'],
    visual:
      'Green Lantern style cosmic superhero, emerald green and black suit, green domino mask, glowing power ring on raised hand, bright green aura, cosmic space background, confident determined face, no readable emblem text',
  },
  {
    aliases: ['emma frost', 'rainha branca', 'white queen'],
    visual:
      'Emma Frost / White Queen style telepath heroine, long platinum blonde hair, elegant white futuristic comic outfit, icy diamond sparkle effect, confident intense gaze, luxurious pale silver background',
  },
  {
    aliases: ['hulk marvel', 'bruce banner'],
    visual:
      'Marvel Hulk style green giant, huge muscular body, green skin, black messy hair, angry face, massive shoulders, torn purple shorts, rubble and impact dust background',
  },
  {
    aliases: ['hulk fluminense', 'hulk jogador', 'givanildo vieira'],
    visual:
      'Brazilian football striker Hulk, strong athletic man, tan skin, short dark hair, full dark beard, intense face, football jersey inspired by Fluminense burgundy green and white colors, stadium lights, not a green monster',
  },
  {
    aliases: ['hulk'],
    visual:
      'green super-strong giant hero, huge muscular body, green skin, black messy hair, angry face, torn purple shorts, rubble background',
  },
  {
    aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man'],
    visual:
      'Spider-Man style hero, red and blue spider suit, web pattern, large white expressive eye lenses, agile pose, city skyline and web strands, friendly heroic energy',
  },
  {
    aliases: ['homem de ferro', 'iron man', 'tony stark'],
    visual:
      'Iron Man style armored hero, red and gold metallic armor, glowing blue arc reactor on chest, helmet with illuminated eyes, cinematic technology background',
  },
  {
    aliases: ['batman'],
    visual:
      'Batman style dark vigilante, black cowl with pointed ears, black cape, armored suit, brooding expression, gothic night city, dramatic moonlit shadows',
  },
  {
    aliases: ['superman', 'super homem', 'super-homem'],
    visual:
      'Superman style classic hero, blue suit, red cape, strong jaw, black hair with curl, bright hopeful expression, sky and sunlight background, no readable chest logo',
  },
  {
    aliases: ['neymar', 'neymar jr', 'neymar junior'],
    visual:
      'Brazilian football star Neymar Jr, tan skin, sharp fade haircut, expressive eyebrows, trimmed beard, earrings, yellow and green Brazil-inspired football kit, stadium lights, confident playful expression',
  },
  {
    aliases: ['messi', 'lionel messi'],
    visual:
      'Lionel Messi style Argentine football star, short brown hair, full brown beard, calm focused face, sky blue and white Argentina-inspired football kit, stadium lights',
  },
  {
    aliases: ['yamal', 'lamine yamal'],
    visual:
      'Lamine Yamal style young football winger, dark skin, low curly fade haircut, youthful confident smile, red and blue Barcelona-inspired football kit, stadium lights',
  },
  {
    aliases: ['shrek'],
    visual:
      'Shrek style green ogre, round green face, trumpet-shaped ears, white tunic, brown vest, friendly ogre grin, swamp background',
  },
  {
    aliases: ['goku', 'son goku'],
    visual:
      'Goku style anime martial artist, spiky black hair, orange gi with blue undershirt and wristbands, intense heroic smile, glowing energy aura, anime action background',
  },
  {
    aliases: ['pikachu'],
    visual:
      'Pikachu style yellow electric mouse creature, red cheeks, long black-tipped ears, cute determined expression, lightning sparks, bright playful background',
  },
  {
    aliases: ['mario', 'super mario'],
    visual:
      'Mario style cheerful plumber hero, red cap, thick black mustache, blue overalls, white gloves, cartoon adventure background, joyful confident expression',
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CharacterRequest;
    const input = normalizeInput(body);

    if (!input.displayName) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const knownCardUrl = getKnownCharacterCard(input.displayName);

    if (knownCardUrl && !input.description) {
      return NextResponse.json({
        url: knownCardUrl,
        prompt: `Curated local card for ${input.displayName}`,
        source: 'known-character-card',
      });
    }

    const seed = stableSeed(`${PROMPT_VERSION}:${input.fullText}`);
    const prompt = await buildFinalImagePrompt(input);
    const image = await generatePollinationsImage(prompt, seed);

    if (image) {
      const uploadedUrl = await uploadImageToR2(
        `characters/${slugify(input.displayName)}_${Date.now()}_${seed}.${extensionFromContentType(image.contentType)}`,
        image.bytes,
        image.contentType,
      );

      if (uploadedUrl) {
        return NextResponse.json({
          url: uploadedUrl,
          prompt,
          source: `${image.provider}-r2`,
        });
      }

      return NextResponse.json({
        url: `data:${image.contentType};base64,${bytesToBase64(image.bytes)}`,
        prompt,
        source: `${image.provider}-data-uri`,
      });
    }

    if (knownCardUrl) {
      return NextResponse.json({
        url: knownCardUrl,
        prompt,
        source: 'known-character-card-after-pollinations-failure',
      });
    }

    return NextResponse.json({
      url: '',
      prompt,
      source: 'pollinations-failed-no-svg-fallback',
      error: 'Não foi possível gerar a imagem no Pollinations agora.',
    });
  } catch (error: unknown) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeInput(body: CharacterRequest): NormalizedCharacterInput {
  const rawPrompt = String(body.prompt || body.name || '').trim();
  const bodyDescription = String(body.description || '').trim();

  const cleanedPrompt = rawPrompt
    .replace(/\s+/g, ' ')
    .replace(/\bRealistic and detailed character portrait\b/gi, '')
    .replace(/\bCharacter portrait\b/gi, '')
    .replace(/\bPortrait\b/gi, '')
    .replace(/\s+([,.])/g, '$1')
    .replace(/[,.]\s*$/g, '')
    .trim();

  const appearanceSplit = cleanedPrompt.split(/\s+[—-]\s*apar[eê]ncia\s*:\s*/i);
  const commaSplit = appearanceSplit[0]?.split(/,\s*/) || [];

  const displayName = sanitizeCharacterName(appearanceSplit.length > 1 ? appearanceSplit[0] : commaSplit[0] || cleanedPrompt);
  const extractedDescription = appearanceSplit.length > 1 ? appearanceSplit.slice(1).join(' — aparência: ') : commaSplit.slice(1).join(', ');
  const description = sanitizeDescription(bodyDescription || extractedDescription);
  const fullText = description ? `${displayName} — aparência: ${description}` : displayName;

  return {
    displayName,
    description,
    fullText,
    normalizedName: normalizeSearchText(displayName),
  };
}

function sanitizeCharacterName(value: string) {
  return value
    .replace(/^personagem\s*:\s*/i, '')
    .replace(/^nome\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.]\s*$/g, '')
    .trim()
    .slice(0, 90);
}

function sanitizeDescription(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[,.]\s*$/g, '')
    .trim()
    .slice(0, 320);
}

async function buildFinalImagePrompt(input: NormalizedCharacterInput) {
  const groqPrompt = await buildPromptWithGroq(input);

  if (groqPrompt) {
    return groqPrompt;
  }

  return buildFallbackPrompt(input);
}

async function buildPromptWithGroq(input: NormalizedCharacterInput) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return '';

  const knownHint = getCharacterHint(input);
  const userDescription = input.description || 'no extra appearance details';

  try {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.35,
        max_tokens: 750,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write image-generation prompts for collectible character cards. Return only valid JSON with one string property named "prompt". The prompt must be in English and must be visually specific. Never return markdown.',
          },
          {
            role: 'user',
            content: `Create a single high-quality text-to-image prompt.

Character name: ${input.displayName}
Extra appearance details from user: ${userDescription}
Known visual identity hint: ${knownHint || 'infer from the character name if known; otherwise use the user description'}

Goal: the generated image must look like the named character, not a generic avatar.

Required final prompt content:
- vertical 4:5 collectible trading card illustration
- premium cinematic digital painting / polished fan-art style
- face and costume must be highly recognizable
- chest-up or half-body character centered in frame
- rich background connected to the character
- premium black and metallic gold card border
- vivid lighting, high detail, crisp mobile game asset
- prioritize character accuracy over keeping every card identical
- no readable text, no letters, no watermark, no official logos, no flat vector, no emoji, no children's drawing, no stick figure, no generic smiley face, no placeholder

Return JSON only like: {"prompt":"..."}`,
          },
        ],
      }),
    });

    const payload = (await safeJson(response)) as GroqChatResponse | null;

    if (!response.ok) {
      console.warn('Groq prompt generation failed:', response.status, payload?.error?.message || response.statusText);
      return '';
    }

    const content = payload?.choices?.[0]?.message?.content || '';
    const parsed = parseGroqPrompt(content);

    if (!parsed) return '';

    return clampPrompt(enforcePromptRules(parsed, input));
  } catch (error) {
    console.warn('Groq prompt generation request failed:', error);
    return '';
  }
}

function parseGroqPrompt(content: string) {
  try {
    const parsed = JSON.parse(content) as { prompt?: unknown };
    return typeof parsed.prompt === 'string' ? parsed.prompt.trim() : '';
  } catch {
    const match = content.match(/"prompt"\s*:\s*"([\s\S]*?)"\s*}/);
    return match?.[1]?.replace(/\\"/g, '"').trim() || '';
  }
}

function enforcePromptRules(prompt: string, input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? ` User custom appearance details: ${input.description}.` : '';

  return `${prompt}

Hard requirements: This is ${input.displayName}. ${hint ? `Recognizable visual identity: ${hint}.` : ''}${description} The character must not look generic. Make the face, hair, costume, colors, props and silhouette specific to ${input.displayName}. Vertical 4:5 premium collectible card, black and gold border, cinematic high-detail illustration. No readable text, no random letters, no watermark, no logos, no flat SVG, no emoji, no placeholder, no stick figure.`;
}

function buildFallbackPrompt(input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? `Additional user appearance details: ${input.description}.` : '';
  const visualIdentity = hint || `use the most recognizable visual identity of ${input.displayName}; if unknown, follow the user's description precisely`;

  return clampPrompt(`
Vertical 4:5 premium collectible trading card illustration for a mobile guessing game.
Character: ${input.displayName}.
Recognizable visual identity: ${visualIdentity}.
${description}
The result must be immediately recognizable as ${input.displayName}, not a generic avatar.
High-detail cinematic digital painting, polished fan-art style, chest-up or half-body portrait centered in frame, expressive accurate face, iconic costume colors, iconic accessories, dynamic character-related background, dramatic rim lighting, saturated colors, crisp game asset.
Premium card design with a black outer border and subtle metallic gold trim, but prioritize character accuracy over template consistency.
No readable text, no letters, no watermark, no official logo, no flat SVG, no emoji, no children's drawing, no stick figure, no generic smiley face, no blank placeholder, no extra faces, no distorted eyes, no cropped head.
`.trim());
}

function getCharacterHint(input: NormalizedCharacterInput) {
  const normalized = input.normalizedName;
  const exactMatch = CHARACTER_HINTS.find((hint) =>
    hint.aliases.some((alias) => normalizeSearchText(alias) === normalized),
  );

  if (exactMatch) return exactMatch.visual;

  const partialMatch = CHARACTER_HINTS.find((hint) =>
    hint.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedAlias.length >= 4 && normalized.includes(normalizedAlias);
    }),
  );

  return partialMatch?.visual || '';
}

async function generatePollinationsImage(prompt: string, seed: number): Promise<GeneratedImage | null> {
  const postImage = await generatePollinationsImagePost(prompt);

  if (postImage) {
    return postImage;
  }

  return generatePollinationsImageGet(prompt, seed);
}

async function generatePollinationsImagePost(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) {
    console.warn('Missing POLLINATIONS_API_KEY.');
    return null;
  }

  try {
    const response = await fetchWithTimeout('https://gen.pollinations.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.POLLINATIONS_IMAGE_MODEL || 'flux',
        prompt,
        n: 1,
        size: CARD_SIZE,
        quality: process.env.POLLINATIONS_IMAGE_QUALITY || 'high',
        response_format: 'b64_json',
        safe: true,
        user: 'quemsoueu-card-generator',
      }),
    });

    const payload = (await safeJson(response)) as PollinationsImageResponse | null;

    if (!response.ok) {
      console.warn('Pollinations POST generation failed:', response.status, payload?.error?.message || response.statusText);
      return null;
    }

    const first = payload?.data?.[0];

    if (first?.b64_json) {
      const bytes = base64ToBytes(first.b64_json);

      if (bytes.byteLength >= 1000) {
        return {
          bytes,
          contentType: 'image/png',
          provider: 'pollinations-post',
        };
      }
    }

    if (first?.url) {
      return fetchImageFromUrl(first.url, 'pollinations-post');
    }

    return null;
  } catch (error) {
    console.warn('Pollinations POST generation request failed:', error);
    return null;
  }
}

async function generatePollinationsImageGet(prompt: string, seed: number): Promise<GeneratedImage | null> {
  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) return null;

  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
  url.searchParams.set('model', process.env.POLLINATIONS_IMAGE_MODEL || 'flux');
  url.searchParams.set('width', CARD_WIDTH);
  url.searchParams.set('height', CARD_HEIGHT);
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('safe', 'true');
  url.searchParams.set('enhance', 'false');

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      console.warn('Pollinations GET generation failed:', response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      console.warn('Pollinations GET returned non-image content-type:', contentType);
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength < 1000) {
      console.warn('Pollinations GET returned an image that is too small.');
      return null;
    }

    return {
      bytes,
      contentType,
      provider: 'pollinations-get',
    };
  } catch (error) {
    console.warn('Pollinations GET generation request failed:', error);
    return null;
  }
}

async function fetchImageFromUrl(url: string, provider: GeneratedImage['provider']): Promise<GeneratedImage | null> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'image/*' },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';

    if (!contentType.startsWith('image/')) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength < 1000) return null;

    return {
      bytes,
      contentType,
      provider,
    };
  } catch {
    return null;
  }
}

async function uploadImageToR2(key: string, bytes: Uint8Array, contentType: string) {
  if (
    !r2AccountId ||
    !process.env.R2_BUCKET_NAME ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_PUBLIC_URL
  ) {
    return '';
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const base = process.env.R2_PUBLIC_URL;
    return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
  } catch (error) {
    console.warn('R2 image upload failed:', error);
    return '';
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 55_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stableSeed(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) || 42;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string) {
  const slug = normalizeSearchText(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return slug || 'character';
}

function clampPrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 3200);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'png';
}

function base64ToBytes(base64: string) {
  const binary = atob(base64.replace(/^data:image\/\w+;base64,/, ''));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }

  return btoa(binary);
}
