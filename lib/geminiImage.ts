import { getRuntimeEnv, getStringEnv } from './r2ImageStorage';

const DEFAULT_GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.5-flash-image-preview',
];

type GeminiInlineData = {
  mimeType?: string;
  data?: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

export async function generateImageWithGemini(prompt: string) {
  const env = await getRuntimeEnv();
  const apiKey = getStringEnv(env, 'GEMINI_API_KEY');
  const configuredModel = getStringEnv(env, 'GEMINI_IMAGE_MODEL');
  const models = configuredModel
    ? [configuredModel, ...DEFAULT_GEMINI_IMAGE_MODELS.filter((model) => model !== configuredModel)]
    : DEFAULT_GEMINI_IMAGE_MODELS;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY nao configurada no Cloudflare.');
  }

  const errors: string[] = [];

  for (const model of models) {
    try {
      const image = await tryGenerateImageWithModel({ apiKey, model, prompt });
      return image;
    } catch (error: any) {
      errors.push(`${model}: ${error?.message || 'erro desconhecido'}`);
    }
  }

  throw new Error(`Gemini nao conseguiu gerar a imagem. Tentativas: ${errors.join(' | ')}`);
}

async function tryGenerateImageWithModel({ apiKey, model, prompt }: { apiKey: string; model: string; prompt: string }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(cleanGeminiError(errorText, response.status));
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (!inlineData?.data) {
    throw new Error('resposta sem imagem');
  }

  const bytes = base64ToUint8Array(inlineData.data);

  return {
    bytes,
    contentType: inlineData.mimeType || 'image/png',
  };
}

function cleanGeminiError(errorText: string, status: number) {
  if (!errorText) return `HTTP ${status}`;

  try {
    const parsed = JSON.parse(errorText);
    const message = parsed?.error?.message;
    if (typeof message === 'string' && message.trim()) return `HTTP ${status} - ${message.trim()}`;
  } catch {}

  return `HTTP ${status} - ${errorText.slice(0, 300)}`;
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
