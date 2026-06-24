-- Avatar store / skin system for the AUTH / USERS Supabase project
-- Project: zpkxigpocyfhupqlyqak
-- Run this manually in Supabase SQL Editor for https://zpkxigpocyfhupqlyqak.supabase.co
-- This file is only SQL documentation/migration. Do not import it in frontend code.
-- Current R2 standard by category:
--   atuem/atuem/avatar/Padrao/Melanie.png
--   atuem/atuem/avatar/Padrao/Melanie1.png
--   atuem/atuem/avatar/Padrao/Melanie-1.mp4
--   atuem/atuem/avatar/Terror/Nome.png
--   atuem/atuem/avatar/Futebol/Nome.png

create table if not exists public.avatar_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  r2_prefix text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avatar_categories_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint avatar_categories_prefix_check check (r2_prefix like 'atuem/atuem/avatar/%')
);

create table if not exists public.avatar_skins (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.avatar_categories(id) on delete set null,
  avatar_key text not null,
  avatar_name text not null,
  skin_code text not null,
  skin_name text not null default 'Oficial',
  image_key text not null,
  card_image_key text,
  r2_prefix text not null default 'atuem/atuem/avatar/',
  rarity text not null default 'common',
  access_type text not null default 'free',
  price_coins integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avatar_skins_access_type_check check (access_type in ('free', 'premium', 'admin', 'event')),
  constraint avatar_skins_rarity_check check (rarity in ('common', 'rare', 'epic', 'legendary', 'mythic')),
  constraint avatar_skins_price_check check (price_coins >= 0),
  constraint avatar_skins_unique_avatar_skin unique (avatar_key, skin_code)
);

create table if not exists public.avatar_animations (
  id uuid primary key default gen_random_uuid(),
  avatar_skin_id uuid not null references public.avatar_skins(id) on delete cascade,
  event_type text not null,
  animation_key text not null,
  variant_code text not null default 'default',
  loop boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avatar_animations_event_type_check check (event_type in ('home', 'lobby', 'intro', 'victory', 'defeat', 'vote', 'custom')),
  constraint avatar_animations_unique_event unique (avatar_skin_id, event_type, variant_code, animation_key)
);

create table if not exists public.user_avatar_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  avatar_skin_id uuid not null references public.avatar_skins(id) on delete cascade,
  source text not null default 'manual',
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, avatar_skin_id)
);

create table if not exists public.user_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_wallets_coins_check check (coins >= 0)
);

alter table public.avatar_categories enable row level security;
alter table public.avatar_skins enable row level security;
alter table public.avatar_animations enable row level security;
alter table public.user_avatar_unlocks enable row level security;
alter table public.user_wallets enable row level security;

drop policy if exists avatar_categories_read_active on public.avatar_categories;
create policy avatar_categories_read_active on public.avatar_categories for select using (is_active = true);

drop policy if exists avatar_skins_read_active on public.avatar_skins;
create policy avatar_skins_read_active on public.avatar_skins for select using (is_active = true);

drop policy if exists avatar_animations_read_active on public.avatar_animations;
create policy avatar_animations_read_active on public.avatar_animations for select using (is_active = true);

drop policy if exists user_avatar_unlocks_read_own on public.user_avatar_unlocks;
create policy user_avatar_unlocks_read_own on public.user_avatar_unlocks for select using (auth.uid() = user_id);

drop policy if exists user_wallets_read_own on public.user_wallets;
create policy user_wallets_read_own on public.user_wallets for select using (auth.uid() = user_id);

create index if not exists avatar_categories_active_idx on public.avatar_categories (is_active, sort_order);
create index if not exists avatar_skins_access_idx on public.avatar_skins (access_type, is_active, sort_order);
create index if not exists avatar_skins_category_idx on public.avatar_skins (category_id, is_active, sort_order);
create index if not exists avatar_animations_skin_event_idx on public.avatar_animations (avatar_skin_id, event_type, is_active);
create index if not exists user_avatar_unlocks_user_idx on public.user_avatar_unlocks (user_id, expires_at);

insert into public.avatar_categories (slug, name, description, r2_prefix, is_active, sort_order)
values
  ('padrao', 'Padrão', 'Personagens padrão do jogo.', 'atuem/atuem/avatar/Padrao/', true, 10),
  ('terror', 'Terror', 'Coleção de personagens de terror.', 'atuem/atuem/avatar/Terror/', false, 20),
  ('futebol', 'Futebol', 'Coleção de jogadores e personagens de futebol.', 'atuem/atuem/avatar/Futebol/', false, 30),
  ('marvel', 'Marvel', 'Coleção licenciada futura.', 'atuem/atuem/avatar/Marvel/', false, 40)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  r2_prefix = excluded.r2_prefix,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.avatar_skins (category_id, avatar_key, avatar_name, skin_code, skin_name, image_key, card_image_key, r2_prefix, rarity, access_type, price_coins, is_active, sort_order)
select c.id, v.avatar_key, v.avatar_name, v.skin_code, 'Oficial', concat(c.r2_prefix, v.skin_code, '.png'), concat(c.r2_prefix, v.skin_code, '.png'), c.r2_prefix, v.rarity, 'free', 0, true, v.sort_order
from public.avatar_categories c
cross join (
  values
    ('Arlecchino', 'Arlecchino', 'Arlecchino', 'legendary', 10),
    ('Cybegirl', 'Cybegirl', 'Cybegirl', 'epic', 20),
    ('Drbolhas', 'Drbolhas', 'Drbolhas', 'rare', 30),
    ('Melanie', 'Melanie', 'Melanie', 'epic', 40),
    ('Popboy', 'Popboy', 'Popboy', 'rare', 50),
    ('Rainha traida', 'Rainha traída', 'Rainha traida', 'legendary', 60),
    ('Rayan', 'Rayan', 'Rayan', 'common', 70),
    ('Selena', 'Selena', 'Selena', 'epic', 80)
) as v(avatar_key, avatar_name, skin_code, rarity, sort_order)
where c.slug = 'padrao'
on conflict (avatar_key, skin_code) do update set
  category_id = excluded.category_id,
  avatar_name = excluded.avatar_name,
  skin_name = excluded.skin_name,
  image_key = excluded.image_key,
  card_image_key = excluded.card_image_key,
  r2_prefix = excluded.r2_prefix,
  rarity = excluded.rarity,
  access_type = excluded.access_type,
  price_coins = excluded.price_coins,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.avatar_animations (avatar_skin_id, event_type, animation_key, variant_code, loop, sort_order)
select s.id, v.event_type, concat(c.r2_prefix, s.skin_code, v.suffix, '.mp4'), v.variant_code, v.loop, v.sort_order
from public.avatar_skins s
join public.avatar_categories c on c.id = s.category_id
cross join (
  values
    ('home', '-A', 'default', true, 10),
    ('intro', '-A', 'default', true, 11),
    ('lobby', '-1', 'default', true, 20),
    ('victory', '-2', 'default', false, 30),
    ('defeat', '-3', 'default', false, 40)
) as v(event_type, suffix, variant_code, loop, sort_order)
where c.slug = 'padrao'
on conflict (avatar_skin_id, event_type, variant_code, animation_key) do update set
  loop = excluded.loop,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
