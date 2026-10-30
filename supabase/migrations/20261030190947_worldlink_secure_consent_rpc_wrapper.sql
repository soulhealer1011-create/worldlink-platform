create or replace function public.withdraw_assistance_sharing_consent(p_request_id uuid)
returns text language sql security definer set search_path = ''
as $$ select private.withdraw_assistance_sharing_consent(p_request_id); $$;
revoke all on function public.withdraw_assistance_sharing_consent(uuid) from public, anon;
grant execute on function public.withdraw_assistance_sharing_consent(uuid) to authenticated;
revoke all on function private.withdraw_assistance_sharing_consent(uuid) from public, anon, authenticated;
