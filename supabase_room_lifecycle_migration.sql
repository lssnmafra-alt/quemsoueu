-- Execute no SQL Editor do Supabase 2 (Dados do Jogo).
-- Esta migration preserva decks, usuarios, historico permanente e bots cadastrados fora das salas.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '1 hour') NOT NULL;

ALTER TABLE public.room_players
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'online';

UPDATE public.rooms
SET
  last_activity_at = COALESCE(last_activity_at, created_at, timezone('utc'::text, now())),
  expires_at = COALESCE(expires_at, COALESCE(last_activity_at, created_at, timezone('utc'::text, now())) + interval '1 hour');

UPDATE public.room_players
SET last_seen_at = COALESCE(last_seen_at, joined_at, timezone('utc'::text, now()));

CREATE INDEX IF NOT EXISTS rooms_expires_at_idx ON public.rooms(expires_at);
CREATE INDEX IF NOT EXISTS room_players_last_seen_at_idx ON public.room_players(room_id, last_seen_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'room_players'
      AND indexname = 'room_players_room_user_unique_idx'
  ) THEN
    WITH ranked_players AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY room_id, user_id
          ORDER BY
            COALESCE(last_seen_at, joined_at, timezone('utc'::text, now())) DESC,
            joined_at DESC,
            id DESC
        ) AS duplicate_rank
      FROM public.room_players
    )
    DELETE FROM public.room_players
    WHERE id IN (
      SELECT id
      FROM ranked_players
      WHERE duplicate_rank > 1
    );

    CREATE UNIQUE INDEX room_players_room_user_unique_idx ON public.room_players(room_id, user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  expired_room_ids UUID[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO expired_room_ids
  FROM public.rooms
  WHERE expires_at < timezone('utc'::text, now());

  IF array_length(expired_room_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.messages WHERE room_id = ANY(expired_room_ids);
  DELETE FROM public.player_cards WHERE room_id = ANY(expired_room_ids);
  DELETE FROM public.room_players WHERE room_id = ANY(expired_room_ids);
  DELETE FROM public.rooms WHERE id = ANY(expired_room_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
