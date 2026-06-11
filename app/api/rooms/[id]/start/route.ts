import { NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { touchRoomActivity } from '@/lib/roomLifecycle';

async function countPlayableCharacters() {
  const { data: characters } = await supabaseGame
    .from('characters')
    .select('deck_id');

  const counts = new Map<string, number>();
  let officialCount = 0;

  for (const character of characters || []) {
    if (character.deck_id) {
      counts.set(character.deck_id, (counts.get(character.deck_id) || 0) + 1);
    } else {
      officialCount += 1;
    }
  }

  return { counts, officialCount };
}

async function resolveDeckId(requestedDeckId: string | null, room: any) {
  const needed = room.chars_per_player || 3;
  const { counts, officialCount } = await countPlayableCharacters();

  if (requestedDeckId && (counts.get(requestedDeckId) || 0) >= needed) {
    return { deckId: requestedDeckId, source: 'selected' };
  }

  if (room.deck_id && (counts.get(room.deck_id) || 0) >= needed) {
    return { deckId: room.deck_id, source: 'room' };
  }

  const { data: decks } = await supabaseGame
    .from('decks')
    .select('id,is_public,created_at')
    .order('created_at', { ascending: false });

  const publicDeck = (decks || []).find((deck: any) => deck.is_public && (counts.get(deck.id) || 0) >= needed);
  if (publicDeck) return { deckId: publicDeck.id, source: 'public' };

  if (officialCount >= needed) {
    return { deckId: null, source: 'official' };
  }

  const anyDeck = (decks || []).find((deck: any) => (counts.get(deck.id) || 0) >= needed);
  if (anyDeck) return { deckId: anyDeck.id, source: 'any' };

  return { deckId: undefined, source: 'none' };
}

async function syncBots(room: any, players: any[], desiredBots?: number, auto = false) {
  const realPlayers = players.filter((player: any) => !player.is_bot);
  const existingBots = players.filter((player: any) => player.is_bot);
  const botSlots = Math.max(0, (room.max_players || 6) - realPlayers.length);
  const targetBots = typeof desiredBots === 'number'
    ? Math.min(Math.max(0, desiredBots), botSlots)
    : auto
      ? Math.min(Math.max(existingBots.length, 1), botSlots)
      : existingBots.length;

  const botsToRemove = existingBots.slice(targetBots);
  const botsToCreate = Math.max(0, targetBots - existingBots.length);

  if (botsToRemove.length > 0) {
    await supabaseGame.from('room_players').delete().in('id', botsToRemove.map((bot: any) => bot.id));
  }

  for (let i = 0; i < botsToCreate; i++) {
    await supabaseGame.from('room_players').insert({
      room_id: room.id,
      user_id: crypto.randomUUID(),
      nickname: `Bot Arena ${existingBots.length + i + 1}`,
      is_bot: true,
      lives: room.chars_per_player || 3,
    });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const requestedDeckId = typeof body.deckId === 'string' && body.deckId ? body.deckId : null;
  const desiredBots = Number.isInteger(body.desiredBots) ? body.desiredBots : undefined;
  const auto = Boolean(body.auto);

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) {
    return NextResponse.json({ error: 'Sala nao encontrada.' }, { status: 404 });
  }

  if (room.status !== 'LOBBY') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'room-not-in-lobby' });
  }

  const playablePlayers = players || [];
  if (playablePlayers.length === 0) {
    return NextResponse.json({ error: 'A sala precisa ter pelo menos um jogador.' }, { status: 400 });
  }

  const resolved = await resolveDeckId(requestedDeckId, room);
  if (resolved.deckId === undefined) {
    return NextResponse.json({
      error: `Nenhum deck tem pelo menos ${room.chars_per_player || 3} personagens.`,
    }, { status: 400 });
  }

  await syncBots(room, playablePlayers, desiredBots, auto);

  await supabaseGame.from('rooms').update({
    status: 'PICKING',
    deck_id: resolved.deckId,
    turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
  }).eq('id', room.id);

  await touchRoomActivity(room.id);
  return NextResponse.json({ ok: true, deckId: resolved.deckId, source: resolved.source });
}
