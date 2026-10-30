import { createPublicClient } from "../../lib/supabase/public";
import MarketplaceListings from "./marketplace-listings";

export default async function MarketplacePage() {
  const supabase = createPublicClient();
  const { data: listings, error } = await supabase
    .from("food_marketplace")
    .select("id,title,description,food_category,quantity,quantity_unit,city,country_code,available_until,organization_name")
    .order("available_until", { ascending: true })
    .limit(50);

  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/donate">Donate</a><a href="/request-help">Request help</a><a href="/login">Sign in</a></nav>
    <section className="hero"><div className="eyebrow">Community food exchange</div><h1>Available food</h1><p>Browse safe surplus food offered by verified participating organisations. Pickup addresses remain private until a reservation is accepted.</p></section>
    {error ? <p className="muted">Food listings are temporarily unavailable. Please try again later.</p> : listings?.length ? <MarketplaceListings listings={listings} /> : <div className="tile"><h2>No active listings yet</h2><p>When a verified donor publishes surplus food, it will appear here.</p><a className="btn" href="/donate">Donate food</a></div>}
  </main>;
}
