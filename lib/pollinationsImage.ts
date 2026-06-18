import { getRuntimeEnv, getStringEnv } from './r2ImageStorage';

const POLLINATIONS_IMAGE_ENDPOINT = 'https://image.pollinations.ai/prompt';
const POLLINATIONS_MODEL = 'flux';

type PollinationsImageOptions = {
  width?: number;
  height?: number;
};

export async function generateImageWithPollinations(prompt: string, options: PollinationsImageOptions = {}) {
  const env = await getRuntimeEnv();
  const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');
  const width = options.width || 1024;
  const height = options.height || 1536;
  const seed = Math.floor(Math.random() * 1_000_000_000);

  const url = new URL(`${POLLINATIONS_IMAGE_ENDPOINT}/${encodeURIComponent(prompt)}`);
  url.searchParams.set('model', POLLINATIONS_MODEL);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('private', 'true');
  url.searchParams.set('safe', 'true');

  const headers: Record<string, string> = {
    Accept: 'image/png,image/jpeg,image/webp,*/*',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    url.searchParams.set('token', apiKey);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  const contentType = response.headers.get('content-type') || 'image/png';

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(cleanPollinationsError(errorText, response.status));
  }

  if (!contentType.startsWith('image/')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Pollinations nao retornou imagem. Resposta: ${text.slice(0, 300)}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  return {
    bytes,
    contentType,
  };
}

function cleanPollinationsError(errorText: string, status: number) {
  if (!errorText) return `Pollinations retornou HTTP ${status}.`;
  return `Pollinations retornou HTTP ${status}: ${errorText.slice(0, 500)}`;
}
