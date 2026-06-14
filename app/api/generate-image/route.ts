import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const PROMPT_VERSION = 'groq-pollinations-real-card-v12';

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
    aliases: ['sonic', 'sonic the hedgehog'],
    visual:
      'Sonic the Hedgehog: blue anthropomorphic hedgehog, large swept-back blue quills, tan muzzle and belly, white gloves, red shoes with white stripe, confident smirk, speed energy, golden rings, dynamic motion background',
  },
  {
    aliases: ['super mario', 'mario'],
    visual:
      'Super Mario: cheerful plumber hero, red cap, thick black mustache, round nose, blue overalls, red shirt, white gloves, expressive smile, colorful mushroom kingdom adventure background',
  },
  {
    aliases: ['the flash', 'flash'],
    visual:
      'The Flash: red superhero speedster suit, gold lightning ear pieces, gold lightning belt, intense heroic face, yellow lightning trails, motion blur, red and gold energy background',
  },
  {
    aliases: ['loki'],
    visual:
      'Loki: sly trickster villain, pale sharp face, black slicked hair, mischievous smile, emerald green and gold armor, large curved golden horned helmet, green magic glow, elegant villain posture',
  },
  {
    aliases: ['thor'],
    visual:
      'Thor: muscular thunder god warrior, long blond hair, short blond beard, red cape, dark silver Asgardian armor with round discs, storm clouds, blue lightning, powerful noble expression',
  },
  {
    aliases: ['lanterna verde', 'green lantern'],
    visual:
      'Green Lantern: emerald cosmic superhero, green and black suit, green domino mask, glowing power ring, bright green aura, space background, confident determined expression',
  },
  {
    aliases: ['emma frost', 'rainha branca', 'white queen'],
    visual:
      'Emma Frost / White Queen: platinum blonde woman, long elegant hair, confident intense gaze, white futuristic comic outfit, diamond sparkle aura, icy silver luxury background',
  },
  {
    aliases: ['hulk marvel', 'bruce banner'],
    visual:
      'Hulk: huge muscular green giant, green skin, black messy hair, angry powerful face, massive shoulders, torn purple shorts, rubble and impact dust background',
  },
  {
    aliases: ['hulk fluminense', 'hulk jogador', 'hulk futebol', 'givanildo vieira'],
    visual:
      'Brazilian football striker Hulk: strong athletic man, tan skin, short dark hair, full dark beard, intense face, football jersey inspired by burgundy green and white colors, stadium lights, not a green monster',
  },
  {
    aliases: ['hulk'],
    visual:
      'Hulk: huge muscular green giant superhero, green skin, black messy hair, angry powerful face, massive shoulders, torn purple shorts, rubble background',
  },
  {
    aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man', 'spiderman'],
    visual:
      'Spider-Man: agile superhero, red and blue spider suit, web pattern, large white expressive eye lenses, dynamic pose, city skyline, web strands',
  },
  {
    aliases: ['homem de ferro', 'homem-de-ferro', 'iron man', 'tony stark'],
    visual:
      'Iron Man: red and gold metallic armored hero, glowing blue arc reactor, illuminated helmet eyes, polished metal reflections, cinematic technology background',
  },
  {
    aliases: ['batman'],
    visual:
      'Batman: dark vigilante, black cowl with pointed ears, black cape, armored suit, brooding expression, gothic night city, dramatic moonlit shadows',
  },
  {
    aliases: ['superman', 'super homem', 'super-homem'],
    visual:
      'Superman: classic heroic man, blue suit, red cape, strong jaw, black hair with curl, hopeful expression, sunlight sky background',
  },
  {
    aliases: ['neymar', 'neymar jr', 'neymar junior'],
    visual:
      'Neymar Jr: Brazilian football star, tan skin, sharp fade haircut, expressive eyebrows, trimmed beard, earrings, yellow and green football kit, stadium lights, confident playful expression',
  },
  {
    aliases: ['messi', 'lionel messi'],
    visual:
      'Lionel Messi: Argentine football star, short brown hair, full brown beard, calm focused face, sky blue and white football kit, stadium lights',
  },
  {
    aliases: ['yamal', 'lamine yamal'],
    visual:
      'Lamine Yamal: young football winger, dark skin, low curly fade haircut, youthful confident smile, red and blue football kit, stadium lights',
  },
  {
    aliases: ['shrek'],
    visual:
      'Shrek: green ogre, round green face, trumpet-shaped ears, white tunic, brown vest, friendly ogre grin, swamp background',
  },
  {
    aliases: ['goku', 'son goku'],
    visual:
      'Goku: anime martial artist, spiky black hair, orange gi, blue undershirt, blue wristbands, intense heroic expression, glowing energy aura',
  },
  {
    aliases: ['pikachu'],
    visual:
      'Pikachu: yellow electric mouse creature, red cheeks, long black-tipped ears, cute determined face, lightning sparks, playful bright background',
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
    const image = await generatePollinationsImage(prompt, seed, env);

    if (!image) {
      return NextResponse.json(
        {
          url: '',
          prompt,
          source: 'pollinations-failed',
          error: 'Nao foi possivel gerar a imagem no Pollinations agora.',
        },
        { status: 502 },
      );
    }

    const key = `characters/${slugify(input.displayName)}_${Date.now()}_${seed}.${extensionFromContentType(image.contentType)}`;
    const uploadedUrl = await uploadImageToStorage(key, image.bytes, image.contentType, env);

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

  return Math.max(512, Math.min(1536, Math.round(value)));
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
    .slice(0, 420);
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
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You write strong English prompts for AI image generation. Return only the final prompt text. No markdown. No JSON. No explanations.',
          },
          {
            role: 'user',
            content: `Create one image prompt.

Character name: ${input.displayName}
User appearance details: ${description}
Known visual identity: ${hint || 'infer the most recognizable visual identity from the character name if known'}

The result must look like the named character, not a generic avatar.

Mandatory style:
premium vertical 4:5 collectible trading card, high-detail cinematic digital painting, polished fan-art, game-ready asset, centered chest-up or half-body character, accurate recognizable face, accurate costume, iconic colors, iconic accessories, iconic silhouette, dynamic background related to the character, dramatic lighting, black and metallic gold card border.

Important:
prioritize character accuracy over template consistency.

Hard negatives:
flat vector, simple geometric avatar, emoji, childish drawing, stick figure, generic face, generic costume, placeholder, blank card, readable text, letters, words, watermark, logo, official logo, distorted eyes, extra face, cropped head.`,
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
Premium vertical 4:5 collectible trading card illustration.

Character: ${input.displayName}.
Recognizable visual identity: ${identity}.
${description}

The image must be immediately recognizable as ${input.displayName}, not a generic avatar.

Style:
high-detail cinematic digital painting, polished fan-art, premium mobile game asset, chest-up or half-body portrait centered in frame, sharp expressive face, accurate hair, accurate costume, iconic colors, iconic accessories, iconic powers, iconic silhouette, dynamic background related to the character, dramatic rim lighting, vivid contrast, crisp details, black outer card border, subtle metallic gold trim.

Prioritize character accuracy over identical template consistency.

Negative prompt:
flat vector, simple geometric shapes, emoji, childish drawing, stick figure, generic smiley face, generic face, generic costume, boring placeholder, blank image, readable text, letters, words, watermark, logo, official logo, distorted eyes, extra faces, cropped head.
`.trim());
}

function enforcePromptRules(prompt: string, input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? ` User custom appearance details: ${input.description}.` : '';

  return clampPrompt(`
${prompt}

Hard correction layer:
This must be ${input.displayName}.
${hint ? `Recognizable visual identity: ${hint}.` : ''}
${description}
Do not make a generic avatar.
Do not make a flat vector.
Do not make a simple geometric mascot.
Make the face, body, hair, costume, colors, accessories, powers and silhouette specific to ${input.displayName}.
Use high-detail cinematic digital painting.
Use a vertical 4:5 premium collectible trading card composition with black and metallic gold border.
No readable text, no letters, no watermark, no logos, no emoji, no placeholder.
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

async function generatePollinationsImage(prompt: string, seed: number, env: RuntimeEnv): Promise<GeneratedImage | null> {
  const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');

  if (!apiKey) {
    console.warn('Missing POLLINATIONS_API_KEY in Cloudflare variables/secrets.');
    return null;
  }

  const width = getNumberEnv(env, 'POLLINATIONS_IMAGE_WIDTH', 896);
  const height = getNumberEnv(env, 'POLLINATIONS_IMAGE_HEIGHT', 1120);
  const preferredModel = getStringEnv(env, 'POLLINATIONS_IMAGE_MODEL') || 'flux';
  const models = uniqueStrings([preferredModel, 'flux', 'turbo']);

  for (const model of models) {
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

        if (bytes.byteLength < 20_000) {
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
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('safe', 'true');
  url.searchParams.set('enhance', 'true');

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
  url.searchParams.set('enhance', 'true');

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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60_000) {
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
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 3600);
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
