'use server';

async function getBots(roomId: string) {
  const { supabaseGame } = await import('@/lib/supabase');
  const { data } = await supabaseGame
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_bot', true);

  return data || [];
}

async function insertBotMessage(roomId: string, bot: any, content: string) {
  const { supabaseGame } = await import('@/lib/supabase');
  await supabaseGame.from('messages').insert({
    room_id: roomId,
    sender_name: bot.nickname,
    sender_id: bot.user_id || bot.id,
    content,
  });
}

function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY');
}

function pickBotForMessage(bots: any[], message: string) {
  const normalized = message.toLowerCase();
  const mentioned = bots.filter((bot: any) => {
    const name = String(bot.nickname || '').toLowerCase();
    return name && normalized.includes(name);
  });

  if (mentioned.length > 0) return mentioned[Math.floor(Math.random() * mentioned.length)];
  if (normalized.includes('@bot') || normalized.includes('bot')) return bots[Math.floor(Math.random() * bots.length)];
  if (Math.random() < 0.2) return bots[Math.floor(Math.random() * bots.length)];
  return null;
}

export async function triggerBotResponse(roomId: string, lastMessage: string, senderName: string) {
  const bots = await getBots(roomId);
  if (bots.length === 0 || !lastMessage.trim()) return;

  const bot = pickBotForMessage(bots, lastMessage);
  if (!bot) return;

  let content = '';

  if (hasGroqKey()) {
    try {
      const { getGroqClient } = await import('@/lib/groq');
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Voce e ${bot.nickname}, um jogador carismatico em uma partida de "Quem Sou Eu?". Um jogador chamado ${senderName} acabou de enviar uma mensagem no chat. Responda em portugues brasileiro, em no maximo 1 frase curta. Nao diga que e IA, robo ou bot.`,
          },
          { role: 'user', content: lastMessage },
        ],
        temperature: 0.8,
      });
      content = completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Groq triggerBotResponse error:', error);
    }
  }

  if (!content) {
    const replies = [
      `${senderName}, anotei isso. Vou observar a mesa.`,
      `Boa pista, ${senderName}. Agora ficou interessante.`,
      'Entendido. Vou jogar com calma nessa rodada.',
      'Essa informacao pode mudar meu palpite.',
      'Estou analisando as cartas restantes.',
      'Vou guardar essa fala para o proximo voto.',
    ];
    content = replies[Math.floor(Math.random() * replies.length)];
  }

  await insertBotMessage(roomId, bot, content.slice(0, 200));
}

export async function triggerBotLobbyMessage(roomId: string) {
  const bots = await getBots(roomId);
  if (bots.length === 0) return;

  const bot = bots[Math.floor(Math.random() * bots.length)];
  const lines = [
    'Estou pronto para a partida.',
    'Escolham um deck bom. Quero ver esse jogo rodar.',
    'Quando iniciar, eu escolho minhas cartas sozinho.',
    'Vou jogar serio, sem travar a sala.',
  ];

  await insertBotMessage(roomId, bot, lines[Math.floor(Math.random() * lines.length)]);
}

export async function triggerBotPickingMessage(roomId: string, botId?: string) {
  const bots = await getBots(roomId);
  if (bots.length === 0) return;

  const bot = botId ? bots.find((item: any) => item.id === botId) : bots[Math.floor(Math.random() * bots.length)];
  if (!bot) return;

  const lines = [
    'Minhas cartas estao escolhidas.',
    'Fechei meu baralho. Agora e suspense.',
    'Cartas prontas por aqui.',
    'Ja escolhi. Vou aguardar a ordem dos turnos.',
  ];

  await insertBotMessage(roomId, bot, lines[Math.floor(Math.random() * lines.length)]);
}

export async function triggerBotTurnMessage(roomId: string, targetCharName: string, botId: string) {
  const bots = await getBots(roomId);
  const bot = bots.find((item: any) => item.id === botId);
  if (!bot) return;

  const lines = [
    `Meu palpite e ${targetCharName}.`,
    `Vou arriscar em ${targetCharName}.`,
    `A mesa esta apontando para ${targetCharName}.`,
    `Hora de testar ${targetCharName}.`,
    `Se eu estiver certo, ${targetCharName} cai agora.`,
  ];

  await insertBotMessage(roomId, bot, lines[Math.floor(Math.random() * lines.length)]);
}

export async function triggerBotResultMessage(roomId: string, botId: string, didHit: boolean, targetCharName: string) {
  const bots = await getBots(roomId);
  const bot = bots.find((item: any) => item.id === botId);
  if (!bot) return;

  const hitLines = [
    `Boa. ${targetCharName} estava na mesa.`,
    'Funcionou. Vou recalcular os proximos palpites.',
    'Acertei essa. Agora a mesa mudou.',
  ];
  const missLines = [
    `Nada de ${targetCharName}. Vou mudar a leitura.`,
    'Errei essa. Ainda tem pista escondida.',
    'Palpite ruim. Vou observar melhor.',
  ];
  const lines = didHit ? hitLines : missLines;

  await insertBotMessage(roomId, bot, lines[Math.floor(Math.random() * lines.length)]);
}
