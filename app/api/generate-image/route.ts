import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

type RuntimeEnv = Record<string, unknown>;

type CharacterRequest = {
  name?: string;
  prompt?: string;
  description?: string;
};

type NormalizedCharacterInput = {
  displayName: string;
  description: string;
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

type SupabaseCharacter = {
  name?: string | null;
  image_url?: string | null;
};

const BASE_STYLE =
  'Premium vertical collectible trading card, cinematic poster quality, dark detailed background, dramatic lighting, black and metallic gold frame, high contrast, detailed digital painting, character recognizable, professional game card art.';

const NO_TEXT_RULE = 'No readable text, no letters, no words, no logo, no watermark.';

const CHARACTER_HINTS: Record<string, string> = {
  pennywise:
    'Pennywise the dancing clown, sinister white clown face, red vertical face makeup lines, orange hair flaring outward, eerie smile, vintage horror carnival mood, red balloon atmosphere.',
  thanos:
    'Thanos, massive purple-skinned titan villain, bald head, deeply furrowed chin, gold and dark blue armor, cosmic battlefield background, intimidating powerful stance.',
  'darth vader':
    'Darth Vader, glossy black helmet, triangular breathing mask, black armored suit and cape, red lightsaber glow, dark smoky sci-fi background.',
  'bruxa ma do oeste':
    'Wicked Witch of the West, green-skinned witch, long hooked nose, black pointed hat, black robes, sinister expression, magical emerald smoke.',
  loki:
    'Loki, sly trickster, sharp pale face, black slicked hair, mischievous smile, emerald green and gold armor, large curved golden horned helmet, green magic glow.',
  thor:
    'Thor, muscular thunder god, long blond hair, short blond beard, red cape, dark silver armor with round discs, storm clouds, blue lightning, mighty hammer.',
  batman:
    'Batman, dark vigilante, black cowl with pointed ears, black cape, armored suit, brooding expression, gothic night city, moonlit shadows.',
  superman:
    'Superman, classic heroic man, blue suit, red cape, strong jaw, black hair with curl, hopeful expression, sunlight breaking through clouds.',
  'homem aranha':
    'Spider-Man, agile superhero, red and blue spider suit, web pattern, large white expressive eye lenses, dynamic pose, city skyline, web strands.',
  'homem de ferro':
    'Iron Man, red and gold metallic armored hero, glowing blue arc reactor, illuminated helmet eyes, polished metal reflections, cinematic technology background.',
  hulk:
    'Hulk, huge muscular green giant superhero, green skin, black messy hair, angry powerful face, massive shoulders, torn purple shorts, rubble background.',
  neymar:
    'Neymar Jr, Brazilian football star, tan skin, sharp fade haircut, expressive eyebrows, trimmed beard, earrings, yellow and green football kit, stadium lights.',
  messi:
    'Lionel Messi, Argentine football star, short brown hair, full brown beard, calm focused face, sky blue and white football kit, stadium lights.',
  'cristiano ronaldo':
    'Cristiano Ronaldo, Portuguese football star, athletic build, sharp cheekbones, short styled dark hair, intense confident expression, red and green football kit, stadium lights.',
  alok:
    'Alok, Brazilian DJ, stylish dark hair and beard, black modern outfit, confident stage presence, electronic music festival lights, neon DJ booth atmosphere.',
  sonic:
    'Sonic the Hedgehog, blue anthropomorphic hedgehog, swept-back blue quills, tan muzzle, white gloves, red shoes with white stripe, speed trails, golden rings.',
  mario:
    'Super Mario, cheerful plumber hero, red cap, thick black mustache, round nose, blue overalls, red shirt, white gloves, colorful mushroom kingdom background.',
  goku:
    'Goku, anime martial artist, spiky black hair, orange gi, blue undershirt, blue wristbands, intense heroic expression, glowing energy aura.',
  naruto:
    'Naruto Uzumaki, anime ninja, spiky blond hair, whisker-like cheek marks, orange and black ninja outfit, metal forehead protector, swirling chakra energy.',
  pikachu:
    'Pikachu, yellow electric mouse creature, red cheeks, long black-tipped ears, cute determined face, lightning sparks, playful energetic background.',
  shrek:
    'Shrek, green ogre, round green face, trumpet-shaped ears, white tunic, brown vest, friendly ogre grin, swamp background.',
};

const CHARACTER_ALIASES: Record<string, string> = {
  'penny wise': 'pennywise',
  'darth vader': 'darth vader',
  'bruxa ma do oeste': 'bruxa ma do oeste',
  'wicked witch of the west': 'bruxa ma do oeste',
  'super homem': 'superman',
  'super-homem': 'superman',
  'homem-aranha': 'homem aranha',
  spiderman: 'homem aranha',
  'spider man': 'homem aranha',
  'spider-man': 'homem aranha',
  'homem-de-ferro': 'homem de ferro',
  'iron man': 'homem de ferro',
  'tony stark': 'homem de ferro',
  'neymar jr': 'neymar',
  'neymar junior': 'neymar',
  'lionel messi': 'messi',
  'cristiano': 'cristiano ronaldo',
  cr7: 'cristiano ronaldo',
  'super mario': 'mario',
  'sonic the hedgehog': 'sonic',
  'son goku': 'goku',
};

export async function POST(req: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    const input = normalizeInput((await req.json()) as CharacterRequest);

    if (!input.displayName) {
      return NextResponse.json({ error: 'Nome ou prompt obrigatorio.' }, { status: 400 });
    }

    if (!input.description) {
      const cachedUrl = await findExistingCharacterImage(env, input);

      if (cachedUrl) {
        return NextResponse.json({
          url: cachedUrl,
          prompt: '',
          source: 'existing-character-cache',
        });
      }
    }

    const finalPrompt = await buildFinalPrompt(input, env);
    const imageBase64 = await generateOpenAIImage(finalPrompt, env);
    const imageBytes = base64ToBytes(imageBase64);
    const key = `characters/${slugify(input.displayName)}-${Date.now()}.png`;

    try {
      const publicUrl = await uploadImageToR2(env, key, imageBytes, 'image/png');

      return NextResponse.json({
        url: publicUrl,
        prompt: finalPrompt,
        source: 'openai-r2',
      });
    } catch (uploadError) {
      console.warn('R2 upload failed, returning data URL fallback:', uploadError);

      return NextResponse.json({
        url: `data:image/png;base64,${imageBase64}`,
        prompt: finalPrompt,
        source: 'openai-data-url-fallback',
      });
    }
  } catch (error: any) {
    console.error('OpenAI image generation route error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel gerar a imagem.' }, { status: 500 });
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
    } catch {}
  }

  return merged;
}

