# WORLDLINK

International food-rescue and food-access platform connecting food donors, charities, people requesting assistance, and logistics partners.

## Monorepo
- `apps/web`: Next.js website.
- `apps/mobile`: Expo / React Native application for Android and iOS.
- `supabase/migrations`: PostgreSQL schema, row-level security, storage, workflow and country catalogue migrations.
- `.github/workflows`: web and mobile quality checks.

## Stack
Next.js 16, TypeScript, Expo 58, React Native, Supabase (Postgres, Auth, Storage), Vercel and GitHub.

## Backend
Dedicated Supabase project: `znghtualrhwphvrwckpy` (London region).
- URL: `https://znghtualrhwphvrwckpy.supabase.co`
- Client applications use the Supabase publishable key only. Never place service-role keys in web or mobile bundles.
- Country reference catalogue: 248 ISO country/territory records with currency and default-locale metadata. The initial operational rollout enables 12 countries: Nigeria, UK, US, Canada, Ghana, Kenya, South Africa, India, Australia, Germany, France and UAE. Other countries remain disabled pending local compliance and operational review.
- Public marketplace reads a restricted view that omits donor pickup addresses. Only verified organisations' active listings are exposed.
- Reservation requests use atomic inventory checks. Donors can accept or decline requests, and the donor or recipient can confirm completed collection through an audited handover record. Organisation verification and beneficiary request assignment are administrator-only. Assistance requests are shared with a charity only after explicit consent.
- Supabase security advisor currently reports no security findings. Remaining performance notices are unused-index information on a pre-launch database with no operational traffic.

## Getting started
1. Install Node.js 22.13+ and npm.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
4. Set the Supabase URL and publishable key in each environment.
5. Run `npm install`, then `npm run dev:web` or `npm run dev:mobile`.

## Website routes
- `/` home
- `/marketplace` public food listings and reservation requests
- `/donate` donor listing form
- `/request-help` private assistance request with explicit sharing consent
- `/organization/new` organisation registration
- `/business`, `/charities`, `/logistics`, `/impact` portals
- `/login`, `/account` authentication and private account workspace
- `/admin` restricted organisation verification and consent-based assistance assignment
- `/privacy`, `/terms` draft policies requiring legal completion before launch

## First administrator
Administrator access is not self-service. Follow [the first-admin bootstrap instructions](supabase/admin/README.md) after the trusted owner has created an account.

## Deploy website
Vercel project root: `apps/web`. Node.js: 22.x. Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase publishable key)

Configure Supabase Auth's Site URL and allowed redirect URLs to include the deployed website origin and `/auth/callback`.

## Mobile
Use Expo SDK 58 / React Native. Configure the two `EXPO_PUBLIC_*` variables in the mobile environment. EAS build profiles are in `apps/mobile/eas.json`; native builds and store submissions still require the owner's Expo, Apple Developer and Google Play Console credentials.

## Production readiness
This is a functioning implementation foundation, not a certified food-safety, legal, payments, identity-verification or emergency-response service. New organisations remain pending until reviewed. Launch country by country only after local food handling, privacy, charity, tax, consumer and transport rules have been reviewed. Payment collection and payouts are not enabled. GPS tracking, dispatch optimisation, live messaging, external email delivery and app-store publishing are not yet enabled.
