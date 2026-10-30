create index if not exists assistance_requests_country_code_idx on public.assistance_requests(country_code);
create index if not exists assistance_requests_target_organization_idx on public.assistance_requests(target_organization_id);
create index if not exists audit_events_actor_id_idx on public.audit_events(actor_id);
create index if not exists audit_events_organization_id_idx on public.audit_events(organization_id);
create index if not exists handovers_handed_over_by_idx on public.handovers(handed_over_by);
create index if not exists handovers_logistics_organization_idx on public.handovers(logistics_organization_id);
create index if not exists handovers_received_by_idx on public.handovers(received_by);
create index if not exists handovers_reservation_id_idx on public.handovers(reservation_id);
create index if not exists organizations_country_code_idx on public.organizations(country_code);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists organizations_verification_kind_idx on public.organizations(verification_status, kind);
create index if not exists platform_admins_granted_by_idx on public.platform_admins(granted_by);
create index if not exists profiles_country_code_idx on public.profiles(country_code);
create index if not exists reservations_listing_id_idx on public.reservations(listing_id);
create index if not exists reservations_listing_status_idx on public.reservations(listing_id, status);
create index if not exists food_listings_status_available_until_idx on public.food_listings(status, available_until);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists organizations_admin_read on public.organizations;
drop policy if exists organizations_read_member on public.organizations;
create policy organizations_read_authorized on public.organizations for select to authenticated
using ((select private.is_platform_admin()) or private.is_org_member(id));

drop policy if exists assistance_owner_read on public.assistance_requests;
drop policy if exists assistance_requests_admin_read on public.assistance_requests;
drop policy if exists assistance_target_org_read on public.assistance_requests;
create policy assistance_requests_read_authorized on public.assistance_requests for select to authenticated
using (requester_id = (select auth.uid()) or (select private.is_platform_admin())
  or (target_organization_id is not null and private.is_org_member(target_organization_id)));

drop policy if exists assistance_create_self on public.assistance_requests;
create policy assistance_create_self on public.assistance_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and target_organization_id is null and status = 'open');

drop policy if exists organizations_create_self on public.organizations;
create policy organizations_create_self on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()) and verification_status = 'pending');

drop policy if exists platform_admins_read_self on public.platform_admins;
create policy platform_admins_read_self on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists reservations_create_self on public.reservations;
drop policy if exists reservations_participant_read on public.reservations;
create policy reservations_participant_read on public.reservations for select to authenticated
using (requester_id = (select auth.uid()) or exists (
  select 1 from public.food_listings l where l.id = reservations.listing_id
    and private.is_org_member(l.organization_id)
));
