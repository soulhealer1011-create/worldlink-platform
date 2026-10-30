export default function CharitiesPortal() {
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/request-help">Request assistance</a><a href="/account">Account</a></nav>
    <section className="hero"><div className="eyebrow">Charity and NGO portal</div><h1>Get good food to the people who need it.</h1><p>Verified charities and community organisations can coordinate food recovery, review assistance needs and work with local donors and delivery partners.</p><div className="actions"><a className="btn" href="/organization/new">Register a charity</a><a className="btn alt" href="/marketplace">Browse available food</a></div></section>
    <section className="grid">
      <article className="tile"><h2>Food sourcing</h2><p>Browse verified donor listings and submit a reservation request for the quantity your programme can safely distribute.</p></article>
      <article className="tile"><h2>Community support</h2><p>People can submit private assistance requests. Access to those requests must be explicitly assigned to your organisation.</p></article>
      <article className="tile"><h2>Responsible distribution</h2><p>Keep records of collection, storage, allergen information and final distribution in line with local requirements.</p></article>
    </section>
    <p className="muted">Organisation verification and permission controls are required before handling beneficiary information or publishing donations.</p>
  </main>;
}
