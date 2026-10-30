create or replace function public.respond_to_food_reservation(p_reservation_id uuid, p_decision text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_org_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Decision must be accepted or rejected';
  end if;

  select listing_id into v_listing_id
  from public.reservations
  where id = p_reservation_id;

  if v_listing_id is null then
    raise exception 'Reservation not found';
  end if;

  select organization_id into v_org_id
  from public.food_listings
  where id = v_listing_id
  for update;

  if not public.is_org_manager(v_org_id) then
    raise exception 'Only an organisation manager can respond to this reservation';
  end if;

  select status into v_status
  from public.reservations
  where id = p_reservation_id and listing_id = v_listing_id
  for update;

  if v_status <> 'requested' then
    raise exception 'This reservation has already been processed';
  end if;

  update public.reservations
  set status = p_decision, updated_at = now()
  where id = p_reservation_id;

  return p_decision;
end;
$$;

create or replace function public.cancel_food_reservation(p_reservation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_requester_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select listing_id into v_listing_id
  from public.reservations
  where id = p_reservation_id;

  if v_listing_id is null then
    raise exception 'Reservation not found';
  end if;

  perform 1 from public.food_listings where id = v_listing_id for update;

  select requester_id, status into v_requester_id, v_status
  from public.reservations
  where id = p_reservation_id and listing_id = v_listing_id
  for update;

  if v_requester_id <> auth.uid() then
    raise exception 'You can only cancel your own reservation';
  end if;
  if v_status <> 'requested' then
    raise exception 'Only pending reservations can be cancelled';
  end if;

  update public.reservations
  set status = 'cancelled', updated_at = now()
  where id = p_reservation_id;

  return 'cancelled';
end;
$$;

revoke all on function public.respond_to_food_reservation(uuid, text) from public, anon;
revoke all on function public.cancel_food_reservation(uuid) from public, anon;
grant execute on function public.respond_to_food_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_food_reservation(uuid) to authenticated;
