import { getCloudflareContext } from '@opennextjs/cloudflare';

export type R2ObjectInfo = {
  key: string;
  size?: number;
  uploaded?: string;
};

const BINDING_NAMES = ['atuem', 'ATUEM', 'CHARACTER_IMAGES', 'R2_BUCKET', 'IMAGES_BUCKET', 'BUCKET'];
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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

  const s3 = getS3Config(env);
  if (!s3) return [];

  const objects: R2ObjectInfo[] = [];
  let continuationToken = '';

  do {
    const query: Record<string, string> = {
      'list-type': '2',
      'max-keys': String(Math.min(1000, limit)),
      prefix,
    };
    if (continuationToken) query['continuation-token'] = continuationToken;

    const response = await signedR2Fetch(s3, '', query);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`R2 list falhou (${response.status}): ${text.slice(0, 180)}`);
    }

    const xml = await response.text();
    objects.push(...parseListObjectsXml(xml));
    continuationToken = readXmlTag(xml, 'NextContinuationToken');
  } while (continuationToken && objects.length < limit);

  return objects.slice(0, limit);
}

export async function getR2Object(key: string) {
  const env = await getRuntimeEnv();
  const binding = getR2Binding(env);

  if (binding) {
    const object = await binding.get(key);
    if (!object?.body) return null;
    return { body: object.body, httpMetadata: object.httpMetadata || {}, size: object.size };
  }

  const s3 = getS3Config(env);
  if (!s3) return null;

  const response = await signedR2Fetch(s3, key, {});
  if (response.status === 404) return null;
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`R2 get falhou (${response.status}): ${text.slice(0, 180)}`);
  }

  return {
    body: response.body,
    httpMetadata: { contentType: response.headers.get('content-type') || undefined },
    size: Number(response.headers.get('content-length') || 0) || undefined,
  };
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

function getS3Config(env: Record<string, any>) {
  const accountId = getStringEnv(env, 'R2_ACCOUNT_ID') || getStringEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const bucketName = getStringEnv(env, 'R2_BUCKET_NAME') || getStringEnv(env, 'R2_BUCKET') || getStringEnv(env, 'BUCKET_NAME');
  const accessKeyId = getStringEnv(env, 'R2_ACCESS_KEY_ID') || getStringEnv(env, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = getStringEnv(env, 'R2_SECRET_ACCESS_KEY') || getStringEnv(env, 'AWS_SECRET_ACCESS_KEY');

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucketName, accessKeyId, secretAccessKey, region: 'auto', service: 's3' };
}

function getStringEnv(env: Record<string, any>, key: string) {
  const value = env[key] ?? process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

async function signedR2Fetch(config: ReturnType<typeof getS3Config> & Record<string, string>, key: string, query: Record<string, string>) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const method = 'GET';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${encodeUriPath(config.bucketName)}${key ? `/${encodeUriPath(key)}` : ''}`;
  const canonicalQueryString = canonicalQuery(query);
  const credentialScope = `${dateStamp}/${config.region}/${config.service}/aws4_request`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${EMPTY_SHA256}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, EMPTY_SHA256].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, config.region, config.service);
  const signature = bytesToHex(await hmac(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${host}${canonicalUri}${canonicalQueryString ? `?${canonicalQueryString}` : ''}`;

  return fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': EMPTY_SHA256,
      'x-amz-date': amzDate,
    },
  });
}

function canonicalQuery(query: Record<string, string>) {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`)
    .join('&');
}

function encodeUriPath(path: string) {
  return String(path).split('/').map(awsEncode).join('/');
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key instanceof Uint8Array ? key : new Uint8Array(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

async function getSignatureKey(secret: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${secret}`), dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

function bytesToHex(bytes: Uint8Array | ArrayBuffer) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(array).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseListObjectsXml(xml: string): R2ObjectInfo[] {
  const objects: R2ObjectInfo[] = [];
  const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];

  for (const item of contents) {
    const key = readXmlTag(item, 'Key');
    if (!key) continue;
    const size = Number(readXmlTag(item, 'Size') || 0) || undefined;
    const uploaded = readXmlTag(item, 'LastModified') || undefined;
    objects.push({ key, size, uploaded });
  }

  return objects;
}

function readXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : '';
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
