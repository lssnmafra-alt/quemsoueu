import { getCloudflareContext } from '@opennextjs/cloudflare';

export type R2ObjectInfo = {
  key: string;
  size?: number;
  uploaded?: string;
};

type R2S3Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2GetResult = {
  body: BodyInit;
  httpMetadata: { contentType?: string };
  size?: number;
};

const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
let awsClientModulePromise: Promise<any> | null = null;

export async function getRuntimeEnv() {
  try {
    return (await getCloudflareContext({ async: true })).env as Record<string, any>;
  } catch {
    return process.env as Record<string, any>;
  }
}

export async function listR2Objects(prefix: string, limit = 1000): Promise<R2ObjectInfo[]> {
  const env = await getRuntimeEnv();
  const binding = getR2Binding(env);

  if (binding) {
    const objects: R2ObjectInfo[] = [];
    let cursor: string | undefined;

    do {
      const listed = await binding.list({ prefix, limit: Math.min(1000, limit), cursor });
      for (const object of listed.objects || []) {
        objects.push({ key: String(object.key || ''), size: object.size, uploaded: object.uploaded?.toISOString?.() });
        if (objects.length >= limit) return objects;
      }
      cursor = listed.cursor;
    } while (cursor);

    return objects;
  }

  const s3Configs = getS3Configs(env);
  if (!s3Configs.length) return [];

  const errors: string[] = [];

  for (const config of s3Configs) {
    try {
      const { client, ListObjectsV2Command } = await getS3Client(config);
      const objects: R2ObjectInfo[] = [];
      let ContinuationToken: string | undefined;

      do {
        const response = await client.send(new ListObjectsV2Command({
          Bucket: config.bucketName,
          Prefix: prefix,
          MaxKeys: Math.min(1000, limit),
          ContinuationToken,
        }));

        for (const object of response.Contents || []) {
          if (!object.Key) continue;
          objects.push({
            key: String(object.Key),
            size: typeof object.Size === 'number' ? object.Size : undefined,
            uploaded: object.LastModified instanceof Date ? object.LastModified.toISOString() : undefined,
          });
          if (objects.length >= limit) return objects;
        }

        ContinuationToken = response.NextContinuationToken;
      } while (ContinuationToken && objects.length < limit);

      return objects.slice(0, limit);
    } catch (error: any) {
      errors.push(`${config.accountId}: ${error?.name || 'R2Error'} ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(' | ') || 'R2 list falhou.');
}

export async function getR2Object(key: string): Promise<R2GetResult | null> {
  const env = await getRuntimeEnv();
  const binding = getR2Binding(env);

  if (binding) {
    const object = await binding.get(key);
    if (!object?.body) return null;
    return { body: object.body, httpMetadata: object.httpMetadata || {}, size: object.size };
  }

  const s3Configs = getS3Configs(env);
  if (!s3Configs.length) return null;

  const errors: string[] = [];

  for (const config of s3Configs) {
    try {
      const { client, GetObjectCommand } = await getS3Client(config);
      const response = await client.send(new GetObjectCommand({ Bucket: config.bucketName, Key: key }));
      if (!response.Body) return null;

      const bytes = typeof response.Body.transformToByteArray === 'function'
        ? await response.Body.transformToByteArray()
        : await streamToUint8Array(response.Body);

      return {
        body: new Blob([bytes]).stream() as unknown as BodyInit,
        httpMetadata: { contentType: response.ContentType || undefined },
        size: typeof response.ContentLength === 'number' ? response.ContentLength : bytes.byteLength,
      };
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404 || error?.name === 'NoSuchKey' || error?.name === 'NotFound') return null;
      errors.push(`${config.accountId}: ${error?.name || 'R2Error'} ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(' | ') || 'R2 get falhou.');
}

export async function putR2Object(key: string, bytes: ArrayBuffer | Uint8Array, contentType: string) {
  const env = await getRuntimeEnv();
  const binding = getR2PutBinding(env);

  if (binding) {
    await binding.put(key, bytes, {
      httpMetadata: { contentType },
    });
    return { key };
  }

  const s3Configs = getS3Configs(env);
  if (!s3Configs.length) {
    throw new Error('Bucket R2 nao configurado para anexar imagens.');
  }

  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const errors: string[] = [];

  for (const config of s3Configs) {
    try {
      const { client, PutObjectCommand } = await getS3Client(config);
      await client.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }));
      return { key };
    } catch (error: any) {
      errors.push(`${config.accountId}: ${error?.name || 'R2Error'} ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(' | ') || 'R2 upload falhou.');
}

export async function hasR2Object(key: string) {
  const objects = await listR2Objects(key, 1);
  return objects.some((object) => object.key === key);
}

export async function findR2ObjectByFilename(prefixes: string[], filename: string) {
  const lowerFilename = filename.toLowerCase();
  for (const prefix of prefixes) {
    const objects = await listR2Objects(prefix, 1000);
    const found = objects.find((object) => object.key.toLowerCase().split('/').pop() === lowerFilename);
    if (found) return found.key;
  }
  return '';
}

export function publicUrlForKey(publicBaseUrl: string, key: string) {
  const encodedKey = String(key || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${publicBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
}

export async function getPublicR2Url(key: string) {
  const env = await getRuntimeEnv();
  const publicBaseUrl = getStringEnv(env, 'R2_PUBLIC_URL');
  return publicBaseUrl ? publicUrlForKey(publicBaseUrl, key) : `/api/r2-file?key=${encodeURIComponent(key)}`;
}

function getR2Binding(env: Record<string, any>) {
  for (const name of BINDING_NAMES) {
    const bucket = env[name];
    if (bucket && typeof bucket.list === 'function' && typeof bucket.get === 'function') return bucket;
  }
  return null;
}

function getR2PutBinding(env: Record<string, any>) {
  for (const name of BINDING_NAMES) {
    const bucket = env[name];
    if (bucket && typeof bucket.put === 'function') return bucket;
  }
  return null;
}

function getS3Configs(env: Record<string, any>): R2S3Config[] {
  const accountIds = [
    getStringEnv(env, 'CLOUDFLARE_ACCOUNT_ID'),
    getStringEnv(env, 'R2_ACCOUNT_ID'),
  ].filter(Boolean);
  const uniqueAccountIds = [...new Set(accountIds)];
  const bucketName = getFirstStringEnv(env, ['R2_BUCKET_NAME', 'R2_BUCKET', 'BUCKET_NAME']);
  const accessKeyId = getFirstStringEnv(env, ['R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID']);
  const secretAccessKey = getFirstStringEnv(env, [
    'R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'R2_SECRET_KEY',
    'R2_ACCESS_KEY_SECRET',
    'AWS_SECRET_ACCESS_KEY',
  ]);

  if (!uniqueAccountIds.length || !bucketName || !accessKeyId || !secretAccessKey) return [];
  return uniqueAccountIds.map((accountId) => ({ accountId, bucketName, accessKeyId, secretAccessKey }));
}

async function getS3Client(config: R2S3Config) {
  awsClientModulePromise ||= import('@aws-sdk/client-s3');
  const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = await awsClientModulePromise;
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand };
}

function getStringEnv(env: Record<string, any>, key: string) {
  const value = env[key] ?? process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getFirstStringEnv(env: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = getStringEnv(env, key);
    if (value) return value;
  }
  return '';
}

async function streamToUint8Array(stream: any) {
  const chunks: Uint8Array[] = [];

  if (typeof stream?.getReader === 'function') {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
    }
  } else if (stream && Symbol.asyncIterator in stream) {
    for await (const chunk of stream) {
      chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    }
  }

  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
