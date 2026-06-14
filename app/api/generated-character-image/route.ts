import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

type RuntimeEnv = Record<string, unknown>;

export async function GET(req: NextRequest) {
  try {
    const env = await getRuntimeEnv();

    const prompt = decodeBase64Url(req.nextUrl.searchParams.get('p') || '');
    const seed = req.nextUrl.searchParams.get('s') || '42';
    const width = req.nextUrl.searchParams.get('w') || '768';
    const height = req.nextUrl.searchParams.get('h') || '960';
    const requestedModel = req.nextUrl.searchParams.get('m') || 'flux';

    if (!prompt) {
      return new Response('Missing prompt', { status: 400 });
    }

    const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');
    const models = uniqueStrings([requestedModel, 'flux', 'turbo']);

    for (const model of models) {
      const withKey = await fetchPollinationsImage({
        prompt,
        seed,
        width,
        height,
        model,
        apiKey,
        useKey: true,
      });

      if (withKey.response) return withKey.response;

      if (withKey.status === 402 || withKey.status === 401 || withKey.status === 403) {
        const withoutKey = await fetchPollinationsImage({
          prompt,
          seed,
          width,
          height,
          model,
          apiKey: '',
          useKey: false,
        });

        if (withoutKey.response) return withoutKey.response;
      }
    }

    return new Response('Image generation failed', {
      status: 502,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('generated-character-image error:', error);

    return new Response('Image generation failed', {
      status: 500,
    });
  }
}

async function fetchPollinationsImage({
  prompt,
  seed,
  width,
  height,
  model,
  apiKey,
  useKey,
}: {
  prompt: string;
  seed: string;
  width: string;
  height: string;
  model: string;
  apiKey: string;
  useKey: boolean;
}): Promise<{ response: Response | null; status: number }> {
  const endpoints = [
    'https://image.pollinations.ai/prompt',
    'https://gen.pollinations.ai/image',
  ];

  for (const endpoint of endpoints) {
    const url = new URL(`${endpoint}/${encodeURIComponent(prompt)}`);

    url.searchParams.set('width', width);
    url.searchParams.set('height', height);
    url.searchParams.set('seed', seed);
    url.searchParams.set('model', model);
    url.searchParams.set('safe', 'true');
    url.searchParams.set('enhance', 'true');
    url.searchParams.set('nologo', 'true');
    url.searchParams.set('private', 'true');

    if (apiKey && useKey) {
      url.searchParams.set('key', apiKey);
    }

    const headers: Record<string, string> = {
      Accept: 'image/*',
    };

    if (apiKey && useKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn(`Pollinations failed ${response.status} using ${endpoint} model=${model} useKey=${useKey}`);
        return { response: null, status: response.status };
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      if (!contentType.startsWith('image/')) {
        console.warn(`Pollinations returned invalid content-type: ${contentType}`);
        continue;
      }

      const imageBytes = await response.arrayBuffer();

      if (imageBytes.byteLength < 1000) {
        console.warn('Pollinations returned too-small image.');
        continue;
      }

      return {
        status: 200,
        response: new Response(imageBytes, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public,max-age=31536000,immutable',
          },
        }),
      };
    } catch (error) {
      console.warn(`Pollinations request failed using ${endpoint} model=${model} useKey=${useKey}`, error);
    }
  }

  return { response: null, status: 0 };
}

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const merged: RuntimeEnv = {};

  if (typeof process !== 'undefined' && process.env) {
    Object.assign(merged, process.env);
  }

  try {
    const contextPromise = getCloudflareContext({
      async: true,
    } as any) as unknown as Promise<{ env: RuntimeEnv }> | { env: RuntimeEnv };

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

function decodeBase64Url(value: string) {
  if (!value) return '';

  try {
    const base64 = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 55_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...init,
    signal: controller.signal,
    cache: 'no-store',
  }).finally(() => clearTimeout(timeout));
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}
