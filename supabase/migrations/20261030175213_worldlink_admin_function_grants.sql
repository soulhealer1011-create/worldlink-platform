revoke all on function private.verify_organization(uuid, text) from public, anon;
revoke all on function private.assign_assistance_request(uuid, uuid) from public, anon;
grant execute on function private.verify_organization(uuid, text) to authenticated;
grant execute on function private.assign_assistance_request(uuid, uuid) to authenticated;

grant select on public.platform_admins to authenticated;
drop policy if exists platform_admins_read_self on public.platform_admins;
create policy platform_admins_read_self on public.platform_admins
for select to authenticated using (user_id = auth.uid());
