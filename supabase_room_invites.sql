-- Execute no SQL Editor do Supabase Game se a tabela ainda nao existir.

CREATE TABLE IF NOT EXISTS public.room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, sender_profile_id, receiver_profile_id)
);

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_invites_open_select ON public.room_invites;
DROP POLICY IF EXISTS room_invites_open_insert ON public.room_invites;
DROP POLICY IF EXISTS room_invites_open_update ON public.room_invites;
DROP POLICY IF EXISTS room_invites_open_delete ON public.room_invites;

CREATE POLICY room_invites_open_select ON public.room_invites FOR SELECT USING (true);
CREATE POLICY room_invites_open_insert ON public.room_invites FOR INSERT WITH CHECK (true);
CREATE POLICY room_invites_open_update ON public.room_invites FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY room_invites_open_delete ON public.room_invites FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS room_invites_receiver_status_idx ON public.room_invites(receiver_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS room_invites_room_idx ON public.room_invites(room_id);
