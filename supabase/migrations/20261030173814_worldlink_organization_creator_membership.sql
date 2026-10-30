create or replace function public.add_organization_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.add_organization_creator_as_owner() from public, anon, authenticated;
drop trigger if exists organizations_add_creator_owner on public.organizations;
create trigger organizations_add_creator_owner
after insert on public.organizations
for each row execute function public.add_organization_creator_as_owner();
