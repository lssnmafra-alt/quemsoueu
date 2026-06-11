import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: players } = await supabase.from('room_players').select('*');
  if (players) {
    for (const player of players) {
      if (player.avatar_url && player.avatar_url.includes('pollinations.ai')) {
          await supabase.from('room_players').update({ avatar_url: null }).eq('id', player.id);
          console.log(`✅ Cleared avatar for player ${player.nickname}`);
      }
    }
  }

  const { data: profiles } = await supabase.from('profiles').select('*');
  if (profiles) {
    for (const prof of profiles) {
      if (prof.avatar_url && prof.avatar_url.includes('pollinations.ai')) {
          await supabase.from('profiles').update({ avatar_url: null }).eq('id', prof.id);
          console.log(`✅ Cleared avatar for profile ${prof.nickname}`);
      }
    }
  }
}

run();
