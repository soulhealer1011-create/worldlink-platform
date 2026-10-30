create or replace view public.food_marketplace
with (security_barrier = true, security_invoker = true)
as
select
  l.id,
  l.title,
  l.description,
  l.food_category,
  l.quantity,
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
where l.status = 'available'
  and l.available_until > now()
  and o.verification_status = 'verified';

revoke all on public.food_marketplace from public;
grant select on public.food_marketplace to anon, authenticated;

revoke select on public.food_listings from anon;
grant select (
  id, organization_id, title, description, food_category, quantity, quantity_unit,
  allergens, dietary_tags, country_code, city, available_from, available_until,
  status, created_at
) on public.food_listings to anon;

revoke select on public.organizations from anon;
grant select (id, name, verification_status) on public.organizations to anon;
