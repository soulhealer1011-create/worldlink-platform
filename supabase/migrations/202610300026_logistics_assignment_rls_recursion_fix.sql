create or replace function private.can_read_logistics_assignment(p_reservation_id uuid, p_logistics_organization_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare v_requester_id uuid; v_donor_organization_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if private.is_platform_admin() or private.is_org_member(p_logistics_organization_id) then return true; end if;
  select r.requester_id, l.organization_id into v_requester_id, v_donor_organization_id
  from public.reservations r join public.food_listings l on l.id = r.listing_id
  where r.id = p_reservation_id;
  if not found then return false; end if;
  return v_requester_id = auth.uid() or private.is_org_member(v_donor_organization_id);
end;
$$;
revoke all on function private.can_read_logistics_assignment(uuid, uuid) from public, anon;
grant execute on function private.can_read_logistics_assignment(uuid, uuid) to authenticated;

drop policy if exists logistics_assignments_read_participants on public.reservation_logistics_assignments;
create policy logistics_assignments_read_participants on public.reservation_logistics_assignments
for select to authenticated
using (private.can_read_logistics_assignment(reservation_id, logistics_organization_id));
