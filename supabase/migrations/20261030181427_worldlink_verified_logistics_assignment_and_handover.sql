create table if not exists public.reservation_logistics_assignments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  logistics_organization_id uuid not null references public.organizations(id) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','completed','cancelled')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservation_logistics_assignments enable row level security;
revoke all on public.reservation_logistics_assignments from public, anon, authenticated;
grant select on public.reservation_logistics_assignments to authenticated;

drop policy if exists logistics_assignments_read_participants on public.reservation_logistics_assignments;
create policy logistics_assignments_read_participants on public.reservation_logistics_assignments
for select to authenticated
using (
  private.is_platform_admin()
  or private.is_org_member(logistics_organization_id)
  or exists (
    select 1 from public.reservations r
    join public.food_listings l on l.id = r.listing_id
    where r.id = reservation_id
      and (r.requester_id = (select auth.uid()) or private.is_org_member(l.organization_id))
  )
);

create index if not exists reservation_logistics_org_status_idx
  on public.reservation_logistics_assignments(logistics_organization_id, status);

drop policy if exists reservations_participant_read on public.reservations;
create policy reservations_participant_read on public.reservations
for select to authenticated
using (
  requester_id = (select auth.uid())
  or exists (
    select 1 from public.food_listings l
    where l.id = reservations.listing_id
      and private.is_org_member(l.organization_id)
  )
  or exists (
    select 1 from public.reservation_logistics_assignments a
    where a.reservation_id = reservations.id
      and a.status = 'assigned'
      and private.is_org_member(a.logistics_organization_id)
  )
);

drop policy if exists listings_logistics_assigned_read on public.food_listings;
create policy listings_logistics_assigned_read on public.food_listings
for select to authenticated
using (
  exists (
    select 1
    from public.reservations r
    join public.reservation_logistics_assignments a on a.reservation_id = r.id
    where r.listing_id = food_listings.id
      and a.status = 'assigned'
      and private.is_org_member(a.logistics_organization_id)
  )
);

create or replace function private.list_verified_logistics_partners(p_country_code text)
returns table (id uuid, name text, country_code text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.countries c
    where c.code = upper(p_country_code) and c.is_enabled = true
  ) then raise exception 'Country is not enabled for WORLDLINK operations'; end if;
  return query
    select o.id, o.name, o.country_code
    from public.organizations o
    where o.kind = 'logistics'
      and o.verification_status = 'verified'
      and o.country_code = upper(p_country_code)
    order by o.name;
end;
$$;

create or replace function private.assign_logistics_partner(p_reservation_id uuid, p_logistics_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_listing public.food_listings%rowtype;
  v_reservation_status text;
  v_assignment_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select listing_id, status into v_listing_id, v_reservation_status
  from public.reservations where id = p_reservation_id for update;
  if v_listing_id is null then raise exception 'Reservation not found'; end if;
  if v_reservation_status <> 'accepted' then raise exception 'Only accepted reservations can be assigned to logistics'; end if;

  select * into v_listing from public.food_listings where id = v_listing_id for update;
  if not (private.is_org_manager(v_listing.organization_id) or private.is_platform_admin()) then
    raise exception 'Only the donor organisation manager or platform administrator can assign a logistics partner';
  end if;
  if not exists (
    select 1 from public.organizations o
    where o.id = p_logistics_organization_id
      and o.kind = 'logistics'
      and o.verification_status = 'verified'
      and o.country_code = v_listing.country_code
  ) then raise exception 'Choose a verified logistics organisation in the same country'; end if;
  if not exists (
    select 1 from public.countries c
    where c.code = v_listing.country_code and c.is_enabled = true
  ) then raise exception 'This country is not enabled for WORLDLINK operations'; end if;
  if exists (
    select 1 from public.reservation_logistics_assignments a
    where a.reservation_id = p_reservation_id and a.status = 'assigned'
  ) then raise exception 'A logistics partner is already assigned to this reservation'; end if;

  insert into public.reservation_logistics_assignments(reservation_id, logistics_organization_id, assigned_by)
  values (p_reservation_id, p_logistics_organization_id, auth.uid())
  returning id into v_assignment_id;

  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), v_listing.organization_id, 'logistics_partner_assigned', 'reservation', p_reservation_id,
          jsonb_build_object('logistics_organization_id', p_logistics_organization_id));

  return v_assignment_id;
