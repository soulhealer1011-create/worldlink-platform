"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Method = "email" | "phone";

export default function LoginPage() {
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldlink-platform.vercel.app";

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "confirmation") setMessage("This confirmation link is invalid, expired, or already used. Request a fresh email and open the newest link.");
    if (error === "auth") setMessage("Sign-in could not be completed. Please try again.");
  }, []);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: siteUrl + "/auth/callback", shouldCreateUser: true }
      });
      if (error) throw error;
      setEmailSent(true);
      setMessage("If the address is eligible, a secure sign-in link has been requested. Check your inbox and spam folder.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to send the email."); }
    finally { setBusy(false); }
  }

  async function sendPhoneCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const normalized = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      setMessage("Enter your number in international format, for example +2348012345678.");
      setBusy(false); return;
    }
    try {
      const { error } = await createClient().auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true } });
      if (error) throw error;
      setPhoneSent(true);
      setMessage("A verification code has been requested. Check your SMS messages.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to send the SMS code."); }
    finally { setBusy(false); }
  }

  async function verifyPhoneCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.verifyOtp({ phone: phone.trim(), token: code.trim(), type: "sms" });
      if (error) throw error;
      window.location.assign("/account");
    } catch (err) { setMessage(err instanceof Error ? err.message : "The code could not be verified."); }
    finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: siteUrl + "/auth/callback", queryParams: { access_type: "offline", prompt: "select_account" } }
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  return <main className="shell">
    <a className="brand" href="/">WORLDLINK</a>
    <section className="hero">
      <div className="eyebrow">Secure account access</div>
      <h1>Welcome to WORLDLINK</h1>
      <p>Sign in using email, Google, or your phone number.</p>
      <div className="tile" style={{display:"grid",gap:14}}>
        <button className="btn" type="button" onClick={googleSignIn} disabled={busy}>Continue with Google</button>
        <div style={{display:"flex",gap:8}}>
          <button type="button" className={method === "email" ? "btn" : "btn btn-secondary"} onClick={() => {setMethod("email");setMessage("");}}>Email</button>
          <button type="button" className={method === "phone" ? "btn" : "btn btn-secondary"} onClick={() => {setMethod("phone");setMessage("");}}>Phone</button>
        </div>
        {method === "email" ? <form onSubmit={sendEmail}>
          <label>Email address<br/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:12,margin:"10px 0 18px",border:"1px solid #cbd8ce",borderRadius:8}}/></label>
          <button className="btn" type="submit" disabled={busy}>{busy?"Sending…":"Email me a sign-in link"}</button>
          {emailSent && <p className="muted">Request another link if the previous one expired.</p>}
        </form> : <form onSubmit={phoneSent ? verifyPhoneCode : sendPhoneCode}>
          <label>Phone number (include country code)<br/><input required type="tel" autoComplete="tel" placeholder="+2348012345678" value={phone} onChange={e=>setPhone(e.target.value)} style={{width:"100%",padding:12,margin:"10px 0 18px",border:"1px solid #cbd8ce",borderRadius:8}}/></label>
          {phoneSent && <label>SMS verification code<br/><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} style={{width:"100%",padding:12,margin:"10px 0 18px",border:"1px solid #cbd8ce",borderRadius:8}}/></label>}
          <button className="btn" type="submit" disabled={busy}>{busy?"Please wait…":phoneSent?"Verify code":"Send SMS code"}</button>
        </form>}
        <p className="muted" role="status">{message}</p>
        <p className="muted">By continuing, you agree to WORLDLINK's <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
      </div>
    </section>
  </main>;
}
