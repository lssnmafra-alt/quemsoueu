import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';
import { advanceTurn, finishOrAdvance } from './gameProgress';

export async function playBotTurn(
  roomId: string,
  options: { expectedTurnNumber?: number | null; expectedPlayerId?: string } = {}
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
  const liveCharacterIds = [...new Set(livePlayerCards.map((card: any) => card.character_id))];

  if (liveCharacterIds.length === 0 || chars.length === 0) {
    const result = await finishOrAdvance(room);
    return { ok: true, skipped: true, reason: 'no-live-cards', ...result };
  }

  let targetChar = null;
  let botComment = '';

  try {
    const { getGroqClient } = await import('./groq');
    const groq = getGroqClient();
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY') {
      const liveCharsForBot = chars.filter((c: any) => liveCharacterIds.includes(c.id));
      const liveCharsNames = liveCharsForBot.map((c: any) => c.name);

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Você é um jogador bot tático, audacioso e divertido jogando uma partida de adivinhação chamada Quem Sou Eu.\nVocê precisa analisar a lista de personagens vivos e selecionar UM personagem dessa lista para adivinhar/votar.\nSua resposta deve ser estritamente em formato JSON válido com as chaves:\n{\n  "selectedCharacterName": "nome exato do personagem da lista",\n  "comment": "um comentário curtíssimo, irônico ou carismático em português brasileiro sobre esse palpite"\n}'
          },
          {
            role: 'user',
            content: `Seu nome de bot: ${activePlayer.nickname}.\nPersonagens ainda vivos na mesa (escolha apenas um desta lista): ${liveCharsNames.join(', ')}.`
          }
        ],
        temperature: 0.8,
      });

      const contentText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(contentText);
      const chosenName = parsed.selectedCharacterName;
      botComment = parsed.comment;

      if (chosenName) {
        targetChar = chars.find((char: any) => 
          liveCharacterIds.includes(char.id) && 
          char.name.toLowerCase() === chosenName.toLowerCase()
        );
        if (!targetChar) {
          targetChar = chars.find((char: any) => 
            liveCharacterIds.includes(char.id) && 
            (char.name.toLowerCase().includes(chosenName.toLowerCase()) || chosenName.toLowerCase().includes(char.name.toLowerCase()))
          );
        }
      }
    }
  } catch (error) {
    console.error('Groq bot turn error:', error);
  }

  if (!targetChar) {
    const randomCharacterId = liveCharacterIds[Math.floor(Math.random() * liveCharacterIds.length)];
    targetChar = chars.find((char: any) => char.id === randomCharacterId);
  }

  if (!targetChar) {
    await advanceTurn(room);
    return { ok: true, skipped: true, reason: 'no-target' };
  }

  if (botComment) {
    try {
      await supabaseGame.from('messages').insert({
        room_id: room.id,
        sender_name: activePlayer.nickname,
        sender_id: activePlayer.user_id || activePlayer.id,
        content: botComment,
      });
    } catch (e) {
      console.error('Failed to insert bot comment into messages:', e);
    }
  }

  await supabaseGame.from('room_players').update({ missed_turns: 0 }).eq('id', activePlayer.id);

  const hits = livePlayerCards.filter((card: any) => card.character_id === targetChar.id);
  const hitPlayers = [];

  for (const hit of hits) {
    await supabaseGame.from('player_cards').update({ is_dead: true }).eq('id', hit.id);
    const targetPlayer: any = playersById.get(hit.player_id);
    if (targetPlayer) {
      const newLives = Math.max(0, (targetPlayer.lives || 0) - 1);
      const updatedPlayer = { ...targetPlayer, lives: newLives, is_eliminated: newLives <= 0 };
      hitPlayers.push(updatedPlayer);
      await supabaseGame
        .from('room_players')
        .update({ lives: newLives, is_eliminated: newLives <= 0 })
        .eq('id', targetPlayer.id);
    }
  }

  await touchRoomActivity(room.id);
  const result = await finishOrAdvance(room, hitPlayers);
  return {
    ok: true,
    target: targetChar.name,
    hits: hits.length,
    hitPlayerIds: hits.map((hit: any) => hit.player_id),
    ...result,
  };
}
