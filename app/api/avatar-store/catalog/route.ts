import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';
import { R2_AVATAR_CATALOG } from '@/lib/avatars';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AVATAR_ROOTS = ['atuem/atuem/avatar/', 'atuem/avatar/'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];
const DEFAULT_SKIN_PRICE = 100;

type StoreItem = {
  id: string;
  avatarKey: string;
  displayName: string;
  skinCode: string;
  skinName: string;
  imageKey?: string;
  imageUrl: string;
  rarity: string;
  accessType: string;
  priceCoins: number;
  owned: boolean;
  locked: boolean;
  sortOrder: number;
  animations: Record<string, string>;
  animationVariants: Record<string, string[]>;
  isDefaultSkin: boolean;
};

export async function GET(req: NextRequest) {
  const userId = String(req.nextUrl.searchParams.get('userId') || '').trim();

  try {
    const r2Items = await buildR2Catalog();
    const dbSkins = await readDbSkins();
    const unlocks = await readUnlocks(userId);
    const wallet = await readWallet(userId);
    const finalItems = mergeCatalog(r2Items.length ? r2Items : fallbackItems(), dbSkins, unlocks);

    return NextResponse.json({ items: finalItems, characters: groupCharacters(finalItems), wallet: { coins: wallet } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const items = fallbackItems();
    return NextResponse.json({ items, characters: groupCharacters(items), wallet: { coins: 0 }, fallback: true, error: error.message || 'Catalogo local.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

async function readDbSkins() {
  try {
    const db = getSupabaseAuthServer();
    const result = await db
      .from('avatar_skins')
      .select('id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,rarity,access_type,price_coins,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order');
    return result.data || [];
  } catch {
    return [];
  }
}

async function readUnlocks(userId: string) {
  if (!isUuid(userId)) return new Set<string>();
  try {
    const db = getSupabaseAuthServer();
    const result = await db.from('user_avatar_unlocks').select('avatar_skin_id,expires_at').eq('user_id', userId);
    return new Set((result.data || [])
      .filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
      .map((row: any) => String(row.avatar_skin_id)));
  } catch {
    return new Set<string>();
  }
}

async function readWallet(userId: string) {
  if (!isUuid(userId)) return 0;
  try {
    const db = getSupabaseAuthServer();
    const result = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
    return Number(result.data?.coins || 0);
  } catch {
    return 0;
  }
}

function mergeCatalog(r2Items: StoreItem[], dbSkins: any[], unlocks: Set<string>) {
  const dbByAsset = new Map<string, any>();
  const dbBySkin = new Map<string, any>();

  for (const skin of dbSkins) {
    dbByAsset.set(normalizeKey(String(skin.image_key || skin.card_image_key || '')), skin);
    dbBySkin.set(`${normalizeKey(String(skin.avatar_key || ''))}:${normalizeKey(String(skin.skin_code || ''))}`, skin);
  }

  return r2Items.map((item) => {
    const dbSkin = dbByAsset.get(normalizeKey(item.imageKey || '')) || dbBySkin.get(`${normalizeKey(item.avatarKey)}:${normalizeKey(item.skinCode)}`);
    const id = String(dbSkin?.id || item.id);
    const isDefaultSkin = Boolean(item.isDefaultSkin);
    const accessType = String(dbSkin?.access_type || (isDefaultSkin ? 'free' : 'premium'));
    const priceCoins = Number(dbSkin?.price_coins ?? (isDefaultSkin ? 0 : DEFAULT_SKIN_PRICE));
    const owned = accessType === 'free' || unlocks.has(id);

    return {
      ...item,
      id,
      displayName: String(dbSkin?.avatar_name || item.displayName),
      skinName: String(dbSkin?.skin_name || item.skinName),
      rarity: String(dbSkin?.rarity || item.rarity),
      accessType,
      priceCoins,
      owned,
      locked: !owned,
      sortOrder: Number(dbSkin?.sort_order ?? item.sortOrder),
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

async function buildR2Catalog(): Promise<StoreItem[]> {
  const objects = (await Promise.all(AVATAR_ROOTS.map((prefix) => safeListR2(prefix)))).flat();
  const imageObjects = objects.filter((object) => isImageKey(object.key) && isRootAsset(object.key));
  const videoObjects = objects.filter((object) => isVideoKey(object.key) && isRootAsset(object.key));
  const itemsBySkin = new Map<string, StoreItem>();

  for (const image of imageObjects) {
    const parsed = parseImageKey(image.key);
    if (!parsed) continue;
    const itemKey = `${normalizeKey(parsed.avatarKey)}:${normalizeKey(parsed.skinCode)}`;
    itemsBySkin.set(itemKey, {
      id: `r2:${normalizeKey(parsed.avatarKey)}:${normalizeKey(parsed.skinCode)}`,
      avatarKey: parsed.avatarKey,
      displayName: prettyName(parsed.avatarKey),
      skinCode: parsed.skinCode,
      skinName: parsed.isDefaultSkin ? 'Oficial' : `Skin ${parsed.skinNumber}`,
      imageKey: image.key,
      imageUrl: await getPublicR2Url(image.key),
      rarity: parsed.isDefaultSkin ? 'common' : 'rare',
      accessType: parsed.isDefaultSkin ? 'free' : 'premium',
      priceCoins: parsed.isDefaultSkin ? 0 : DEFAULT_SKIN_PRICE,
      owned: parsed.isDefaultSkin,
      locked: !parsed.isDefaultSkin,
      sortOrder: parsed.avatarSort * 100 + parsed.skinNumber,
      animations: {},
      animationVariants: {},
      isDefaultSkin: parsed.isDefaultSkin,
    });
  }

  for (const video of videoObjects) {
    const parsed = parseVideoKey(video.key);
    if (!parsed) continue;
    const itemKey = `${normalizeKey(parsed.avatarKey)}:${normalizeKey(parsed.skinCode)}`;
    const item = itemsBySkin.get(itemKey);
    if (!item) continue;

    if (parsed.eventType === 'home') {
      item.animations.home = video.key;
      item.animations.intro = video.key;
      continue;
    }

    const variants = item.animationVariants[parsed.eventType] || [];
    if (!variants.includes(video.key)) variants.push(video.key);
    item.animationVariants[parsed.eventType] = variants.sort(naturalCompare);

    if (parsed.isDefaultMovement || !item.animations[parsed.eventType]) {
      item.animations[parsed.eventType] = video.key;
    }
  }

  return [...itemsBySkin.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

async function safeListR2(prefix: string) {
  try {
    return await listR2Objects(prefix, 5000);
  } catch {
    return [];
  }
}

function fallbackItems(): StoreItem[] {
  return R2_AVATAR_CATALOG.map((avatar) => ({
    id: avatar.avatarId,
    avatarKey: avatar.avatarKey,
    displayName: avatar.displayName,
    skinCode: avatar.skinCode,
    skinName: avatar.skinName,
    imageKey: avatar.imageKey,
    imageUrl: avatar.imageUrl,
    rarity: 'common',
    accessType: 'free',
    priceCoins: 0,
    owned: true,
    locked: false,
    sortOrder: avatar.sortOrder,
    animations: avatar.animations || {},
    animationVariants: {},
    isDefaultSkin: true,
  }));
}

function groupCharacters(items: StoreItem[]) {
  const grouped = new Map<string, StoreItem[]>();
  for (const item of items) {
    const key = normalizeKey(item.avatarKey);
    grouped.set(key, [...(grouped.get(key) || []), item]);
  }

  return [...grouped.entries()].map(([id, skins]) => {
    const sortedSkins = skins.sort((a, b) => Number(!a.isDefaultSkin) - Number(!b.isDefaultSkin) || a.sortOrder - b.sortOrder);
    const official = sortedSkins.find((skin) => skin.isDefaultSkin) || sortedSkins[0];
    return {
      id,
      avatarKey: official.avatarKey,
      displayName: official.displayName,
      imageUrl: official.imageUrl,
      imageKey: official.imageKey,
      skinCount: sortedSkins.length,
      ownedCount: sortedSkins.filter((skin) => skin.owned).length,
      skins: sortedSkins,
      sortOrder: official.sortOrder,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

function parseImageKey(key: string) {
  const stem = filenameStem(key);
  if (!stem) return null;
  const match = stem.match(/^(.*?)(\d+)?$/);
  const avatarKey = cleanName(match?.[1] || stem);
  const rawNumber = match?.[2] ? Number(match[2]) : 0;
  if (!avatarKey) return null;
  return {
    avatarKey,
    skinCode: rawNumber > 0 ? `${avatarKey}${rawNumber}` : avatarKey,
    skinNumber: rawNumber > 0 ? rawNumber : 0,
    isDefaultSkin: rawNumber === 0,
    avatarSort: sortHash(avatarKey),
  };
}

function parseVideoKey(key: string) {
  const stem = filenameStem(key);
  const match = stem.match(/^(.*?)-([A-Za-z]|\d+)$/);
  if (!match) return null;
  const skinStem = cleanName(match[1]);
  const suffix = String(match[2] || '');
  const imageParsed = parseImageKey(`${skinStem}.png`);
  if (!imageParsed) return null;

  if (suffix.toLowerCase() === 'a') {
    return { avatarKey: imageParsed.avatarKey, skinCode: imageParsed.skinCode, eventType: 'home', isDefaultMovement: true };
  }

  const firstDigit = suffix[0];
  const eventType = firstDigit === '1' ? 'lobby' : firstDigit === '2' ? 'victory' : firstDigit === '3' ? 'defeat' : '';
  if (!eventType) return null;

  return {
    avatarKey: imageParsed.avatarKey,
    skinCode: imageParsed.skinCode,
    eventType,
    isDefaultMovement: suffix.length === 1,
  };
}

function filenameStem(key: string) {
  return decodeURIComponent(String(key || '').split('/').pop() || '').replace(/\.[^.]+$/, '').trim();
}

function isRootAsset(key: string) {
  const relative = AVATAR_ROOTS.reduce((value, prefix) => value.startsWith(prefix) ? value.slice(prefix.length) : value, key);
  return relative && !relative.includes('/');
}

function isImageKey(key: string) {
  const lower = key.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isVideoKey(key: string) {
  const lower = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function cleanName(value: string) {
  return String(value || '').replace(/[-_]+$/g, '').trim();
}

function prettyName(value: string) {
  return String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKey(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

function sortHash(value: string) {
  return normalizeKey(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}
