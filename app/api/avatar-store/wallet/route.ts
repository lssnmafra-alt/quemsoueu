import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';
import { isProjectAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const userId = String(req.nextUrl.searchParams.get('userId') || '').trim();
  if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });

  try {
    const db = getSupabaseAuthServer();
    const result = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
    return NextResponse.json({ wallet: { coins: Number(result.data?.coins || 0) } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Nao foi possivel ler moedas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || body.targetUserId || '').trim();
    const adminId = String(body.adminId || body.requestedBy || '').trim();
    const amount = Number(body.amount || 0);

    if (!isProjectAdmin(adminId)) {
      return NextResponse.json({ error: 'Apenas ADM pode alterar moedas.' }, { status: 403 });
    }

    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (!Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: 'Quantidade invalida.' }, { status: 400 });

    const db = getSupabaseAuthServer();
    const current = await db.from('user_wallets').select('coins').eq('user_id', userId).maybeSingle();
    const coins = Math.max(0, Number(current.data?.coins || 0) + Math.floor(amount));

    const result = await db
      .from('user_wallets')
      .upsert({ user_id: userId, coins, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('coins')
      .maybeSingle();

    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, wallet: { coins: Number(result.data?.coins || coins) } });
  } catch (error: any) {
    console.error('Avatar wallet error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel alterar moedas.' }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
