import { getCloudflareContext } from '@opennextjs/cloudflare';

const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];

type UploadImageParams = {
  key: string;
  bytes: ArrayBuffer | Uint8Array;
  contentType: string;
};

export async function uploadImageToR2({ key, bytes, contentType }: UploadImageParams) {
  const env = await getRuntimeEnv();
  const bucket = getR2Bucket(env);
  const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');

  if (!bucket) {
    throw new Error('Bucket R2 nao configurado. Verifique o binding atuem/ATUEM/R2_BUCKET.');
  }

  if (!publicBaseUrl) {
    throw new Error('R2_PUBLIC_URL nao configurado.');
  }

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType,
    },
  });

  return {
    key,
    url: `${publicBaseUrl.replace(/\/+$/, '')}/${key}`,
  };
}

export async function getRuntimeEnv() {
  try {
    return (await getCloudflareContext({ async: true })).env as Record<string, any>;
  } catch {
    return process.env as Record<string, any>;
  }
}

export function getStringEnv(env: Record<string, any>, key: string) {
  const value = env[key] ?? process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getR2Bucket(env: Record<string, any>) {
  for (const name of BINDING_NAMES) {
    const bucket = env[name];
    if (bucket && typeof bucket.put === 'function') return bucket;
  }

  return null;
}
