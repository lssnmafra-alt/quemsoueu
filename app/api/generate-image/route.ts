import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getKnownCharacterCard } from '@/lib/knownCharacterCards';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 500;
const PROMPT_VERSION = 'premium-card-v11';

const r2AccountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';

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
};

type GeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  provider: string;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CharacterRequest;
    const input = normalizeInput(body);

    if (!input.displayName) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const knownCardUrl = getKnownCharacterCard(input.displayName);
    const prompt = buildPremiumImagePrompt(input);

    if (knownCardUrl && !input.description) {
      return NextResponse.json({
        url: knownCardUrl,
        prompt,
        source: 'known-card',
      });
    }

    const image = await generateImage(prompt, stableSeed(`${PROMPT_VERSION}:${input.fullText}`));

    if (image) {
      const uploadedUrl = await uploadImageToR2(
        `characters/${slugify(input.displayName)}_${Date.now()}_${image.provider}.${extensionFromContentType(image.contentType)}`,
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
        source: 'known-card-after-ai-failure',
      });
    }

    return NextResponse.json({
      url: '',
      prompt,
      source: 'no-image-generated',
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

  const promptParts = rawPrompt
    .replace(/\s+/g, ' ')
    .replace(/\bRealistic and detailed character portrait\b/gi, '')
    .replace(/\bCharacter portrait\b/gi, '')
    .replace(/\bPortrait\b/gi, '')
    .replace(/\s+([,.])/g, '$1')
    .replace(/[,.]\s*$/g, '')
    .trim();

  const splitByAppearance = promptParts.split(/\s+[—-]\s*apar[eê]ncia\s*:\s*/i);
  const displayName = sanitizeCharacterName(splitByAppearance[0] || promptParts);
  const extractedDescription = splitByAppearance.slice(1).join(' — aparência: ').trim();
  const description = sanitizeDescription(bodyDescription || extractedDescription);
  const fullText = description ? `${displayName} — aparência: ${description}` : displayName;

  return {
    displayName,
    description,
    fullText,
  };
}

function sanitizeCharacterName(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^personagem\s*:\s*/i, '')
    .replace(/^nome\s*:\s*/i, '')
    .replace(/[,.]\s*$/g, '')
    .trim()
    .slice(0, 90);
}

function sanitizeDescription(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[,.]\s*$/g, '')
    .trim()
    .slice(0, 280);
}

function buildPremiumImagePrompt(input: NormalizedCharacterInput) {
  const descriptionLine = input.description
    ? `Custom appearance details that must be followed: ${input.description}.`
    : 'No extra user appearance details were provided. Use the most recognizable version of the character.';

  return clampPrompt(`
Create ONE premium vertical 4:5 collectible character card illustration for a mobile guessing game.

Character name: ${input.displayName}.
${descriptionLine}

The character must be immediately recognizable, not generic.
Use the character's iconic silhouette, outfit colors, hairstyle, accessories, expression, powers and visual identity.
If this is a known hero, villain, athlete, singer, anime/game/movie character or public figure, make the illustration clearly evoke that character while keeping it as polished original fan-art style.

Card style:
- cinematic illustrated trading card
- sharp detailed face
- dynamic bust portrait from chest up
- centered composition
- dramatic rim light
- premium black and gold frame
- rich background related to the character
- vibrant contrast
- game-ready asset
- high-detail digital painting
- not a simple avatar

Strict negative rules:
- no text
- no letters
- no logo
- no watermark
- no flat SVG
- no emoji
- no stick figure
- no children's drawing
- no generic face
- no boring template
- no empty placeholder
- no random symbols
- no distorted eyes
- no extra faces
- no cropped head
`.trim());
}

async function generateImage(prompt: string, seed: number): Promise<GeneratedImage | null> {
  const openAiImage = await generateWithOpenAI(prompt);

  if (openAiImage) {
    return openAiImage;
  }

  const geminiImage = await generateWithGemini(prompt);

  if (geminiImage) {
    return geminiImage;
  }

  if (process.env.ENABLE_POLLINATIONS_IMAGE_FALLBACK === 'true') {
    const pollinationsImage = await generateWithPollinations(prompt, seed);

    if (pollinationsImage) {
      return pollinationsImage;
    }
  }

  return null;
}

async function generateWithOpenAI(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        prompt,
        n: 1,
        size: process.env.OPENAI_IMAGE_SIZE || '1024x1536',
        quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
      }),
    });

    const payload = (await safeJson(response)) as OpenAIImageResponse | null;

    if (!response.ok) {
      console.warn('OpenAI image generation failed:', response.status, payload?.error?.message || response.statusText);
      return null;
    }

    const item = payload?.data?.[0];

    if (item?.b64_json) {
      return {
        bytes: base64ToBytes(item.b64_json),
        contentType: 'image/png',
        provider: 'openai',
      };
    }

    if (item?.url) {
      const imageResponse = await fetchWithTimeout(item.url, {
        method: 'GET',
        headers: { Accept: 'image/*' },
      });

      if (!imageResponse.ok) return null;

      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      const contentType = imageResponse.headers.get('content-type') || 'image/png';

      if (!contentType.startsWith('image/') || bytes.byteLength < 1000) return null;

      return {
        bytes,
        contentType,
        provider: 'openai',
      };
    }

    return null;
  } catch (error) {
    console.warn('OpenAI image generation request failed:', error);
    return null;
  }
}

async function generateWithGemini(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBodies = [
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    },
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    },
  ];

  for (const body of requestBodies) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = (await safeJson(response)) as GeminiImageResponse | null;

      if (!response.ok) {
        console.warn('Gemini image generation failed:', response.status, payload?.error?.message || response.statusText);
        continue;
      }

      const inlineImage = payload?.candidates
        ?.flatMap((candidate) => candidate.content?.parts || [])
        .find((part) => part.inlineData?.data);

      if (!inlineImage?.inlineData?.data) {
        continue;
      }

      return {
        bytes: base64ToBytes(inlineImage.inlineData.data),
        contentType: inlineImage.inlineData.mimeType || 'image/png',
        provider: 'gemini',
      };
    } catch (error) {
      console.warn('Gemini image generation request failed:', error);
    }
  }

  return null;
}

async function generateWithPollinations(prompt: string, seed: number): Promise<GeneratedImage | null> {
  const urls = [
    buildPollinationsImageUrl(prompt, seed, 'flux'),
    buildPollinationsImageUrl(prompt, seed, 'turbo'),
  ];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Accept: 'image/*' },
      });

      if (!response.ok) {
        console.warn('Pollinations image generation failed:', response.status, response.statusText);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      if (!contentType.startsWith('image/')) {
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());

      if (bytes.byteLength < 1000) {
        continue;
      }

      return {
        bytes,
        contentType,
        provider: 'pollinations',
      };
    } catch (error) {
      console.warn('Pollinations image generation request failed:', error);
    }
  }

  return null;
}

function buildPollinationsImageUrl(prompt: string, seed: number, model: 'flux' | 'turbo') {
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);

  url.searchParams.set('width', String(CARD_WIDTH));
  url.searchParams.set('height', String(CARD_HEIGHT));
  url.searchParams.set('model', model);
  url.searchParams.set('quality', 'high');
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('enhance', 'true');
  url.searchParams.set('seed', String(seed));

  if (process.env.POLLINATIONS_API_KEY) {
    url.searchParams.set('key', process.env.POLLINATIONS_API_KEY);
  }

  return url.toString();
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

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || 'character';
}

function clampPrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 2400);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'png';
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
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
