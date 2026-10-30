create schema if not exists marketplace_api;
grant usage on schema marketplace_api to anon, authenticated;

create or replace function marketplace_api.public_listing_available_quantity(p_listing_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total numeric;
  v_reserved numeric;
begin
  select l.quantity into v_total
  from public.food_listings l
  join public.organizations o on o.id = l.organization_id
  join public.countries c on c.code = l.country_code and c.is_enabled = true
  where l.id = p_listing_id
    and l.status = 'available'
    and l.available_until > now()
    and o.verification_status = 'verified';
  if not found then return null; end if;

  select coalesce(sum(r.quantity), 0) into v_reserved
  from public.reservations r
  where r.listing_id = p_listing_id
    and r.status in ('requested', 'accepted', 'collected');
  return greatest(v_total - v_reserved, 0);
end;
$$;

revoke all on function marketplace_api.public_listing_available_quantity(uuid) from public, anon;
grant execute on function marketplace_api.public_listing_available_quantity(uuid) to anon, authenticated;

create or replace view public.food_marketplace
with (security_barrier = true, security_invoker = true)
as
select
  l.id,
  l.title,
  l.description,
  l.food_category,
  marketplace_api.public_listing_available_quantity(l.id)::numeric(12,2) as quantity,
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
join public.countries c on c.code = l.country_code and c.is_enabled = true
where l.status = 'available'
  and l.available_until > now()
  and o.verification_status = 'verified'
  and marketplace_api.public_listing_available_quantity(l.id) > 0;

revoke usage on schema private from anon;
revoke all on function private.public_listing_available_quantity(uuid) from anon;
revoke all on function private.prevent_listing_inventory_below_reservations() from anon;
