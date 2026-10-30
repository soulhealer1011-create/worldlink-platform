"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  food_category: string;
  quantity: number;
  quantity_unit: string;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  city: string;
  country_code: string;
  available_until: string;
  organization_name: string;
};

export default function MarketplaceListings({ listings }: { listings: Listing[] }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");

  const categories = Array.from(new Set(listings.map((item) => item.food_category))).sort();
  const countries = Array.from(new Set(listings.map((item) => item.country_code))).sort();
  const filteredListings = listings.filter((item) => {
    const searchable = [item.title, item.description ?? "", item.city, item.organization_name, item.food_category].join(" ").toLowerCase();
    return searchable.includes(search.trim().toLowerCase())
      && (category === "all" || item.food_category === category)
      && (country === "all" || item.country_code === country);
  });

  async function reserve(listing: Listing) {
    const quantity = Number(quantities[listing.id] || "1");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(listing.quantity)) {
      setMessages((old) => ({ ...old, [listing.id]: "Enter a quantity greater than zero and no more than the available amount." }));
      return;
    }
    setBusy(listing.id);
    setMessages((old) => ({ ...old, [listing.id]: "" }));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessages((old) => ({ ...old, [listing.id]: "Please sign in before reserving food." }));
        return;
      }
      const { error } = await supabase.rpc("reserve_food_listing", {
        p_listing_id: listing.id,
        p_quantity: quantity
      });
      if (error) throw error;
      setMessages((old) => ({ ...old, [listing.id]: "Reservation request submitted. The donor organisation must confirm it." }));
    } catch (error) {
      setMessages((old) => ({
        ...old,
        [listing.id]: error instanceof Error ? error.message : "Unable to reserve this listing."
      }));
    } finally {
      setBusy(null);
    }
  }

  return <>
    <section className="tile">
      <label>Search food, city or organisation
        <input value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search available food"
          style={{ display: "block", width: "100%", padding: 11, margin: "6px 0 12px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
      </label>
      <div className="actions">
        <label>Food category
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ display: "block", padding: 10, marginTop: 6 }}>
            <option value="all">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Country
          <select value={country} onChange={(event) => setCountry(event.target.value)} style={{ display: "block", padding: 10, marginTop: 6 }}>
            <option value="all">All countries</option>
            {countries.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <p className="muted">{filteredListings.length} of {listings.length} listings shown</p>
    </section>
    {filteredListings.length ? <div className="grid">
      {filteredListings.map((item) => <article className="tile" key={item.id}>
        <div className="eyebrow">{item.food_category}</div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <p><strong>{item.quantity} {item.quantity_unit}</strong> · {item.city}, {item.country_code}</p>
        <p className="muted">Donated by {item.organization_name}</p>
        {item.allergens?.length
          ? <p><strong>Allergens:</strong> {item.allergens.join(", ")}</p>
          : <p className="muted">Allergen information not supplied — confirm with the donor before collection.</p>}
        {item.dietary_tags?.length ? <p><strong>Dietary:</strong> {item.dietary_tags.join(", ")}</p> : null}
        <p className="muted">Available until {new Date(item.available_until).toLocaleString()}</p>
        <label>Quantity to request
          <input type="number" min="0.01" step="any" max={item.quantity}
            value={quantities[item.id] ?? "1"}
            onChange={(event) => setQuantities((old) => ({ ...old, [item.id]: event.target.value }))}
            style={{ display: "block", width: "100%", padding: 10, margin: "6px 0 12px", border: "1px solid #cbd8ce", borderRadius: 8 }} />
        </label>
        <button className="btn" disabled={busy === item.id} onClick={() => reserve(item)}>
          {busy === item.id ? "Sending…" : "Request this food"}
        </button>
        {messages[item.id] && <p role="status">{messages[item.id]} {messages[item.id].includes("sign in") && <a href="/login">Sign in</a>}</p>}
      </article>)}
    </div> : <p className="muted">No food listings match these filters.</p>}
  </>;
}
