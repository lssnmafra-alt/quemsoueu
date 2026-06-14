import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const PROMPT_VERSION = 'cloudflare-groq-pollinations-card-v6';

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

type GeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  provider: 'pollinations-gen' | 'pollinations-legacy';
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

type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | null,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    },
  ) => Promise<unknown>;
};

type CharacterHint = {
  aliases: string[];
  visual: string;
};

const CHARACTER_HINTS: CharacterHint[] = [
  {
    aliases: ['the flash', 'flash'],
    visual:
      'red superhero speedster, sleek deep red suit, gold lightning ear pieces, gold belt, lightning electricity trails, dynamic running energy, intense heroic face, yellow lightning background',
  },
  {
    aliases: ['loki'],
    visual:
      'Loki trickster villain, black slicked hair, pale sharp face, mischievous smile, emerald green and gold armor, large curved golden horned helmet, green magic glow, elegant villain pose',
  },
  {
    aliases: ['thor'],
    visual:
      'Thor thunder god superhero, muscular warrior, long blond hair, short blond beard, red cape, dark silver armor with round discs, storm clouds, blue lightning, noble powerful expression',
  },
  {
    aliases: ['lanterna verde', 'green lantern'],
    visual:
      'Green Lantern cosmic superhero, emerald green and black suit, green domino mask, glowing power ring, bright green aura, cosmic space background, confident determined expression',
  },
  {
    aliases: ['emma frost', 'rainha branca', 'white queen'],
    visual:
      'Emma Frost White Queen telepath heroine, long platinum blonde hair, elegant white futuristic comic outfit, icy diamond sparkle aura, confident intense gaze, luxurious silver background',
  },
  {
    aliases: ['hulk marvel', 'bruce banner'],
    visual:
      'green giant superhero, huge muscular body, green skin, black messy hair, angry face, massive shoulders, torn purple shorts, rubble and impact dust background',
  },
  {
    aliases: ['hulk fluminense', 'hulk jogador', 'hulk futebol', 'givanildo vieira'],
    visual:
      'Brazilian football striker Hulk, strong athletic man, tan skin, short dark hair, full dark beard, intense face, football jersey inspired by burgundy green and white colors, stadium lights, not a green monster',
  },
  {
    aliases: ['hulk'],
    visual:
      'green giant superhero, huge muscular body, green skin, black messy hair, angry face, massive shoulders, torn purple shorts, rubble background',
  },
  {
    aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man', 'spiderman'],
    visual:
      'Spider-Man style agile superhero, red and blue spider suit, web pattern, large white expressive eye lenses, city skyline, web strands, dynamic heroic pose',
  },
  {
    aliases: ['homem de ferro', 'homem-de-ferro', 'iron man', 'tony stark'],
    visual:
      'Iron Man armored hero, red and gold metallic armor, glowing blue arc reactor on chest, illuminated helmet eyes, cinematic tech background, polished metal reflections',
  },
  {
    aliases: ['batman'],
    visual:
      'Batman dark vigilante, black cowl with pointed ears, black cape, armored suit, brooding expression, gothic night city, dramatic moonlit shadows',
  },
  {
    aliases: ['superman', 'super homem', 'super-homem'],
    visual:
      'Superman classic hero, blue suit, red cape, strong jaw, black hair with curl, bright hopeful expression, sunlight sky background',
  },
  {
    aliases: ['neymar', 'neymar jr', 'neymar junior'],
    visual:
      'Brazilian football star Neymar Jr, tan skin, sharp fade haircut, expressive eyebrows, trimmed beard, earrings, yellow and green football kit, stadium lights, confident playful expression',
  },
  {
    aliases: ['messi', 'lionel messi'],
    visual:
      'Lionel Messi Argentine football star, short brown hair, full brown beard, calm focused face, sky blue and white football kit, stadium lights',
  },
  {
    aliases: ['yamal', 'lamine yamal'],
    visual:
      'Lamine Yamal young football winger, dark skin, low curly fade haircut, youthful confident smile, red and blue football kit, stadium lights',
  },
  {
    aliases: ['shrek'],
    visual:
      'Shrek green ogre, round green face, trumpet-shaped ears, white tunic, brown vest, friendly ogre grin, swamp background',
  },
  {
    aliases: ['goku', 'son goku'],
    visual:
      'Goku anime martial artist, spiky black hair, orange gi with blue undershirt and blue wristbands, intense heroic expression, glowing energy aura',
  },
  {
    aliases: ['pikachu'],
    visual:
      'Pikachu yellow electric mouse creature, red cheeks, long black-tipped ears, cute determined face, lightning sparks, playful bright background',
  },
  {
    aliases: ['mario', 'super mario'],
    visual:
      'Mario cheerful plumber hero, red cap, thick black mustache, blue overalls, white gloves, joyful confident expression, colorful adventure background',
  },
];

