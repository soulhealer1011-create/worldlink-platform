create or replace function private.update_assistance_request_status(p_request_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('fulfilled', 'closed') then raise exception 'Status must be fulfilled or closed'; end if;
  select target_organization_id, status into v_org_id, v_status
  from public.assistance_requests where id = p_request_id for update;
  if v_org_id is null then raise exception 'Request is not assigned to a charity'; end if;
  if not private.is_org_manager(v_org_id) then raise exception 'Only a charity manager can update this request'; end if;
  if not exists (select 1 from public.organizations o where o.id = v_org_id and o.kind = 'charity' and o.verification_status = 'verified') then
    raise exception 'Assigned organisation is not a verified charity';
  end if;
  if v_status <> 'matched' then raise exception 'Only matched requests can be completed or closed'; end if;
  update public.assistance_requests set status = p_status, updated_at = now() where id = p_request_id;
  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), v_org_id, 'assistance_request_status', 'assistance_request', p_request_id,
          jsonb_build_object('status', p_status));
  return p_status;
end;
$$;

revoke all on function private.update_assistance_request_status(uuid, text) from public, anon;
grant execute on function private.update_assistance_request_status(uuid, text) to authenticated;

create or replace function public.update_assistance_request_status(p_request_id uuid, p_status text)
returns text language sql security invoker set search_path = ''
as $$ select private.update_assistance_request_status(p_request_id, p_status); $$;
revoke all on function public.update_assistance_request_status(uuid, text) from public, anon;
grant execute on function public.update_assistance_request_status(uuid, text) to authenticated;
