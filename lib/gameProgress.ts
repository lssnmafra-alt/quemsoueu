import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';

function resolvePlayerId(player: any) {
  if (typeof player === 'string') return player;
  return player?.id || player?.player_id || '';
}

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sameTurnFilter(query: any, room: any) {
  return query
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0);
}

async function finishRoom(room: any) {
  await sameTurnFilter(supabaseGame.from('rooms').update({ status: 'FINISHED' }), room);
  await touchRoomActivity(room.id);
}

function nextNumberForIndex(currentTurn: number, activeLength: number, desiredIndex: number) {
  if (activeLength <= 0) return currentTurn + 1;
  let next = currentTurn + 1;
  while (next % activeLength !== desiredIndex) next += 1;
  return next;
}

async function resolveNextTurnNumber(room: any) {
  const currentTurn = room.current_turn_number || 0;
  const { data: players } = await supabaseGame
    .from('room_players')
    .select('id,play_order,is_eliminated,lives')
    .eq('room_id', room.id);

  const activePlayers = [...(players || [])]
    .filter((player: any) => !player.is_eliminated && (player.lives || 0) > 0)
    .sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));

  if (activePlayers.length <= 1) return currentTurn + 1;

  const { data: events } = await supabaseGame
    .from('match_events')
    .select('actor_player_id')
    .eq('room_id', room.id)
    .eq('turn_number', currentTurn)
    .not('actor_player_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const actorId = events?.[0]?.actor_player_id;
  const actor = actorId ? (players || []).find((player: any) => player.id === actorId) : null;

  if (!actor) return currentTurn + 1;

  const actorOrder = actor.play_order || 0;
  const nextPlayer = activePlayers.find((player: any) => (player.play_order || 0) > actorOrder) || activePlayers[0];
  const desiredIndex = activePlayers.findIndex((player: any) => player.id === nextPlayer.id);
  return nextNumberForIndex(currentTurn, activePlayers.length, desiredIndex >= 0 ? desiredIndex : 0);
}

export async function advanceTurn(room: any) {
  const nextTurnNumber = await resolveNextTurnNumber(room);

  await sameTurnFilter(
    supabaseGame
      .from('rooms')
      .update({
        current_turn_number: nextTurnNumber,
        turn_expires_at: new Date(Date.now() + (room.vote_time_seconds || 30) * 1000).toISOString(),
      }),
    room,
  );

  await touchRoomActivity(room.id);
}

export async function syncLivesFromLiveCards(roomId: string) {
  const [{ data: players }, { data: liveCards }] = await Promise.all([
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
    supabaseGame.from('player_cards').select('*').eq('room_id', roomId).eq('is_dead', false),
  ]);

  const liveCounts = new Map<string, number>();
  for (const card of liveCards || []) {
    liveCounts.set(card.player_id, (liveCounts.get(card.player_id) || 0) + 1);
  }

  const eliminatedPlayerIds = new Set<string>();

  for (const player of players || []) {
    const wasAlreadyEliminated = Boolean(player.is_eliminated);

    if (wasAlreadyEliminated && (liveCounts.get(player.id) || 0) > 0) {
      await supabaseGame
        .from('player_cards')
        .update({ is_dead: true })
        .eq('room_id', roomId)
        .eq('player_id', player.id)
        .eq('is_dead', false);
      liveCounts.set(player.id, 0);
      eliminatedPlayerIds.add(player.id);
    }

    const lives = wasAlreadyEliminated ? 0 : liveCounts.get(player.id) || 0;
    const isEliminated = wasAlreadyEliminated || lives <= 0;

    if ((player.lives || 0) !== lives || Boolean(player.is_eliminated) !== isEliminated) {
      await supabaseGame.from('room_players').update({ lives, is_eliminated: isEliminated }).eq('id', player.id);
    }
  }

  return {
    players: players || [],
    liveCards: (liveCards || []).filter((card: any) => !eliminatedPlayerIds.has(card.player_id)),
    liveCounts,
  };
}

async function logTiebreakStarted(room: any, playerIds: string[], reason: string) {
  try {
    await supabaseGame.from('match_events').insert({
      room_id: room.id,
      turn_number: room.current_turn_number || 0,
      event_type: 'tiebreak_started',
      metadata: { player_ids: playerIds, reason, sudden_death: true },
    });
  } catch (error) {
    console.warn('match_events tiebreak_started skipped:', error);
  }
}

