"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Reservation = { id: string; listing_id: string; quantity: number; status: string; created_at: string };
type Listing = { id: string; title: string; quantity_unit: string; country_code: string };
type Partner = { id: string; name: string; country_code: string };
type Assignment = { reservation_id: string; logistics_organization_id: string; status: string };
type WorkItem = Reservation & { listing: Listing; assignment?: Assignment };

export default function BusinessReservations() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [partners, setPartners] = useState<Record<string, Partner[]>>({});
  const [selectedPartners, setSelectedPartners] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setItems([]); setPartners({}); setMessage("Sign in to manage your organisation's food requests."); return; }
      const { data: memberships, error: memberError } = await supabase.from("organization_members")
        .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
      if (memberError) throw memberError;
      const ids = (memberships ?? []).map((row) => row.organization_id);
      if (!ids.length) { setItems([]); setPartners({}); setMessage("Register an organisation and wait for verification before managing food requests."); return; }

      const { data: listings, error: listingError } = await supabase.from("food_listings")
        .select("id,title,quantity_unit,country_code").in("organization_id", ids);
      if (listingError) throw listingError;
      const listingMap = new Map<string, Listing>();
      for (const row of listings ?? []) listingMap.set(row.id, row as Listing);
      const listingIds = Array.from(listingMap.keys());
      if (!listingIds.length) { setItems([]); setPartners({}); setMessage("No food listings found for your organisations."); return; }

      const { data: reservations, error: reservationError } = await supabase.from("reservations")
        .select("id,listing_id,quantity,status,created_at").in("listing_id", listingIds)
        .order("created_at", { ascending: false }).limit(100);
      if (reservationError) throw reservationError;
      const reservationIds = (reservations ?? []).map((row) => row.id);

      let assignmentMap = new Map<string, Assignment>();
      if (reservationIds.length) {
        const { data: assignments, error: assignmentError } = await supabase.from("reservation_logistics_assignments")
          .select("reservation_id,logistics_organization_id,status").in("reservation_id", reservationIds);
        if (assignmentError) throw assignmentError;
        assignmentMap = new Map<string, Assignment>();
        for (const row of assignments ?? []) assignmentMap.set(row.reservation_id, row as Assignment);
      }

      const nextItems = (reservations ?? []).map((row) => ({
        ...row,
        listing: listingMap.get(row.listing_id)!,
        assignment: assignmentMap.get(row.id)
      }));
      setItems(nextItems);

      const countryCodes = Array.from(new Set(nextItems.filter((row) => row.status === "accepted").map((row) => row.listing.country_code)));
      const partnerResults = await Promise.all(countryCodes.map(async (code) => {
        const { data, error } = await supabase.rpc("list_verified_logistics_partners", { p_country_code: code });
        if (error) return [code, [] as Partner[]] as const;
        return [code, (data ?? []) as Partner[]] as const;
      }));
      setPartners(Object.fromEntries(partnerResults));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load reservation requests.");
    } finally {
      setLoading(false);
    }
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

  async function assignLogistics(id: string) {
    const partnerId = selectedPartners[id];
    if (!partnerId) { setMessage("Choose a verified logistics partner first."); return; }
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("assign_logistics_partner", {
        p_reservation_id: id, p_logistics_organization_id: partnerId
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign logistics partner.");
    } finally { setBusy(null); }
  }

  async function completeHandover(id: string) {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_food_handover", {
        p_reservation_id: id, p_notes: "Collection confirmed by donor organisation"
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm handover.");
    } finally { setBusy(null); }
  }

  return <section className="section">
    <h2>Incoming food requests</h2>
    <p className="muted">Review requests, then either coordinate collection directly or assign a verified logistics partner in the same country. Pickup details are only visible to the donor and an assigned logistics team.</p>
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
      {item.status === "accepted" && <>
        {item.assignment?.status === "assigned" ? <p className="muted">A verified logistics partner has been assigned.</p> : <>
          <label>Assign verified logistics partner
            <select value={selectedPartners[item.id] ?? ""} onChange={(event) => setSelectedPartners((old) => ({ ...old, [item.id]: event.target.value }))} style={{ display: "block", padding: 10, margin: "6px 0 12px", width: "100%" }}>
              <option value="">Choose a logistics partner in {item.listing.country_code}</option>
              {(partners[item.listing.country_code] ?? []).map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
          </label>
          <button className="btn alt" disabled={busy === item.id || !(partners[item.listing.country_code]?.length)} onClick={() => assignLogistics(item.id)}>Assign logistics partner</button>
          {!(partners[item.listing.country_code]?.length) && <p className="muted">No verified logistics partner is registered in this country yet. You can still coordinate collection directly.</p>}
        </>}
        <button className="btn" disabled={busy === item.id} onClick={() => completeHandover(item.id)}>Confirm direct collection</button>
      </>}
    </article>)}
    {!loading && !items.length && !message && <p className="muted">No food requests yet.</p>}
  </section>;
}
