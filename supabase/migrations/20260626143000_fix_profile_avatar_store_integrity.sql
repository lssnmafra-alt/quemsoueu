do $$
declare
  fk record;
begin
  for fk in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profiles drop constraint if exists %I', fk.conname);
  end loop;
end $$;

alter table public.profiles add column if not exists avatar_animation_set_id uuid null;
alter table public.profiles add column if not exists emoji text default '🙂';
alter table public.profiles add column if not exists profile_completed boolean default false;

create or replace function public.set_profile_avatar(
  p_user_id uuid,
  p_avatar_url text,
  p_avatar_animation_set_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  update public.profiles
     set avatar_url = nullif(trim(p_avatar_url), ''),
         avatar_animation_set_id = p_avatar_animation_set_id,
         profile_completed = true,
         updated_at = now()
   where id = p_user_id
   returning * into v_profile;

  if v_profile.id is null then
    insert into public.profiles (
      id,
      email,
      nickname,
      emoji,
      avatar_url,
      avatar_animation_set_id,
      profile_completed,
      is_guest,
      updated_at
    ) values (
      p_user_id,
      'player_' || p_user_id::text || '@quemsoueu.local',
      'Jogador',
      '🙂',
      nullif(trim(p_avatar_url), ''),
      p_avatar_animation_set_id,
      true,
      true,
      now()
    )
    on conflict (id) do update
      set avatar_url = excluded.avatar_url,
          avatar_animation_set_id = excluded.avatar_animation_set_id,
          profile_completed = true,
          updated_at = now()
    returning * into v_profile;
  end if;

  return v_profile;
end;
$$;
