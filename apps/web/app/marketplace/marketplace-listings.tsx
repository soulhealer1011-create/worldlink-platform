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

  async function reserve(listing: Listing) {
    const quantity = Number(quantities[listing.id] || "1");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessages((old) => ({ ...old, [listing.id]: "Enter a valid quantity." }));
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

  return <div className="grid">
    {listings.map((item) => <article className="tile" key={item.id}>
      <div className="eyebrow">{item.food_category}</div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <p><strong>{item.quantity} {item.quantity_unit}</strong> · {item.city}, {item.country_code}</p>
      <p className="muted">Donated by {item.organization_name}</p>
      {item.allergens?.length ? <p><strong>Allergens:</strong> {item.allergens.join(", ")}</p> : <p className="muted">Allergen information not supplied — confirm with the donor before collection.</p>}
      {item.dietary_tags?.length ? <p><strong>Dietary:</strong> {item.dietary_tags.join(", ")}</p> : null}
      <p className="muted">Available until {new Date(item.available_until).toLocaleString()}</p>
      <label>Quantity to request
        <input
          type="number"
          min="0.01"
          step="any"
          max={item.quantity}
          value={quantities[item.id] ?? "1"}
          onChange={(event) => setQuantities((old) => ({ ...old, [item.id]: event.target.value }))}
          style={{ display: "block", width: "100%", padding: 10, margin: "6px 0 12px", border: "1px solid #cbd8ce", borderRadius: 8 }}
        />
      </label>
      <button className="btn" disabled={busy === item.id} onClick={() => reserve(item)}>
        {busy === item.id ? "Sending…" : "Request this food"}
      </button>
      {messages[item.id] && <p role="status">{messages[item.id]} {messages[item.id].includes("sign in") && <a href="/login">Sign in</a>}</p>}
    </article>)}
  </div>;
}
