import { supabaseGame } from './supabase';

function getHitPlayerIdsFromEvent(event: any) {
  const ids = event?.metadata?.hit_player_ids;
  return Array.isArray(ids) ? ids.filter((id: unknown) => typeof id === 'string') : [];
}

async function markEventDamageApplied(event: any, extra: Record<string, any> = {}) {
  if (!event?.id) return;
  const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
  try {
    await supabaseGame
      .from('match_events')
      .update({ metadata: { ...metadata, damage_pending: false, damage_applied: true, damage_applied_at: new Date().toISOString(), ...extra } })
      .eq('id', event.id);
  } catch (error) {
    console.warn('match_events damage_applied skipped:', error);
  }
}

async function latestVoteEvent(room: any) {
  const { data } = await supabaseGame
    .from('match_events')
    .select('id,event_type,character_id,metadata')
    .eq('room_id', room.id)
    .eq('turn_number', room.current_turn_number || 0)
    .in('event_type', ['vote_hit', 'vote_miss'])
    .order('created_at', { ascending: false })
    .limit(1);

  return data?.[0] || null;
}

export async function applyVoteDamage(room: any) {
  const event = await latestVoteEvent(room);
  if (!event) return { applied: false, reason: 'no-vote-event' };

  const metadata = event.metadata || {};
  if (metadata.damage_applied === true) {
    return { applied: false, reason: 'damage-already-applied', eventId: event.id };
  }

  if (event.event_type !== 'vote_hit') {
    await markEventDamageApplied(event, { damage_reason: 'vote-miss-no-damage' });
    return { applied: false, reason: 'vote-miss', eventId: event.id };
  }

  const hitPlayerIds = getHitPlayerIdsFromEvent(event);
  if (!event.character_id || hitPlayerIds.length === 0) {
    await markEventDamageApplied(event, { damage_reason: 'missing-hit-targets' });
    return { applied: false, reason: 'missing-hit-targets', eventId: event.id };
  }

  const { data: hitCards } = await supabaseGame
    .from('player_cards')
    .select('id,player_id')
    .eq('room_id', room.id)
    .eq('character_id', event.character_id)
    .eq('is_dead', false)
    .in('player_id', hitPlayerIds);

  const cards = hitCards || [];

  if (cards.length > 0) {
    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .in('id', cards.map((card: any) => card.id));
  }

  const { data: remainingLiveCards } = await supabaseGame
    .from('player_cards')
    .select('player_id')
    .eq('room_id', room.id)
    .eq('is_dead', false)
    .in('player_id', hitPlayerIds);

  const liveCountByPlayer = new Map<string, number>();
  for (const card of remainingLiveCards || []) {
    liveCountByPlayer.set(card.player_id, (liveCountByPlayer.get(card.player_id) || 0) + 1);
  }

  const { data: players } = await supabaseGame
    .from('room_players')
    .select('id,is_eliminated')
    .in('id', hitPlayerIds);

  for (const player of players || []) {
    if (player.is_eliminated) continue;
    const lives = Math.max(0, liveCountByPlayer.get(player.id) || 0);
    await supabaseGame
      .from('room_players')
      .update({ lives, is_eliminated: lives <= 0 })
      .eq('id', player.id);
  }

  await markEventDamageApplied(event, {
    damage_reason: cards.length > 0 ? 'cards-marked-dead' : 'no-live-cards-left-for-hit',
    damaged_card_ids: cards.map((card: any) => card.id),
    hit_player_ids: hitPlayerIds,
  });

  return {
    applied: cards.length > 0,
    eventId: event.id,
    damagedCards: cards.length,
    hitPlayerIds,
  };
}
