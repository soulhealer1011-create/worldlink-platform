revoke all privileges on all tables in schema public from anon;

revoke select (
  id, organization_id, title, description, food_category, quantity, quantity_unit,
  allergens, dietary_tags, country_code, city, available_from, available_until,
  status, created_at
) on public.food_listings from anon;
revoke select (id, name, verification_status) on public.organizations from anon;

grant select on public.countries to anon;
grant select on public.food_marketplace to anon;
grant select (
  id, organization_id, title, description, food_category, quantity, quantity_unit,
  allergens, dietary_tags, country_code, city, available_from, available_until,
  status, created_at
) on public.food_listings to anon;
grant select (id, name, verification_status) on public.organizations to anon;
