import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

const PROMPT_VERSION = 'proxy-pollinations-card-v21';

type RuntimeEnv = Record<string, unknown>;

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

type CharacterHint = {
  aliases: string[];
  visual: string;
};

const CHARACTER_HINTS: CharacterHint[] = [
  {
    aliases: ['thanos'],
    visual:
      'Thanos, massive purple-skinned titan villain, bald head, deeply furrowed chin, gold and dark blue armor, intimidating expression, cosmic fiery background, powerful stance',
  },
  {
    aliases: ['darth vader'],
    visual:
      'Darth Vader, black armored Sith lord, glossy black helmet, triangular breathing mask, black cape, red lightsaber glow, dark smoky sci-fi background, intimidating silhouette',
  },
  {
    aliases: ['bruxa má do oeste', 'bruxa ma do oeste', 'wicked witch of the west'],
    visual:
      'Wicked Witch of the West, green-skinned witch, long hooked nose, black pointed hat, black robes, sinister expression, dark magical green smoke background',
  },
  {
    aliases: ['sonic', 'sonic the hedgehog'],
    visual:
      'Sonic the Hedgehog, blue anthropomorphic hedgehog, swept-back blue quills, tan muzzle, white gloves, red shoes with white stripe, confident smirk, speed trails, golden rings',
  },
  {
    aliases: ['super mario', 'mario'],
    visual:
      'Super Mario, cheerful plumber hero, red cap, thick black mustache, round nose, blue overalls, red shirt, white gloves, colorful mushroom kingdom background',
  },
  {
    aliases: ['the flash', 'flash'],
    visual:
      'The Flash, red speedster superhero suit, gold lightning ear pieces, gold lightning belt, yellow lightning trails, motion blur, heroic intense face',
  },
  {
    aliases: ['loki'],
    visual:
      'Loki, sly trickster villain, pale sharp face, black slicked hair, mischievous smile, emerald green and gold armor, large curved golden horned helmet, green magic glow',
  },
  {
    aliases: ['thor'],
    visual:
      'Thor, muscular thunder god warrior, long blond hair, short blond beard, red cape, dark silver armor with round discs, storm clouds, blue lightning',
  },
  {
    aliases: ['lanterna verde', 'green lantern'],
    visual:
      'Green Lantern, emerald cosmic superhero, green and black suit, green domino mask, glowing power ring, bright green aura, space background',
  },
  {
    aliases: ['emma frost', 'rainha branca', 'white queen'],
    visual:
      'Emma Frost White Queen, platinum blonde woman, long elegant hair, confident intense gaze, white futuristic comic outfit, diamond sparkle aura, icy silver background',
  },
  {
    aliases: ['hulk marvel', 'bruce banner'],
    visual:
      'Hulk, huge muscular green giant superhero, green skin, black messy hair, angry powerful face, massive shoulders, torn purple shorts, rubble background',
  },
  {
    aliases: ['hulk fluminense', 'hulk jogador', 'hulk futebol', 'givanildo vieira'],
    visual:
      'Brazilian football striker Hulk, strong athletic man, tan skin, short dark hair, full dark beard, intense face, burgundy green and white football jersey, stadium lights, not a green monster',
  },
  {
    aliases: ['hulk'],
    visual:
      'Hulk, huge muscular green giant superhero, green skin, black messy hair, angry powerful face, massive shoulders, torn purple shorts, rubble background',
  },
  {
    aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man', 'spiderman'],
    visual:
      'Spider-Man, agile superhero, red and blue spider suit, web pattern, large white expressive eye lenses, dynamic pose, city skyline, web strands',
  },
  {
    aliases: ['homem de ferro', 'homem-de-ferro', 'iron man', 'tony stark'],
    visual:
      'Iron Man, red and gold metallic armored hero, glowing blue arc reactor, illuminated helmet eyes, polished metal reflections, cinematic technology background',
  },
  {
    aliases: ['batman'],
    visual:
      'Batman, dark vigilante, black cowl with pointed ears, black cape, armored suit, brooding expression, gothic night city, moonlit shadows',
  },
  {
    aliases: ['superman', 'super homem', 'super-homem'],
    visual:
      'Superman, classic heroic man, blue suit, red cape, strong jaw, black hair with curl, hopeful expression, sunlight sky background',
  },
  {
    aliases: ['neymar', 'neymar jr', 'neymar junior'],
    visual:
      'Neymar Jr, Brazilian football star, tan skin, sharp fade haircut, expressive eyebrows, trimmed beard, earrings, yellow and green football kit, stadium lights',
  },
  {
    aliases: ['messi', 'lionel messi'],
    visual:
      'Lionel Messi, Argentine football star, short brown hair, full brown beard, calm focused face, sky blue and white football kit, stadium lights',
  },
  {
    aliases: ['yamal', 'lamine yamal'],
    visual:
      'Lamine Yamal, young football winger, dark skin, low curly fade haircut, youthful confident smile, red and blue football kit, stadium lights',
  },
  {
    aliases: ['shrek'],
    visual:
      'Shrek, green ogre, round green face, trumpet-shaped ears, white tunic, brown vest, friendly ogre grin, swamp background',
  },
  {
    aliases: ['goku', 'son goku'],
    visual:
      'Goku, anime martial artist, spiky black hair, orange gi, blue undershirt, blue wristbands, intense heroic expression, glowing energy aura',
  },
  {
    aliases: ['pikachu'],
    visual:
      'Pikachu, yellow electric mouse creature, red cheeks, long black-tipped ears, cute determined face, lightning sparks, playful bright background',
  },
];

