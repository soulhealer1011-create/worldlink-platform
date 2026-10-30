"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Request = { id: string; city: string; country_code: string; household_size: number; food_needs: string[]; notes: string | null; status: string; created_at: string };
type Charity = { id: string; name: string };

export default function CharityRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRequests([]); setCharities([]); setMessage("Sign in to view requests assigned to your charity."); return; }
      const { data: members, error: memberError } = await supabase.from("organization_members")
        .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
      if (memberError) throw memberError;
      const ids = (members ?? []).map((row) => row.organization_id);
      if (!ids.length) { setRequests([]); setCharities([]); setMessage("Register a charity and wait for verification before receiving requests."); return; }
      const { data: orgs, error: orgError } = await supabase.from("organizations")
        .select("id,name").in("id", ids).eq("kind", "charity").eq("verification_status", "verified");
      if (orgError) throw orgError;
      const valid = (orgs ?? []) as Charity[];
      setCharities(valid);
      if (!valid.length) { setRequests([]); setMessage("No verified charity organisation is linked to this account."); return; }
      const { data, error } = await supabase.from("assistance_requests")
        .select("id,city,country_code,household_size,food_needs,notes,status,created_at")
        .in("target_organization_id", valid.map((org) => org.id))
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setRequests((data ?? []) as Request[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load assigned assistance requests.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function update(id: string, status: "fulfilled" | "closed") {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_assistance_request_status", { p_request_id: id, p_status: status });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this request.");
    } finally { setBusy(null); }
  }

  return <section className="section">
    <h2>Requests assigned to your charity</h2>
    <p className="muted">Only requests explicitly shared by the requester and assigned to your verified charity appear here. Keep beneficiary details confidential.</p>
    <button className="btn alt" onClick={load} disabled={loading}>Refresh requests</button>
    {message && <p role="status" className="muted">{message}</p>}
    {loading ? <p className="muted">Loading requests…</p> : null}
    {requests.map((item) => <article className="tile" key={item.id}>
      <div className="eyebrow">{item.status}</div>
      <h3>{item.city}, {item.country_code}</h3>
      <p>Household size: {item.household_size}</p>
      <p>Food needs: {item.food_needs?.join(", ") || "Not specified"}</p>
      {item.notes && <p>{item.notes}</p>}
      <p className="muted">Received {new Date(item.created_at).toLocaleString()}</p>
      {item.status === "matched" && <div className="actions">
        <button className="btn" disabled={busy === item.id} onClick={() => update(item.id, "fulfilled")}>Mark fulfilled</button>
        <button className="btn alt" disabled={busy === item.id} onClick={() => update(item.id, "closed")}>Close request</button>
      </div>}
    </article>)}
    {!loading && !requests.length && !message && <p className="muted">No requests are currently assigned to your charity.</p>}
  </section>;
}
