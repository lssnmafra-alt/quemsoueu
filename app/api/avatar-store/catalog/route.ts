import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuth } from '@/lib/supabase';
import { getPublicR2Url } from '@/lib/r2Storage';
import { R2_AVATAR_CATALOG } from '@/lib/avatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const userId = String(req.nextUrl.searchParams.get('userId') || '').trim();

  try {
    const [{ data: skins, error: skinsError }, { data: unlocks }, { data: wallet }] = await Promise.all([
      supabaseAuth.from('avatar_skins').select('id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,rarity,access_type,price_coins,sort_order').eq('is_active', true).order('sort_order'),
      isUuid(userId) ? supabaseAuth.from('user_avatar_unlocks').select('avatar_skin_id,expires_at').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
      isUuid(userId) ? supabaseAuth.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null as any }),
    ]);

    if (skinsError) throw skinsError;

    const unlocked = new Set((unlocks || [])
      .filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
      .map((row: any) => String(row.avatar_skin_id)));

    const items = await Promise.all((skins || []).map(async (skin: any) => {
      const accessType = skin.access_type || 'free';
      const owned = accessType === 'free' || unlocked.has(String(skin.id));
      const imageKey = skin.card_image_key || skin.image_key;
      return {
        id: skin.id,
        avatarKey: skin.avatar_key,
        displayName: skin.avatar_name,
        skinCode: skin.skin_code,
        skinName: skin.skin_name,
        imageKey,
        imageUrl: await getPublicR2Url(imageKey),
        rarity: skin.rarity || 'common',
        accessType,
        priceCoins: Number(skin.price_coins || 0),
        owned,
        locked: !owned,
        sortOrder: Number(skin.sort_order || 0),
      };
    }));

    return NextResponse.json({ items, wallet: { coins: Number(wallet?.coins || 0) } }, { headers: { 'Cache-Control': 'no-store' } });
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
    }));

    return NextResponse.json({ items, wallet: { coins: 0 }, fallback: true, error: error.message || 'Catalogo local.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
