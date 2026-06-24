import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuth } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    const skinId = String(body.skinId || '').trim();

    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (!isUuid(skinId)) return NextResponse.json({ error: 'Skin invalida.' }, { status: 400 });

    const { data: skin, error: skinError } = await supabaseAuth
      .from('avatar_skins')
      .select('id,access_type,price_coins,is_active')
      .eq('id', skinId)
      .maybeSingle();

    if (skinError) throw skinError;
    if (!skin?.is_active) return NextResponse.json({ error: 'Skin indisponivel.' }, { status: 404 });

    if (skin.access_type === 'free') {
      await supabaseAuth.from('user_avatar_unlocks').upsert({ user_id: userId, avatar_skin_id: skinId, source: 'free' }, { onConflict: 'user_id,avatar_skin_id' });
      return NextResponse.json({ ok: true, free: true });
    }

    const price = Number(skin.price_coins || 0);
    const { data: wallet, error: walletError } = await supabaseAuth
      .from('user_wallets')
      .select('coins')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletError) throw walletError;
    const currentCoins = Number(wallet?.coins || 0);
    if (currentCoins < price) return NextResponse.json({ error: 'Moedas insuficientes.', wallet: { coins: currentCoins } }, { status: 402 });

    const nextCoins = currentCoins - price;
    const { error: updateWalletError } = await supabaseAuth
      .from('user_wallets')
      .upsert({ user_id: userId, coins: nextCoins, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (updateWalletError) throw updateWalletError;

    const { error: unlockError } = await supabaseAuth
      .from('user_avatar_unlocks')
      .upsert({ user_id: userId, avatar_skin_id: skinId, source: 'coins', metadata: { price_coins: price } }, { onConflict: 'user_id,avatar_skin_id' });

    if (unlockError) throw unlockError;
    return NextResponse.json({ ok: true, wallet: { coins: nextCoins } });
  } catch (error: any) {
    console.error('Avatar buy error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel comprar.' }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
