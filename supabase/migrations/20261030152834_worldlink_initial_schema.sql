create extension if not exists pgcrypto;

create table if not exists public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  default_locale text not null default 'en',
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country_code text references public.countries(code),
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  kind text not null check (kind in ('business','charity','logistics','community','other')),
  country_code text not null references public.countries(code),
  description text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','suspended')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.food_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 180),
  description text,
  food_category text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  quantity_unit text not null,
  allergens text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  country_code text not null references public.countries(code),
  city text not null,
  pickup_address text,
  pickup_latitude double precision,
  pickup_longitude double precision,
  available_from timestamptz not null,
  available_until timestamptz not null,
  status text not null default 'draft' check (status in ('draft','available','reserved','collected','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until > available_from),
  check ((pickup_latitude is null and pickup_longitude is null) or (pickup_latitude between -90 and 90 and pickup_longitude between -180 and 180))
);

create table if not exists public.assistance_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_organization_id uuid references public.organizations(id) on delete set null,
  country_code text not null references public.countries(code),
  city text not null,
  household_size integer not null default 1 check (household_size between 1 and 100),
  food_needs text[] not null default '{}',
  notes text,
  status text not null default 'open' check (status in ('open','matched','fulfilled','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.food_listings(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric(12,2) not null check (quantity > 0),
  status text not null default 'requested' check (status in ('requested','accepted','rejected','collected','cancelled')),
  pickup_code_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  logistics_organization_id uuid references public.organizations(id) on delete set null,
  handed_over_by uuid references auth.users(id),
  received_by uuid references auth.users(id),
  proof_path text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists food_listings_browse_idx on public.food_listings(country_code,city,status,available_until);
create index if not exists food_listings_org_idx on public.food_listings(organization_id,created_at desc);
create index if not exists assistance_requests_owner_idx on public.assistance_requests(requester_id,created_at desc);
create index if not exists reservations_requester_idx on public.reservations(requester_id,created_at desc);
create index if not exists organization_members_user_idx on public.organization_members(user_id,organization_id);

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid()) $$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.role in ('owner','admin','manager')) $$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.role in ('owner','admin')) $$;

create or replace function public.add_organization_creator()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.organization_members(organization_id,user_id,role)
  values (new.id,new.created_by,'owner') on conflict do nothing;
  return new;
end $$;

drop trigger if exists organizations_add_creator on public.organizations;
create trigger organizations_add_creator after insert on public.organizations
for each row execute function public.add_organization_creator();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists food_listings_updated_at on public.food_listings;
create trigger food_listings_updated_at before update on public.food_listings for each row execute function public.set_updated_at();
drop trigger if exists assistance_requests_updated_at on public.assistance_requests;
create trigger assistance_requests_updated_at before update on public.assistance_requests for each row execute function public.set_updated_at();
drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at before update on public.reservations for each row execute function public.set_updated_at();

alter table public.countries enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.food_listings enable row level security;
alter table public.assistance_requests enable row level security;
alter table public.reservations enable row level security;
alter table public.handovers enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists countries_read_enabled on public.countries;
create policy countries_read_enabled on public.countries for select using (is_enabled=true);
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists organizations_read_member on public.organizations;
create policy organizations_read_member on public.organizations for select to authenticated using (public.is_org_member(id));
drop policy if exists organizations_create_self on public.organizations;
create policy organizations_create_self on public.organizations for insert to authenticated with check (created_by=auth.uid());
drop policy if exists organizations_update_manager on public.organizations;
create policy organizations_update_manager on public.organizations for update to authenticated using (public.is_org_manager(id)) with check (public.is_org_manager(id));

drop policy if exists members_read_org on public.organization_members;
create policy members_read_org on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists members_add_manager on public.organization_members;
create policy members_add_manager on public.organization_members for insert to authenticated with check (public.is_org_manager(organization_id));
drop policy if exists members_update_admin on public.organization_members;
create policy members_update_admin on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists members_remove_admin on public.organization_members;
create policy members_remove_admin on public.organization_members for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists listings_public_available on public.food_listings;
create policy listings_public_available on public.food_listings for select using (status='available' and available_until>now());
drop policy if exists listings_org_read on public.food_listings;
create policy listings_org_read on public.food_listings for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists listings_create_manager on public.food_listings;
create policy listings_create_manager on public.food_listings for insert to authenticated with check (public.is_org_manager(organization_id));
drop policy if exists listings_update_manager on public.food_listings;
create policy listings_update_manager on public.food_listings for update to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