const STATIC_CARD_RULES: Array<{ path: string; aliases: string[] }> = [
  { path: '/official-cards/football/cristiano-ronaldo.png', aliases: ['cristiano ronaldo', 'cr7', 'ronaldo'] },
  { path: '/official-cards/football/haaland.png', aliases: ['haaland', 'erling haaland'] },
  { path: '/official-cards/football/hulk-fluminense.png', aliases: ['hulk fluminense', 'hulk jogador', 'hulk futebol', 'givanildo vieira'] },
  { path: '/official-cards/football/lamine-yamal.png', aliases: ['lamine yamal', 'yamal'] },
  { path: '/official-cards/football/mbappe.png', aliases: ['mbappe', 'mbappé', 'kylian mbappe', 'kylian mbappé'] },
  { path: '/official-cards/football/messi.png', aliases: ['messi', 'lionel messi'] },
  { path: '/official-cards/football/neymar.png', aliases: ['neymar', 'neymar jr', 'neymar junior'] },
  { path: '/official-cards/football/vini-jr.png', aliases: ['vini jr', 'vinicius jr', 'vinícius jr', 'vinicius junior', 'vinícius junior'] },

  { path: '/official-cards/games/bob-esponja.png', aliases: ['bob esponja', 'spongebob'] },
  { path: '/official-cards/games/elsa.png', aliases: ['elsa', 'frozen elsa'] },
  { path: '/official-cards/games/goku.png', aliases: ['goku', 'son goku'] },
  { path: '/official-cards/games/mario.png', aliases: ['mario', 'super mario'] },
  { path: '/official-cards/games/naruto.png', aliases: ['naruto', 'naruto uzumaki'] },
  { path: '/official-cards/games/pikachu.png', aliases: ['pikachu'] },
  { path: '/official-cards/games/shrek.png', aliases: ['shrek'] },
  { path: '/official-cards/games/sonic.png', aliases: ['sonic', 'sonic the hedgehog'] },

  { path: '/official-cards/heroes/batman.png', aliases: ['batman'] },
  { path: '/official-cards/heroes/capitao-america.png', aliases: ['capitao america', 'capitão américa', 'captain america'] },
  { path: '/official-cards/heroes/homem-de-ferro.png', aliases: ['homem de ferro', 'homem-de-ferro', 'iron man', 'tony stark'] },
  { path: '/official-cards/heroes/hulk-marvel.png', aliases: ['hulk marvel', 'bruce banner'] },
  { path: '/official-cards/heroes/mulher-maravilha.png', aliases: ['mulher maravilha', 'mulher-maravilha', 'wonder woman'] },
  { path: '/official-cards/heroes/pantera-negra.png', aliases: ['pantera negra', 'black panther'] },
  { path: '/official-cards/heroes/superman.png', aliases: ['superman', 'super homem', 'super-homem'] },
  { path: '/official-cards/heroes/thor.png', aliases: ['thor'] },

  { path: '/official-cards/music/anitta.png', aliases: ['anitta'] },
  { path: '/official-cards/music/ariana-grande.png', aliases: ['ariana grande'] },
  { path: '/official-cards/music/beyonce.png', aliases: ['beyonce', 'beyoncé'] },
  { path: '/official-cards/music/bruno-mars.png', aliases: ['bruno mars'] },
  { path: '/official-cards/music/michael-jackson.png', aliases: ['michael jackson'] },
  { path: '/official-cards/music/rihanna.png', aliases: ['rihanna'] },
  { path: '/official-cards/music/taylor-swift.png', aliases: ['taylor swift'] },
  { path: '/official-cards/music/the-weeknd.png', aliases: ['the weeknd', 'weeknd'] },

  { path: '/official-cards/villains/coringa.png', aliases: ['coringa', 'joker'] },
  { path: '/official-cards/villains/darth-vader.png', aliases: ['darth vader'] },
  { path: '/official-cards/villains/duende-verde.png', aliases: ['duende verde', 'green goblin'] },
  { path: '/official-cards/villains/lex-luthor.png', aliases: ['lex luthor'] },
  { path: '/official-cards/villains/loki.png', aliases: ['loki'] },
  { path: '/official-cards/villains/magneto.png', aliases: ['magneto'] },
  { path: '/official-cards/villains/thanos.png', aliases: ['thanos'] },
  { path: '/official-cards/villains/voldemort.png', aliases: ['voldemort'] },

  { path: '/standard-cards/aquaman.png', aliases: ['aquaman'] },
  { path: '/standard-cards/homem-aranha.png', aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man', 'spiderman'] },
  { path: '/standard-cards/hulk.png', aliases: ['hulk'] },
  { path: '/standard-cards/lucas-moura.png', aliases: ['lucas moura', 'lucas mourea'] },
];

export async function POST(req: NextRequest) {
  try {
    const runtimeEnv = await getRuntimeEnv();
    const body = (await req.json()) as CharacterRequest;
    const input = normalizeInput(body);

    if (!input.displayName) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const staticCard = getStaticCard(input.displayName);

    if (staticCard && !input.description) {
      return NextResponse.json({
        url: staticCard,
        prompt: `Static curated card for ${input.displayName}`,
        source: 'static-card',
      });
    }

    const seed = stableSeed(`${PROMPT_VERSION}:${input.fullText}`);
    const prompt = await buildFinalImagePrompt(input, runtimeEnv);
    const image = await generatePollinationsImage(prompt, seed, runtimeEnv);

    if (!image) {
      if (staticCard) {
        return NextResponse.json({
          url: staticCard,
          prompt,
          source: 'static-card-after-pollinations-failure',
        });
      }

      return NextResponse.json({
        url: '',
        prompt,
        source: 'pollinations-failed',
        error: 'Não foi possível gerar a imagem no Pollinations agora.',
      });
    }

    const key = `characters/${slugify(input.displayName)}_${Date.now()}_${seed}.${extensionFromContentType(image.contentType)}`;
    const uploadedUrl = await uploadImageToStorage(key, image.bytes, image.contentType, runtimeEnv);

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
  } catch (error: unknown) {
    console.error('Image generation error:', error);
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
    const context = await getCloudflareContext({ async: true });
    Object.assign(merged, context.env as RuntimeEnv);
  } catch {
    try {
      const context = getCloudflareContext();
      Object.assign(merged, context.env as RuntimeEnv);
    } catch {
      // Fora do Cloudflare/OpenNext, fica só com process.env.
    }
  }

  return merged;
}

function getStringEnv(env: RuntimeEnv, key: string) {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getNumberEnv(env: RuntimeEnv, key: string, fallback: number) {
  const raw = getStringEnv(env, key);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(256, Math.min(1024, Math.round(parsed)));
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

  const displayName = sanitizeCharacterName(
    appearanceSplit.length > 1 ? appearanceSplit[0] : commaSplit[0] || cleanedPrompt,
  );

  const extractedDescription =
    appearanceSplit.length > 1 ? appearanceSplit.slice(1).join(' — aparência: ') : commaSplit.slice(1).join(', ');

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
    .slice(0, 360);
}

async function buildFinalImagePrompt(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const groqPrompt = await buildPromptWithGroq(input, env);

  if (groqPrompt) {
    return groqPrompt;
  }

  return buildFallbackPrompt(input);
}

async function buildPromptWithGroq(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const apiKey = getStringEnv(env, 'GROQ_API_KEY');

  if (!apiKey) return '';

  const knownHint = getCharacterHint(input);
  const userDescription = input.description || 'no extra appearance details';
  const model = getStringEnv(env, 'GROQ_MODEL') || 'llama-3.3-70b-versatile';

  const body = {
    model,
    temperature: 0.25,
    max_tokens: 700,
    messages: [
      {
        role: 'system',
        content:
          'You create prompts for AI image generation. Return only a direct English prompt. No markdown, no JSON, no explanations.',
      },
      {
        role: 'user',
        content: `Create one text-to-image prompt for a premium collectible character card.

Character name: ${input.displayName}
User appearance details: ${userDescription}
Known visual identity: ${knownHint || 'infer from the character name if it is known; otherwise follow the user details precisely'}

The image must NOT be generic. It must be recognizable as the named character.

Requirements:
- vertical 4:5 collectible trading card illustration
- cinematic high-detail digital painting
- polished fan-art / premium mobile game asset style
- chest-up or half-body character centered in frame
- accurate recognizable face, hair, costume, colors, accessories, powers and silhouette
- background must relate to the character
- black and metallic gold premium card border
- dramatic lighting, vivid contrast, crisp details
- prioritize character accuracy over identical card template

Negative requirements:
- no readable text
- no letters
- no logos
- no watermark
- no flat SVG
- no emoji
- no childish drawing
- no stick figure
- no simple generic avatar
- no generic smiley face
- no placeholder
- no random symbols`,
      },
    ],
  };

  try {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await safeJson(response)) as GroqChatResponse | null;

    if (!response.ok) {
      console.warn('Groq prompt generation failed:', response.status, payload?.error?.message || response.statusText);
      return '';
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || '';

    if (!content) return '';

    return clampPrompt(enforcePromptRules(content, input));
  } catch (error) {
    console.warn('Groq prompt generation request failed:', error);
    return '';
  }
}

function enforcePromptRules(prompt: string, input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? ` User custom appearance details: ${input.description}.` : '';

  return `${prompt}

Hard requirements: This is ${input.displayName}. ${hint ? `Recognizable visual identity: ${hint}.` : ''}${description} The character must not look generic. Make face, hair, costume, colors, props, powers and silhouette specific to ${input.displayName}. Vertical 4:5 premium collectible card. Black and metallic gold card border. Cinematic high-detail digital painting. No readable text, no letters, no logos, no watermark, no flat SVG, no emoji, no childish drawing, no generic avatar, no placeholder.`;
}

function buildFallbackPrompt(input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? `Additional user appearance details: ${input.description}.` : '';
  const visualIdentity =
    hint || `use the most recognizable visual identity of ${input.displayName}; if unknown, follow the user description precisely`;

  return clampPrompt(`
Vertical 4:5 premium collectible trading card illustration for a mobile guessing game.
Character: ${input.displayName}.
Recognizable visual identity: ${visualIdentity}.
${description}
The result must be immediately recognizable as ${input.displayName}, not a generic avatar.
High-detail cinematic digital painting, polished fan-art style, chest-up or half-body portrait centered in frame, expressive accurate face, iconic costume colors, iconic accessories, powers, dynamic character-related background, dramatic rim lighting, saturated colors, crisp game asset.
Premium black outer card border with metallic gold trim.
Prioritize character accuracy over template consistency.
No readable text, no letters, no logo, no watermark, no flat SVG, no emoji, no children's drawing, no stick figure, no generic smiley face, no blank placeholder, no extra faces, no distorted eyes, no cropped head.
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

async function generatePollinationsImage(prompt: string, seed: number, env: RuntimeEnv): Promise<GeneratedImage | null> {
  const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');

  if (!apiKey) {
    console.warn('Missing POLLINATIONS_API_KEY in Cloudflare variables/secrets.');
    return null;
  }

  const width = getNumberEnv(env, 'POLLINATIONS_IMAGE_WIDTH', 768);
  const height = getNumberEnv(env, 'POLLINATIONS_IMAGE_HEIGHT', 960);
  const model = getStringEnv(env, 'POLLINATIONS_IMAGE_MODEL') || 'flux';

  const urls = [
    buildPollinationsGenUrl(prompt, seed, width, height, model, apiKey),
    buildPollinationsLegacyUrl(prompt, seed, width, height, model, apiKey),
  ];

  for (const item of urls) {
    try {
      const response = await fetchWithTimeout(item.url, {
        method: 'GET',
        headers: {
          Accept: 'image/*',
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn(`${item.provider} failed:`, response.status, response.statusText);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      if (!contentType.startsWith('image/')) {
        console.warn(`${item.provider} returned non-image content-type:`, contentType);
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());

      if (bytes.byteLength < 1000) {
        console.warn(`${item.provider} returned an invalid small image.`);
        continue;
      }

      return {
        bytes,
        contentType,
        provider: item.provider,
      };
    } catch (error) {
      console.warn(`${item.provider} request failed:`, error);
    }
  }

  return null;
}

function buildPollinationsGenUrl(
  prompt: string,
  seed: number,
  width: number,
  height: number,
  model: string,
  apiKey: string,
) {
  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);

  url.searchParams.set('key', apiKey);
  url.searchParams.set('model', model);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('safe', 'true');
  url.searchParams.set('private', 'true');

  return {
    url: url.toString(),
    provider: 'pollinations-gen' as const,
  };
}

function buildPollinationsLegacyUrl(
  prompt: string,
  seed: number,
  width: number,
  height: number,
  model: string,
  apiKey: string,
) {
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);

  url.searchParams.set('key', apiKey);
  url.searchParams.set('model', model);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('safe', 'true');

  return {
    url: url.toString(),
    provider: 'pollinations-legacy' as const,
  };
}

async function uploadImageToStorage(key: string, bytes: Uint8Array, contentType: string, env: RuntimeEnv) {
  const directR2Url = await uploadImageToDirectR2Binding(key, bytes, contentType, env);

  if (directR2Url) return directR2Url;

  return uploadImageToR2S3Api(key, bytes, contentType, env);
}

async function uploadImageToDirectR2Binding(key: string, bytes: Uint8Array, contentType: string, env: RuntimeEnv) {
  const bucket = getR2BucketBinding(env);
  const publicUrl = getStringEnv(env, 'R2_PUBLIC_URL');

  if (!bucket || !publicUrl) return '';

  try {
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    return joinPublicUrl(publicUrl, key);
  } catch (error) {
    console.warn('Direct R2 binding upload failed:', error);
    return '';
  }
}

function getR2BucketBinding(env: RuntimeEnv): R2BucketLike | null {
  const possibleNames = ['CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

  for (const name of possibleNames) {
    const value = env[name];

    if (isR2BucketLike(value)) {
      return value;
    }
  }

  return null;
}

function isR2BucketLike(value: unknown): value is R2BucketLike {
  return Boolean(value && typeof value === 'object' && 'put' in value && typeof (value as { put?: unknown }).put === 'function');
}

async function uploadImageToR2S3Api(key: string, bytes: Uint8Array, contentType: string, env: RuntimeEnv) {
  const accountId = getStringEnv(env, 'R2_ACCOUNT_ID') || getStringEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = getStringEnv(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = getStringEnv(env, 'R2_SECRET_ACCESS_KEY');
  const bucketName = getStringEnv(env, 'R2_BUCKET_NAME');
  const publicUrl = getStringEnv(env, 'R2_PUBLIC_URL');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return '';
  }

  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return joinPublicUrl(publicUrl, key);
  } catch (error) {
    console.warn('R2 S3 API upload failed:', error);
    return '';
  }
}

function joinPublicUrl(base: string, key: string) {
  return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
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

function getStaticCard(name: string) {
  const normalizedName = normalizeSearchText(name);

  if (!normalizedName) return '';

  const exact = STATIC_CARD_RULES.find((rule) =>
    rule.aliases.some((alias) => normalizeSearchText(alias) === normalizedName),
  );

  if (exact) return exact.path;

  const partial = STATIC_CARD_RULES.find((rule) =>
    rule.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedAlias.length >= 4 && normalizedName.includes(normalizedAlias);
    }),
  );

  return partial?.path || '';
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
  return 'jpg';
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
