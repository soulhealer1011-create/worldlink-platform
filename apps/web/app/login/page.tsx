"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Authentication could not be completed."); }
    finally { setBusy(false); }
  }

  async function sendEmailLink(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true }
      });
      if (error) throw error;
      setMessage("A secure sign-in link has been requested. Open it on this device. If it does not arrive, check spam and your email-provider settings.");
    });
  }

  async function googleSignIn() {
    await run(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    });
  }

  async function sendPhoneCode(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setPhoneCodeSent(true);
      setMessage("SMS verification code requested. Enter the code sent to your phone.");
    });
  }

  async function verifyPhoneCode(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: phoneCode.trim(), type: "sms" });
      if (error) throw error;
      window.location.assign("/account");
    });
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: 12, margin: "10px 0 18px", border: "1px solid #cbd8ce", borderRadius: 8, boxSizing: "border-box" };

  return (
    <main className="shell">
      <a className="brand" href="/">WORLDLINK</a>
      <section className="hero">
        <div className="eyebrow">Secure account access</div>
        <h1>Welcome to WORLDLINK</h1>
        <p>Sign in using Google, your email address, or your mobile number.</p>
        <div className="tile">
          <button className="btn" type="button" disabled={busy} onClick={googleSignIn}>
            {busy ? "Please wait…" : "Continue with Google"}
          </button>
          <form onSubmit={sendEmailLink} style={{ marginTop: 22 }}>
            <label>Email address<br />
              <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </label>
            <button className="btn" type="submit" disabled={busy}>Email me a sign-in link</button>
          </form>
          <form onSubmit={phoneCodeSent ? verifyPhoneCode : sendPhoneCode} style={{ marginTop: 22 }}>
            <label>Phone number (international format, e.g. +2348012345678)<br />
              <input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234…" style={inputStyle} />
            </label>
            {phoneCodeSent && <label>SMS verification code<br />
              <input required inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={e => setPhoneCode(e.target.value)} style={inputStyle} />
            </label>}
            <button className="btn" type="submit" disabled={busy}>{phoneCodeSent ? "Verify phone number" : "Send SMS code"}</button>
          </form>
          <p className="muted" role="status" aria-live="polite">{message}</p>
          <p className="muted">Google sign-in and SMS verification require their providers to be enabled in the WORLDLINK Supabase Auth settings.</p>
        </div>
      </section>
    </main>
  );
}
