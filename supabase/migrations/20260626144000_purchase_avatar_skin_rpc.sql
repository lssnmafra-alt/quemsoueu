create or replace function public.purchase_avatar_skin(
  p_user_id uuid,
  p_avatar_skin_id uuid
)
returns table (
  ok boolean,
  error text,
  coins integer,
  price_coins integer,
  already_owned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skin record;
  v_wallet integer := 0;
  v_price integer := 0;
  v_owned boolean := false;
begin
  select id, access_type, coalesce(price_coins, 0) as price_coins, is_active
    into v_skin
    from public.avatar_skins
   where id = p_avatar_skin_id;

  if v_skin.id is null then
    return query select false, 'Skin invalida.', 0, 0, false;
    return;
  end if;

  if not coalesce(v_skin.is_active, false) then
    return query select false, 'Skin indisponivel.', 0, coalesce(v_skin.price_coins, 0), false;
    return;
  end if;

  select exists (
    select 1
      from public.user_avatar_unlocks
     where user_id = p_user_id
       and avatar_skin_id = p_avatar_skin_id
       and (expires_at is null or expires_at > now())
  ) into v_owned;

  select coalesce(coins, 0)
    into v_wallet
    from public.user_wallets
   where user_id = p_user_id
   for update;

  v_wallet := coalesce(v_wallet, 0);
  v_price := coalesce(v_skin.price_coins, 0);

  if v_owned then
    return query select true, null::text, v_wallet, v_price, true;
    return;
  end if;

  if v_skin.access_type = 'free' then
    insert into public.user_avatar_unlocks (user_id, avatar_skin_id, source, metadata)
    values (p_user_id, p_avatar_skin_id, 'free', '{"auto_unlock":true}'::jsonb)
    on conflict (user_id, avatar_skin_id) do update
      set source = excluded.source,
          metadata = public.user_avatar_unlocks.metadata || excluded.metadata;

    return query select true, null::text, v_wallet, 0, false;
    return;
  end if;

  if v_skin.access_type <> 'premium' then
    return query select false, 'Skin exclusiva indisponivel para compra agora.', v_wallet, v_price, false;
    return;
  end if;

  if v_wallet < v_price then
    return query select false, 'Moedas insuficientes.', v_wallet, v_price, false;
    return;
  end if;

  update public.user_wallets
     set coins = coins - v_price,
         updated_at = now()
   where user_id = p_user_id
   returning coins into v_wallet;

  insert into public.user_avatar_unlocks (user_id, avatar_skin_id, source, metadata)
  values (p_user_id, p_avatar_skin_id, 'coins', jsonb_build_object('price_coins', v_price))
  on conflict (user_id, avatar_skin_id) do update
    set source = excluded.source,
        metadata = public.user_avatar_unlocks.metadata || excluded.metadata;

  return query select true, null::text, v_wallet, v_price, false;
end;
$$;

grant execute on function public.set_profile_avatar(uuid, text, uuid) to anon, authenticated, service_role;
grant execute on function public.purchase_avatar_skin(uuid, uuid) to anon, authenticated, service_role;
