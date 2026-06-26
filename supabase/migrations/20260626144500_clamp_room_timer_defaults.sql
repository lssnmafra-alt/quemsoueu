alter table public.rooms alter column vote_time_seconds set default 30;
alter table public.rooms alter column pick_time_seconds set default 30;
alter table public.rooms alter column reveal_time_seconds set default 8;

update public.rooms
   set reveal_time_seconds = 8
 where reveal_time_seconds is null or reveal_time_seconds not in (5, 8, 12);

update public.rooms
   set vote_time_seconds = 30
 where vote_time_seconds is null or vote_time_seconds < 10 or vote_time_seconds > 120;

update public.rooms
   set pick_time_seconds = 30
 where pick_time_seconds is null or pick_time_seconds < 10 or pick_time_seconds > 120;
