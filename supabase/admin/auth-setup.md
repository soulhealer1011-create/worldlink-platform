# Supabase Auth setup before user testing

## Site URL and redirects

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to the `https://worldlink-flame.vercel.app` (the verified Vercel production domain).
- Add the exact callback URL: `https://worldlink-flame.vercel.app/auth/callback`.
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
