create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  sender_profile_id uuid not null,
  receiver_profile_id uuid not null,
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_invites_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  constraint room_invites_no_self_check check (sender_profile_id <> receiver_profile_id),
  constraint room_invites_room_id_fkey foreign key (room_id) references public.rooms(id) on delete cascade,
  constraint room_invites_sender_profile_id_fkey foreign key (sender_profile_id) references public.profiles(id) on delete cascade,
  constraint room_invites_receiver_profile_id_fkey foreign key (receiver_profile_id) references public.profiles(id) on delete cascade,
  constraint room_invites_unique_pair unique (room_id, sender_profile_id, receiver_profile_id)
);

create index if not exists room_invites_receiver_status_idx on public.room_invites(receiver_profile_id, status, created_at desc);
create index if not exists room_invites_room_status_idx on public.room_invites(room_id, status, created_at desc);
create index if not exists room_invites_sender_idx on public.room_invites(sender_profile_id, created_at desc);

alter table public.room_invites enable row level security;

drop policy if exists "room_invites_select_public" on public.room_invites;
create policy "room_invites_select_public"
  on public.room_invites for select
  using (true);

drop policy if exists "room_invites_insert_public" on public.room_invites;
create policy "room_invites_insert_public"
  on public.room_invites for insert
  with check (true);

drop policy if exists "room_invites_update_public" on public.room_invites;
create policy "room_invites_update_public"
  on public.room_invites for update
  using (true)
  with check (true);

create or replace function public.touch_room_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_room_invites_updated_at on public.room_invites;
create trigger trg_room_invites_updated_at
before update on public.room_invites
for each row execute function public.touch_room_invites_updated_at();
