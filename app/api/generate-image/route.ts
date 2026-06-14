import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const PROMPT_VERSION = 'groq-pollinations-direct-url-v15';

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
  provider: 'pollinations-download';
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

    const seed = stableSeed(`${PROMPT_VERSION}:${input.fullText}`);
    const prompt = await buildFinalPrompt(input, env);
    const urls = buildPollinationsUrls(prompt, seed, env);

    for (const url of urls) {
      const image = await downloadPollinationsImage(url);

      if (!image) continue;

      const key = `characters/${slugify(input.displayName)}_${Date.now()}_${seed}.${extensionFromContentType(image.contentType)}`;
      const uploadedUrl = await uploadImageToStorage(key, image.bytes, image.contentType, env);

      if (uploadedUrl) {
        return NextResponse.json({
          url: uploadedUrl,
          prompt,
          source: 'pollinations-r2',
        });
      }

      return NextResponse.json({
        url: `data:${image.contentType};base64,${bytesToBase64(image.bytes)}`,
        prompt,
        source: 'pollinations-data-uri',
      });
    }

    const directUrl = urls[0];

    if (directUrl) {
      return NextResponse.json({
        url: directUrl,
        prompt,
        source: 'pollinations-direct-url',
        warning: 'Worker nao conseguiu baixar a imagem, entao retornou a URL direta do Pollinations.',
      });
    }

    return NextResponse.json(
      {
        url: '',
        prompt,
        source: 'no-url-built',
        error: 'Nao foi possivel montar a URL da imagem.',
      },
      { status: 500 },
    );
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
      // Local fora do Cloudflare.
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
    .slice(0, 320);
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
        temperature: 0.25,
        max_tokens: 650,
        messages: [
          {
            role: 'system',
            content:
              'You write strong English prompts for AI image generation. Return only the final prompt text. No markdown. No JSON. No explanations.',
          },
          {
            role: 'user',
            content: `Create one concise image prompt.

Character name: ${input.displayName}
User appearance details: ${description}
Known visual identity: ${hint || 'infer the most recognizable visual identity from the character name if known'}

The image must look like the named character, not a generic avatar.

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
  const description = input.description ? `User custom appearance details: ${input.description}.` : '';
  const identity = hint || `use the most recognizable visual identity of ${input.displayName}`;

  return clampPrompt(`
Premium vertical collectible trading card illustration.
Character: ${input.displayName}.
Recognizable visual identity: ${identity}.
${description}
Make the image immediately recognizable as ${input.displayName}, not generic.
Cinematic digital painting, polished fan-art, centered chest-up character, expressive face, accurate hair, accurate costume, iconic colors, iconic accessories, dynamic character-related background, dramatic lighting, crisp details, black and metallic gold card border.
Avoid flat vector, simple geometric avatar, emoji, childish drawing, stick figure, generic face, generic costume, placeholder, readable text, letters, watermark, logo.
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

function buildPollinationsUrls(prompt: string, seed: number, env: RuntimeEnv) {
  const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');
  const width = getNumberEnv(env, 'POLLINATIONS_IMAGE_WIDTH', 768);
  const height = getNumberEnv(env, 'POLLINATIONS_IMAGE_HEIGHT', 960);
  const preferredModel = getStringEnv(env, 'POLLINATIONS_IMAGE_MODEL') || 'flux';
  const models = uniqueStrings([preferredModel, 'flux', 'turbo']);

  const urls: string[] = [];

  for (const model of models) {
    urls.push(buildPollinationsUrl('https://image.pollinations.ai/prompt', prompt, seed, width, height, model, apiKey));
    urls.push(buildPollinationsUrl('https://gen.pollinations.ai/image', prompt, seed, width, height, model, apiKey));
  }

  return uniqueStrings(urls);
}

function buildPollinationsUrl(
  base: string,
  prompt: string,
  seed: number,
  width: number,
  height: number,
  model: string,
  apiKey: string,
) {
  const url = new URL(`${base}/${encodeURIComponent(prompt)}`);

  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('model', model);
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('safe', 'true');
  url.searchParams.set('enhance', 'true');

  if (apiKey) {
    url.searchParams.set('key', apiKey);
  }

  return url.toString();
}

async function downloadPollinationsImage(url: string): Promise<GeneratedImage | null> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      console.warn('Pollinations download failed:', response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      console.warn('Pollinations returned non-image:', contentType);
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength < 10_000) {
      console.warn('Pollinations returned invalid small image.');
      return null;
    }

    return {
      bytes,
      contentType,
      provider: 'pollinations-download',
    };
  } catch (error) {
    console.warn('Pollinations request failed:', error);
    return null;
  }
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
  const names = ['CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

  for (const name of names) {
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
  const slug = normalizeSearchText(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56);
  return slug || 'character';
}

function clampPrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 1600);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'jpg';
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }

  return btoa(binary);
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}
