"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function RequestHelpPage() {
  const [form, setForm] = useState({
    country: "NG", city: "", household: "1", needs: "", notes: "", share: false
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in before sending a private assistance request.");
      const { error } = await supabase.from("assistance_requests").insert({
        requester_id: user.id,
        country_code: form.country.toUpperCase(),
        city: form.city.trim(),
        household_size: Number(form.household),
        food_needs: form.needs.split(",").map((item) => item.trim()).filter(Boolean),
        notes: form.notes.trim(),
        share_with_assigned_charity: form.share,
        consent_at: form.share ? new Date().toISOString() : null
      });
      if (error) throw error;
      setMessage(form.share
        ? "Your request has been submitted. You consented to share it with a verified charity assigned by WORLDLINK."
        : "Your request has been submitted privately. It will not be shared with a charity unless you change your consent.");
      setForm({ country: "NG", city: "", household: "1", needs: "", notes: "", share: false });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit request.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { display: "block", width: "100%", padding: 11, margin: "6px 0 14px", border: "1px solid #cbd8ce", borderRadius: 8 };
  return <main className="shell">
    <a className="brand" href="/">WORLDLINK</a>
    <section className="hero"><div className="eyebrow">Private community support</div><h1>Request food assistance</h1><p>Your request is private by default. Do not include passwords, bank details or unnecessary sensitive information.</p>
      <form className="tile" onSubmit={submit}>
        <label>Country code<input required maxLength={2} value={form.country} onChange={(event) => set("country", event.target.value.toUpperCase())} style={fieldStyle}/></label>
        <label>City<input required value={form.city} onChange={(event) => set("city", event.target.value)} style={fieldStyle}/></label>
        <label>Household size<input required type="number" min="1" max="100" value={form.household} onChange={(event) => set("household", event.target.value)} style={fieldStyle}/></label>
        <label>Food needs (comma-separated)<input value={form.needs} onChange={(event) => set("needs", event.target.value)} placeholder="e.g. rice, vegetables" style={fieldStyle}/></label>
        <label>Additional information<textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} style={fieldStyle}/></label>
        <label style={{display:"flex",gap:10,alignItems:"flex-start",margin:"8px 0 18px"}}>
          <input type="checkbox" checked={form.share} onChange={(event) => set("share", event.target.checked)} style={{marginTop:4}}/>
          <span>I consent to WORLDLINK sharing this request with one verified charity organisation assigned to help me. I understand I can keep the request private by leaving this unchecked.</span>
        </label>
        <button className="btn" disabled={busy}>{busy ? "Submitting…" : "Submit assistance request"}</button>
        <p role="status">{message}</p>
      </form>
    </section>
  </main>;
}
