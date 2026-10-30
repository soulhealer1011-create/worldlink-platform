create or replace function public.reserve_food_listing(p_listing_id uuid, p_quantity numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.food_listings%rowtype;
  v_reserved numeric;
  v_reservation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_listing
  from public.food_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Food listing not found';
  end if;
  if v_listing.status <> 'available' or v_listing.available_until <= now() then
    raise exception 'This food listing is no longer available';
  end if;
  if v_listing.available_from > now() then
    raise exception 'This food listing is not available yet';
  end if;
  if not exists (
    select 1 from public.organizations o
    where o.id = v_listing.organization_id
      and o.verification_status = 'verified'
  ) then
    raise exception 'Donor organisation is not verified';
  end if;

  select coalesce(sum(r.quantity), 0)
  into v_reserved
  from public.reservations r
  where r.listing_id = p_listing_id
    and r.status in ('requested', 'accepted');

  if v_reserved + p_quantity > v_listing.quantity then
    raise exception 'Not enough food remains for this reservation';
  end if;

  insert into public.reservations (listing_id, requester_id, quantity, status)
  values (p_listing_id, auth.uid(), p_quantity, 'requested')
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

revoke all on function public.reserve_food_listing(uuid, numeric) from public, anon;
grant execute on function public.reserve_food_listing(uuid, numeric) to authenticated;
revoke insert, update on public.reservations from authenticated;
