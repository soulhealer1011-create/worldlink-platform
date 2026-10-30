# Grant the first WORLDLINK platform administrator

Platform administrator access is intentionally not self-service. Do this only for the trusted project owner.

1. Sign up or sign in to WORLDLINK at the deployed website.
2. Open `/admin`. If access has not been granted, the page displays the signed-in account UUID.
3. In Supabase Dashboard → SQL Editor for the WORLDLINK project, run the statement below after replacing the UUID with the trusted owner's account ID:

```sql
insert into public.platform_admins (user_id)
values ('REPLACE_WITH_TRUSTED_OWNER_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

The `platform_admins` table has RLS enabled. Authenticated users can read only their own admin row; no client can grant itself administrator access. The SQL Editor/project owner is the only bootstrap path.

After the row is inserted, sign out and sign in again, then open `/admin`. The administrator can verify organisations and assign assistance requests only when the requester explicitly consented to charity sharing.
