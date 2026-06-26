-- Backfill de perfis antigos que tinham avatar_url no formato avatar:<json>
-- mas ainda estavam com avatar_animation_set_id vazio.
with parsed as (
  select
    id,
    (regexp_match(avatar_url, 'avatarSetId%22%3A%22([0-9a-fA-F-]{36})%22'))[1]::uuid as set_id
  from public.profiles
  where avatar_animation_set_id is null
    and avatar_url like 'avatar:%avatarSetId%22%3A%22%'
)
update public.profiles p
set avatar_animation_set_id = parsed.set_id,
    updated_at = now()
from parsed
where p.id = parsed.id
  and parsed.set_id is not null;
