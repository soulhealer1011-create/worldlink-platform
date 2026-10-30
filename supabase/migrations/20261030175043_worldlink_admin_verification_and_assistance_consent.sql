alter table public.assistance_requests
  add column if not exists share_with_assigned_charity boolean not null default false,
  add column if not exists consent_at timestamptz;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
$$;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;

drop policy if exists organizations_admin_read on public.organizations;
create policy organizations_admin_read on public.organizations
for select to authenticated using (private.is_platform_admin());

drop policy if exists assistance_requests_admin_read on public.assistance_requests;
create policy assistance_requests_admin_read on public.assistance_requests
for select to authenticated using (private.is_platform_admin());

create or replace function private.verify_organization(p_organization_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if p_status not in ('verified', 'rejected', 'suspended', 'pending') then
    raise exception 'Invalid verification status';
  end if;
  update public.organizations
  set verification_status = p_status, updated_at = now()
  where id = p_organization_id;
  if not found then raise exception 'Organisation not found'; end if;
  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), p_organization_id, 'organization_verification', 'organization', p_organization_id,
          jsonb_build_object('verification_status', p_status));
  return p_status;
end;
$$;

create or replace function private.assign_assistance_request(p_request_id uuid, p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.assistance_requests%rowtype;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  select * into v_request from public.assistance_requests where id = p_request_id for update;
  if not found then raise exception 'Assistance request not found'; end if;
  if not v_request.share_with_assigned_charity then
    raise exception 'The requester has not consented to share this request with an assigned charity';
  end if;
  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.kind = 'charity' and o.verification_status = 'verified'
  ) then
    raise exception 'Choose a verified charity organisation';
  end if;
  update public.assistance_requests
  set target_organization_id = p_organization_id, status = 'matched', updated_at = now()
  where id = p_request_id;
  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), p_organization_id, 'assistance_request_assigned', 'assistance_request', p_request_id,
          jsonb_build_object('requester_id', v_request.requester_id));
  return p_request_id;
end;
$$;

grant execute on function private.verify_organization(uuid, text) to authenticated;
grant execute on function private.assign_assistance_request(uuid, uuid) to authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.is_platform_admin(); $$;

create or replace function public.verify_organization(p_organization_id uuid, p_status text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.verify_organization(p_organization_id, p_status); $$;

create or replace function public.assign_assistance_request(p_request_id uuid, p_organization_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.assign_assistance_request(p_request_id, p_organization_id); $$;

revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.verify_organization(uuid, text) from public, anon;
revoke all on function public.assign_assistance_request(uuid, uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.verify_organization(uuid, text) to authenticated;
grant execute on function public.assign_assistance_request(uuid, uuid) to authenticated;
