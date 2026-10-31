# Supabase Auth setup before user testing

## Site URL and redirects

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to the production WORLDLINK origin: `https://worldlink-platform.vercel.app`.
- In Vercel → Project → Settings → Environment Variables, set `NEXT_PUBLIC_SITE_URL` to `https://worldlink-platform.vercel.app` for Production, Preview, and Development. For local-only testing, override it in `.env.local` with `http://localhost:3000`.
- Add `https://worldlink-platform.vercel.app/auth/confirm` to Redirect URLs.
- Keep `https://worldlink-platform.vercel.app/auth/callback` allow-listed for PKCE/OAuth callbacks.
- Add the matching local URLs (`http://localhost:3000/auth/confirm` and `http://localhost:3000/auth/callback`) only when using local development.

## Magic Link email template — important

The web confirmation route supports Supabase's token-hash flow. In Supabase Dashboard → Authentication → Email Templates → Magic Link, use this template:

```html
<h2>Your WORLDLINK sign-in</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm and sign in to WORLDLINK</a></p>
<p>Or enter this one-time code in the mobile app:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>If you did not request this message, you can ignore it.</p>
```

Do not use `{{ .ConfirmationURL }}` as the only web link with this token-hash route. The web route exchanges `token_hash` using Supabase `verifyOtp`; the existing `/auth/callback` route remains available for PKCE code callbacks. The app's mobile client uses the one-time code.

After saving the template:
1. Request a new sign-in email (old links may already be expired or consumed).
2. Open the newest link once. It should land on `/account`.
3. If it fails, inspect Supabase Auth logs and confirm the Site URL and redirect allow-list match the live origin exactly.

## Production email delivery

Supabase's default sender is rate-limited and intended for testing. For reliable Gmail delivery at production volume, configure a verified sending domain and custom SMTP provider in Supabase Auth settings. Add SPF, DKIM and DMARC records as instructed by the provider. Keep SMTP credentials only in Supabase Auth settings; never put them in the app, Vercel client variables, or GitHub.

## Google sign-in — required provider credentials

The web and Expo clients now request Google OAuth through Supabase. To enable the provider:

1. In Google Cloud Console, create an OAuth 2.0 Client ID with application type **Web application**.
2. Add this exact Authorized redirect URI in Google Cloud:
   `https://znghtualrhwphvrwckpy.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Authentication → Sign In / Providers → Google, enable Google and enter the Google Client ID and Client Secret. Save them in Supabase only; do not put the client secret in Vercel or either app.
4. In Authentication → URL Configuration, allow these app return URLs:
   - `https://worldlink-platform.vercel.app/auth/callback`
   - `worldlink://auth/callback`
5. In Google OAuth consent screen, configure the app name, support email, developer contact, and publish/verify the consent screen as appropriate for the audience.

Google sign-in cannot complete until the real Google Client ID and Client Secret have been entered in Supabase. The mobile app uses the `worldlink://` deep-link scheme declared in `apps/mobile/app.json`.

## Phone-number sign-in — required SMS provider

The web and Expo clients now support SMS OTP requests and verification. Supabase requires phone sign-up to be enabled and a supported SMS provider configured:

1. Open Supabase Dashboard → Authentication → Sign In / Providers → Phone.
2. Enable phone sign-ups.
3. Configure a supported SMS provider (for example Twilio, Vonage, or MessageBird) with its account credentials and sender/service identifier.
4. Keep all SMS credentials in Supabase Auth settings; never add them to browser/mobile code or public environment variables.
5. Set reasonable OTP expiry and send-rate limits, and test delivery to Nigerian (+234) and other intended country numbers. SMS costs and country coverage depend on the provider and your account.

The UI expects phone numbers in E.164 format, e.g. `+2348012345678`. Phone sign-in will return a provider/configuration error until the SMS provider is configured and the target country is enabled by that provider.

