drop policy if exists organizations_update_manager on public.organizations;
revoke update on public.organizations from public, anon, authenticated;

drop policy if exists organizations_create_self on public.organizations;
create policy organizations_create_self on public.organizations
for insert to authenticated
with check (created_by = auth.uid() and verification_status = 'pending');

drop policy if exists assistance_update_owner on public.assistance_requests;
revoke update on public.assistance_requests from public, anon, authenticated;

drop policy if exists assistance_create_self on public.assistance_requests;
create policy assistance_create_self on public.assistance_requests
for insert to authenticated
with check (requester_id = auth.uid() and target_organization_id is null and status = 'open');

alter table public.assistance_requests
  drop constraint if exists assistance_requests_consent_timestamp_check;
alter table public.assistance_requests
  add constraint assistance_requests_consent_timestamp_check
  check (share_with_assigned_charity = (consent_at is not null));

drop policy if exists listings_manager_insert_verified on public.food_listings;
create policy listings_manager_insert_verified on public.food_listings
for insert to authenticated
with check (
  private.is_org_manager(organization_id)
  and status in ('draft', 'available')
  and exists (
    select 1 from public.organizations o
    where o.id = food_listings.organization_id
      and o.verification_status = 'verified'
  )
);

create or replace function private.can_create_handover(
  p_reservation_id uuid, p_logistics_organization_id uuid, p_handed_over_by uuid, p_received_by uuid
)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare v_requester uuid; v_donor_org uuid; v_status text;
begin
  if auth.uid() is null or p_handed_over_by <> auth.uid() then return false; end if;
  select r.requester_id, l.organization_id, r.status into v_requester, v_donor_org, v_status
  from public.reservations r join public.food_listings l on l.id = r.listing_id
  where r.id = p_reservation_id;
  if not found or v_status <> 'accepted' then return false; end if;
  if p_received_by is not null and p_received_by <> v_requester then return false; end if;
  if p_logistics_organization_id is not null then
    if not exists (select 1 from public.organizations o where o.id = p_logistics_organization_id and o.kind = 'logistics' and o.verification_status = 'verified') then return false; end if;
    if not private.is_org_manager(p_logistics_organization_id) then return false; end if;
  end if;
  return v_requester = auth.uid() or private.is_org_manager(v_donor_org)
    or (p_logistics_organization_id is not null and private.is_org_manager(p_logistics_organization_id));
end;
$$;

create or replace function private.can_read_handover(
  p_reservation_id uuid, p_logistics_organization_id uuid, p_handed_over_by uuid, p_received_by uuid
)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare v_requester uuid; v_donor_org uuid;
begin
  if auth.uid() is null then return false; end if;
  select r.requester_id, l.organization_id into v_requester, v_donor_org
  from public.reservations r join public.food_listings l on l.id = r.listing_id
  where r.id = p_reservation_id;
  if not found then return false; end if;
  return p_handed_over_by = auth.uid() or p_received_by = auth.uid() or v_requester = auth.uid()
    or private.is_org_member(v_donor_org)
    or (p_logistics_organization_id is not null and private.is_org_member(p_logistics_organization_id));
end;
$$;

revoke all on function private.can_create_handover(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function private.can_read_handover(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function private.can_create_handover(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.can_read_handover(uuid, uuid, uuid, uuid) to authenticated;

drop policy if exists handovers_create_participant on public.handovers;
create policy handovers_create_participant on public.handovers
for insert to authenticated
with check (private.can_create_handover(reservation_id, logistics_organization_id, handed_over_by, received_by));

drop policy if exists handovers_participant_read on public.handovers;
create policy handovers_participant_read on public.handovers
for select to authenticated
using (private.can_read_handover(reservation_id, logistics_organization_id, handed_over_by, received_by));

drop policy if exists audit_insert_actor on public.audit_events;
revoke insert on public.audit_events from public, anon, authenticated;
