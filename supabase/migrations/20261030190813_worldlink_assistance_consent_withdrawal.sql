create or replace function private.withdraw_assistance_sharing_consent(p_request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_requester uuid; v_target_org uuid; v_share boolean; v_member record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select requester_id,target_organization_id,share_with_assigned_charity
  into v_requester,v_target_org,v_share
  from public.assistance_requests where id = p_request_id for update;
  if not found then raise exception 'Assistance request not found'; end if;
  if v_requester <> auth.uid() then raise exception 'Only the requester can withdraw sharing consent'; end if;
  if not v_share then return 'open'; end if;
  update public.assistance_requests
  set share_with_assigned_charity = false, consent_at = null,
      target_organization_id = null, status = 'open', updated_at = now()
  where id = p_request_id;
  if v_target_org is not null then
    for v_member in select user_id from public.organization_members
      where organization_id = v_target_org and role in ('owner','admin','manager')
    loop
      perform private.enqueue_notification(v_member.user_id,'assistance_consent_withdrawn',
        'Assistance request sharing withdrawn',
        'A requester withdrew sharing consent. This request is no longer available to your charity.',
        'assistance_request',p_request_id,
        'assistance:consent_withdrawn:charity:' || p_request_id::text || ':' || v_member.user_id::text);
    end loop;
  end if;
  perform private.enqueue_notification(v_requester,'assistance_consent_withdrawn',
    'Your sharing consent was withdrawn',
    'Your assistance request is private again and is no longer assigned to a charity.',
    'assistance_request',p_request_id,
    'assistance:consent_withdrawn:requester:' || p_request_id::text);
  return 'open';
end;
$$;
revoke all on function private.withdraw_assistance_sharing_consent(uuid) from public, anon, authenticated;
grant execute on function private.withdraw_assistance_sharing_consent(uuid) to authenticated;
create or replace function public.withdraw_assistance_sharing_consent(p_request_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.withdraw_assistance_sharing_consent(p_request_id); $$;
revoke all on function public.withdraw_assistance_sharing_consent(uuid) from public, anon;
grant execute on function public.withdraw_assistance_sharing_consent(uuid) to authenticated;