export async function POST(req: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    const body = (await req.json()) as CharacterRequest;
    const input = normalizeInput(body);

    if (!input.displayName) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const prompt = await buildFinalPrompt(input, env);
    const seed = stableSeed(`${PROMPT_VERSION}:${input.fullText}`);
    const width = getNumberEnv(env, 'POLLINATIONS_IMAGE_WIDTH', 768);
    const height = getNumberEnv(env, 'POLLINATIONS_IMAGE_HEIGHT', 960);
    const model = getStringEnv(env, 'POLLINATIONS_IMAGE_MODEL') || 'flux';
    const url = buildInternalImageProxyUrl(prompt, seed, width, height, model);

    return NextResponse.json({
      url,
      prompt,
      source: 'internal-pollinations-proxy',
    });
  } catch (error: unknown) {
    console.error('Image generation route error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const merged: RuntimeEnv = {};

  if (typeof process !== 'undefined' && process.env) {
    Object.assign(merged, process.env);
  }

  try {
    const contextPromise = getCloudflareContext({ async: true } as any) as unknown as
      | Promise<{ env: RuntimeEnv }>
      | { env: RuntimeEnv };
    const context = await contextPromise;
    Object.assign(merged, context.env);
  } catch {
    try {
      const context = getCloudflareContext() as unknown as { env: RuntimeEnv };
      Object.assign(merged, context.env);
    } catch {
      // Fora do Cloudflare/OpenNext.
    }
  }

  return merged;
}

function getStringEnv(env: RuntimeEnv, key: string) {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getNumberEnv(env: RuntimeEnv, key: string, fallback: number) {
  const value = Number(getStringEnv(env, key));

  if (!Number.isFinite(value)) return fallback;

  return Math.max(384, Math.min(1024, Math.round(value)));
}

function normalizeInput(body: CharacterRequest): NormalizedCharacterInput {
  const rawPrompt = String(body.prompt || body.name || '').trim();
  const rawDescription = String(body.description || '').trim();

  const cleanedPrompt = rawPrompt
    .replace(/\s+/g, ' ')
    .replace(/\bRealistic and detailed character portrait\b/gi, '')
    .replace(/\bCharacter portrait\b/gi, '')
    .replace(/\bPortrait\b/gi, '')
    .replace(/\s+([,.])/g, '$1')
    .replace(/[,.]\s*$/g, '')
    .trim();

  const appearanceSplit = cleanedPrompt.split(/\s+[—-]\s*apar[eê]ncia\s*:\s*/i);
  const namePart = appearanceSplit[0] || cleanedPrompt;
  const extractedDescription = appearanceSplit.length > 1 ? appearanceSplit.slice(1).join(' — aparência: ') : '';

  const displayName = sanitizeCharacterName(namePart);
  const description = sanitizeDescription(rawDescription || extractedDescription);
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
    .slice(0, 260);
}

async function buildFinalPrompt(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const groqPrompt = await buildPromptWithGroq(input, env);

  if (groqPrompt) {
    return groqPrompt;
  }

  return buildDirectPrompt(input);
}

async function buildPromptWithGroq(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const apiKey = getStringEnv(env, 'GROQ_API_KEY');

  if (!apiKey) return '';

  const hint = getCharacterHint(input);
  const model = getStringEnv(env, 'GROQ_MODEL') || 'llama-3.3-70b-versatile';
  const description = input.description || 'no extra user appearance details';

  try {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 520,
        messages: [
          {
            role: 'system',
            content:
              'You write concise English prompts for AI image generation. Return only the final prompt text. No markdown. No JSON. No explanations.',
          },
          {
            role: 'user',
            content: `Create one concise image prompt.

Character name: ${input.displayName}
User appearance details: ${description}
Known visual identity: ${hint || 'infer the most recognizable visual identity from the character name if known'}

The result must look like the named character, not a generic avatar.

Style:
premium vertical collectible trading card, cinematic digital painting, polished fan-art, centered chest-up character, recognizable face, accurate costume, iconic colors, iconic accessories, iconic silhouette, dynamic background related to the character, dramatic lighting, black and metallic gold card border.

Avoid:
flat vector, simple geometric avatar, emoji, childish drawing, stick figure, generic face, generic costume, placeholder, readable text, letters, words, watermark, logo, official logo.`,
          },
        ],
      }),
    });

    const payload = (await safeJson(response)) as GroqChatResponse | null;

    if (!response.ok) {
      console.warn('Groq prompt generation failed:', response.status, payload?.error?.message || response.statusText);
      return '';
    }

    const text = payload?.choices?.[0]?.message?.content?.trim() || '';

    if (!text) return '';

    return clampPrompt(enforcePromptRules(text, input));
  } catch (error) {
    console.warn('Groq prompt generation request failed:', error);
    return '';
  }
}

