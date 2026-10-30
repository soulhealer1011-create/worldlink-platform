import { createPublicClient } from "../../lib/supabase/public";

export const dynamic = "force-dynamic";

type ImpactSummary = {
  active_listing_count: number;
  available_quantity_by_unit: Record<string, number>;
  completed_handover_count: number;
  rescued_quantity_by_unit: Record<string, number>;
};

export default async function ImpactPage() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("public_impact_summary")
    .select("active_listing_count,available_quantity_by_unit,completed_handover_count,rescued_quantity_by_unit")
    .single();

  const summary = data as ImpactSummary | null;
  const available = Object.entries(summary?.available_quantity_by_unit ?? {});
  const rescued = Object.entries(summary?.rescued_quantity_by_unit ?? {});

  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/donate">Donate food</a><a href="/charities">Charities</a></nav>
    <section className="hero"><div className="eyebrow">Impact dashboard</div><h1>See the food moving through the network.</h1><p>These public totals are generated from live food listings and completed handover records. Quantities remain separated by unit; kilograms, portions and packs are never added together.</p></section>
    {error || !summary ? <p className="muted">Impact data is temporarily unavailable.</p> : <>
      <section className="grid">
        <article className="tile"><div className="eyebrow">Active food listings</div><h2 style={{fontSize:42}}>{summary.active_listing_count.toLocaleString()}</h2><p>Verified donor listings currently available to request.</p></article>
        <article className="tile"><div className="eyebrow">Completed handovers</div><h2 style={{fontSize:42}}>{summary.completed_handover_count.toLocaleString()}</h2><p>Reservations with a recorded collection and handover confirmation.</p></article>
      </section>
      <section className="section">
        <h2>Food currently available</h2>
        <div className="grid">
          {available.length ? available.map(([unit, quantity]) => <article className="tile" key={unit}><div className="eyebrow">Available quantity</div><h2 style={{fontSize:34}}>{Number(quantity).toLocaleString()} {unit}</h2><p>Quantity remaining in active public listings.</p></article>) : <article className="tile"><p>No active food quantity is currently listed.</p></article>}
        </div>
      </section>
      <section className="section">
        <h2>Food collected</h2>
        <div className="grid">
          {rescued.length ? rescued.map(([unit, quantity]) => <article className="tile" key={unit}><div className="eyebrow">Confirmed collection</div><h2 style={{fontSize:34}}>{Number(quantity).toLocaleString()} {unit}</h2><p>Reservation quantity linked to completed handovers.</p></article>) : <article className="tile"><p>No completed handovers have been recorded yet.</p></article>}
        </div>
      </section>
    </>}
    <p className="muted">These figures measure confirmed collections, not independently verified final consumption or household outcomes. WORLDLINK does not estimate meals or beneficiaries without validated distribution data.</p>
  </main>;
}
