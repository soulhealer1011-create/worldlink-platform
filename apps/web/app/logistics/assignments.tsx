"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Assignment = { id: string; reservation_id: string; logistics_organization_id: string; status: string; assigned_at: string };
type Reservation = { id: string; listing_id: string; quantity: number; status: string };
type Listing = { id: string; title: string; quantity_unit: string; city: string; country_code: string; pickup_address: string | null; available_from: string; available_until: string };
type WorkItem = { assignment: Assignment; reservation: Reservation; listing: Listing };

export default function LogisticsAssignments() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setItems([]); setMessage("Sign in to view logistics assignments."); return; }
      const { data: members, error: memberError } = await supabase.from("organization_members")
        .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
      if (memberError) throw memberError;
      const ids = (members ?? []).map((row) => row.organization_id);
      if (!ids.length) { setItems([]); setMessage("Register your logistics organisation and wait for verification."); return; }
      const { data: orgs, error: orgError } = await supabase.from("organizations")
        .select("id").in("id", ids).eq("kind", "logistics").eq("verification_status", "verified");
      if (orgError) throw orgError;
      const logisticsIds = (orgs ?? []).map((org) => org.id);
      if (!logisticsIds.length) { setItems([]); setMessage("No verified logistics organisation is linked to this account."); return; }

      const { data: assignments, error: assignmentError } = await supabase.from("reservation_logistics_assignments")
        .select("id,reservation_id,logistics_organization_id,status,assigned_at")
        .in("logistics_organization_id", logisticsIds).eq("status", "assigned")
        .order("assigned_at", { ascending: true });
      if (assignmentError) throw assignmentError;
      const reservationIds = (assignments ?? []).map((item) => item.reservation_id);
      if (!reservationIds.length) { setItems([]); setMessage("No collection jobs have been assigned to your logistics team."); return; }

      const { data: reservations, error: reservationError } = await supabase.from("reservations")
        .select("id,listing_id,quantity,status").in("id", reservationIds);
      if (reservationError) throw reservationError;
      const listingIds = (reservations ?? []).map((item) => item.listing_id);
      const { data: listings, error: listingError } = await supabase.from("food_listings")
        .select("id,title,quantity_unit,city,country_code,pickup_address,available_from,available_until")
        .in("id", listingIds);
      if (listingError) throw listingError;

      const reservationMap = new Map<string, Reservation>();
      for (const item of reservations ?? []) reservationMap.set(item.id, item as Reservation);
      const listingMap = new Map<string, Listing>();
      for (const item of listings ?? []) listingMap.set(item.id, item as Listing);
      const next = (assignments ?? []).flatMap((assignment) => {
        const reservation = reservationMap.get(assignment.reservation_id);
        const listing = reservation ? listingMap.get(reservation.listing_id) : undefined;
        return reservation && listing ? [{ assignment: assignment as Assignment, reservation, listing }] : [];
      });
      setItems(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load logistics assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function complete(item: WorkItem) {
    setBusy(item.reservation.id);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_logistics_handover", {
        p_reservation_id: item.reservation.id,
        p_notes: "Collection and handover completed by assigned logistics partner"
      });
      if (error) throw error;
      await load();
      setMessage("Handover recorded. The reservation is now marked as collected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete this handover.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="section">
    <h2>Assigned collection jobs</h2>
    <p className="muted">Pickup addresses are revealed only to the verified logistics organisation assigned to the reservation. Confirm the collection and handover only after the food has physically changed hands.</p>
    <button className="btn alt" onClick={load} disabled={loading}>Refresh assignments</button>
    {loading && <p className="muted">Loading assigned jobs…</p>}
    {message && <p role="status" className="muted">{message}</p>}
    {items.map((item) => <article className="tile" key={item.assignment.id}>
      <div className="eyebrow">Assigned · {item.listing.country_code}</div>
      <h3>{item.listing.title}</h3>
      <p>{item.reservation.quantity} {item.listing.quantity_unit} · {item.listing.city}</p>
      <p><strong>Pickup address:</strong> {item.listing.pickup_address || "Contact the donor to confirm the collection point."}</p>
      <p><strong>Collection window:</strong> {new Date(item.listing.available_from).toLocaleString()} – {new Date(item.listing.available_until).toLocaleString()}</p>
      <p className="muted">Assigned {new Date(item.assignment.assigned_at).toLocaleString()}</p>
      <button className="btn" disabled={busy === item.reservation.id} onClick={() => complete(item)}>
        {busy === item.reservation.id ? "Recording…" : "Confirm collection and handover"}
      </button>
    </article>)}
    {!loading && !items.length && !message && <p className="muted">No assigned collection jobs yet.</p>}
  </section>;
}
