create or replace function private.public_listing_available_quantity(p_listing_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total numeric;
  v_reserved numeric;
begin
  select l.quantity into v_total
  from public.food_listings l
  join public.organizations o on o.id = l.organization_id
  join public.countries c on c.code = l.country_code and c.is_enabled = true
  where l.id = p_listing_id
    and l.status = 'available'
    and l.available_until > now()
    and o.verification_status = 'verified';
  if not found then return null; end if;

  select coalesce(sum(r.quantity), 0) into v_reserved
  from public.reservations r
  where r.listing_id = p_listing_id
    and r.status in ('requested', 'accepted', 'collected');

  return greatest(v_total - v_reserved, 0);
end;
$$;

revoke all on function private.public_listing_available_quantity(uuid) from public, anon;
grant usage on schema private to anon, authenticated;
grant execute on function private.public_listing_available_quantity(uuid) to anon, authenticated;

create or replace function private.reserve_food_listing(p_listing_id uuid, p_quantity numeric)
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;

  select * into v_listing from public.food_listings where id = p_listing_id for update;
  if not found then raise exception 'Food listing not found'; end if;
  if v_listing.status <> 'available' or v_listing.available_until <= now() then
    raise exception 'This food listing is no longer available';
  end if;
  if v_listing.available_from > now() then raise exception 'This food listing is not available yet'; end if;
  if not exists (select 1 from public.organizations o where o.id = v_listing.organization_id and o.verification_status = 'verified') then
    raise exception 'Donor organisation is not verified';
  end if;
  if not exists (select 1 from public.countries c where c.code = v_listing.country_code and c.is_enabled = true) then
    raise exception 'This country is not enabled for WORLDLINK operations';
  end if;
  if private.is_org_member(v_listing.organization_id) then
    raise exception 'You cannot reserve food listed by your own organisation';
  end if;

  select coalesce(sum(r.quantity), 0) into v_reserved
  from public.reservations r
  where r.listing_id = p_listing_id and r.status in ('requested', 'accepted', 'collected');

  if v_reserved + p_quantity > v_listing.quantity then
    raise exception 'Not enough food remains for this reservation';
  end if;

  insert into public.reservations (listing_id, requester_id, quantity, status)
  values (p_listing_id, auth.uid(), p_quantity, 'requested')
  returning id into v_reservation_id;
  return v_reservation_id;
end;
$$;

create or replace function private.prevent_listing_inventory_below_reservations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reserved numeric;
begin
  if new.quantity < old.quantity then
    select coalesce(sum(r.quantity), 0) into v_reserved
    from public.reservations r
    where r.listing_id = old.id and r.status in ('requested', 'accepted', 'collected');
    if new.quantity < v_reserved then
      raise exception 'Listing quantity cannot be reduced below pending, accepted and collected quantities';
    end if;
  end if;
  if new.status <> 'available' and old.status = 'available' and exists (
    select 1 from public.reservations r where r.listing_id = old.id and r.status = 'accepted'
  ) then
    raise exception 'An active accepted reservation must be completed before withdrawing this listing';
  end if;
  return new;
end;
$$;

create or replace view public.food_marketplace
with (security_barrier = true, security_invoker = true)
as
select
  l.id,
  l.title,
  l.description,
  l.food_category,
  private.public_listing_available_quantity(l.id)::numeric(12,2) as quantity,
  l.quantity_unit,
  l.allergens,
  l.dietary_tags,
  l.country_code,
  l.city,
  l.available_from,
  l.available_until,
  l.created_at,
  o.name as organization_name
from public.food_listings l
join public.organizations o on o.id = l.organization_id
join public.countries c on c.code = l.country_code and c.is_enabled = true
where l.status = 'available'
  and l.available_until > now()
  and o.verification_status = 'verified'
  and private.public_listing_available_quantity(l.id) > 0;

revoke select (quantity) on public.food_listings from anon;
revoke all on public.food_marketplace from public;
grant select on public.food_marketplace to anon, authenticated;
