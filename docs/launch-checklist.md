# WORLDLINK launch and acceptance checklist

This checklist distinguishes implemented product workflows from owner actions and external reviews still required before a public launch.

## 1. Owner account and administrator access
1. Open the production website and create an account using the email OTP flow.
2. Open /admin after signing in and copy the account UUID shown on the restricted-access screen.
3. In the WORLDLINK Supabase SQL Editor, run the first-administrator statement in supabase/admin/README.md, replacing the placeholder with the UUID of the trusted owner.
4. Sign out and sign in again, then confirm that /admin opens.

Administrator access must never be granted to an untrusted account.

## 2. Supabase Auth email configuration
Follow supabase/admin/auth-setup.md:
- Configure the deployed website as the Supabase Auth Site URL.
- Add the exact /auth/callback redirect URL.
- Configure the Magic Link template to include both the sign-in link and one-time code.
- Configure a verified sending domain and production SMTP provider before sending significant user volume.

## 3. End-to-end acceptance tests
Use test organisations and test accounts first.

### Donor to recipient
1. Register a business or community organisation.
2. As platform administrator, verify it.
3. Sign in as its owner/manager and publish a food listing.
4. Confirm the public marketplace shows the listing but never its pickup address.
5. Confirm allergens and dietary tags are displayed.
6. Sign in as a different user and request part of the available quantity.
7. As donor manager, accept or reject the reservation.
8. Confirm the collection using the donor or recipient account.
9. Confirm the reservation becomes collected and a handover audit record exists.
10. Try two concurrent requests that exceed inventory; the database must reject the excess reservation.

### Private food assistance
1. Submit one request without charity-sharing consent; confirm it is visible only to the requester and authorised platform administrators.
2. Submit a second request with explicit consent.
3. Assign it to a verified charity as administrator.
4. Confirm the assigned charity can see only its assigned request.
5. Mark the request fulfilled or closed and confirm the status changes.

### Organisation access
- Verify an organisation before publishing listings or receiving beneficiary requests.
- Confirm a manager of one organisation cannot manage another organisation's records.
- Confirm a user cannot reserve food published by their own organisation.

## 4. Country rollout
The database contains 248 country and territory records. Only 12 are enabled for the initial operational rollout. Before enabling another country, review local food redistribution, privacy, charity registration, tax, transport, consumer protection, safeguarding and data-transfer requirements. Do not treat the country catalogue as evidence of legal approval.

## 5. Mobile release
The Expo / React Native source is in apps/mobile.
- Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the mobile build environment.
- Link the app to the owner's Expo account and set the EAS project ID.
- Run the mobile typecheck and export workflow.
- Produce Android internal test builds and iOS TestFlight builds.
- Test sign-in, listing discovery, reservation, donor management and charity management on physical devices.
- Store submissions require the owner's Google Play Console and Apple Developer accounts and credentials.

No store build or store submission has been completed yet.

## 6. Legal, safety and operations
Before launch:
- Replace placeholders in /privacy and /terms with the registered operator's details, contacts, legal bases, retention rules, user-rights process, liability and governing law.
- Obtain legal review for each enabled country.
- Establish food safety, allergen, temperature-control, traceability, recall, safeguarding and incident-response procedures.
- Define organisation verification evidence and periodic re-verification.
- Decide how logistics partners are assigned and insured; GPS dispatch and route optimisation are not yet implemented.
- Decide whether any paid services, fundraising or payouts are needed. Payment processing is not currently enabled.

## 7. Hosting and source control
- Source repository: https://github.com/soulhealer1011-create/worldlink-platform
- Production website: https://worldlink-ujunwaedeh771-4486.vercel.app
- Supabase project region: London, UK.
- Vercel currently reports a temporary 100-deployment-per-24-hour limit. The existing production deployment remains live; recent code changes await the next permitted production deployment.
- The GitHub repository is currently public. Change its visibility in GitHub settings if the source code should be private.