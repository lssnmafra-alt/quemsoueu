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
    const model = req.nextUrl.searchParams.get('m') || 'flux';

    if (!prompt) {
      return new Response('Missing prompt', { status: 400 });
    }

    const apiKey = getStringEnv(env, 'POLLINATIONS_API_KEY');

    const pollinationsUrl = new URL(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    );

    pollinationsUrl.searchParams.set('width', width);
    pollinationsUrl.searchParams.set('height', height);
    pollinationsUrl.searchParams.set('seed', seed);
    pollinationsUrl.searchParams.set('model', model);
    pollinationsUrl.searchParams.set('safe', 'true');
    pollinationsUrl.searchParams.set('enhance', 'true');
    pollinationsUrl.searchParams.set('nologo', 'true');
    pollinationsUrl.searchParams.set('private', 'true');

    if (apiKey) {
      pollinationsUrl.searchParams.set('key', apiKey);
    }

    const response = await fetch(pollinationsUrl.toString(), {
      headers: {
        Accept: 'image/*',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return new Response(
        `Pollinations error ${response.status}`,
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get('content-type') || 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      return new Response(
        `Invalid content-type: ${contentType}`,
        { status: 502 }
      );
    }

    const imageBytes = await response.arrayBuffer();

    return new Response(imageBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public,max-age=31536000,immutable',
      },
    });
  } catch (error) {
    console.error(error);

    return new Response('Image generation failed', {
      status: 500,
    });
  }
}

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const merged: RuntimeEnv = {};

  if (typeof process !== 'undefined' && process.env) {
    Object.assign(merged, process.env);
  }

  try {
    const contextPromise = getCloudflareContext({
      async: true,
    } as any) as unknown as
      | Promise<{ env: RuntimeEnv }>
      | { env: RuntimeEnv };

    const context = await contextPromise;

    Object.assign(merged, context.env);
  } catch {
    try {
      const context = getCloudflareContext() as unknown as {
        env: RuntimeEnv;
      };

      Object.assign(merged, context.env);
    } catch {}
  }

  return merged;
}

function getStringEnv(env: RuntimeEnv, key: string) {
  const value = env[key];

  return typeof value === 'string'
    ? value.trim()
    : '';
}

function decodeBase64Url(value: string) {
  if (!value) return '';

  try {
    const base64 = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    const binary = atob(base64);

    const bytes = Uint8Array.from(
      binary,
      (c) => c.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}