function getStringEnv(env: RuntimeEnv, key: string) {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeInput(body: CharacterRequest): NormalizedCharacterInput {
  const rawName = String(body.name || body.prompt || '').trim();
  const rawDescription = String(body.description || '').trim();
  const cleanedName = rawName
    .replace(/^personagem\s*:\s*/i, '')
    .replace(/^nome\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.]\s*$/g, '')
    .trim()
    .slice(0, 90);

  return {
    displayName: cleanedName,
    description: rawDescription.replace(/\s+/g, ' ').replace(/[,.]\s*$/g, '').trim().slice(0, 300),
    normalizedName: normalizeSearchText(cleanedName),
  };
}

async function buildFinalPrompt(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const groqPrompt = await buildPromptWithGroq(input, env);

  if (groqPrompt) return groqPrompt;

  return buildFallbackPrompt(input);
}

async function buildPromptWithGroq(input: NormalizedCharacterInput, env: RuntimeEnv) {
  const apiKey = getStringEnv(env, 'GROQ_API_KEY');

  if (!apiKey) return '';

  const model = getStringEnv(env, 'GROQ_MODEL') || 'llama-3.3-70b-versatile';
  const hint = getCharacterHint(input);

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
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content:
              'You write concise English image-generation prompts. Return only the prompt text. No markdown, no JSON, no explanations.',
          },
          {
            role: 'user',
            content: `Create a visual prompt for OpenAI image generation.

Character: ${input.displayName}
Known visual hints: ${hint || 'infer the most recognizable public visual identity from the character name'}
User description: ${input.description || 'none'}

Required style:
${BASE_STYLE}

The character must be recognizable and not a generic avatar. Emphasize accurate costume, face, colors, accessories, silhouette, and environment.

Hard negative rule:
${NO_TEXT_RULE}`,
          },
        ],
      }),
    });

    const payload = (await safeJson(response)) as GroqChatResponse | null;

    if (!response.ok) {
      console.warn('Groq prompt build failed:', response.status, payload?.error?.message || response.statusText);
      return '';
    }

    const prompt = payload?.choices?.[0]?.message?.content?.trim();
    if (!prompt) return '';

    return clampPrompt(`${prompt} ${NO_TEXT_RULE}`);
  } catch (error) {
    console.warn('Groq prompt request failed:', error);
    return '';
  }
}

function buildFallbackPrompt(input: NormalizedCharacterInput) {
  const hint = getCharacterHint(input);
  const description = input.description ? `User-provided visual details: ${input.description}.` : '';

  return clampPrompt(
    `${BASE_STYLE} Character: ${input.displayName}. ${
      hint ? `Recognizable visual identity: ${hint}.` : `Use the most recognizable visual identity of ${input.displayName}.`
    } ${description} Centered chest-up composition inside a premium card frame, cinematic poster texture, dramatic rim light, detailed face, accurate costume, iconic colors, professional game card art. ${NO_TEXT_RULE}`,
  );
}

