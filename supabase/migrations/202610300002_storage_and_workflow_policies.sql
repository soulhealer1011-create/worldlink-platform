-- WORLDLINK private handover evidence and public donor media storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('food-media','food-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists worldlink_food_media_public_read on storage.objects;
create policy worldlink_food_media_public_read on storage.objects for select using(bucket_id='food-media');
drop policy if exists worldlink_food_media_member_upload on storage.objects;
create policy worldlink_food_media_member_upload on storage.objects for insert to authenticated
with check(bucket_id='food-media' and (storage.foldername(name))[1] is not null and public.is_org_member(((storage.foldername(name))[1])::uuid));
drop policy if exists worldlink_food_media_manager_update on storage.objects;
create policy worldlink_food_media_manager_update on storage.objects for update to authenticated
using(bucket_id='food-media' and public.is_org_manager(((storage.foldername(name))[1])::uuid))
with check(bucket_id='food-media' and public.is_org_manager(((storage.foldername(name))[1])::uuid));
drop policy if exists worldlink_food_media_manager_delete on storage.objects;
create policy worldlink_food_media_manager_delete on storage.objects for delete to authenticated
using(bucket_id='food-media' and public.is_org_manager(((storage.foldername(name))[1])::uuid));
drop policy if exists reservations_participant_update on public.reservations;
create policy reservations_participant_update on public.reservations for update to authenticated
using(requester_id=auth.uid() or exists(select 1 from public.food_listings l where l.id=listing_id and public.is_org_manager(l.organization_id)))
with check(requester_id=auth.uid() or exists(select 1 from public.food_listings l where l.id=listing_id and public.is_org_manager(l.organization_id)));
drop policy if exists handovers_create_participant on public.handovers;
create policy handovers_create_participant on public.handovers for insert to authenticated
with check(handed_over_by=auth.uid() or (logistics_organization_id is not null and public.is_org_manager(logistics_organization_id)));
drop policy if exists audit_insert_actor on public.audit_events;
create policy audit_insert_actor on public.audit_events for insert to authenticated with check(actor_id=auth.uid());
