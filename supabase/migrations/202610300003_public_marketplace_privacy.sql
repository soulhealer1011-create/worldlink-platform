-- Restrict direct table reads and expose only safe, verified marketplace fields.
drop policy if exists listings_public_available on public.food_listings;
drop policy if exists listings_manager_write on public.food_listings;
drop policy if exists listings_create_manager on public.food_listings;
drop policy if exists listings_update_manager on public.food_listings;
create policy listings_manager_insert_verified on public.food_listings for insert to authenticated
with check (public.is_org_manager(organization_id) and exists(select 1 from public.organizations o where o.id=organization_id and o.verification_status='verified'));
create policy listings_manager_update_verified on public.food_listings for update to authenticated
using(public.is_org_manager(organization_id))
with check(public.is_org_manager(organization_id) and exists(select 1 from public.organizations o where o.id=organization_id and o.verification_status='verified'));
revoke select on public.food_listings from anon;
grant select on public.food_listings to authenticated;
create or replace view public.food_marketplace with (security_barrier=true) as
select l.id,l.title,l.description,l.food_category,l.quantity,l.quantity_unit,l.allergens,l.dietary_tags,
l.country_code,l.city,l.available_from,l.available_until,l.created_at,o.name as organization_name
from public.food_listings l join public.organizations o on o.id=l.organization_id
where l.status='available' and l.available_until>now() and o.verification_status='verified';
grant select on public.food_marketplace to anon,authenticated;