async function generateOpenAIImage(prompt: string, env: RuntimeEnv) {
  const apiKey = getStringEnv(env, 'OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY nao esta configurada.');
  }

  const model = getStringEnv(env, 'OPENAI_IMAGE_MODEL') || 'gpt-image-1';
  const size = getStringEnv(env, 'OPENAI_IMAGE_SIZE') || '1024x1536';
  const quality = getStringEnv(env, 'OPENAI_IMAGE_QUALITY') || 'medium';

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/images/generations',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        n: 1,
      }),
    },
    120_000,
  );

  const payload = (await safeJson(response)) as any;

  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI Images API retornou ${response.status}.`;

    if (isOpenAIBillingLimitError(message)) {
      throw new Error(
        'A conta OpenAI atingiu o limite de billing. Aumente o limite/adicione creditos na OpenAI ou envie uma imagem manualmente para este personagem.',
      );
    }

    throw new Error(message);
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (typeof imageBase64 !== 'string' || !imageBase64) {
    throw new Error('OpenAI nao retornou b64_json da imagem.');
  }

  return imageBase64;
}

async function uploadImageToR2(env: RuntimeEnv, key: string, bytes: Uint8Array, contentType: string) {
  const binding = getR2Binding(env);

  if (binding) {
    await binding.put(key, bytes, {
      httpMetadata: {
        contentType,
      },
    });

    return buildPublicR2Url(env, key);
  }

  const accountId = getStringEnv(env, 'R2_ACCOUNT_ID') || getStringEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = getStringEnv(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = getStringEnv(env, 'R2_SECRET_ACCESS_KEY');
  const bucket = getStringEnv(env, 'R2_BUCKET_NAME');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Credenciais R2 incompletas.');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );

  return buildPublicR2Url(env, key);
}

function slugify(value: string) {
  return (
    normalizeSearchText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'personagem'
  );
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function findExistingCharacterImage(env: RuntimeEnv, input: NormalizedCharacterInput) {
  const supabaseUrl = getStringEnv(env, 'NEXT_PUBLIC_SUPABASE_URL_GAME') || getStringEnv(env, 'SUPABASE_URL_GAME');
  const supabaseKey = getStringEnv(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME') || getStringEnv(env, 'SUPABASE_ANON_KEY_GAME');

  if (!supabaseUrl || !supabaseKey) return '';

  const search = encodeURIComponent(`*${input.displayName.replace(/[%*_]/g, '').trim()}*`);
  const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/characters?select=name,image_url&image_url=not.is.null&name=ilike.${search}&limit=10`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) return '';

    const rows = (await response.json()) as SupabaseCharacter[];
    const exact = rows.find((row) => normalizeSearchText(row.name || '') === input.normalizedName);
    const candidate = exact || rows.find((row) => isValidCharacterImageUrl(row.image_url || ''));

    if (candidate?.image_url && isValidCharacterImageUrl(candidate.image_url)) {
      return candidate.image_url.trim();
    }
  } catch (error) {
    console.warn('Character image cache lookup failed:', error);
  }

  return '';
}

function getCharacterHint(input: NormalizedCharacterInput) {
  const aliasTarget = CHARACTER_ALIASES[input.normalizedName] || input.normalizedName;

  if (CHARACTER_HINTS[aliasTarget]) return CHARACTER_HINTS[aliasTarget];

  const partialKey = Object.keys(CHARACTER_HINTS).find((key) => {
    return aliasTarget.includes(key) || key.includes(aliasTarget);
  });

  return partialKey ? CHARACTER_HINTS[partialKey] : '';
}

function getR2Binding(env: RuntimeEnv) {
  for (const name of ['CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET']) {
    const candidate = env[name] as { put?: Function } | undefined;

    if (candidate && typeof candidate.put === 'function') {
      return candidate as {
        put: (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
      };
    }
  }

  return null;
}

function buildPublicR2Url(env: RuntimeEnv, key: string) {
  const publicUrl = getStringEnv(env, 'R2_PUBLIC_URL');

  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL nao esta configurado.');
  }

  return `${publicUrl.replace(/\/+$/, '')}/${key}`;
}

function isValidCharacterImageUrl(value: string) {
  const url = value.trim().toLowerCase();

  if (!url) return false;
  if (url.startsWith('data:image/svg')) return false;
  if (url.includes('fallback-svg')) return false;
  if (url.includes('source=fallback')) return false;
  if (url.includes('/official-cards/')) return false;
  if (url.includes('/standard-cards/')) return false;
  if (url.includes('/characters/') && url.endsWith('.svg')) return false;

  return true;
}

function isOpenAIBillingLimitError(message: string) {
  const normalized = message.toLowerCase();

  return normalized.includes('billing hard limit') || normalized.includes('hard limit has been reached');
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
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 2400);
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
