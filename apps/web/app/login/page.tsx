"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
export default function LoginPage() {
 const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 useEffect(() => { if (new URLSearchParams(window.location.search).get("error") === "confirmation") setMessage("This confirmation link is invalid, expired, or already used. Request a fresh email and open the newest link."); }, []);
 async function submit(e:React.FormEvent) {
  e.preventDefault(); setBusy(true); setMessage("");
  try {
   const supabase=createClient();
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldlink-platform.vercel.app";
   const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:siteUrl+"/auth/callback"}});
   if(error) throw error;
   setMessage("Check your email for a secure sign-in link. If it does not arrive, check spam and your Supabase email settings.");
  } catch(err) { setMessage(err instanceof Error?err.message:"Unable to start sign-in."); }
  finally { setBusy(false); }
 }
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Secure account access</div><h1>Welcome to WORLDLINK</h1><p>Enter your email and we will send you a one-time sign-in link.</p><form onSubmit={submit} className="tile"><label>Email address<br/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:12,margin:"10px 0 18px",border:"1px solid #cbd8ce",borderRadius:8}}/></label><button className="btn" type="submit" disabled={busy}>{busy?"Sending…":"Email me a sign-in link"}</button><p className="muted" role="status">{message}</p></form></section></main>;
}
