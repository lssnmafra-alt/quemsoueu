const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function readEnv() {
  return Object.fromEntries(
    fs.readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
      })
  );
}

(async () => {
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL_GAME, env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME);
  const rooms = await supabase.from('rooms').select('id,last_activity_at,expires_at').limit(1);
  const players = await supabase.from('room_players').select('id,last_seen_at,connection_status').limit(1);

  console.log(JSON.stringify({
    rooms: { ok: !rooms.error, error: rooms.error?.message || null },
    players: { ok: !players.error, error: players.error?.message || null },
  }, null, 2));
})();
