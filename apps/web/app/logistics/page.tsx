export default function LogisticsPortal() {
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/organization/new">Register organisation</a><a href="/account">Account</a></nav>
    <section className="hero"><div className="eyebrow">Delivery and logistics portal</div><h1>Make every collection count.</h1><p>Local delivery partners can join the food recovery network to support scheduled collections and verified handovers between donors and recipient organisations.</p><div className="actions"><a className="btn" href="/organization/new">Register a logistics team</a><a className="btn alt" href="/marketplace">View available food</a></div></section>
    <section className="grid">
      <article className="tile"><h2>Collection planning</h2><p>Coordinate collection windows with donors and recipient organisations before dispatch.</p></article>
      <article className="tile"><h2>Chain of custody</h2><p>Record who handed over and received food, with timestamps and evidence where appropriate.</p></article>
      <article className="tile"><h2>Food-safe transport</h2><p>Use suitable vehicles, temperature controls and handling procedures for the food being transported.</p></article>
    </section>
    <p className="muted">Live GPS tracking, driver dispatch and route optimisation are not enabled yet; they require a location and logistics integration.</p>
  </main>;
}
