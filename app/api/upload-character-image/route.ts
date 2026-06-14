import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

type RuntimeEnv = Record<string, unknown>;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const BINDING_NAMES = ['CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie uma imagem no campo file.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Envie uma imagem PNG, JPG ou WEBP.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'A imagem pode ter no maximo 5MB.' }, { status: 400 });
    }

    const env = await getRuntimeEnv();
    const extension = EXTENSIONS[file.type];
    const key = `characters/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const bytes = await file.arrayBuffer();

    const binding = getR2Binding(env);

    if (binding) {
      await binding.put(key, bytes, {
        httpMetadata: {
          contentType: file.type,
        },
      });
    } else {
      await uploadWithS3(env, key, bytes, file.type);
    }

    const publicUrl = getPublicUrl(env);

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'R2_PUBLIC_URL nao esta configurado para montar a URL publica.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: `${publicUrl.replace(/\/+$/, '')}/${key}` });
  } catch (error: any) {
    console.error('upload-character-image error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel enviar a imagem.' }, { status: 500 });
  }
}

async function uploadWithS3(env: RuntimeEnv, key: string, body: ArrayBuffer, contentType: string) {
  const accountId = getStringEnv(env, 'R2_ACCOUNT_ID') || getStringEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = getStringEnv(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = getStringEnv(env, 'R2_SECRET_ACCESS_KEY');
  const bucket = getStringEnv(env, 'R2_BUCKET_NAME');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Configure R2 binding ou R2_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME.');
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
      Body: new Uint8Array(body),
      ContentType: contentType,
    }),
  );
}

function getR2Binding(env: RuntimeEnv) {
  for (const name of BINDING_NAMES) {
    const candidate = env[name] as { put?: Function } | undefined;

    if (candidate && typeof candidate.put === 'function') {
      return candidate as {
        put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
      };
    }
  }

  return null;
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

function getPublicUrl(env: RuntimeEnv) {
  return getStringEnv(env, 'R2_PUBLIC_URL');
}
