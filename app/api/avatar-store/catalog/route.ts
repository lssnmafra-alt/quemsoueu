import { NextRequest, NextResponse } from 'next/server';
import { getPublicR2Url } from '@/lib/r2Storage';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
};

export async function GET(req: NextRequest) {
  const userId = String(req.nextUrl.searchParams.get('userId') || '').trim();

  try {
    const db = getSupabaseAuthServer();
    const categories = await readCategories(db, true);
    const categoryIds = new Set<string>(categories.map((category: any) => String(category.id)));
    const categoriesById = new Map<string, any>(categories.map((category: any) => [String(category.id), category]));
    const skins = (await readSkins(db)).filter((skin: any) => categoryIds.has(String(skin.category_id || '')));
    const animationsBySkin = groupAnimations(await readAnimations(db));
    const unlocks: Set<string> = await readUnlocks(db, userId);
    const wallet = await readWallet(db, userId);
    const items = await Promise.all(skins.map((skin: any) => skinToItem(skin, categoriesById.get(String(skin.category_id)), animationsBySkin.get(String(skin.id)) || [], unlocks)));

    return NextResponse.json({ items, characters: groupCharacters(items), categories: categories.map(toPublicCategory), wallet: { coins: wallet } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ items: [], characters: [], categories: [], wallet: { coins: 0 }, error: error.message || 'Catalogo indisponivel.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

async function readCategories(db: any, activeOnly: boolean): Promise<any[]> {
  let query = db.from('avatar_categories').select('id,slug,name,description,r2_prefix,is_active,sort_order').order('sort_order');
  if (activeOnly) query = query.eq('is_active', true);
  const result = await query;
  return result.data || [];
}

async function readSkins(db: any): Promise<any[]> {
  const result = await db
    .from('avatar_skins')
    .select('id,category_id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,rarity,access_type,price_coins,sort_order,is_active,is_featured')
    .eq('is_active', true)
    .order('sort_order');
  return result.data || [];
}

async function readAnimations(db: any): Promise<any[]> {
  const result = await db
    .from('avatar_animations')
    .select('avatar_skin_id,event_type,animation_key,variant_code,is_active,sort_order')
    .eq('is_active', true)
    .order('sort_order');
  return result.data || [];
}

async function readUnlocks(db: any, userId: string): Promise<Set<string>> {
  if (!isUuid(userId)) return new Set<string>();
  const result = await db.from('user_avatar_unlocks').select('avatar_skin_id,expires_at').eq('user_id', userId);
  const ids = (result.data || [])
    .filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
    .map((row: any) => String(row.avatar_skin_id));
  return new Set<string>(ids);
}

async function readWallet(db: any, userId: string): Promise<number> {
  if (!isUuid(userId)) return 0;
  const result = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
  return Number(result.data?.coins || 0);
}

async function skinToItem(skin: any, category: any, rows: any[], unlocks: Set<string>): Promise<StoreItem> {
  const imageKey = String(skin.card_image_key || skin.image_key || '').trim();
  const isDefaultSkin = String(skin.skin_code || '') === String(skin.avatar_key || '');
  const accessType = String(skin.access_type || (isDefaultSkin ? 'free' : 'premium'));
  const owned = accessType === 'free' || unlocks.has(String(skin.id));
  const bundle = normalizeAnimationBundle(rows);

  return {
    id: String(skin.id),
    avatarKey: String(skin.avatar_key || ''),
    displayName: String(skin.avatar_name || skin.avatar_key || 'Avatar'),
    skinCode: String(skin.skin_code || skin.avatar_key || ''),
    skinName: String(skin.skin_name || (isDefaultSkin ? 'Oficial' : 'Skin')),
    imageKey,
    imageUrl: imageKey ? await getPublicR2Url(imageKey) : '',
    rarity: String(skin.rarity || 'common'),
    accessType,
    priceCoins: Number(skin.price_coins ?? (isDefaultSkin ? 0 : DEFAULT_SKIN_PRICE)),
    owned,
    locked: !owned,
    sortOrder: Number(skin.sort_order || 0),
    animations: bundle.animations,
    animationVariants: bundle.animationVariants,
    isDefaultSkin,
    categoryId: String(skin.category_id || ''),
    categorySlug: String(category?.slug || ''),
    categoryName: String(category?.name || ''),
  };
}

function groupAnimations(rows: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const row of rows) {
    const id = String(row.avatar_skin_id || '');
    map.set(id, [...(map.get(id) || []), row]);
  }
  return map;
}

function normalizeAnimationBundle(rows: any[]) {
  const animations: Record<string, string> = {};
  const animationVariants: Record<string, string[]> = {};
  for (const row of rows) {
    const eventType = String(row.event_type || '').trim();
    const animationKey = String(row.animation_key || '').trim();
    if (!eventType || !animationKey) continue;
    const variants = animationVariants[eventType] || [];
    if (!variants.includes(animationKey)) variants.push(animationKey);
    animationVariants[eventType] = variants;
    if (!animations[eventType] || String(row.variant_code || '') === 'default') animations[eventType] = animationKey;
  }
  return { animations, animationVariants };
}

function groupCharacters(items: StoreItem[]) {
  const grouped = new Map<string, StoreItem[]>();
  for (const item of items) {
    const key = `${item.categorySlug || 'geral'}:${normalizeKey(item.avatarKey)}`;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  }
  return [...grouped.entries()].map(([id, skins]) => {
    const sortedSkins = skins.sort((a, b) => Number(!a.isDefaultSkin) - Number(!b.isDefaultSkin) || a.sortOrder - b.sortOrder);
    const official = sortedSkins.find((skin) => skin.isDefaultSkin) || sortedSkins[0];
    return { id, avatarKey: official.avatarKey, displayName: official.displayName, imageUrl: official.imageUrl, imageKey: official.imageKey, categorySlug: official.categorySlug, categoryName: official.categoryName, skinCount: sortedSkins.length, ownedCount: sortedSkins.filter((skin) => skin.owned).length, skins: sortedSkins, sortOrder: official.sortOrder };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

function toPublicCategory(category: any) {
  return { id: category.id, slug: category.slug, name: category.name, description: category.description || '', r2Prefix: category.r2_prefix, sortOrder: category.sort_order };
}

function normalizeKey(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}
