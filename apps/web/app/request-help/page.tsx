"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
export default function RequestHelpPage(){
 const [form,setForm]=useState({country:"NG",city:"",household:"1",needs:"",notes:""});
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const set=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Please sign in before sending a private assistance request.");return;}
   const {error}=await supabase.from("assistance_requests").insert({requester_id:user.id,country_code:form.country,city:form.city,household_size:Number(form.household),food_needs:form.needs.split(",").map(x=>x.trim()).filter(Boolean),notes:form.notes});
   if(error)throw error;setMessage("Your request has been submitted privately. A participating organisation can review it if it is assigned to them.");
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to submit request.");}finally{setBusy(false);}
 }
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Private community support</div><h1>Request food assistance</h1><p>Your request is private by default. Do not include passwords, bank details or unnecessary sensitive information.</p><form className="tile" onSubmit={submit}><label>Country code<input required maxLength={2} value={form.country} onChange={e=>set("country",e.target.value.toUpperCase())} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>City<input required value={form.city} onChange={e=>set("city",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>Household size<input required type="number" min="1" max="100" value={form.household} onChange={e=>set("household",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>Food needs (comma-separated)<input value={form.needs} onChange={e=>set("needs",e.target.value)} placeholder="e.g. rice, vegetables" style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><label>Additional information<textarea value={form.notes} onChange={e=>set("notes",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><button className="btn" disabled={busy}>{busy?"Submitting…":"Submit private request"}</button><p role="status">{message}</p></form></section></main>;
}
