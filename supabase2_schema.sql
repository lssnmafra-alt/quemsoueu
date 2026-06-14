-- Execute este script no SQL Editor do seu projeto Supabase 2 (Dados do Jogo)

-- Decks
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  creator_id UUID NOT NULL, -- FK to Supabase 1 if needed, but here just an ID string
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a decks" ON public.decks FOR ALL USING (true);

-- Personagens
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  avatar_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de personagens" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Edição de personagens" ON public.characters FOR ALL USING (true);

-- Favoritos
CREATE TABLE public.deck_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
  UNIQUE(user_id, deck_id)
);
ALTER TABLE public.deck_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favoritos visíveis" ON public.deck_favorites FOR ALL USING (true);

-- Salas
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  admin_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT true,
  deck_id UUID REFERENCES public.decks(id),
  max_players INTEGER DEFAULT 6,
  chars_per_player INTEGER DEFAULT 3,
  vote_time_seconds INTEGER DEFAULT 30,
  reveal_time_seconds INTEGER DEFAULT 10,
  pick_time_seconds INTEGER DEFAULT 30,
  status TEXT DEFAULT 'LOBBY', -- LOBBY, PICKING, STARTING, PLAYING, FINISHED
  current_turn_number INTEGER DEFAULT 0,
  turn_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso as salas" ON public.rooms FOR ALL USING (true);

-- Jogadores na Sala
CREATE TABLE public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  is_bot BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  play_order INTEGER,
  lives INTEGER DEFAULT 0, -- Set in PICKING phase
  missed_turns INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso aos jogadores" ON public.room_players FOR ALL USING (true);

-- Cartas Secretas Escolhidas pelos jogadores
CREATE TABLE public.player_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.room_players(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  is_dead BOOLEAN DEFAULT false -- Marked true when guessed
);
ALTER TABLE public.player_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cartas visíveis a todos" ON public.player_cards FOR ALL USING (true); 
-- In a more secure game, RLS would hide this, but for simplicity of this implementation, we handle it in edge/app logic or clients hide it until game ends/reveals.

-- Chat Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat livre" ON public.messages FOR ALL USING (true);
