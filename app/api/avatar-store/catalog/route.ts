import { NextRequest, NextResponse } from 'next/server';
import { listR2Objects } from '@/lib/r2Storage';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SKIN_PRICE = 100;
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXTENSIONS = ['.webm', '.mp4'];

type StoreItem = {
  id: string;
  avatarKey: string;
  displayName: string;
  skinCode: string;
  skinName: string;
  imageKey?: string;
  imageUrl: string;
  cardImageKey?: string;
  cardImageUrl: string;
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
    const dbItems = await Promise.all(skins.map((skin: any) => skinToItem(skin, categoriesById.get(String(skin.category_id)), animationsBySkin.get(String(skin.id)) || [], unlocks)));
    const r2Items = await buildR2Items(categories, dbItems);
    const items = mergeItems(dbItems, r2Items);

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
  const result = await db.from('avatar_skins').select('id,category_id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,rarity,access_type,price_coins,sort_order,is_active,is_featured').eq('is_active', true).order('sort_order');
  return result.data || [];
}

async function readAnimations(db: any): Promise<any[]> {
  const result = await db.from('avatar_animations').select('avatar_skin_id,event_type,animation_key,variant_code,is_active,sort_order').eq('is_active', true).order('sort_order');
  return result.data || [];
}

async function readUnlocks(db: any, userId: string): Promise<Set<string>> {
  if (!isUuid(userId)) return new Set<string>();
  const result = await db.from('user_avatar_unlocks').select('avatar_skin_id,expires_at').eq('user_id', userId);
  const ids = (result.data || []).filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now()).map((row: any) => String(row.avatar_skin_id));
  return new Set<string>(ids);
}

async function readWallet(db: any, userId: string): Promise<number> {
  if (!isUuid(userId)) return 0;
  const result = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
  return Number(result.data?.coins || 0);
}

async function skinToItem(skin: any, category: any, rows: any[], unlocks: Set<string>): Promise<StoreItem> {
  const imageKey = String(skin.image_key || skin.card_image_key || '').trim();
  const cardImageKey = String(skin.card_image_key || imageKey).trim();
  const isDefaultSkin = String(skin.skin_code || '') === String(skin.avatar_key || '');
  const accessType = String(skin.access_type || (isDefaultSkin ? 'free' : 'premium'));
  const owned = accessType === 'free' || unlocks.has(String(skin.id));
  const bundle = normalizeAnimationBundle(rows);
  return { id: String(skin.id), avatarKey: String(skin.avatar_key || ''), displayName: String(skin.avatar_name || skin.avatar_key || 'Avatar'), skinCode: String(skin.skin_code || skin.avatar_key || ''), skinName: String(skin.skin_name || (isDefaultSkin ? 'Oficial' : 'Skin')), imageKey, imageUrl: imageKey ? imageProxyUrl(imageKey) : '', cardImageKey, cardImageUrl: cardImageKey ? imageProxyUrl(cardImageKey) : '', rarity: String(skin.rarity || 'common'), accessType, priceCoins: Number(skin.price_coins ?? (isDefaultSkin ? 0 : DEFAULT_SKIN_PRICE)), owned, locked: !owned, sortOrder: Number(skin.sort_order || 0), animations: bundle.animations, animationVariants: bundle.animationVariants, isDefaultSkin, categoryId: String(skin.category_id || ''), categorySlug: String(category?.slug || ''), categoryName: String(category?.name || '') };
}

async function buildR2Items(categories: any[], dbItems: StoreItem[]): Promise<StoreItem[]> {
  const existing = new Set(dbItems.map((item) => `${item.categoryId}:${normalizeKey(item.avatarKey)}:${normalizeKey(item.skinCode)}`));
  const output: StoreItem[] = [];
  for (const category of categories) {
    const prefix = normalizePrefix(category.r2_prefix);
    if (!prefix) continue;
    const objects = await safeListR2(prefix);
    const imageKeys = objects.map((object: any) => String(object.key || '')).filter(isImageKey);
    const videoKeys = objects.map((object: any) => String(object.key || '')).filter(isVideoKey);
    for (const imageKey of imageKeys) {
      const parsed = parseImage(prefix, imageKey);
      if (!parsed) continue;
      const key = `${category.id}:${normalizeKey(parsed.avatarKey)}:${normalizeKey(parsed.skinCode)}`;
      if (existing.has(key)) continue;
      const isFree = String(category.slug) === 'padrao' && parsed.isDefaultSkin;
      const bundle = r2Animations(prefix, parsed.avatarKey, parsed.skinCode, videoKeys);
      output.push({ id: `r2:${normalizeKey(category.slug)}:${normalizeKey(parsed.skinCode)}`, avatarKey: parsed.avatarKey, displayName: prettyName(parsed.avatarKey), skinCode: parsed.skinCode, skinName: parsed.isDefaultSkin ? 'Oficial' : `Skin ${parsed.skinNumber}`, imageKey, imageUrl: imageProxyUrl(imageKey), cardImageKey: imageKey, cardImageUrl: imageProxyUrl(imageKey), rarity: isFree ? 'common' : 'rare', accessType: isFree ? 'free' : 'premium', priceCoins: isFree ? 0 : DEFAULT_SKIN_PRICE, owned: isFree, locked: !isFree, sortOrder: parsed.avatarSort * 100 + parsed.skinNumber, animations: bundle.animations, animationVariants: bundle.animationVariants, isDefaultSkin: parsed.isDefaultSkin, categoryId: String(category.id || ''), categorySlug: String(category.slug || ''), categoryName: String(category.name || '') });
    }
  }
  return output;
}

