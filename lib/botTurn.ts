import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';
import { advanceTurn, finishOrAdvance } from './gameProgress';

type GroqTurnStatus = {
  configured: boolean;
  attempted: boolean;
  responded: boolean;
  parsed: boolean;
  selectedBy: 'groq' | 'fallback' | null;
  fallbackReason: string | null;
};

async function logMatchEvents(events: any[]) {
  const rows = events.filter(Boolean).map((event) => ({
    room_id: event.roomId,
    turn_number: event.turnNumber,
    event_type: event.eventType,
    actor_player_id: event.actorPlayerId || null,
    target_player_id: event.targetPlayerId || null,
    character_id: event.characterId || null,
    message: event.message || null,
    metadata: event.metadata || {},
  }));

  if (rows.length === 0) return;

  try {
    const { error } = await supabaseGame.from('match_events').insert(rows);
    if (error) console.warn('match_events skipped:', error.message);
  } catch (error) {
    console.warn('match_events failed:', error);
  }
}

export async function playBotTurn(
  roomId: string,
  options: { expectedTurnNumber?: number | null; expectedPlayerId?: string } = {},
) {
  const expectedTurnNumber = Number.isInteger(options.expectedTurnNumber) ? options.expectedTurnNumber : null;
  const expectedPlayerId = options.expectedPlayerId || '';

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room || room.status !== 'PLAYING') {
    return { ok: false, reason: 'room-not-playing' };
  }

  if (expectedTurnNumber !== null && room.current_turn_number !== expectedTurnNumber) {
    return { ok: false, reason: 'stale-turn' };
  }

  const orderedPlayers = [...(players || [])].sort((a: any, b: any) => (a.play_order || 0) - (b.play_order || 0));
  const activePlayers = orderedPlayers.filter((player: any) => !player.is_eliminated && player.lives > 0);
  const activePlayer = activePlayers.length > 0
    ? activePlayers[(room.current_turn_number || 0) % activePlayers.length]
    : null;

  if (!activePlayer) {
    await supabaseGame.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id);
    await touchRoomActivity(room.id);
    return { ok: true, finished: true, reason: 'no-active-player' };
  }

  if (expectedPlayerId && activePlayer.id !== expectedPlayerId) {
    return { ok: false, reason: 'stale-player' };
  }

  if (!activePlayer.is_bot) {
    return { ok: false, reason: 'active-player-is-human' };
  }

  const originalExpiresAt = room.turn_expires_at || null;
  let lockQuery = supabaseGame
    .from('rooms')
    .update({ turn_expires_at: new Date(Date.now() + 20_000).toISOString() })
    .eq('id', room.id)
    .eq('status', 'PLAYING')
    .eq('current_turn_number', room.current_turn_number || 0);

  lockQuery = originalExpiresAt ? lockQuery.eq('turn_expires_at', originalExpiresAt) : lockQuery.is('turn_expires_at', null);

  const { data: lockRows, error: lockError } = await lockQuery.select('id').limit(1);

  if (lockError) throw lockError;
  if (!lockRows || lockRows.length === 0) {
    return { ok: false, reason: 'bot-turn-already-handled' };
  }

  const [{ data: deckChars }, { data: liveCards }] = await Promise.all([
    room.deck_id
      ? supabaseGame.from('characters').select('*').eq('deck_id', room.deck_id)
      : supabaseGame.from('characters').select('*').is('deck_id', null),
    supabaseGame
      .from('player_cards')
      .select('id,player_id,character_id,is_dead')
      .eq('room_id', room.id)
      .eq('is_dead', false),
  ]);

  const chars = deckChars || [];
  const cards = liveCards || [];
  const activePlayerIds = new Set(activePlayers.map((player: any) => player.id));
  const playersById = new Map((players || []).map((player: any) => [player.id, player]));
  const livePlayerCards = cards.filter((card: any) => activePlayerIds.has(card.player_id));
  const targetablePlayerCards = livePlayerCards.filter((card: any) => card.player_id !== activePlayer.id);
  const liveCharacterIds = [...new Set(targetablePlayerCards.map((card: any) => card.character_id))] as string[];

  if (liveCharacterIds.length === 0 || chars.length === 0) {
    const result = await advanceTurn(room);
    await logMatchEvents([{
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'bot_skip',
      actorPlayerId: activePlayer.id,
      message: `${activePlayer.nickname} nao tinha alvo valido para votar.`,
      metadata: { reason: 'no-valid-bot-target' },
    }]);
    return { ok: true, skipped: true, reason: 'no-valid-bot-target', ...result };
  }

  let targetChar: any = null;
  let botComment = '';
  const groqStatus: GroqTurnStatus = {
    configured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY'),
    attempted: false,
    responded: false,
    parsed: false,
    selectedBy: null,
    fallbackReason: null,
  };

  if (groqStatus.configured) {
    try {
      const { getGroqClient } = await import('./groq');
      const groq = getGroqClient();
      groqStatus.attempted = true;

      const liveCharsForBot = chars.filter((char: any) => liveCharacterIds.includes(char.id));
      const liveCharsNames = liveCharsForBot.map((char: any) => char.name);

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Voce e um jogador tatico, audacioso e divertido em uma partida de adivinhacao chamada Quem Sou Eu. Nao diga que e IA, robo ou bot.\nAnalise a lista de personagens vivos e selecione UM personagem dessa lista para adivinhar/votar.\nSua resposta deve ser estritamente em JSON valido com as chaves:\n{\n  "selectedCharacterName": "nome exato do personagem da lista",\n  "comment": "um comentario curtissimo, ironico ou carismatico em portugues brasileiro sobre esse palpite"\n}',
          },
          {
            role: 'user',
            content: `Seu nome na mesa: ${activePlayer.nickname}.\nPersonagens ainda vivos na mesa (escolha apenas um desta lista): ${liveCharsNames.join(', ')}.`,
          },
        ],
        temperature: 0.8,
      });

      const contentText = completion.choices[0]?.message?.content || '{}';
      groqStatus.responded = Boolean(contentText && contentText !== '{}');
      const parsed = JSON.parse(contentText);
      groqStatus.parsed = true;

      const chosenName = typeof parsed.selectedCharacterName === 'string' ? parsed.selectedCharacterName : '';
      botComment = typeof parsed.comment === 'string' ? parsed.comment.slice(0, 160) : '';

      if (chosenName) {
        targetChar = chars.find((char: any) =>
          liveCharacterIds.includes(char.id) &&
          char.name.toLowerCase() === chosenName.toLowerCase()
        );

        if (!targetChar) {
          targetChar = chars.find((char: any) =>
            liveCharacterIds.includes(char.id) &&
            (char.name.toLowerCase().includes(chosenName.toLowerCase()) ||
              chosenName.toLowerCase().includes(char.name.toLowerCase()))
          );
        }
      }

      if (targetChar) {
        groqStatus.selectedBy = 'groq';
      } else {
        groqStatus.fallbackReason = 'groq-selected-character-not-found';
      }
    } catch (error) {
      groqStatus.fallbackReason = error instanceof SyntaxError ? 'groq-json-parse-error' : 'groq-request-error';
      console.error('Groq bot turn error:', error);
    }
  } else {
    groqStatus.fallbackReason = 'missing-groq-api-key';
  }

  if (!targetChar) {
    const randomCharacterId = liveCharacterIds[Math.floor(Math.random() * liveCharacterIds.length)];
    targetChar = chars.find((char: any) => char.id === randomCharacterId);
    groqStatus.selectedBy = 'fallback';
    groqStatus.fallbackReason = groqStatus.fallbackReason || 'no-groq-target';
  }

  if (!targetChar) {
    await advanceTurn(room);
    await logMatchEvents([{
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'bot_skip',
      actorPlayerId: activePlayer.id,
      message: `${activePlayer.nickname} nao encontrou alvo para votar.`,
      metadata: { reason: 'no-target', groq: groqStatus },
    }]);
    return { ok: true, skipped: true, reason: 'no-target', groq: groqStatus };
  }

  if (botComment) {
    try {
      await supabaseGame.from('messages').insert({
        room_id: room.id,
        sender_name: activePlayer.nickname,
        sender_id: activePlayer.user_id || activePlayer.id,
        content: botComment,
      });
    } catch (error) {
      console.error('Failed to insert bot comment into messages:', error);
    }
  }

  await supabaseGame.from('room_players').update({ missed_turns: 0 }).eq('id', activePlayer.id);

  const hits = livePlayerCards.filter((card: any) => card.character_id === targetChar.id);
  const hitPlayers = [];
  const eliminatedPlayers: any[] = [];

  if (hits.length > 0) {
    await supabaseGame
      .from('player_cards')
      .update({ is_dead: true })
      .in('id', hits.map((hit: any) => hit.id));
  }

  const hitCountByPlayer = new Map<string, number>();
  for (const hit of hits) {
    hitCountByPlayer.set(hit.player_id, (hitCountByPlayer.get(hit.player_id) || 0) + 1);
  }

  for (const [playerId, hitCount] of hitCountByPlayer.entries()) {
    const targetPlayer: any = playersById.get(playerId);
    if (!targetPlayer) continue;
    const previousLives = targetPlayer.lives || 0;
    const newLives = Math.max(0, previousLives - hitCount);
    const updatedPlayer = { ...targetPlayer, lives: newLives, is_eliminated: newLives <= 0 };
    hitPlayers.push(updatedPlayer);
    if (previousLives > 0 && newLives <= 0) eliminatedPlayers.push(updatedPlayer);
    await supabaseGame
      .from('room_players')
      .update({ lives: newLives, is_eliminated: newLives <= 0 })
      .eq('id', targetPlayer.id);
  }

  await touchRoomActivity(room.id);
  const result = await finishOrAdvance(room, hitPlayers);
  const hitPlayerIds = [...new Set(hits.map((hit: any) => hit.player_id))];

  await logMatchEvents([
    {
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: hits.length > 0 ? 'vote_hit' : 'vote_miss',
      actorPlayerId: activePlayer.id,
      characterId: targetChar.id,
      message: hits.length > 0
        ? `${activePlayer.nickname} acertou ${targetChar.name}.`
        : `${activePlayer.nickname} errou ${targetChar.name}.`,
      metadata: {
        source: 'bot',
        target_name: targetChar.name,
        hit_count: hits.length,
        hit_player_ids: hitPlayerIds,
        groq: groqStatus,
      },
    },
    ...eliminatedPlayers.map((player: any) => ({
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'player_eliminated',
      actorPlayerId: activePlayer.id,
      targetPlayerId: player.id,
      characterId: targetChar.id,
      message: `${activePlayer.nickname} eliminou ${player.nickname} com ${targetChar.name}.`,
      metadata: {
        source: 'bot',
        target_name: targetChar.name,
        eliminated_player_name: player.nickname,
      },
    })),
    result?.finished ? {
      roomId: room.id,
      turnNumber: room.current_turn_number || 0,
      eventType: 'room_finished',
      message: result.winner ? `Partida encerrada. Campeao: ${result.winner}.` : 'Partida encerrada em empate.',
      metadata: { winner: result.winner || null, reason: result.reason || null },
    } : null,
  ]);

  return {
    ok: true,
    target: targetChar.name,
    hits: hits.length,
    hitPlayerIds,
    hitPlayers,
    groq: groqStatus,
    ...result,
  };
}