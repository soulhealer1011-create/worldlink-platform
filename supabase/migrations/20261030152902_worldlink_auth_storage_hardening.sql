create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, locale)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')), ''),
    coalesce(nullif(new.raw_user_meta_data->>'locale',''), 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_worldlink on auth.users;
create trigger on_auth_user_created_worldlink
after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('food-media','food-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists worldlink_food_media_public_read on storage.objects;
create policy worldlink_food_media_public_read on storage.objects for select using (bucket_id='food-media');

drop policy if exists worldlink_food_media_member_upload on storage.objects;
create policy worldlink_food_media_member_upload on storage.objects for insert to authenticated
with check (
  bucket_id='food-media'
  and (storage.foldername(name))[1] is not null
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists worldlink_food_media_manager_update on storage.objects;
create policy worldlink_food_media_manager_update on storage.objects for update to authenticated
using (
  bucket_id='food-media'
  and public.is_org_manager(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id='food-media'
  and public.is_org_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists worldlink_food_media_manager_delete on storage.objects;
create policy worldlink_food_media_manager_delete on storage.objects for delete to authenticated
using (
  bucket_id='food-media'
  and public.is_org_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists reservations_update_participant on public.reservations;
