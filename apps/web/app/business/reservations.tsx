"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Reservation = {
  id: string;
  listing_id: string;
  quantity: number;
  status: string;
  created_at: string;
};
type Listing = { id: string; title: string; quantity_unit: string };

export default function BusinessReservations() {
  const [items, setItems] = useState<Array<Reservation & { listing: Listing }>>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setItems([]); setMessage("Sign in to manage your organisation's food requests."); return; }
      const { data: memberships, error: memberError } = await supabase.from("organization_members")
        .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
      if (memberError) throw memberError;
      const ids = (memberships ?? []).map((row) => row.organization_id);
      if (!ids.length) { setItems([]); setMessage("Register an organisation and wait for verification before managing food requests."); return; }
      const { data: listings, error: listingError } = await supabase.from("food_listings")
        .select("id,title,quantity_unit").in("organization_id", ids);
      if (listingError) throw listingError;
      const listingMap = new Map((listings ?? []).map((row) => [row.id, row as Listing]));
      const listingIds = Array.from(listingMap.keys());
      if (!listingIds.length) { setItems([]); setMessage("No food listings found for your organisations."); return; }
      const { data: reservations, error: reservationError } = await supabase.from("reservations")
        .select("id,listing_id,quantity,status,created_at").in("listing_id", listingIds)
        .order("created_at", { ascending: false }).limit(100);
      if (reservationError) throw reservationError;
      setItems((reservations ?? []).map((row) => ({ ...row, listing: listingMap.get(row.listing_id)! })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load reservation requests.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: "accepted" | "rejected") {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("respond_to_food_reservation", {
        p_reservation_id: id, p_decision: decision
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this request.");
    } finally { setBusy(null); }
  }

  return <section className="section">
    <h2>Incoming food requests</h2>
    <p className="muted">Review requests for listings managed by your organisation. Accept only when the food and collection arrangements are ready.</p>
    <button className="btn alt" onClick={load} disabled={loading}>Refresh requests</button>
    {loading ? <p className="muted">Loading requests…</p> : null}
    {message ? <p role="status" className="muted">{message}</p> : null}
    {items.map((item) => <article className="tile" key={item.id}>
      <div className="eyebrow">{item.status}</div>
      <h3>{item.listing.title}</h3>
      <p>{item.quantity} {item.listing.quantity_unit} requested · {new Date(item.created_at).toLocaleString()}</p>
      {item.status === "requested" && <div className="actions">
        <button className="btn" disabled={busy === item.id} onClick={() => decide(item.id, "accepted")}>Accept request</button>
        <button className="btn alt" disabled={busy === item.id} onClick={() => decide(item.id, "rejected")}>Decline</button>
      </div>}
    </article>)}
  </section>;
}
