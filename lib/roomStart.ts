import { supabaseGame } from './supabase';
import { touchRoomActivity } from './roomLifecycle';
import { getBotAvatarPool, pickBotAvatarUrl } from './serverAvatars';

const MIN_PLAYERS_TO_START = 4;

const BOT_NICKNAMES = [
  'jugameplays', 'bruninho67', 'pedrinn', 'rafa_xt', 'gui_zika', 'luluzinha', 'anafps', 'joaovk',
  'ninafps', 'dudazinha', 'vitin7', 'lele_gg', 'xandeplay', 'biazinha', 'thzinn', 'brunao77',
  'jpzin', 'mariii', 'kauanzera', 'lelefps', 'gabsplay', 'nanagame',
];

function shouldRefreshBotNickname(nickname = '') {
  const trimmed = nickname.trim();
  if (!trimmed) return true;
  if (/^bot\s+arena\s*\d*$/i.test(trimmed)) return true;
  if (/^[A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+$/.test(trimmed)) return true;
  return false;
}

function shouldRefreshBotAvatar(avatarUrl = '') {
  const value = String(avatarUrl || '').trim();
  if (!value) return true;
  return value.startsWith('avatar:');
}

function getBotNickname(index: number, usedNicknames = new Set<string>()) {
  for (let attempt = 0; attempt < BOT_NICKNAMES.length * 2; attempt++) {
    const base = BOT_NICKNAMES[(index + attempt) % BOT_NICKNAMES.length];
    const nickname = attempt < BOT_NICKNAMES.length ? base : `${base}${index + 1}`;
    if (!usedNicknames.has(nickname.toLowerCase())) {
      usedNicknames.add(nickname.toLowerCase());
      return nickname;
    }
  }

  const fallback = `player${index + 17}`;
  usedNicknames.add(fallback.toLowerCase());
  return fallback;
}

async function countPlayableCharacters() {
  const { data: characters } = await supabaseGame.from('characters').select('deck_id');
  const counts = new Map<string, number>();
  for (const character of characters || []) {
    if (character.deck_id) counts.set(character.deck_id, (counts.get(character.deck_id) || 0) + 1);
  }
  return counts;
}

async function resolveDeckId(requestedDeckId: string | null, room: any) {
  const cardsPerPlayer = Math.max(1, Number(room.chars_per_player || 3));
  const needed = cardsPerPlayer;
  const counts = await countPlayableCharacters();

  if (requestedDeckId && (counts.get(requestedDeckId) || 0) >= needed) return { deckId: requestedDeckId, source: 'selected', needed, deckCharacters: counts.get(requestedDeckId) || 0 };
  if (room.deck_id && (counts.get(room.deck_id) || 0) >= needed) return { deckId: room.deck_id, source: 'room', needed, deckCharacters: counts.get(room.deck_id) || 0 };

  const { data: decks } = await supabaseGame
    .from('decks')
    .select('id,is_public,created_at')
    .order('created_at', { ascending: false });

  const publicDeck = (decks || []).find((deck: any) => deck.is_public && (counts.get(deck.id) || 0) >= needed);
  if (publicDeck) return { deckId: publicDeck.id, source: 'public', needed, deckCharacters: counts.get(publicDeck.id) || 0 };

  const anyDeck = (decks || []).find((deck: any) => (counts.get(deck.id) || 0) >= needed);
  if (anyDeck) return { deckId: anyDeck.id, source: 'any', needed, deckCharacters: counts.get(anyDeck.id) || 0 };

  return { deckId: undefined, source: 'none', needed, deckCharacters: 0 };
}

async function syncBots(room: any, players: any[], desiredBots?: number, auto = false) {
  const realPlayers = players.filter((player: any) => !player.is_bot);
  const existingBots = players.filter((player: any) => player.is_bot);
  const botSlots = Math.max(0, (room.max_players || 6) - realPlayers.length);
  let targetBots = typeof desiredBots === 'number'
    ? Math.min(Math.max(0, desiredBots), botSlots)
    : auto
      ? Math.min(Math.max(existingBots.length, 1), botSlots)
      : existingBots.length;

  if (realPlayers.length + targetBots < MIN_PLAYERS_TO_START && botSlots > targetBots) {
    targetBots = Math.min(botSlots, MIN_PLAYERS_TO_START - realPlayers.length);
  }

  const botsToKeep = existingBots.slice(0, targetBots);
  const botsToRemove = existingBots.slice(targetBots);
  const botsToCreate = Math.max(0, targetBots - existingBots.length);
  const usedNicknames = new Set<string>(players
    .filter((player: any) => !player.is_bot || !shouldRefreshBotNickname(player.nickname || ''))
    .map((player: any) => String(player.nickname || '').toLowerCase())
    .filter(Boolean));
  const avatarPool = await getBotAvatarPool();
  let botsRenamed = 0;
  let botsAvatarUpdated = 0;

  if (botsToRemove.length > 0) await supabaseGame.from('room_players').delete().in('id', botsToRemove.map((bot: any) => bot.id));

  for (let i = 0; i < botsToKeep.length; i++) {
    const bot = botsToKeep[i];
    const updates: Record<string, any> = {};

    if (shouldRefreshBotNickname(bot.nickname || '')) {
      updates.nickname = getBotNickname(i, usedNicknames);
      botsRenamed += 1;
    } else {
      usedNicknames.add(String(bot.nickname || '').toLowerCase());
    }

    if (shouldRefreshBotAvatar(bot.avatar_url || '')) {
      updates.avatar_url = pickBotAvatarUrl(avatarPool, `${room.id}:${bot.id || bot.user_id || bot.nickname}`, i);
      botsAvatarUpdated += 1;
    }

    if (Object.keys(updates).length > 0) await supabaseGame.from('room_players').update(updates).eq('id', bot.id);
  }

  for (let i = 0; i < botsToCreate; i++) {
    const botIndex = botsToKeep.length + i;
    const nickname = getBotNickname(botIndex, usedNicknames);
    await supabaseGame.from('room_players').insert({
      room_id: room.id,
      user_id: crypto.randomUUID(),
      nickname,
      avatar_url: pickBotAvatarUrl(avatarPool, `${room.id}:new:${nickname}`, botIndex),
      is_bot: true,
      lives: room.chars_per_player || 3,
      last_seen_at: new Date().toISOString(),
      connection_status: 'online',
    });
  }

  const { data: syncedPlayers } = await supabaseGame.from('room_players').select('*').eq('room_id', room.id);
  return {
    players: syncedPlayers || [],
    targetBots,
    botsCreated: botsToCreate,
    botsRemoved: botsToRemove.length,
    botsRenamed,
    botsAvatarUpdated,
    enforcedMinimumBot: realPlayers.length + (typeof desiredBots === 'number' ? Math.max(0, desiredBots) : existingBots.length) < MIN_PLAYERS_TO_START && targetBots > existingBots.length,
  };
}

export async function startRoom(roomId: string, options: { requestedDeckId?: string | null; desiredBots?: number; auto?: boolean } = {}) {
  const requestedDeckId = options.requestedDeckId || null;
  const desiredBots = Number.isInteger(options.desiredBots) ? options.desiredBots : undefined;
  const auto = Boolean(options.auto);

  const [{ data: room }, { data: players }] = await Promise.all([
    supabaseGame.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabaseGame.from('room_players').select('*').eq('room_id', roomId),
  ]);

  if (!room) return { ok: false, status: 404, error: 'Sala nao encontrada.' };
  if (room.status !== 'LOBBY') return { ok: true, skipped: true, reason: 'room-not-in-lobby' };

  const playablePlayers = players || [];
  if (playablePlayers.length === 0) return { ok: false, status: 400, error: 'A sala precisa ter pelo menos um jogador.' };

  const botSync = await syncBots(room, playablePlayers, desiredBots, auto);
  if (botSync.players.length < MIN_PLAYERS_TO_START) {
    return { ok: false, status: 400, error: 'A partida precisa de pelo menos 4 participantes. Convide alguem ou adicione bots.' };
  }

  const resolved = await resolveDeckId(requestedDeckId, room);
  if (resolved.deckId === undefined) {
    return { ok: false, status: 400, error: `O deck precisa ter pelo menos ${resolved.needed} personagens para ${room.chars_per_player || 3} vida(s) por jogador.` };
  }

  await supabaseGame.from('rooms').update({
    status: 'PICKING',
    deck_id: resolved.deckId,
    turn_expires_at: new Date(Date.now() + ((room.pick_time_seconds || 30) * 1000)).toISOString(),
  }).eq('id', room.id);

  await touchRoomActivity(room.id);
  return {
    ok: true,
    deckId: resolved.deckId,
    source: resolved.source,
    participants: botSync.players.length,
    bots: botSync.targetBots,
    botsCreated: botSync.botsCreated,
    botsRemoved: botSync.botsRemoved,
    botsRenamed: botSync.botsRenamed,
    botsAvatarUpdated: botSync.botsAvatarUpdated,
    deckCharacters: resolved.deckCharacters,
    repeatedCharactersAcrossPlayersAllowed: true,
    enforcedMinimumBot: botSync.enforcedMinimumBot,
  };
}
