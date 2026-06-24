import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SKIN_PRICE = 100;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    const skinId = String(body.skinId || '').trim();

    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });

    const db = getSupabaseAuthServer();
    const skin = isUuid(skinId) ? await readSkinById(db, skinId) : await ensureSkinFromPayload(db, body);

    if (!skin?.id) return NextResponse.json({ error: 'Skin invalida.' }, { status: 400 });
    if (!skin.is_active) return NextResponse.json({ error: 'Skin indisponivel.' }, { status: 404 });

    const alreadyOwned = await userOwnsSkin(db, userId, skin.id);
    if (alreadyOwned || skin.access_type === 'free') {
      await db.from('user_avatar_unlocks').upsert({ user_id: userId, avatar_skin_id: skin.id, source: skin.access_type === 'free' ? 'free' : 'owned' }, { onConflict: 'user_id,avatar_skin_id' });
      return NextResponse.json({ ok: true, alreadyOwned: true, skinId: skin.id });
    }

    const price = Number(skin.price_coins || DEFAULT_SKIN_PRICE);
    const currentCoins = await readCoins(db, userId);
    if (currentCoins < price) return NextResponse.json({ error: 'Moedas insuficientes.', wallet: { coins: currentCoins }, priceCoins: price }, { status: 402 });

    const nextCoins = currentCoins - price;
    const { error: updateWalletError } = await db
      .from('user_wallets')
      .upsert({ user_id: userId, coins: nextCoins, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (updateWalletError) throw updateWalletError;

    const { error: unlockError } = await db
      .from('user_avatar_unlocks')
      .upsert({ user_id: userId, avatar_skin_id: skin.id, source: 'coins', metadata: { price_coins: price } }, { onConflict: 'user_id,avatar_skin_id' });

    if (unlockError) throw unlockError;
    return NextResponse.json({ ok: true, skinId: skin.id, wallet: { coins: nextCoins } });
  } catch (error: any) {
    console.error('Avatar buy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel comprar.' }, { status: 500 });
  }
}

async function readSkinById(db: any, skinId: string) {
  const result = await db
    .from('avatar_skins')
    .select('id,access_type,price_coins,is_active')
    .eq('id', skinId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

async function ensureSkinFromPayload(db: any, body: any) {
  const avatarKey = String(body.avatarKey || '').trim();
  const skinCode = String(body.skinCode || '').trim();
  const displayName = String(body.displayName || avatarKey).trim();
  const skinName = String(body.skinName || 'Skin').trim();
  const imageKey = String(body.imageKey || '').trim();
  const isDefaultSkin = Boolean(body.isDefaultSkin) || skinCode === avatarKey;

  if (!avatarKey || !skinCode || !imageKey) return null;

  const payload = {
    avatar_key: avatarKey,
    avatar_name: displayName,
    skin_code: skinCode,
    skin_name: skinName,
    image_key: imageKey,
    card_image_key: imageKey,
    r2_prefix: 'atuem/atuem/avatar/',
    rarity: isDefaultSkin ? 'common' : 'rare',
    access_type: isDefaultSkin ? 'free' : 'premium',
    price_coins: isDefaultSkin ? 0 : Number(body.priceCoins || DEFAULT_SKIN_PRICE),
    is_active: true,
    sort_order: Number(body.sortOrder || 999),
  };

  const result = await db
    .from('avatar_skins')
    .upsert(payload, { onConflict: 'avatar_key,skin_code' })
    .select('id,access_type,price_coins,is_active')
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

async function userOwnsSkin(db: any, userId: string, skinId: string) {
  const result = await db
    .from('user_avatar_unlocks')
    .select('avatar_skin_id,expires_at')
    .eq('user_id', userId)
    .eq('avatar_skin_id', skinId)
    .maybeSingle();

  if (result.error) return false;
  return Boolean(result.data && (!result.data.expires_at || new Date(result.data.expires_at).getTime() > Date.now()));
}

async function readCoins(db: any, userId: string) {
  const result = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
  return Number(result.data?.coins || 0);
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}