async function startTiebreakPicking(room: any, tiebreakPlayers: any[], reason = 'tiebreak') {
  const playersToPick = tiebreakPlayers.filter(Boolean);
  const tiebreakPlayerIds = uniqueIds(playersToPick.map((player: any) => player.id));

  if (tiebreakPlayerIds.length === 0) {
    await advanceTurn(room);
    return { finished: false, reason: 'no-tiebreak-players-advanced' };
  }

  await logTiebreakStarted(room, tiebreakPlayerIds, reason);

  await supabaseGame.from('player_cards').update({ is_dead: true }).eq('room_id', room.id).in('player_id', tiebreakPlayerIds).eq('is_dead', false);
  await supabaseGame.from('room_players').update({ lives: 1, is_eliminated: false, missed_turns: 0 }).in('id', tiebreakPlayerIds);

  await sameTurnFilter(
    supabaseGame.from('rooms').update({
      status: 'PICKING',
      turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
    }),
    room,
  );

  await touchRoomActivity(room.id);

  return { finished: false, tiebreak: true, suddenDeath: true, needsPicking: true, tiebreakPlayerIds, reason };
}

function liveCardsByOwner(liveCards: any[]) {
  const ownerIds = new Set<string>();
  const map = new Map<string, any[]>();
  for (const card of liveCards || []) {
    if (!card.player_id) continue;
    ownerIds.add(card.player_id);
    const list = map.get(card.player_id) || [];
    list.push(card);
    map.set(card.player_id, list);
  }
  return { ownerIds, map };
}

function playersFromIds(ids: Iterable<string>, playersById: Map<string, any>) {
  return [...ids].map((id) => playersById.get(id) || { id }).filter(Boolean);
}

export async function finishOrAdvance(room: any, tiebreakPlayers: any[] = []) {
  const { players, liveCards, liveCounts } = await syncLivesFromLiveCards(room.id);
  const playersById = new Map((players || []).map((player: any) => [player.id, player]));
  const alive = (players || []).filter((player: any) => !player.is_eliminated && (liveCounts.get(player.id) || 0) > 0);
  const aliveIds = new Set(alive.map((player: any) => player.id));
  const liveCardsFromAlive = (liveCards || []).filter((card: any) => aliveIds.has(card.player_id));
  const { ownerIds } = liveCardsByOwner(liveCardsFromAlive);
  const distinctLiveCharacters = new Set((liveCardsFromAlive || []).map((card: any) => card.character_id));

  // CAMPEÃO: única hipótese de campeão direto é existir um único dono de todas as cartas vivas.
  // Ex.: restam 3 cartas e as 3 pertencem ao mesmo jogador, mesmo que ainda existam vários jogadores na sala.
  // Também cobre desistência/abandono: se a saída do adversário deixa um único dono de cartas vivas, esse dono vence.
  if (ownerIds.size === 1) {
    const winnerId = [...ownerIds][0];
    const winner: any = playersById.get(winnerId);
    if (winner) {
      await finishRoom(room);
      return { finished: true, winner: winner.nickname || null, winnerId, reason: 'champion-sole-live-card-owner' };
    }
  }

  // Sem dono de carta viva: não declara campeão por chute. Vai para desempate/morte súbita entre envolvidos.
  if (ownerIds.size === 0 || alive.length === 0 || liveCardsFromAlive.length === 0) {
    const explicitTiebreakIds = uniqueIds(tiebreakPlayers.map(resolvePlayerId));
    const fallbackTiebreakIds = (players || []).filter((player: any) => !player.is_eliminated).map((player: any) => player.id);
    const tiebreakIds = explicitTiebreakIds.length > 0 ? explicitTiebreakIds : fallbackTiebreakIds;
    return startTiebreakPicking(room, playersFromIds(uniqueIds(tiebreakIds), playersById), 'no-live-card-owner-sudden-death');
  }

  // MORTE SÚBITA: dois ou mais jogadores restantes com a mesma carta viva.
  // Também cobre o caso do desempate em que todos escolheram a mesma carta de novo.
  if (ownerIds.size > 1 && distinctLiveCharacters.size <= 1) {
    return startTiebreakPicking(room, playersFromIds(ownerIds, playersById), 'same-live-card-sudden-death');
  }

  // MORTE SÚBITA: restaram 2 ou 3 jogadores disputando e nenhum deles é dono único de todas as cartas vivas.
  if (ownerIds.size > 1 && alive.length <= 3) {
    return startTiebreakPicking(room, playersFromIds(ownerIds, playersById), 'remaining-players-sudden-death');
  }

  // Caso normal: ainda há 4+ jogadores/donos de cartas vivas. A rodada continua.
  await advanceTurn(room);
  return { finished: false, reason: 'round-continues' };
}
