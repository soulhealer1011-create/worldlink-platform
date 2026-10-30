"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function DonatePage() {
  const [form, setForm] = useState({
    title: "", category: "Produce", quantity: "", unit: "kg", country: "NG",
    city: "", pickupAddress: "", from: "", until: "", description: "", allergens: "", dietaryTags: ""
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function change(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in before publishing a donation.");

      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id,role")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin", "manager"]);
      if (membershipError) throw membershipError;

      let organizationId: string | null = null;
      for (const member of memberships ?? []) {
        const { data } = await supabase.from("organizations")
          .select("id,verification_status")
          .eq("id", member.organization_id)
          .eq("verification_status", "verified")
          .maybeSingle();
        if (data) { organizationId = data.id; break; }
      }
      if (!organizationId) {
        throw new Error("A verified donor organisation is required. Register your organisation first and wait for verification.");
      }

      const availableFrom = new Date(form.from);
      const availableUntil = new Date(form.until);
      if (!Number.isFinite(availableFrom.getTime()) || !Number.isFinite(availableUntil.getTime()) || availableUntil <= availableFrom) {
        throw new Error("Enter a valid collection window. The end time must be after the start time.");
      }

      const { error } = await supabase.from("food_listings").insert({
        organization_id: organizationId,
        title: form.title.trim(),
        food_category: form.category,
        quantity: Number(form.quantity),
        quantity_unit: form.unit.trim(),
        country_code: form.country.toUpperCase(),
        city: form.city.trim(),
        pickup_address: form.pickupAddress.trim(),
        description: form.description.trim(),
        allergens: form.allergens.split(",").map((item) => item.trim()).filter(Boolean),
        dietary_tags: form.dietaryTags.split(",").map((item) => item.trim()).filter(Boolean),
        available_from: availableFrom.toISOString(),
        available_until: availableUntil.toISOString(),
        status: "available"
      });
      if (error) throw error;
      setMessage("Your food donation has been published.");
      setForm({ title: "", category: "Produce", quantity: "", unit: "kg", country: "NG", city: "", pickupAddress: "", from: "", until: "", description: "", allergens: "", dietaryTags: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish donation.");
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text", required = true) => (
    <label>{label}
      <input required={required} type={type} min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "any" : undefined} value={form[key]}
        onChange={(event) => change(key, event.target.value)}
        style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 14px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
    </label>
  );

  return <main className="shell">
    <a className="brand" href="/">WORLDLINK</a>
    <section className="hero"><div className="eyebrow">Food donor workspace</div><h1>Donate surplus food</h1><p>List safe food your verified organisation can make available for collection. Pickup address is stored privately and is not shown on the public marketplace.</p></section>
    <form className="tile" onSubmit={submit}>
      {field("Food name", "title")}
      <label>Category
        <select value={form.category} onChange={(event) => change("category", event.target.value)} style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 14px" }}>
          {["Produce", "Bakery", "Dairy", "Prepared meals", "Packaged food", "Other"].map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      {field("Quantity", "quantity", "number")}
      {field("Unit (kg, packs, portions)", "unit")}
      {field("Country code", "country")}
      {field("City", "city")}
      {field("Private pickup address", "pickupAddress")}
      {field("Available from", "from", "datetime-local")}
      {field("Available until", "until", "datetime-local")}
      <label>Allergens (comma-separated)
        <input value={form.allergens} onChange={(event) => change("allergens", event.target.value)} placeholder="e.g. peanuts, milk, wheat" style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 14px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
      </label>
      <label>Dietary tags (comma-separated)
        <input value={form.dietaryTags} onChange={(event) => change("dietaryTags", event.target.value)} placeholder="e.g. vegetarian, halal, vegan" style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 14px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
      </label>
      <label>Description
        <textarea value={form.description} onChange={(event) => change("description", event.target.value)} style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 14px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
      </label>
      <button className="btn" disabled={busy}>{busy ? "Publishing…" : "Publish donation"}</button>
      <p role="status">{message}</p>
    </form>
  </main>;
}
