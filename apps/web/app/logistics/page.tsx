import LogisticsAssignments from "./assignments";

export default function LogisticsPortal() {
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/organization/new">Register organisation</a><a href="/account">Account</a></nav>
    <section className="hero"><div className="eyebrow">Delivery and logistics portal</div><h1>Make every collection count.</h1><p>Verified delivery partners can accept collection assignments from food donors and record a secure handover to the recipient organisation or person.</p><div className="actions"><a className="btn" href="/organization/new">Register a logistics team</a><a className="btn alt" href="/marketplace">View available food</a></div></section>
    <section className="grid">
      <article className="tile"><h2>Verified assignments</h2><p>Only verified logistics organisations in the same enabled country can be assigned to a reservation.</p></article>
      <article className="tile"><h2>Private pickup details</h2><p>Pickup addresses are visible only to the donor and the verified logistics team assigned to that collection.</p></article>
      <article className="tile"><h2>Chain of custody</h2><p>Record the collection, the responsible logistics organisation, the recipient and a timestamped handover.</p></article>
    </section>
    <LogisticsAssignments />
    <p className="muted">Live GPS tracking, driver dispatch and route optimisation are not enabled yet; assigned collections and handover records are supported.</p>
  </main>;
}
