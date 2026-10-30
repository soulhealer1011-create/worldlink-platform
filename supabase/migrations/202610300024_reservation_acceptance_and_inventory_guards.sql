create or replace function private.reserve_food_listing(p_listing_id uuid, p_quantity numeric)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_listing public.food_listings%rowtype; v_reserved numeric; v_reservation_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  select * into v_listing from public.food_listings where id = p_listing_id for update;
  if not found then raise exception 'Food listing not found'; end if;
  if v_listing.status <> 'available' or v_listing.available_until <= now() then raise exception 'This food listing is no longer available'; end if;
  if v_listing.available_from > now() then raise exception 'This food listing is not available yet'; end if;
  if not exists (select 1 from public.organizations o where o.id = v_listing.organization_id and o.verification_status = 'verified') then
    raise exception 'Donor organisation is not verified';
  end if;
  if not exists (select 1 from public.countries c where c.code = v_listing.country_code and c.is_enabled = true) then
    raise exception 'This country is not enabled for WORLDLINK operations';
  end if;
  if private.is_org_member(v_listing.organization_id) then raise exception 'You cannot reserve food listed by your own organisation'; end if;
  select coalesce(sum(r.quantity), 0) into v_reserved from public.reservations r
  where r.listing_id = p_listing_id and r.status in ('requested', 'accepted');
  if v_reserved + p_quantity > v_listing.quantity then raise exception 'Not enough food remains for this reservation'; end if;
  insert into public.reservations (listing_id, requester_id, quantity, status)
  values (p_listing_id, auth.uid(), p_quantity, 'requested') returning id into v_reservation_id;
  return v_reservation_id;
end;
$$;

create or replace function private.respond_to_food_reservation(p_reservation_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_listing public.food_listings%rowtype; v_status text; v_listing_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'Decision must be accepted or rejected'; end if;
  select listing_id into v_listing_id from public.reservations where id = p_reservation_id;
  if v_listing_id is null then raise exception 'Reservation not found'; end if;
  select * into v_listing from public.food_listings where id = v_listing_id for update;
  if not private.is_org_manager(v_listing.organization_id) then raise exception 'Only an organisation manager can respond to this reservation'; end if;
  select status into v_status from public.reservations where id = p_reservation_id and listing_id = v_listing_id for update;
  if v_status <> 'requested' then raise exception 'This reservation has already been processed'; end if;
  if p_decision = 'accepted' then
    if v_listing.status <> 'available' or v_listing.available_from > now() or v_listing.available_until <= now() then
      raise exception 'This listing is no longer available for acceptance';
    end if;
    if not exists (select 1 from public.organizations o where o.id = v_listing.organization_id and o.verification_status = 'verified') then
      raise exception 'Donor organisation is not verified';
    end if;
    if not exists (select 1 from public.countries c where c.code = v_listing.country_code and c.is_enabled = true) then
      raise exception 'This country is not enabled for WORLDLINK operations';
    end if;
  end if;
  update public.reservations set status = p_decision, updated_at = now() where id = p_reservation_id;
  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), v_listing.organization_id, 'food_reservation_decision', 'reservation', p_reservation_id,
          jsonb_build_object('decision', p_decision));
  return p_decision;
end;
$$;

create or replace function private.prevent_listing_inventory_below_reservations()
returns trigger language plpgsql set search_path = ''
as $$
declare v_reserved numeric;
begin
  if new.quantity < old.quantity then
    select coalesce(sum(r.quantity), 0) into v_reserved from public.reservations r
    where r.listing_id = old.id and r.status in ('requested', 'accepted');
    if new.quantity < v_reserved then
      raise exception 'Listing quantity cannot be reduced below pending and accepted reservation quantities';
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

drop trigger if exists food_listing_inventory_guard on public.food_listings;
create trigger food_listing_inventory_guard before update of quantity, status on public.food_listings
for each row execute function private.prevent_listing_inventory_below_reservations();

revoke all on function private.reserve_food_listing(uuid, numeric) from public, anon;
grant execute on function private.reserve_food_listing(uuid, numeric) to authenticated;
revoke all on function private.respond_to_food_reservation(uuid, text) from public, anon;
grant execute on function private.respond_to_food_reservation(uuid, text) to authenticated;
