require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL_GAME;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY_GAME || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME;
const supabase = createClient(url, key);
const OFFICIAL_CREATOR_ID = '00000000-0000-4000-8000-000000000001';
function botUuid(roomIndex, botIndex) {
  return `00000000-0000-4000-8${roomIndex.toString().padStart(3, '0')}-${botIndex.toString().padStart(12, '0')}`;
}

function svgData({ title, subtitle = '', bg = '#1d4ed8', accent = '#f59e0b', initials = '?' }) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" rx="72" fill="${bg}"/>
    <rect x="55" y="55" width="790" height="1090" rx="52" fill="#ffffff" opacity=".12"/>
    <rect x="95" y="95" width="710" height="1010" rx="42" fill="#0f172a" opacity=".18"/>
    <circle cx="450" cy="420" r="190" fill="${accent}"/>
    <circle cx="450" cy="420" r="150" fill="#fff" opacity=".18"/>
    <text x="450" y="475" font-size="150" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" fill="#fff">${initials}</text>
    <text x="450" y="820" font-size="62" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" fill="#fff">${title}</text>
    <text x="450" y="900" font-size="34" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" fill="#e2e8f0">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const decks = [
  {
    name: 'Craques do Futebol',
    initials: 'FC',
    bg: '#1d4ed8',
    accent: '#f59e0b',
    characters: ['Neymar', 'Messi', 'Lamine Yamal', 'Cristiano Ronaldo', 'Mbappe', 'Vini Jr', 'Haaland', 'Hulk Fluminense'],
  },
  {
    name: 'Heróis de Cinema',
    initials: 'HR',
    bg: '#7f1d1d',
    accent: '#fbbf24',
    characters: ['Homem de Ferro', 'Mulher Maravilha', 'Thor', 'Capitão América', 'Pantera Negra', 'Batman', 'Superman', 'Hulk da Marvel'],
  },
  {
    name: 'Vilões Lendários',
    initials: 'VL',
    bg: '#111827',
    accent: '#dc2626',
    characters: ['Coringa', 'Lex Luthor', 'Thanos', 'Loki', 'Darth Vader', 'Voldemort', 'Magneto', 'Duende Verde'],
  },
  {
    name: 'Desenhos e Games',
    initials: 'DG',
    bg: '#166534',
    accent: '#f97316',
    characters: ['Mario', 'Sonic', 'Pikachu', 'Naruto', 'Goku', 'Elsa', 'Shrek', 'Bob Esponja'],
  },
  {
    name: 'Música Pop',
    initials: 'MP',
    bg: '#6d28d9',
    accent: '#22c55e',
    characters: ['Anitta', 'Beyonce', 'Taylor Swift', 'The Weeknd', 'Ariana Grande', 'Bruno Mars', 'Michael Jackson', 'Rihanna'],
  },
];

function characterImage(name, deck) {
  const initials = name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return svgData({ title: name, subtitle: deck.name, bg: deck.bg, accent: deck.accent, initials });
}

async function upsertDeck(deck) {
  const image_url = svgData({ title: deck.name, subtitle: 'Deck publico', bg: deck.bg, accent: deck.accent, initials: deck.initials });
  const { data: existing } = await supabase.from('decks').select('*').eq('name', deck.name).maybeSingle();

  const payload = {
    name: deck.name,
    description: `Deck publico com ${deck.characters.length} personagens para partidas rápidas.`,
    creator_id: OFFICIAL_CREATOR_ID,
    is_public: true,
    cover_url: image_url,
  };

  const { data, error } = existing
    ? await supabase.from('decks').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('decks').insert(payload).select().single();

  if (error) throw new Error(`Deck ${deck.name}: ${error.message}`);

  await supabase.from('characters').delete().eq('deck_id', data.id);
  const characters = deck.characters.map((name) => ({
    deck_id: data.id,
    name,
    image_url: characterImage(name, deck),
  }));
  const { error: charError } = await supabase.from('characters').insert(characters);
  if (charError) throw new Error(`Characters ${deck.name}: ${charError.message}`);

  return data;
}

async function findAdminUser() {
  const { data } = await supabase
    .from('room_players')
    .select('user_id,nickname')
    .eq('is_bot', false)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || { user_id: 'seed-admin', nickname: 'Admin' };
}

async function upsertBotRoom({ code, deckId, admin, bots, roomIndex }) {
  const payload = {
    code,
    admin_id: admin.user_id,
    is_public: true,
    max_players: 6,
    chars_per_player: 3,
    pick_time_seconds: 30,
    vote_time_seconds: 30,
    reveal_time_seconds: 8,
    status: 'LOBBY',
    deck_id: null,
    current_turn_number: 0,
  };

  const { data: existing } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
  const { data: room, error } = existing
    ? await supabase.from('rooms').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('rooms').insert(payload).select().single();
  if (error) throw new Error(`Room ${code}: ${error.message}`);

  await supabase.from('room_players').delete().eq('room_id', room.id);
  await supabase.from('messages').delete().eq('room_id', room.id);
  await supabase.from('player_cards').delete().eq('room_id', room.id);

  const players = [
    {
      room_id: room.id,
      user_id: admin.user_id,
      nickname: admin.nickname || 'Admin',
      is_admin: true,
      is_bot: false,
      lives: 0,
    },
    ...bots.map((name, index) => ({
      room_id: room.id,
      user_id: botUuid(roomIndex, index + 1),
      nickname: name,
      is_admin: false,
      is_bot: true,
      lives: 0,
    })),
  ];

  const { error: playerError } = await supabase.from('room_players').insert(players);
  if (playerError) throw new Error(`Room players ${code}: ${playerError.message}`);

  await supabase.from('messages').insert({
    room_id: room.id,
    sender_id: botUuid(roomIndex, 1),
    sender_name: bots[0],
    content: 'Sala pronta. Escolha um deck e vamos jogar.',
  });

  return room;
}

(async () => {
  const createdDecks = [];
  for (const deck of decks) {
    createdDecks.push(await upsertDeck(deck));
  }

  const admin = await findAdminUser();
  const rooms = [
    await upsertBotRoom({ code: 'BOTFUT', deckId: null, admin, bots: ['Bot Tatico', 'Bot Goleador'], roomIndex: 1 }),
    await upsertBotRoom({ code: 'BOTPOP', deckId: null, admin, bots: ['Bot Mestre', 'Bot Relampago', 'Bot Radar'], roomIndex: 2 }),
  ];

  console.log(JSON.stringify({
    decks: createdDecks.map((deck) => deck.name),
    rooms: rooms.map((room) => room.code),
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
