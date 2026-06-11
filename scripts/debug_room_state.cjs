const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: node scripts/debug_room_state.cjs <room-id>');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL_GAME, env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME);

(async () => {
  const [room, players, official, decks] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabase.from('room_players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true }),
    supabase.from('characters').select('id', { count: 'exact', head: true }).is('deck_id', null),
    supabase.from('decks').select('id,name,is_public,creator_id').limit(30),
  ]);

  console.log(JSON.stringify({
    room: room.data,
    roomError: room.error?.message || null,
    players: players.data,
    playersError: players.error?.message || null,
    officialCount: official.count,
    officialError: official.error?.message || null,
    decks: decks.data,
    decksError: decks.error?.message || null,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