drop policy if exists assistance_owner_read on public.assistance_requests;
create policy assistance_owner_read on public.assistance_requests for select to authenticated using (requester_id=auth.uid());
drop policy if exists assistance_target_org_read on public.assistance_requests;
create policy assistance_target_org_read on public.assistance_requests for select to authenticated using (target_organization_id is not null and public.is_org_member(target_organization_id));
drop policy if exists assistance_create_self on public.assistance_requests;
create policy assistance_create_self on public.assistance_requests for insert to authenticated with check (requester_id=auth.uid());
drop policy if exists assistance_update_owner on public.assistance_requests;
create policy assistance_update_owner on public.assistance_requests for update to authenticated using (requester_id=auth.uid()) with check (requester_id=auth.uid());

drop policy if exists reservations_participant_read on public.reservations;
create policy reservations_participant_read on public.reservations for select to authenticated using (
  requester_id=auth.uid() or exists(select 1 from public.food_listings l where l.id=listing_id and public.is_org_member(l.organization_id))
);
drop policy if exists reservations_create_self on public.reservations;
create policy reservations_create_self on public.reservations for insert to authenticated with check (
  requester_id=auth.uid() and exists(select 1 from public.food_listings l where l.id=listing_id and l.status='available' and quantity<=l.quantity)
);
drop policy if exists reservations_update_participant on public.reservations;
create policy reservations_update_participant on public.reservations for update to authenticated using (
  requester_id=auth.uid() or exists(select 1 from public.food_listings l where l.id=listing_id and public.is_org_manager(l.organization_id))
) with check (
  requester_id=auth.uid() or exists(select 1 from public.food_listings l where l.id=listing_id and public.is_org_manager(l.organization_id))
);

drop policy if exists handovers_participant_read on public.handovers;
create policy handovers_participant_read on public.handovers for select to authenticated using (
  handed_over_by=auth.uid() or received_by=auth.uid() or (logistics_organization_id is not null and public.is_org_member(logistics_organization_id))
);
drop policy if exists handovers_create_participant on public.handovers;
create policy handovers_create_participant on public.handovers for insert to authenticated with check (
  handed_over_by=auth.uid() or (logistics_organization_id is not null and public.is_org_manager(logistics_organization_id))
);

drop policy if exists audit_read_admin on public.audit_events;
create policy audit_read_admin on public.audit_events for select to authenticated using (
  organization_id is not null and public.is_org_admin(organization_id)
);
drop policy if exists audit_insert_actor on public.audit_events;
create policy audit_insert_actor on public.audit_events for insert to authenticated with check (actor_id=auth.uid());

grant select on public.countries to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update on public.food_listings to anon, authenticated;
grant select, insert, update on public.assistance_requests to authenticated;
grant select, insert, update on public.reservations to authenticated;
grant select, insert on public.handovers to authenticated;
grant select, insert on public.audit_events to authenticated;

insert into public.countries(code,name,currency_code,default_locale,is_enabled) values
('NG','Nigeria','NGN','en-NG',true),
('GB','United Kingdom','GBP','en-GB',true),
('US','United States','USD','en-US',true),
('CA','Canada','CAD','en-CA',true),
('GH','Ghana','GHS','en-GH',true),
('KE','Kenya','KES','en-KE',true),
('ZA','South Africa','ZAR','en-ZA',true),
('IN','India','INR','en-IN',true),
('AU','Australia','AUD','en-AU',true),
('DE','Germany','EUR','de-DE',true),
('FR','France','EUR','fr-FR',true),
('AE','United Arab Emirates','AED','en-AE',true)
on conflict (code) do update set name=excluded.name,currency_code=excluded.currency_code,default_locale=excluded.default_locale,is_enabled=excluded.is_enabled;