async function safeListR2(prefix: string) {
  try { return await listR2Objects(prefix, 5000); } catch { return []; }
}

function parseImage(prefix: string, key: string) {
  const relative = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const parts = relative.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const stem = parts[parts.length - 1].replace(/\.[^.]+$/, '').trim();
  const match = stem.match(/^(.*?)(\d+)?$/);
  const avatarKey = cleanName(match?.[1] || parts[0] || stem);
  const rawNumber = match?.[2] ? Number(match[2]) : 0;
  if (!avatarKey) return null;
  return { avatarKey, skinCode: rawNumber > 0 ? `${avatarKey}${rawNumber}` : avatarKey, skinNumber: rawNumber > 0 ? rawNumber : 0, isDefaultSkin: rawNumber === 0, avatarSort: sortHash(avatarKey) };
}

function r2Animations(prefix: string, avatarKey: string, skinCode: string, videoKeys: string[]) {
  const animations: Record<string, string> = {};
  const animationVariants: Record<string, string[]> = {};
  const folder = `${prefix}${avatarKey}/`;
  for (const key of videoKeys) {
    if (!key.startsWith(folder)) continue;
    const stem = key.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (!stem.startsWith(`${skinCode}-`)) continue;
    const suffix = stem.slice(skinCode.length + 1);
    const eventType = suffix.toLowerCase() === 'a' ? 'home' : suffix[0] === '1' ? 'lobby' : suffix[0] === '2' ? 'victory' : suffix[0] === '3' ? 'defeat' : '';
    if (!eventType) continue;
    const variants = animationVariants[eventType] || [];
    if (!variants.includes(key)) variants.push(key);
    animationVariants[eventType] = variants.sort(naturalCompare);
    if (!animations[eventType] || shouldPreferAnimation(key, animations[eventType], suffix)) animations[eventType] = key;
    if (eventType === 'home') animations.intro = key;
  }
  return { animations, animationVariants };
}

function mergeItems(dbItems: StoreItem[], r2Items: StoreItem[]) {
  return [...dbItems, ...r2Items].sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName) || a.skinName.localeCompare(b.skinName));
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
    const animationKey = normalizeAnimationKey(row.animation_key);
    if (!eventType || !animationKey) continue;
    const variants = animationVariants[eventType] || [];
    if (!variants.includes(animationKey)) variants.push(animationKey);
    animationVariants[eventType] = variants;
    if (!animations[eventType] || String(row.variant_code || '') === 'default') animations[eventType] = animationKey;
  }
  return { animations, animationVariants };
}

function normalizeAnimationKey(key: string) {
  const value = String(key || '').trim();
  if (!value) return '';
  return isAvatarAnimationKey(value) ? value.replace(/\.mp4$/i, '.webm') : value;
}

function isAvatarAnimationKey(key: string) {
  const normalized = key.replace(/\\/g, '/').toLowerCase();
  return normalized.includes('/avatar/') || normalized.includes('/animacao/');
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
    return { id, avatarKey: official.avatarKey, displayName: official.displayName, imageUrl: official.imageUrl, imageKey: official.imageKey, cardImageUrl: official.cardImageUrl || official.imageUrl, cardImageKey: official.cardImageKey || official.imageKey, categorySlug: official.categorySlug, categoryName: official.categoryName, skinCount: sortedSkins.length, ownedCount: sortedSkins.filter((skin) => skin.owned).length, skins: sortedSkins, sortOrder: official.sortOrder };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

function toPublicCategory(category: any) { return { id: category.id, slug: category.slug, name: category.name, description: category.description || '', r2Prefix: category.r2_prefix, sortOrder: category.sort_order }; }
function imageProxyUrl(key: string) { return `/api/r2-file?key=${encodeURIComponent(key)}`; }
function normalizePrefix(value: string) { const clean = String(value || '').trim().replace(/^\/+/, ''); return clean.endsWith('/') ? clean : `${clean}/`; }
function isImageKey(key: string) { const lower = key.toLowerCase(); return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)); }
function isVideoKey(key: string) { const lower = key.toLowerCase(); return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext)); }
function shouldPreferAnimation(nextKey: string, currentKey: string, suffix: string) {
  const nextLower = nextKey.toLowerCase();
  const currentLower = currentKey.toLowerCase();
  if (nextLower.endsWith('.webm') && !currentLower.endsWith('.webm')) return true;
  if (!nextLower.endsWith('.webm') && currentLower.endsWith('.webm')) return false;
  return suffix.length === 1 || suffix.toLowerCase() === 'a';
}
function cleanName(value: string) { return String(value || '').replace(/[-_]+$/g, '').trim(); }
function prettyName(value: string) { return String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function sortHash(value: string) { return normalizeKey(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0); }
function naturalCompare(a: string, b: string) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }
function normalizeKey(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase(); }
function isUuid(value: string) { return value.length === 36 && value.includes('-'); }
