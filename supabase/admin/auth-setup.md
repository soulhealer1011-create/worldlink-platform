# Supabase Auth setup before user testing

## Site URL and redirects

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to the production WORLDLINK origin: `https://worldlink-platform.vercel.app`.
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
