export default function BusinessPortal() {
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/donate">Donate food</a><a href="/account">Account</a></nav>
    <section className="hero"><div className="eyebrow">Business portal</div><h1>Turn surplus into community value.</h1><p>Food retailers, restaurants, farms, manufacturers and distributors can register an organisation, publish surplus food and coordinate safe collections.</p><div className="actions"><a className="btn" href="/organization/new">Register your business</a><a className="btn alt" href="/donate">Create a food listing</a></div></section>
    <section className="grid">
      <article className="tile"><h2>1. Register</h2><p>Create your organisation profile and provide accurate business information for verification.</p></article>
      <article className="tile"><h2>2. Publish</h2><p>Once verified, list food category, quantity, allergens, collection window and city. Do not publish private pickup details publicly.</p></article>
      <article className="tile"><h2>3. Coordinate</h2><p>Review incoming requests and arrange collection with an eligible charity or community partner.</p></article>
    </section>
    <p className="muted">Verification is required before listings appear in the public marketplace. Food donors remain responsible for food safety, traceability and local legal compliance.</p>
  </main>;
}
