"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
export default function NewOrganizationPage(){
 const [form,setForm]=useState({name:"",kind:"business",country:"NG",description:""});
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Sign in before registering an organisation.");return;}
   const {error}=await supabase.from("organizations").insert({name:form.name,kind:form.kind,country_code:form.country,description:form.description,created_by:user.id});
   if(error)throw error;setMessage("Organisation submitted. It is pending verification. You can now continue to the donation workspace.");
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to create organisation.");}finally{setBusy(false);}
 }
 const set=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Organisation onboarding</div><h1>Register your organisation</h1><p>Businesses, charities and delivery teams can create a workspace. New organisations start as pending verification.</p><form className="tile" onSubmit={submit}><label>Organisation name<input required minLength={2} value={form.name} onChange={e=>set("name",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>Organisation type<select value={form.kind} onChange={e=>set("kind",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}><option value="business">Business / food donor</option><option value="charity">Charity / NGO</option><option value="logistics">Delivery / logistics</option><option value="community">Community organisation</option><option value="other">Other</option></select></label><label>Country code<input required maxLength={2} value={form.country} onChange={e=>set("country",e.target.value.toUpperCase())} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>Description<textarea value={form.description} onChange={e=>set("description",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><button className="btn" disabled={busy}>{busy?"Submitting…":"Register organisation"}</button><p role="status">{message}</p></form></section></main>;
}
