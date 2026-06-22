import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';

const PROFILE_SELECT = 'id,nickname,avatar_url,played_matches,wins,is_guest,updated_at';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const viewerId = req.nextUrl.searchParams.get('viewerId')?.trim() || '';
    if (!isUuid(id)) return NextResponse.json({ error: 'Perfil invalido.' }, { status: 400 });

    const { data: profile, error } = await supabaseGame.from('profiles').select(PROFILE_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!profile) return NextResponse.json({ error: 'Perfil nao encontrado.' }, { status: 404 });

    const { data: trophyRows } = await supabaseGame
      .from('profile_trophies')
      .select('id,unlocked_at,metadata,trophy:trophies(id,code,name,description,tier,icon,sort_order)')
      .eq('profile_id', id)
      .order('unlocked_at', { ascending: false });

    const friendship = viewerId && isUuid(viewerId) && viewerId !== id ? await findFriendship(viewerId, id) : null;

    return NextResponse.json({ profile, trophies: trophyRows || [], friendship });
  } catch (error: any) {
    console.error('Public profile read error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar perfil.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || body.reporterId || '').trim();
    const reason = normalizeReason(body.reason);
    const message = String(body.message || '').trim().slice(0, 500);

    if (!isUuid(targetId) || !isUuid(userId)) return NextResponse.json({ error: 'Perfil invalido.' }, { status: 400 });
    if (targetId === userId) return NextResponse.json({ error: 'Acao indisponivel para o proprio perfil.' }, { status: 400 });

    const { data, error } = await supabaseGame
      .from('profile_reports')
      .insert({ reporter_profile_id: userId, reported_profile_id: targetId, reason, message })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, report: data });
  } catch (error: any) {
    console.error('Profile moderation request error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel registrar a solicitacao.' }, { status: 500 });
  }
}

async function findFriendship(userId: string, targetId: string) {
  const { data, error } = await supabaseGame
    .from('friendships')
    .select('*')
    .or(`and(requester_profile_id.eq.${userId},receiver_profile_id.eq.${targetId}),and(requester_profile_id.eq.${targetId},receiver_profile_id.eq.${userId})`)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function normalizeReason(value: unknown) {
  const clean = String(value || 'outro').trim().toLowerCase();
  const allowed = new Set(['nome_ofensivo', 'avatar_inadequado', 'comportamento', 'spam', 'outro']);
  return allowed.has(clean) ? clean : 'outro';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
