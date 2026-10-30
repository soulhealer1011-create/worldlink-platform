# WORLDLINK

International food-rescue and food-access platform connecting food donors, charities, people requesting assistance, and logistics partners.

## Monorepo
- `apps/web`: Next.js website with separate role-specific routes.
- `apps/mobile`: Expo / React Native application for Android and iOS.
- `supabase/migrations`: PostgreSQL schema, row-level security, storage and marketplace privacy migrations.
- `.github/workflows`: type-check and production build checks.

## Stack
Next.js 16, TypeScript, Expo 58, React Native, Supabase (Postgres, Auth, Storage), Vercel.

## Backend
Dedicated Supabase project: `znghtualrhwphvrwckpy` (London region).
- URL: `https://znghtualrhwphvrwckpy.supabase.co`
- Public publishable key: configure via environment variables; never place service-role keys in web or mobile bundles.
- Initial enabled country records: Nigeria, UK, US, Canada, Ghana, Kenya, South Africa, India, Australia, Germany, France and UAE.
- Public marketplace reads a restricted view that omits donor pickup addresses. Only verified organisations' active listings are exposed.

## Getting started
1. Install Node.js 22 and npm.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
4. Add the Supabase URL and publishable key.
5. Run `npm install`, then `npm run dev:web` or `npm run dev:mobile`.

## Website routes
- `/` home
- `/marketplace` public food listings
- `/donate` donor listing form
- `/request-help` private food assistance request
- `/organization/new` organisation registration
- `/business`, `/charities`, `/logistics`, `/impact` role-specific workspaces
- `/login` email one-time-link authentication
- `/account` signed-in account page

## Deploy website
Create a Vercel project linked to this GitHub repository, set the root directory to `apps/web`, and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the Supabase publishable key)

Set Node.js to 22.x. Configure Supabase Auth's allowed redirect URLs for the deployed website domain, including `/auth/callback`. Do not put a service-role key in Vercel public variables.

## Mobile
Use Expo SDK 58 / React Native. Configure the two `EXPO_PUBLIC_*` variables in your local Expo environment and use EAS Build after setting your Apple and Google application credentials.

## Production readiness
This is an implementation foundation with connected authentication and marketplace data paths, not a certified food-safety, legal, payments, identity-verification or emergency-response service. New organisations remain pending until reviewed. Donor listing creation is restricted to verified organisations. Launch country by country only after local food handling, privacy, charity, tax, consumer and transport rules have been reviewed. Payment collection and payouts are not enabled.
