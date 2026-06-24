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
    const source = String(body.source || 'reward').trim() || 'reward';

    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });

    const db = getSupabaseAuthServer();
    const skin = isUuid(skinId) ? await readSkinById(db, skinId) : await ensureSkinFromPayload(db, body);
    if (!skin?.id) return NextResponse.json({ error: 'Skin invalida.' }, { status: 400 });

    const result = await db
      .from('user_avatar_unlocks')
      .upsert({ user_id: userId, avatar_skin_id: skin.id, source, metadata: { granted_by_api: true } }, { onConflict: 'user_id,avatar_skin_id' })
      .select('avatar_skin_id')
      .maybeSingle();

    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, skinId: skin.id, source });
  } catch (error: any) {
    console.error('Avatar grant error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel liberar a skin.' }, { status: 500 });
  }
}

async function readSkinById(db: any, skinId: string) {
  const result = await db.from('avatar_skins').select('id,is_active').eq('id', skinId).maybeSingle();
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

  const result = await db
    .from('avatar_skins')
    .upsert({
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
    }, { onConflict: 'avatar_key,skin_code' })
    .select('id,is_active')
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}
