"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
export default function DonatePage(){
 const [form,setForm]=useState({title:"",category:"Produce",quantity:"",unit:"kg",country:"NG",city:"",from:"",until:"",description:""});
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 function change(k:keyof typeof form,v:string){setForm(old=>({...old,[k]:v}));}
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
   if(!user){setMessage("Please sign in first. A verified organisation account is required to publish a donation.");return;}
   const {data:members}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1);
   if(!members?.length){setMessage("Your account needs to be linked to a donor organisation before publishing. Organisation onboarding is the next step.");return;}
   const {error}=await supabase.from("food_listings").insert({organization_id:members[0].organization_id,title:form.title,food_category:form.category,quantity:Number(form.quantity),quantity_unit:form.unit,country_code:form.country,city:form.city,description:form.description,available_from:form.from,available_until:form.until,status:"available"});
   if(error)throw error;setMessage("Your food donation has been published.");
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to publish donation.");}
  finally{setBusy(false);}
 }
 const field=(label:string,key:keyof typeof form,type="text")=><label>{label}<input required type={type} value={form[key]} onChange={e=>change(key,e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px",border:"1px solid #cbd8ce",borderRadius:8}}/></label>;
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Food donor workspace</div><h1>Donate surplus food</h1><p>List safe food that your organisation can make available for collection.</p><form className="tile" onSubmit={submit}>{field("Food name","title")}<label>Category<select value={form.category} onChange={e=>change("category",e.target.value)}>{["Produce","Bakery","Dairy","Prepared meals","Packaged food","Other"].map(v=><option key={v}>{v}</option>)}</select></label>{field("Quantity","quantity","number")}{field("Unit (kg, packs, portions)","unit")}{field("Country code","country")}{field("City","city")}{field("Available from","from","datetime-local")}{field("Available until","until","datetime-local")}<label>Description<textarea value={form.description} onChange={e=>change("description",e.target.value)} style={{display:"block",width:"100%",padding:11,margin:"6px 0 14px"}}/></label><button className="btn" disabled={busy}>{busy?"Publishing…":"Publish donation"}</button><p role="status">{message}</p></form></section></main>;
}
