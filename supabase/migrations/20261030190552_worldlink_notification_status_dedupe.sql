create or replace function private.notify_reservation_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_title text;
begin
  if old.status is distinct from new.status
     and new.status in ('accepted','rejected','cancelled') then
    select title into v_title from public.food_listings where id = new.listing_id;
    perform private.enqueue_notification(
      new.requester_id,'reservation_status',
      case when new.status = 'accepted' then 'Food reservation accepted'
           when new.status = 'rejected' then 'Food reservation declined'
           else 'Food reservation cancelled' end,
      'Your request for ' || coalesce(v_title,'a food listing') || ' is now ' || new.status || '.',
      'reservation',new.id,
      'reservation:status:' || new.id::text || ':' || new.status || ':' || new.requester_id::text
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_reservation_status() from public, anon, authenticated;