function buildDirectPrompt(input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? `User details: ${input.description}.` : '';
  const identity = hint || `use the most recognizable visual identity of ${input.displayName}`;

  return clampPrompt(`
Premium vertical collectible trading card illustration.
Character: ${input.displayName}.
Visual identity: ${identity}.
${description}
Make the image immediately recognizable as ${input.displayName}.
Cinematic digital painting, polished fan-art, centered chest-up character, expressive face, accurate hair, accurate costume, iconic colors, iconic accessories, dynamic character-related background, dramatic lighting, crisp details, black and metallic gold card border.
No flat vector, no simple geometric avatar, no emoji, no childish drawing, no stick figure, no generic face, no generic costume, no placeholder, no readable text, no letters, no watermark, no logo.
`.trim());
}

function enforcePromptRules(prompt: string, input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? ` User details: ${input.description}.` : '';

  return clampPrompt(`
${prompt}

Hard requirement: This must be ${input.displayName}.
${hint ? `Visual identity: ${hint}.` : ''}
${description}
Do not create a generic avatar or flat vector.
Use cinematic digital painting, premium collectible card, black and metallic gold border.
No readable text, no letters, no watermark, no logos.
`.trim());
}

function getCharacterHint(input: NormalizedCharacterInput) {
  const normalized = input.normalizedName;

  const exact = CHARACTER_HINTS.find((hint) =>
    hint.aliases.some((alias) => normalizeSearchText(alias) === normalized),
  );

  if (exact) return exact.visual;

  const partial = CHARACTER_HINTS.find((hint) =>
    hint.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedAlias.length >= 4 && normalized.includes(normalizedAlias);
    }),
  );

  return partial?.visual || '';
}

function buildInternalImageProxyUrl(prompt: string, seed: number, width: number, height: number, model: string) {
  const params = new URLSearchParams();

  params.set('p', base64UrlEncode(prompt));
  params.set('s', String(seed));
  params.set('w', String(width));
  params.set('h', String(height));
  params.set('m', model);

  return `/api/generated-character-image?${params.toString()}`;
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 40_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...init,
    signal: controller.signal,
    cache: 'no-store',
  }).finally(() => clearTimeout(timeout));
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

function clampPrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 1200);
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
