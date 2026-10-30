"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Organization = { id: string; name: string; kind: string; country_code: string; description: string | null; created_at: string };
type AssistanceRequest = { id: string; city: string; country_code: string; household_size: number; food_needs: string[]; notes: string | null; created_at: string; share_with_assigned_charity: boolean };
type Charity = { id: string; name: string };

export default function AdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const [orgResult, requestResult, charityResult] = await Promise.all([
        supabase.from("organizations").select("id,name,kind,country_code,description,created_at")
          .eq("verification_status", "pending").order("created_at", { ascending: true }),
        supabase.from("assistance_requests").select("id,city,country_code,household_size,food_needs,notes,created_at,share_with_assigned_charity")
          .eq("status", "open").order("created_at", { ascending: true }),
        supabase.from("organizations").select("id,name").eq("kind", "charity").eq("verification_status", "verified")
      ]);
      if (orgResult.error || requestResult.error || charityResult.error) {
        throw orgResult.error || requestResult.error || charityResult.error;
      }
      setOrganizations((orgResult.data ?? []) as Organization[]);
      setRequests((requestResult.data ?? []) as AssistanceRequest[]);
      setCharities((charityResult.data ?? []) as Charity[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load administrator data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function verify(id: string, status: "verified" | "rejected") {
    setBusy(id); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("verify_organization", {
        p_organization_id: id, p_status: status
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update organisation verification.");
    } finally { setBusy(null); }
  }

  async function assign(requestId: string) {
    const organizationId = assignments[requestId];
    if (!organizationId) { setMessage("Choose a verified charity before assigning this request."); return; }
    setBusy(requestId); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("assign_assistance_request", {
        p_request_id: requestId, p_organization_id: organizationId
      });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign this request.");
    } finally { setBusy(null); }
  }

  return <div className="section">
    <div className="actions"><button className="btn alt" onClick={load} disabled={loading}>Refresh admin queue</button></div>
    {message && <p role="status" className="muted">{message}</p>}
    <h2>Pending organisation verification</h2>
    {loading ? <p className="muted">Loading…</p> : organizations.length ? organizations.map((org) => <article className="tile" key={org.id}>
      <div className="eyebrow">{org.kind} · {org.country_code}</div><h3>{org.name}</h3><p>{org.description || "No description supplied."}</p><p className="muted">Submitted {new Date(org.created_at).toLocaleString()}</p>
      <div className="actions"><button className="btn" disabled={busy === org.id} onClick={() => verify(org.id, "verified")}>Verify organisation</button><button className="btn alt" disabled={busy === org.id} onClick={() => verify(org.id, "rejected")}>Reject</button></div>
    </article>) : <p className="muted">No organisations are waiting for verification.</p>}
    <h2>Open food assistance requests</h2>
    {requests.length ? requests.map((item) => <article className="tile" key={item.id}>
      <div className="eyebrow">{item.city}, {item.country_code} · Household {item.household_size}</div>
      <p>Needs: {item.food_needs?.join(", ") || "Not specified"}</p>
      {item.notes && <p>{item.notes}</p>}
      <p className="muted">Submitted {new Date(item.created_at).toLocaleString()}</p>
      {item.share_with_assigned_charity ? <div className="actions">
        <select value={assignments[item.id] ?? ""} onChange={(event) => setAssignments((old) => ({ ...old, [item.id]: event.target.value }))}>
          <option value="">Choose a verified charity</option>
          {charities.map((charity) => <option key={charity.id} value={charity.id}>{charity.name}</option>)}
        </select>
        <button className="btn" disabled={busy === item.id || !charities.length} onClick={() => assign(item.id)}>Assign request</button>
      </div> : <p className="muted">Private request: requester has not consented to charity sharing. Do not assign it.</p>}
    </article>) : <p className="muted">No open assistance requests.</p>}
  </div>;
}
