# WORLDLINK

International food-rescue and food-access platform connecting food donors, charities, people requesting assistance, and logistics partners.

## Monorepo
- `apps/web`: Next.js website with separate role-specific routes.
- `apps/mobile`: Expo / React Native application for Android and iOS.
- `supabase/migrations`: PostgreSQL schema, RLS policies and storage setup.
- `.github/workflows`: continuous integration.

## Stack
Next.js, TypeScript, Expo, React Native, Supabase (Postgres, Auth, Storage), Vercel.

## Getting started
1. Install Node.js 22.13+ and npm.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
4. Add your Supabase project URL and publishable/anon key.
5. Run `npm install`, then `npm run dev:web` or `npm run dev:mobile`.

Never put a Supabase service-role key in a browser or mobile bundle.

## Backend
The initial migration is in `supabase/migrations`. Apply it to the dedicated WORLDLINK Supabase project using the Supabase CLI or SQL editor. Review and test all RLS policies before production launch.

## Deployment
Deploy `apps/web` on Vercel with the root directory set to `apps/web`. Configure the public Supabase URL and publishable key as environment variables. Build mobile binaries with EAS after setting the Expo environment variables.

## Important
This repository is an initial implementation foundation, not a certified food-safety, legal, payments, identity-verification or emergency-response service. Launch country by country only after local food handling, privacy, charity, tax and consumer rules have been reviewed. Payment collection and payouts are not enabled by default.
