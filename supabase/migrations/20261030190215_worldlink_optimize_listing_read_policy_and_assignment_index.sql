create index if not exists reservation_logistics_assignments_assigned_by_idx
on public.reservation_logistics_assignments(assigned_by);

drop policy if exists listings_logistics_assigned_read on public.food_listings;
drop policy if exists listings_org_read on public.food_listings;
create policy listings_authenticated_read on public.food_listings
for select to authenticated
using (
  private.is_org_member(organization_id)
  or exists (
    select 1
    from public.reservations r
    join public.reservation_logistics_assignments a on a.reservation_id = r.id
    where r.listing_id = food_listings.id
      and a.status = 'assigned'
      and private.is_org_member(a.logistics_organization_id)
  )
);
