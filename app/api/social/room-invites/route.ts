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
    const inviteId = req.nextUrl.searchParams.get('inviteId')?.trim() || req.nextUrl.searchParams.get('id')?.trim() || '';
    const userId = req.nextUrl.searchParams.get('userId')?.trim() || '';
    const roomId = req.nextUrl.searchParams.get('roomId')?.trim() || '';
    if (!isUuid(inviteId) && !isUuid(userId) && !isUuid(roomId)) return NextResponse.json({ invites: [], invite: null, error: 'Usuario, convite ou sala invalida.' }, { status: 400 });

    if (isUuid(inviteId)) {
      const invite = await readInvite(inviteId);
      return NextResponse.json({ invite, invites: invite ? [invite] : [] });
    }

    let query = supabaseGame.from('room_invites').select(INVITE_SELECT).order('created_at', { ascending: false }).limit(50);
    if (isUuid(userId)) query = query.eq('receiver_profile_id', userId).neq('sender_profile_id', userId).eq('status', 'pending');
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
    const inviteId = String(body.inviteId || body.id || '').trim();
    const userId = String(body.userId || body.senderId || '').trim();
    const targetId = String(body.targetId || body.receiverId || '').trim();
    const roomId = String(body.roomId || '').trim();
    const action = String(body.action || 'invite').trim();

    if (action === 'accept') {
      if (!isUuid(userId) || !isUuid(inviteId)) {
        return NextResponse.json({ error: 'Convite invalido.' }, { status: 400 });
      }

      const invite = await readInvite(inviteId);
      if (!invite) return NextResponse.json({ error: 'Convite nao encontrado.' }, { status: 404 });
      if (invite.receiver_profile_id !== invite.sender_profile_id && invite.receiver_profile_id !== userId) {
        return NextResponse.json({ error: 'Este convite pertence a outro jogador.' }, { status: 403 });
      }
      if (invite.status === 'cancelled' || invite.status === 'declined') {
        return NextResponse.json({ error: 'Esse convite nao esta mais disponivel.', invite }, { status: 409 });
      }
      if (!invite.room?.id) return NextResponse.json({ error: 'Sala nao encontrada.', invite }, { status: 404 });
      if (invite.room?.status && invite.room.status !== 'LOBBY') {
        return NextResponse.json({ error: 'Essa sala nao aceita novos jogadores no momento.', invite }, { status: 409 });
      }

      if (invite.status !== 'accepted') {
        const { error } = await supabaseGame
          .from('room_invites')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', inviteId);
        if (error) throw error;
      }

      await ensureInviteFriendRequest(invite.sender_profile_id, userId);
      const acceptedInvite = await readInvite(inviteId);
      return NextResponse.json({ ok: true, invite: acceptedInvite || invite, roomId: invite.room_id });
    }

    if (!isUuid(userId) || !isUuid(roomId) || (!isUuid(targetId) && action !== 'link')) {
      return NextResponse.json({ error: 'Convite invalido.' }, { status: 400 });
    }

    if (action === 'decline' || action === 'cancel') {
      if (isUuid(inviteId)) {
        const { error } = await supabaseGame
          .from('room_invites')
          .update({ status: action === 'cancel' ? 'cancelled' : 'declined', updated_at: new Date().toISOString() })
          .eq('id', inviteId);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      const { error } = await supabaseGame
        .from('room_invites')
        .update({ status: action === 'cancel' ? 'cancelled' : 'declined', updated_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq(action === 'cancel' ? 'sender_profile_id' : 'receiver_profile_id', userId)
        .eq(action === 'cancel' ? 'receiver_profile_id' : 'sender_profile_id', targetId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const receiverId = action === 'link' ? userId : targetId;

    const { data, error } = await supabaseGame
      .from('room_invites')
      .upsert({
        room_id: roomId,
        sender_profile_id: userId,
        receiver_profile_id: receiverId,
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

async function readInvite(inviteId: string): Promise<any> {
  const { data, error } = await supabaseGame.from('room_invites').select(INVITE_SELECT).eq('id', inviteId).maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureInviteFriendRequest(senderId: string, visitorId: string) {
  if (!isUuid(senderId) || !isUuid(visitorId) || senderId === visitorId) return;

  const { data: existing, error: existingError } = await supabaseGame
    .from('friendships')
    .select('id,status')
    .or(`and(requester_profile_id.eq.${senderId},receiver_profile_id.eq.${visitorId}),and(requester_profile_id.eq.${visitorId},receiver_profile_id.eq.${senderId})`)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const { error } = await supabaseGame
    .from('friendships')
    .insert({ requester_profile_id: senderId, receiver_profile_id: visitorId, status: 'pending' });
  if (error) throw error;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
