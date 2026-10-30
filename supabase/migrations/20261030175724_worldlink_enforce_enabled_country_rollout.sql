drop policy if exists organizations_create_self on public.organizations;
create policy organizations_create_self on public.organizations
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and verification_status = 'pending'
  and exists (select 1 from public.countries c where c.code = organizations.country_code and c.is_enabled = true)
);

drop policy if exists assistance_create_self on public.assistance_requests;
create policy assistance_create_self on public.assistance_requests
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and target_organization_id is null
  and status = 'open'
  and exists (select 1 from public.countries c where c.code = assistance_requests.country_code and c.is_enabled = true)
);

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
  and exists (select 1 from public.countries c where c.code = food_listings.country_code and c.is_enabled = true)
);
