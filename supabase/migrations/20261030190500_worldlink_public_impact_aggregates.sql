create or replace view public.public_impact_summary
with (security_barrier = true)
as
select
  (select count(*)::bigint from public.food_marketplace) as active_listing_count,
  coalesce((
    select jsonb_object_agg(x.quantity_unit, x.available_quantity)
    from (
      select quantity_unit, sum(quantity)::numeric as available_quantity
      from public.food_marketplace
      group by quantity_unit
    ) x
  ), '{}'::jsonb) as available_quantity_by_unit,
  (select count(distinct h.reservation_id)::bigint
   from public.handovers h where h.completed_at is not null) as completed_handover_count,
  coalesce((
    select jsonb_object_agg(x.quantity_unit, x.rescued_quantity)
    from (
      select l.quantity_unit, sum(r.quantity)::numeric as rescued_quantity
      from (
        select distinct on (reservation_id) reservation_id
        from public.handovers
        where completed_at is not null
        order by reservation_id, completed_at desc, created_at desc
      ) h
      join public.reservations r on r.id = h.reservation_id
      join public.food_listings l on l.id = r.listing_id
      group by l.quantity_unit
    ) x
  ), '{}'::jsonb) as rescued_quantity_by_unit;

revoke all on public.public_impact_summary from public;
grant select on public.public_impact_summary to anon, authenticated;
