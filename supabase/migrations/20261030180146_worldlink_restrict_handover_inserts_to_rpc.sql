drop policy if exists handovers_create_participant on public.handovers;
revoke insert on public.handovers from public, anon, authenticated;
