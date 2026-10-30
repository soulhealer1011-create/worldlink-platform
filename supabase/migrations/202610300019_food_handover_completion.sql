create or replace function private.complete_food_handover(p_reservation_id uuid, p_notes text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_requester_id uuid;
  v_organization_id uuid;
  v_status text;
  v_handover_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select listing_id, requester_id, status into v_listing_id, v_requester_id, v_status
  from public.reservations where id = p_reservation_id;
  if v_listing_id is null then raise exception 'Reservation not found'; end if;
  select organization_id into v_organization_id from public.food_listings where id = v_listing_id for update;
  select status into v_status from public.reservations where id = p_reservation_id and listing_id = v_listing_id for update;
  if v_status <> 'accepted' then raise exception 'Only accepted reservations can be handed over'; end if;
  if not private.can_create_handover(p_reservation_id, null, auth.uid(), v_requester_id) then
    raise exception 'Only the donor organisation manager or recipient can confirm this handover';
  end if;
  insert into public.handovers(reservation_id, handed_over_by, received_by, notes, completed_at)
  values (p_reservation_id, auth.uid(), v_requester_id, nullif(trim(p_notes), ''), now())
  returning id into v_handover_id;
  update public.reservations set status = 'collected' where id = p_reservation_id;
  insert into public.audit_events(actor_id, organization_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), v_organization_id, 'food_handover_completed', 'reservation', p_reservation_id,
          jsonb_build_object('handover_id', v_handover_id));
  return v_handover_id;
end;
$$;

revoke all on function private.complete_food_handover(uuid, text) from public, anon;
grant execute on function private.complete_food_handover(uuid, text) to authenticated;

create or replace function public.complete_food_handover(p_reservation_id uuid, p_notes text default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.complete_food_handover(p_reservation_id, p_notes); $$;
revoke all on function public.complete_food_handover(uuid, text) from public, anon;
grant execute on function public.complete_food_handover(uuid, text) to authenticated;
