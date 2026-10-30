create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  event_key text not null unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists user_notifications_user_created_idx
on public.user_notifications(user_id, created_at desc);
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from public, anon, authenticated;
grant select on public.user_notifications to authenticated;
grant update(read_at) on public.user_notifications to authenticated;
drop policy if exists user_notifications_read_own on public.user_notifications;
create policy user_notifications_read_own on public.user_notifications for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists user_notifications_mark_read_own on public.user_notifications;
create policy user_notifications_mark_read_own on public.user_notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function private.enqueue_notification(
  p_user_id uuid, p_type text, p_title text, p_body text,
  p_entity_type text, p_entity_id uuid, p_event_key text
) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null or p_event_key is null then return; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,entity_type,entity_id,event_key)
  values (p_user_id,p_type,p_title,p_body,p_entity_type,p_entity_id,p_event_key)
  on conflict (event_key) do nothing;
end;
$$;
revoke all on function private.enqueue_notification(uuid,text,text,text,text,uuid,text) from public, anon, authenticated;

create or replace function private.notify_new_reservation()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_org_id uuid; v_title text; v_unit text; v_member record;
begin
  select organization_id,title,quantity_unit into v_org_id,v_title,v_unit
  from public.food_listings where id = new.listing_id;
  for v_member in select user_id from public.organization_members
    where organization_id = v_org_id and role in ('owner','admin','manager')
  loop
    perform private.enqueue_notification(v_member.user_id,'reservation_received','New food reservation',
      'A request for ' || new.quantity::text || ' ' || coalesce(v_unit,'units') || ' of ' || coalesce(v_title,'your food listing') || ' is waiting for review.',
      'reservation',new.id,'reservation:created:' || new.id::text || ':' || v_member.user_id::text);
  end loop;
  return new;
end;
$$;
revoke all on function private.notify_new_reservation() from public, anon, authenticated;
drop trigger if exists notify_new_reservation on public.reservations;
create trigger notify_new_reservation after insert on public.reservations
for each row execute function private.notify_new_reservation();

create or replace function private.notify_reservation_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_title text;
begin
  if old.status is distinct from new.status then
    select title into v_title from public.food_listings where id = new.listing_id;
    perform private.enqueue_notification(new.requester_id,'reservation_status',
      case when new.status = 'accepted' then 'Food reservation accepted'
           when new.status = 'rejected' then 'Food reservation declined'
           when new.status = 'collected' then 'Food collection confirmed'
           else 'Food reservation updated' end,
      'Your request for ' || coalesce(v_title,'a food listing') || ' is now ' || new.status || '.',
      'reservation',new.id,'reservation:status:' || new.id::text || ':' || new.status || ':' || new.requester_id::text);
  end if;
  return new;
end;
$$;
revoke all on function private.notify_reservation_status() from public, anon, authenticated;
drop trigger if exists notify_reservation_status on public.reservations;
create trigger notify_reservation_status after update of status on public.reservations
for each row execute function private.notify_reservation_status();

create or replace function private.notify_assistance_assignment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_member record;
begin
  if new.target_organization_id is not null
     and new.target_organization_id is distinct from old.target_organization_id
     and new.share_with_assigned_charity = true and new.consent_at is not null
     and new.status = 'matched' then
    perform private.enqueue_notification(new.requester_id,'assistance_assigned','Your food assistance request has been assigned',
      'A verified charity has been assigned to coordinate your request.',
      'assistance_request',new.id,'assistance:assigned:requester:' || new.id::text);
    for v_member in select user_id from public.organization_members
      where organization_id = new.target_organization_id and role in ('owner','admin','manager')
    loop
      perform private.enqueue_notification(v_member.user_id,'assistance_assigned','New consented assistance request',
        'A food assistance request has been assigned to your charity. Sign in to review it.',
        'assistance_request',new.id,'assistance:assigned:charity:' || new.id::text || ':' || v_member.user_id::text);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_assistance_assignment() from public, anon, authenticated;
drop trigger if exists notify_assistance_assignment on public.assistance_requests;
create trigger notify_assistance_assignment after update of target_organization_id,status on public.assistance_requests
for each row execute function private.notify_assistance_assignment();

create or replace function private.notify_organization_verification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.verification_status is distinct from new.verification_status
     and new.verification_status in ('verified','rejected') then
    perform private.enqueue_notification(new.created_by,'organization_verification',
      case when new.verification_status = 'verified' then 'Organisation verified' else 'Organisation verification update' end,
      'Your organisation "' || new.name || '" has been ' || new.verification_status || '.',
      'organization',new.id,'organization:verification:' || new.id::text || ':' || new.verification_status);
  end if;
  return new;
end;
$$;
revoke all on function private.notify_organization_verification() from public, anon, authenticated;
drop trigger if exists notify_organization_verification on public.organizations;
create trigger notify_organization_verification after update of verification_status on public.organizations
for each row execute function private.notify_organization_verification();

create or replace function private.notify_logistics_assignment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_member record;
begin
  if new.status = 'assigned' then
    for v_member in select user_id from public.organization_members
      where organization_id = new.logistics_organization_id and role in ('owner','admin','manager')
    loop
      perform private.enqueue_notification(v_member.user_id,'logistics_assignment','New food collection assignment',
        'A food collection has been assigned to your logistics organisation. Sign in to view the pickup details.',
        'reservation',new.reservation_id,'logistics:assigned:' || new.id::text || ':' || v_member.user_id::text);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_logistics_assignment() from public, anon, authenticated;
drop trigger if exists notify_logistics_assignment on public.reservation_logistics_assignments;
create trigger notify_logistics_assignment after insert on public.reservation_logistics_assignments
for each row execute function private.notify_logistics_assignment();

create or replace function private.notify_completed_handover()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_requester uuid; v_org_id uuid; v_member record;
begin
  if new.completed_at is not null then
    select r.requester_id,l.organization_id into v_requester,v_org_id
    from public.reservations r join public.food_listings l on l.id = r.listing_id
    where r.id = new.reservation_id;
    perform private.enqueue_notification(v_requester,'handover_completed','Food collection recorded',
      'A completed handover has been recorded for your food reservation.',
      'reservation',new.reservation_id,'handover:completed:recipient:' || new.reservation_id::text);
    for v_member in select user_id from public.organization_members
      where organization_id = v_org_id and role in ('owner','admin','manager')
    loop
      perform private.enqueue_notification(v_member.user_id,'handover_completed','Food handover completed',
        'A food reservation from your organisation has been marked as collected.',
        'reservation',new.reservation_id,'handover:completed:donor:' || new.reservation_id::text || ':' || v_member.user_id::text);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_completed_handover() from public, anon, authenticated;
drop trigger if exists notify_completed_handover on public.handovers;
create trigger notify_completed_handover after insert on public.handovers
for each row execute function private.notify_completed_handover();
