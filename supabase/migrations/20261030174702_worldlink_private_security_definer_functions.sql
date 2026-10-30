create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_org_admin(uuid) set schema private;
alter function public.is_org_manager(uuid) set schema private;
alter function public.is_org_member(uuid) set schema private;
alter function public.add_organization_creator_as_owner() set schema private;
alter function public.add_organization_creator() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.reserve_food_listing(uuid, numeric) set schema private;
alter function public.respond_to_food_reservation(uuid, text) set schema private;
alter function public.cancel_food_reservation(uuid) set schema private;

create or replace function private.respond_to_food_reservation(p_reservation_id uuid, p_decision text)
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'Decision must be accepted or rejected'; end if;
  select listing_id into v_listing_id from public.reservations where id = p_reservation_id;
  if v_listing_id is null then raise exception 'Reservation not found'; end if;
  select organization_id into v_org_id from public.food_listings where id = v_listing_id for update;
  if not private.is_org_manager(v_org_id) then raise exception 'Only an organisation manager can respond to this reservation'; end if;
  select status into v_status from public.reservations where id = p_reservation_id and listing_id = v_listing_id for update;
  if v_status <> 'requested' then raise exception 'This reservation has already been processed'; end if;
  update public.reservations set status = p_decision, updated_at = now() where id = p_reservation_id;
  return p_decision;
end;
$$;

grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_manager(uuid) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.reserve_food_listing(uuid, numeric) to authenticated;
grant execute on function private.respond_to_food_reservation(uuid, text) to authenticated;
grant execute on function private.cancel_food_reservation(uuid) to authenticated;
revoke all on function private.add_organization_creator_as_owner() from public, anon, authenticated;
revoke all on function private.add_organization_creator() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.reserve_food_listing(p_listing_id uuid, p_quantity numeric)
returns uuid language sql security invoker set search_path = ''
as $$ select private.reserve_food_listing(p_listing_id, p_quantity); $$;
create or replace function public.respond_to_food_reservation(p_reservation_id uuid, p_decision text)
returns text language sql security invoker set search_path = ''
as $$ select private.respond_to_food_reservation(p_reservation_id, p_decision); $$;
create or replace function public.cancel_food_reservation(p_reservation_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.cancel_food_reservation(p_reservation_id); $$;

revoke all on function public.reserve_food_listing(uuid, numeric) from public, anon;
revoke all on function public.respond_to_food_reservation(uuid, text) from public, anon;
revoke all on function public.cancel_food_reservation(uuid) from public, anon;
grant execute on function public.reserve_food_listing(uuid, numeric) to authenticated;
grant execute on function public.respond_to_food_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_food_reservation(uuid) to authenticated;
