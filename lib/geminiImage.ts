import { getRuntimeEnv, getStringEnv } from './r2ImageStorage';

const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';

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
  const model = getStringEnv(env, 'GEMINI_IMAGE_MODEL') || DEFAULT_GEMINI_IMAGE_MODEL;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY nao configurada no Cloudflare.');
  }

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
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Gemini nao conseguiu gerar a imagem.');
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (!inlineData?.data) {
    throw new Error('Gemini nao retornou imagem.');
  }

  const bytes = base64ToUint8Array(inlineData.data);

  return {
    bytes,
    contentType: inlineData.mimeType || 'image/png',
  };
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
