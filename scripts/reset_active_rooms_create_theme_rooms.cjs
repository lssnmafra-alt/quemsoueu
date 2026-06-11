require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL_GAME;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY_GAME || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME;
const supabase = createClient(url, key);

const ROOM_STATUSES = ['LOBBY', 'PICKING', 'STARTING', 'PLAYING', 'FINISHED'];
const ROOM_COUNT = 3;

function nextRoomExpiry(now = new Date()) {
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

function codeFromIndex(index) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = `T${index + 1}`;
  while (code.length < 6) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function deleteActiveRooms() {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id,code,status')
    .in('status', ROOM_STATUSES);

  if (error) throw error;
  const ids = (rooms || []).map((room) => room.id);
  if (ids.length === 0) return [];

  await supabase.from('messages').delete().in('room_id', ids);
  await supabase.from('player_cards').delete().in('room_id', ids);
  await supabase.from('room_players').delete().in('room_id', ids);
  await supabase.from('rooms').delete().in('id', ids);

  return rooms;
}

async function getPlayableThemes() {
  const [{ count: officialCount }, { data: publicDecks }] = await Promise.all([
    supabase.from('characters').select('id', { count: 'exact', head: true }).is('deck_id', null),
    supabase.from('decks').select('id,name').eq('is_public', true),
  ]);

  const deckIds = (publicDecks || []).map((deck) => deck.id);
  const { data: deckCharacters } = deckIds.length > 0
    ? await supabase.from('characters').select('deck_id').in('deck_id', deckIds)
    : { data: [] };

  const counts = new Map();
  (deckCharacters || []).forEach((char) => {
    counts.set(char.deck_id, (counts.get(char.deck_id) || 0) + 1);
  });

  return [
    ...((officialCount || 0) >= 3 ? [{ id: null, name: 'Personagens Oficiais' }] : []),
    ...(publicDecks || []).filter((deck) => (counts.get(deck.id) || 0) >= 3),
  ];
}

async function createThemeRoom(theme, index) {
  const now = new Date();
  const adminId = uuidv4();
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code: codeFromIndex(index),
      admin_id: adminId,
      is_public: true,
      deck_id: theme.id,
      max_players: 6,
      chars_per_player: 3,
      pick_time_seconds: 30,
      vote_time_seconds: 30,
      reveal_time_seconds: 8,
      status: 'LOBBY',
      current_turn_number: 0,
      last_activity_at: now.toISOString(),
      expires_at: nextRoomExpiry(now),
    })
    .select()
    .single();

  if (error) throw error;

  const bots = Array.from({ length: 4 }, (_, botIndex) => {
    const userId = botIndex === 0 ? adminId : uuidv4();
    return {
      room_id: room.id,
      user_id: userId,
      nickname: `Bot Tema ${index + 1}.${botIndex + 1}`,
      is_bot: true,
      is_admin: botIndex === 0,
      lives: 0,
      last_seen_at: now.toISOString(),
      connection_status: 'online',
    };
  });

  const { error: playersError } = await supabase.from('room_players').insert(bots);
  if (playersError) throw playersError;

  await supabase.from('messages').insert({
    room_id: room.id,
    sender_id: adminId,
    sender_name: bots[0].nickname,
    content: `Sala nova com tema ${theme.name}.`,
  });

  return { code: room.code, theme: theme.name, id: room.id };
}

(async () => {
  const deleted = await deleteActiveRooms();
  const themes = await getPlayableThemes();
  if (themes.length === 0) throw new Error('Nenhum tema jogavel encontrado.');

  const shuffledThemes = [...themes].sort(() => Math.random() - 0.5);
  const created = [];
  for (let i = 0; i < Math.min(ROOM_COUNT, shuffledThemes.length); i++) {
    created.push(await createThemeRoom(shuffledThemes[i], i));
  }

  console.log(JSON.stringify({
    deletedRooms: deleted.map((room) => ({ code: room.code, status: room.status })),
    createdRooms: created,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
