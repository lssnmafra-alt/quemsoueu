import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuth } from '@/lib/supabase';
import { getPublicR2Url, listR2Objects } from '@/lib/r2Storage';
import { R2_AVATAR_CATALOG } from '@/lib/avatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AVATAR_ROOTS = ['atuem/atuem/avatar/', 'atuem/avatar/'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];

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
    const [r2Items, dbResult, unlockResult, walletResult] = await Promise.all([
      buildR2Catalog(),
      supabaseAuth.from('avatar_skins').select('id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,rarity,access_type,price_coins,sort_order').eq('is_active', true).order('sort_order').then((res) => res).catch((error) => ({ data: [], error })),
      isUuid(userId) ? supabaseAuth.from('user_avatar_unlocks').select('avatar_skin_id,expires_at').eq('user_id', userId).then((res) => res).catch(() => ({ data: [] as any[] })) : Promise.resolve({ data: [] as any[] }),
      isUuid(userId) ? supabaseAuth.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle().then((res) => res).catch(() => ({ data: null as any })) : Promise.resolve({ data: null as any }),
    ]);

    const unlocked = new Set((unlockResult.data || [])
      .filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
      .map((row: any) => String(row.avatar_skin_id)));

    const dbItems = await Promise.all((dbResult.data || []).map(async (skin: any) => {
      const baseKey = `${normalizeKey(skin.avatar_key)}:${normalizeKey(skin.skin_code)}`;
      const existing = r2Items.find((item) => `${normalizeKey(item.avatarKey)}:${normalizeKey(item.skinCode)}` === baseKey || normalizeKey(item.imageKey || '') === normalizeKey(skin.image_key || ''));
      const accessType = skin.access_type || 'free';
      const owned = accessType === 'free' || unlocked.has(String(skin.id));
      const imageKey = skin.card_image_key || skin.image_key || existing?.imageKey || '';
      return {
        ...(existing || {}),
        id: skin.id,
        avatarKey: skin.avatar_key,
        displayName: skin.avatar_name,
        skinCode: skin.skin_code,
        skinName: skin.skin_name,
        imageKey,
        imageUrl: imageKey ? await getPublicR2Url(imageKey) : existing?.imageUrl || '',
        rarity: skin.rarity || existing?.rarity || 'common',
        accessType,
        priceCoins: Number(skin.price_coins || 0),
        owned,
        locked: !owned,
        sortOrder: Number(skin.sort_order || existing?.sortOrder || 0),
        animations: existing?.animations || {},
        animationVariants: existing?.animationVariants || {},
        isDefaultSkin: existing?.isDefaultSkin ?? String(skin.skin_code || '').toLowerCase() === 'skin-1',
      } as StoreItem;
    }));

    const dbKeys = new Set(dbItems.map((item) => normalizeKey(item.imageKey || `${item.avatarKey}:${item.skinCode}`)));
    const merged = [
      ...dbItems,
      ...r2Items.filter((item) => !dbKeys.has(normalizeKey(item.imageKey || `${item.avatarKey}:${item.skinCode}`))),
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName) || a.skinName.localeCompare(b.skinName));

    return NextResponse.json({ items: merged, characters: groupCharacters(merged), wallet: { coins: Number(walletResult.data?.coins || 0) } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const items = R2_AVATAR_CATALOG.map((avatar) => ({
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

    return NextResponse.json({ items, characters: groupCharacters(items), wallet: { coins: 0 }, fallback: true, error: error.message || 'Catalogo local.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

async function buildR2Catalog(): Promise<StoreItem[]> {
  const objects = (await Promise.all(AVATAR_ROOTS.map((prefix) => listR2Objects(prefix, 5000).catch(() => [])))).flat();
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
      accessType: 'free',
      priceCoins: 0,
      owned: true,
      locked: false,
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

  return [...itemsBySkin.values()];
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
