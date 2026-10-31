# Supabase Auth setup before user testing

## Site URL and redirects

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to the deployed WORLDLINK website origin (the production alias configured in Vercel).
- Add the exact callback URL: `https://worldlink-ujunwaedeh771-4486.vercel.app/auth/callback`.
- Add local development callback URL `http://localhost:3000/auth/callback` if local web development is required.

## Magic Link email template

The website uses the confirmation link. The mobile app accepts the one-time code. Use a template that includes both values so both clients work:

```html
<h2>Your WORLDLINK sign-in</h2>
<p><a href="{{ .ConfirmationURL }}">Sign in to WORLDLINK</a></p>
<p>Or enter this one-time code in the mobile app:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>If you did not request this message, you can ignore it.</p>
```

Paste this into Authentication → Email Templates → Magic Link. Test both the web link and the mobile code before launch.

## Production email

The built-in email sender is suitable only for limited testing. Configure a verified sending domain and custom SMTP provider before public launch. Keep SMTP credentials in Supabase Auth settings; never put them in the app or GitHub repository.

## Google sign-in (web and mobile)

In Supabase Dashboard → Authentication → Sign In / Providers → Google:

1. Enable Google.
2. Create a Google OAuth client in Google Cloud Console.
3. Add the Supabase Auth callback URI shown in the Supabase provider settings to the Google OAuth client's Authorized redirect URIs.
4. Save the Google client ID and client secret in the Supabase provider configuration only. Do not commit either value.
5. In Authentication → URL Configuration, add the production and local web callbacks above, plus the mobile deep link `worldlink://auth/callback`.
6. Confirm the OAuth consent screen is published or that every tester is listed as an allowed test user.

The mobile app uses the `worldlink://` URL scheme declared in `apps/mobile/app.json`. Rebuild the native app after changing its scheme or native configuration.

## Phone-number sign-in (web and mobile)

In Supabase Dashboard → Authentication → Sign In / Providers → Phone:

1. Enable phone authentication.
2. Configure a supported SMS provider (for example Twilio, Vonage, or MessageBird) with its credentials in Supabase Dashboard.
3. Configure an approved sender and international SMS delivery. Test Nigerian numbers in E.164 format (for example `+234...`) and at least one number in each intended launch country.
4. Set sensible OTP expiry and SMS rate limits. Do not expose provider credentials in client apps.

The apps expect phone numbers in E.164 format and verify the SMS OTP with Supabase Auth. SMS provider fees and country-specific delivery restrictions apply.

## Email confirmation troubleshooting

The web callback now accepts both PKCE `code` callbacks and Supabase `token_hash` verification links. Keep the redirect URLs allow-listed and use the callback route as the email redirect destination.

The hosted project's default email sender is heavily rate-limited and may reject messages to addresses outside the Supabase organisation. Configure custom SMTP with a verified sending domain before inviting public users. If a link is opened on another device or expires, request a fresh link; never reuse a consumed confirmation link.