end;
$$;

create or replace function private.complete_logistics_handover(p_reservation_id uuid, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.reservation_logistics_assignments%rowtype;
  v_requester_id uuid;
  v_listing_id uuid;
  v_listing public.food_listings%rowtype;
  v_handover_id uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_assignment from public.reservation_logistics_assignments
  where reservation_id = p_reservation_id and status = 'assigned' for update;
  if not found then raise exception 'No active logistics assignment exists for this reservation'; end if;
  if not private.is_org_manager(v_assignment.logistics_organization_id) then
    raise exception 'Only a manager of the assigned logistics organisation can complete this handover';
  end if;

  select listing_id, requester_id, status into v_listing_id, v_requester_id, v_status
  from public.reservations where id = p_reservation_id for update;
  if v_listing_id is null or v_status <> 'accepted' then raise exception 'Reservation is not ready for handover'; end if;

  select * into v_listing from public.food_listings where id = v_listing_id for update;
  if not private.can_create_handover(p_reservation_id, v_assignment.logistics_organization_id, auth.uid(), v_requester_id) then
    raise exception 'Logistics handover is not authorised';
  end if;

  insert into public.handovers(reservation_id, logistics_organization_id, handed_over_by, received_by, notes, completed_at)
  values (p_reservation_id, v_assignment.logistics_organization_id, auth.uid(), v_requester_id, nullif(trim(p_notes), ''), now())
  returning id into v_handover_id;

  update public.reservations set status = 'collected', updated_at = now() where id = p_reservation_id;
  update public.reservation_logistics_assignments
    set status = 'completed', completed_at = now(), updated_at = now()
    where id = v_assignment.id;

  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), v_assignment.logistics_organization_id, 'logistics_handover_completed', 'reservation', p_reservation_id,
          jsonb_build_object('handover_id', v_handover_id, 'donor_organization_id', v_listing.organization_id));

  return v_handover_id;
end;
$$;

revoke all on function private.list_verified_logistics_partners(text) from public, anon;
grant execute on function private.list_verified_logistics_partners(text) to authenticated;
revoke all on function private.assign_logistics_partner(uuid, uuid) from public, anon;
grant execute on function private.assign_logistics_partner(uuid, uuid) to authenticated;
revoke all on function private.complete_logistics_handover(uuid, text) from public, anon;
grant execute on function private.complete_logistics_handover(uuid, text) to authenticated;

create or replace function public.list_verified_logistics_partners(p_country_code text)
returns table (id uuid, name text, country_code text)
language sql security invoker set search_path = ''
as $$ select * from private.list_verified_logistics_partners(p_country_code); $$;
create or replace function public.assign_logistics_partner(p_reservation_id uuid, p_logistics_organization_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.assign_logistics_partner(p_reservation_id, p_logistics_organization_id); $$;
create or replace function public.complete_logistics_handover(p_reservation_id uuid, p_notes text default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.complete_logistics_handover(p_reservation_id, p_notes); $$;

revoke all on function public.list_verified_logistics_partners(text) from public, anon;
grant execute on function public.list_verified_logistics_partners(text) to authenticated;
revoke all on function public.assign_logistics_partner(uuid, uuid) from public, anon;
grant execute on function public.assign_logistics_partner(uuid, uuid) to authenticated;
revoke all on function public.complete_logistics_handover(uuid, text) from public, anon;
grant execute on function public.complete_logistics_handover(uuid, text) to authenticated;
