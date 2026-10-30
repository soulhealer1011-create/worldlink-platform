"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Reservation = { id: string; listing_id: string; quantity: number; status: string; created_at: string };
type Assistance = { id: string; city: string; country_code: string; household_size: number; food_needs: string[]; notes: string | null; share_with_assigned_charity: boolean; status: string; created_at: string };
type Organisation = { id: string; name: string; kind: string; country_code: string; verification_status: string };
type Notification = { id: string; notification_type: string; title: string; body: string; created_at: string; read_at: string | null };

export default function AccountDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [requests, setRequests] = useState<Assistance[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setMessage("");
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setMessage("Your session has expired. Please sign in again."); return; }
    const [r, a, o, n] = await Promise.all([
      supabase.from("reservations").select("id,listing_id,quantity,status,created_at").eq("requester_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("assistance_requests").select("id,city,country_code,household_size,food_needs,notes,share_with_assigned_charity,status,created_at").eq("requester_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("organization_members").select("organization_id").eq("user_id", user.id),
      supabase.from("user_notifications").select("id,notification_type,title,body,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
    ]);
    if (r.error || a.error || o.error || n.error) {
      setMessage(r.error?.message || a.error?.message || o.error?.message || n.error?.message || "Unable to load your account.");
      return;
    }
    const organisationIds = (o.data ?? []).map((row) => row.organization_id);
    const organisationResult = organisationIds.length
      ? await supabase.from("organizations").select("id,name,kind,country_code,verification_status").in("id", organisationIds)
      : { data: [], error: null };
    if (organisationResult.error) { setMessage(organisationResult.error.message); return; }
    setReservations((r.data ?? []) as Reservation[]);
    setRequests((a.data ?? []) as Assistance[]);
    setOrganisations((organisationResult.data ?? []) as Organisation[]);
    setNotifications((n.data ?? []) as Notification[]);
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) { setMessage(error.message); return; }
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  }

  async function cancel(id: string) {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_food_reservation", { p_reservation_id: id });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel reservation.");
    } finally { setBusy(null); }
  }

  async function withdrawConsent(id: string) {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("withdraw_assistance_sharing_consent", { p_request_id: id });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to withdraw sharing consent.");
    } finally { setBusy(null); }
  }

  async function confirmCollection(id: string) {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_food_handover", {
        p_reservation_id: id, p_notes: "Collection confirmed by recipient"
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm collection.");
    } finally { setBusy(null); }
  }

  return <div className="section">
    <div className="actions"><a className="btn" href="/organization/new">Register an organisation</a><a className="btn alt" href="/marketplace">Browse food</a><a className="btn alt" href="/request-help">Request assistance</a></div>
    <h2>Notifications</h2>
    {notifications.length ? notifications.map((item) => <article className="tile" key={item.id}>
      <div className="eyebrow">{item.read_at ? "Read" : "New"} · {item.notification_type.replace(/_/g, " ")}</div>
      <h3>{item.title}</h3><p>{item.body}</p><p className="muted">{new Date(item.created_at).toLocaleString()}</p>
      {!item.read_at && <button className="btn alt" onClick={() => markRead(item.id)}>Mark as read</button>}
    </article>) : <p className="muted">You have no notifications yet.</p>}
    <h2>Your organisations</h2>
    {organisations.length ? <div className="grid">{organisations.map((org) => <article className="tile" key={org.id}><h3>{org.name}</h3><p>{org.kind} · {org.country_code}</p><p className="muted">Verification: {org.verification_status}</p></article>)}</div> : <p className="muted">You have not joined an organisation yet.</p>}
    <h2>Your food reservations</h2>
    {reservations.length ? reservations.map((item) => <article className="tile" key={item.id}><div className="eyebrow">{item.status}</div><p>Reservation reference: {item.id}</p><p>{item.quantity} requested · Listing reference: {item.listing_id}</p><p className="muted">{new Date(item.created_at).toLocaleString()}</p>{item.status === "requested" && <button className="btn alt" disabled={busy === item.id} onClick={() => cancel(item.id)}>Cancel request</button>}{item.status === "accepted" && <button className="btn" disabled={busy === item.id} onClick={() => confirmCollection(item.id)}>Confirm I collected this food</button>}</article>) : <p className="muted">No food reservations yet.</p>}
    <h2>Your assistance requests</h2>
    {requests.length ? requests.map((item) => <article className="tile" key={item.id}><div className="eyebrow">{item.status}</div><p>{item.city}, {item.country_code} · Household size {item.household_size}</p><p>Food needs: {item.food_needs?.join(", ") || "Not specified"}</p>{item.notes && <p>{item.notes}</p>}<p className="muted">{item.share_with_assigned_charity ? "Consent given for charity sharing" : "Private request"} · Submitted {new Date(item.created_at).toLocaleString()}</p>{item.share_with_assigned_charity && <button className="btn alt" disabled={busy === item.id} onClick={() => withdrawConsent(item.id)}>Withdraw sharing consent</button>}</article>) : <p className="muted">No assistance requests submitted.</p>}
    {message && <p role="status" className="muted">{message}</p>}
  </div>;
}
