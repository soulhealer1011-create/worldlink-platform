"use client";
import { useState } from "react";
export default function LoginPage(){
 const [email,setEmail]=useState(""); const [message,setMessage]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setMessage("Authentication setup is the next integration step. Configure Supabase Auth and verify your redirect URLs before accepting real users.");}
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><h1>Welcome back</h1><p>Sign-in will use the WORLDLINK Supabase Auth project.</p><form onSubmit={submit} className="tile"><label>Email address<br/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:12,margin:"10px 0 18px"}}/></label><button className="btn" type="submit">Continue</button><p className="muted">{message}</p></form></section></main>;
}
