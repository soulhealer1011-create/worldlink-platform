import { createPublicClient } from "../../lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("food_marketplace").select("id,quantity,quantity_unit");
  const listings = data ?? [];
  const activeListings = listings.length;
  const quantitiesByUnit = listings.reduce<Record<string, number>>((acc, item) => {
    acc[item.quantity_unit] = (acc[item.quantity_unit] ?? 0) + Number(item.quantity ?? 0);
    return acc;
  }, {});
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/donate">Donate food</a></nav>
    <section className="hero"><div className="eyebrow">Impact dashboard</div><h1>Measure food rescued and communities reached.</h1><p>Live public marketplace indicators. These figures reflect active listings only, not confirmed collections or completed distributions.</p></section>
    {error ? <p className="muted">Impact data is temporarily unavailable.</p> : <section className="grid">
      <article className="tile"><div className="eyebrow">Active listings</div><h2 style={{fontSize:42}}>{activeListings}</h2><p>Verified donor listings currently available to request.</p></article>
      {Object.entries(quantitiesByUnit).map(([unit, quantity]) => <article className="tile" key={unit}><div className="eyebrow">Available quantity</div><h2 style={{fontSize:42}}>{quantity.toLocaleString()} {unit}</h2><p>Total quantity shown on active listings using this unit. Units are not combined.</p></article>)}
    </section>}
    <p className="muted">WORLDLINK will only report rescued food and beneficiary reach after collection and distribution records are implemented and verified.</p>
  </main>;
}
