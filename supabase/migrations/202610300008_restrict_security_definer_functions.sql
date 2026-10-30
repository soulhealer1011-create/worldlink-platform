revoke all on function public.add_organization_creator() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_org_admin(uuid) from public, anon;
revoke all on function public.is_org_manager(uuid) from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;