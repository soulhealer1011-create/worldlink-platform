# Supabase migration workflow

The SQL files in supabase/migrations are the canonical migration history for the WORLDLINK Supabase project in London. Their numeric prefixes and names match the 27 migrations recorded in supabase_migrations.schema_migrations.

## Rules for future changes
1. Never edit a migration that has already been applied to a shared environment.
2. Create a new forward-only migration for every schema, policy, trigger or function change.
3. Apply the migration through the Supabase migration workflow so the database records its version and name.
4. Read the recorded version from the Supabase migration history and commit the exact SQL as supabase/migrations/VERSION_name.sql.
5. Before any CLI push, confirm the local migration list matches the remote migration history. Do not reset or repair the production migration history to work around a mismatch.
6. Test RLS and grants after each security-related migration, and run the Supabase security advisor.

The production database has 28 recorded migrations at the time of this document. The migration history was reconciled to the repository in the mobile-release PR so future CLI-based deployments do not try to replay the original schema on the live database.

Never put service-role keys or SMTP credentials in migration files or client bundles.