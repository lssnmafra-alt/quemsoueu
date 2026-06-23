import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';

const INVITE_SELECT = `
  id,
  room_id,
  sender_profile_id,
  receiver_profile_id,
  status,
  message,
  created_at,
  updated_at,
  room:rooms(id,code,status,max_players,deck_id),
  sender:profiles!room_invites_sender_profile_id_fkey(id,nickname,avatar_url,wins,played_matches),
  receiver:profiles!room_invites_receiver_profile_id_fkey(id,nickname,avatar_url,wins,played_matches)
`;

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')?.trim() || '';
    const roomId = req.nextUrl.searchParams.get('roomId')?.trim() || '';
    if (!isUuid(userId) && !isUuid(roomId)) return NextResponse.json({ invites: [], error: 'Usuario ou sala invalida.' }, { status: 400 });

    let query = supabaseGame.from('room_invites').select(INVITE_SELECT).order('created_at', { ascending: false }).limit(50);
    if (isUuid(userId)) query = query.eq('receiver_profile_id', userId).eq('status', 'pending');
    if (isUuid(roomId)) query = query.eq('room_id', roomId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ invites: data || [] });
  } catch (error: any) {
    console.error('Room invites read error:', error);
    return NextResponse.json({ invites: [], error: error.message || 'Nao foi possivel carregar convites.' }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || body.senderId || '').trim();
    const targetId = String(body.targetId || body.receiverId || '').trim();
    const roomId = String(body.roomId || '').trim();
    const action = String(body.action || 'invite').trim();

    if (!isUuid(userId) || !isUuid(targetId) || !isUuid(roomId)) {
      return NextResponse.json({ error: 'Convite invalido.' }, { status: 400 });
    }

    if (action === 'decline' || action === 'cancel') {
      const { error } = await supabaseGame
        .from('room_invites')
        .update({ status: action === 'cancel' ? 'cancelled' : 'declined', updated_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq(action === 'cancel' ? 'sender_profile_id' : 'receiver_profile_id', userId)
        .eq(action === 'cancel' ? 'receiver_profile_id' : 'sender_profile_id', targetId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await supabaseGame
      .from('room_invites')
      .upsert({
        room_id: roomId,
        sender_profile_id: userId,
        receiver_profile_id: targetId,
        status: 'pending',
        message: String(body.message || '').slice(0, 240),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id,sender_profile_id,receiver_profile_id' })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, invite: data });
  } catch (error: any) {
    console.error('Room invite action error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel enviar convite.' }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
