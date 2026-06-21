import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isProjectAdmin } from '@/lib/admin';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';

  if (!isProjectAdmin(userId)) {
    return NextResponse.json({ error: 'Acesso de ADM necessario.' }, { status: 403 });
  }

  if (!roomId) {
    return NextResponse.json({ error: 'Sala obrigatoria.' }, { status: 400 });
  }

  const steps = [
    () => supabaseGame.from('match_events').delete().eq('room_id', roomId),
    () => supabaseGame.from('messages').delete().eq('room_id', roomId),
    () => supabaseGame.from('player_cards').delete().eq('room_id', roomId),
    () => supabaseGame.from('room_players').delete().eq('room_id', roomId),
    () => supabaseGame.from('rooms').delete().eq('id', roomId),
  ];

  for (const step of steps) {
    const { error } = await step();
    if (error) {
      return NextResponse.json({ error: error.message || 'Nao foi possivel excluir a sala.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, roomId });
}
