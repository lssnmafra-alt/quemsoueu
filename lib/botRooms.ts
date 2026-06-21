import { supabaseGame } from './supabase';
import { closeAndDeleteRooms, nextRoomExpiry } from './roomLifecycle';
import { getBotAvatarPool, pickBotAvatarUrl } from './serverAvatars';

const TARGET_BOT_LOBBY_ROOMS = 1;
const MAX_BOT_ONLY_ROOM_AGE_MS = 8 * 60 * 1000;

const BOT_ROOM_SHAPES = [
  { bots: 3, maxPlayers: 4 },
  { bots: 4, maxPlayers: 6 },
  { bots: 5, maxPlayers: 6 },
  { bots: 5, maxPlayers: 10 },
  { bots: 6, maxPlayers: 10 },
];

const BOT_NAMES = [
  'jugameplays', 'bruninho67', 'pedrinn', 'rafa_xt', 'gui_zika', 'luluzinha', 'anafps', 'joaovk',
  'ninafps', 'dudazinha', 'vitin7', 'lele_gg', 'xandeplay', 'biazinha', 'thzinn', 'brunao77',
  'jpzin', 'mariii', 'kauanzera', 'lelefps', 'gabsplay', 'nanagame',
];

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'B';
  while (code.length < 6) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function shapeForIndex(index: number) {
  return BOT_ROOM_SHAPES[index % BOT_ROOM_SHAPES.length];
}

async function getPlayableThemes(charsPerPlayer = 3) {
  const { data: publicDecks } = await supabaseGame.from('decks').select('id,name').eq('is_public', true);
  const deckIds = (publicDecks || []).map((deck: any) => deck.id);
  const { data: deckCharacters } = deckIds.length > 0
    ? await supabaseGame.from('characters').select('deck_id').in('deck_id', deckIds)
    : { data: [] };

  const counts = new Map<string, number>();
  (deckCharacters || []).forEach((character: any) => counts.set(character.deck_id, (counts.get(character.deck_id) || 0) + 1));

  return (publicDecks || [])
    .filter((deck: any) => (counts.get(deck.id) || 0) >= charsPerPlayer)
    .map((deck: any) => ({ id: deck.id, name: deck.name }));
}

async function createBotRoom(theme: { id: string; name: string }, index: number) {
  const now = new Date();
  const adminId = crypto.randomUUID();
  const code = randomCode();
  const rotatingIndex = Math.floor(now.getTime() / (10 * 60 * 1000)) + index;
  const shape = shapeForIndex(rotatingIndex);
  const avatarPool = await getBotAvatarPool();

  const { data: room, error } = await supabaseGame
    .from('rooms')
    .insert({
      code,
      admin_id: adminId,
      is_public: true,
      deck_id: theme.id,
      max_players: shape.maxPlayers,
      chars_per_player: 3,
      pick_time_seconds: 30,
      vote_time_seconds: 30,
      reveal_time_seconds: 8,
      status: 'LOBBY',
      current_turn_number: 0,
      turn_expires_at: null,
      last_activity_at: now.toISOString(),
      expires_at: nextRoomExpiry(now),
    })
    .select()
    .single();

  if (error) throw error;

  const names = shuffle(BOT_NAMES).slice(0, shape.bots);
  const players = names.map((name, botIndex) => {
    const userId = botIndex === 0 ? adminId : crypto.randomUUID();
    return {
      room_id: room.id,
      user_id: userId,
      nickname: name,
      avatar_url: pickBotAvatarUrl(avatarPool, `${room.id}:${name}:${userId}`, botIndex),
      is_bot: true,
      is_admin: botIndex === 0,
      lives: 0,
      last_seen_at: now.toISOString(),
      connection_status: 'online',
    };
  });

  const { error: playersError } = await supabaseGame.from('room_players').insert(players);
  if (playersError) throw playersError;

  return { id: room.id, code: room.code, theme: theme.name, shape };
}

function isBotOnlyRoom(roomPlayers: any[]) {
  return roomPlayers.length > 0 && roomPlayers.every((player: any) => player.is_bot);
}

function isExpectedBotRoomShape(room: any, players: any[]) {
  return BOT_ROOM_SHAPES.some((shape) => shape.maxPlayers === (room.max_players || 6) && shape.bots === players.length);
}

export async function runBotRoomCycle() {
  const { data: rooms } = await supabaseGame
    .from('rooms')
    .select('id, code, status, created_at, last_activity_at, max_players, deck_id')
    .eq('status', 'LOBBY')
    .eq('is_public', true);

  const roomIds = (rooms || []).map((room: any) => room.id);
  const { data: players } = roomIds.length
    ? await supabaseGame.from('room_players').select('*').in('room_id', roomIds)
    : { data: [] };

  const playersByRoom = new Map<string, any[]>();
  (players || []).forEach((player: any) => {
    const list = playersByRoom.get(player.room_id) || [];
    list.push(player);
    playersByRoom.set(player.room_id, list);
  });

  const now = Date.now();
  const staleBotRooms = (rooms || []).filter((room: any) => {
    const roomPlayers = playersByRoom.get(room.id) || [];
    const lastActivity = new Date(room.last_activity_at || room.created_at || 0).getTime();
    return isBotOnlyRoom(roomPlayers) && now - lastActivity > MAX_BOT_ONLY_ROOM_AGE_MS;
  });

  if (staleBotRooms.length > 0) await closeAndDeleteRooms(staleBotRooms.map((room: any) => room.id));

  const remainingRooms = (rooms || []).filter((room: any) => !staleBotRooms.some((stale: any) => stale.id === room.id));
  const botRooms = remainingRooms.filter((room: any) => {
    const roomPlayers = playersByRoom.get(room.id) || [];
    return isBotOnlyRoom(roomPlayers) && isExpectedBotRoomShape(room, roomPlayers);
  });

  if (botRooms.length >= TARGET_BOT_LOBBY_ROOMS) return { ok: true, created: 0, removed: staleBotRooms.length };

  const themes = await getPlayableThemes(3);
  if (!themes.length) return { ok: false, created: 0, removed: staleBotRooms.length, error: 'Nenhum deck publico jogavel encontrado.' };

  const created = [];
  for (let i = botRooms.length; i < TARGET_BOT_LOBBY_ROOMS; i++) {
    const theme = themes[i % themes.length];
    created.push(await createBotRoom(theme, i));
  }

  return { ok: true, created: created.length, rooms: created, removed: staleBotRooms.length };
}
