revoke select on public.food_listings from anon;
revoke select on public.organizations from anon;
grant select (id, organization_id, status, title, description, food_category, quantity, quantity_unit, allergens, dietary_tags, country_code, city, available_from, available_until, created_at)
on public.food_listings to anon;
grant select (id, name, verification_status) on public.organizations to anon;

drop policy if exists listings_public_available_verified on public.food_listings;
create policy listings_public_available_verified on public.food_listings
for select to anon
using (
  status = 'available'
  and available_until > now()
  and exists (
    select 1 from public.organizations o
    where o.id = food_listings.organization_id
      and o.verification_status = 'verified'
  )
);

drop policy if exists organizations_public_verified_read on public.organizations;
create policy organizations_public_verified_read on public.organizations
for select to anon using (verification_status = 'verified');

create or replace view public.food_marketplace
with (security_invoker = true, security_barrier = true)
as
select l.id, l.title, l.description, l.food_category, l.quantity, l.quantity_unit,
       l.allergens, l.dietary_tags, l.country_code, l.city, l.available_from,
       l.available_until, l.created_at, o.name as organization_name
from public.food_listings l
join public.organizations o on o.id = l.organization_id
where l.status = 'available'
  and l.available_until > now()
  and o.verification_status = 'verified';

grant select on public.food_marketplace to anon;
