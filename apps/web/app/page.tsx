const areas = [
  ["Donate food","Businesses and households can list safe surplus food for collection.","/donate"],
  ["Find food","Browse available food and request a reservation.","/marketplace"],
  ["Request assistance","Submit a private request for food support.","/request-help"],
  ["Charities","Coordinate verified community food programmes.","/charities"],
  ["Business portal","Manage an organisation and its donations.","/business"],
  ["Delivery partners","Coordinate collection and handover workflows.","/logistics"],
  ["Impact","Track food rescued and community reach.","/impact"]
];
export default function Home() {
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a>{areas.map(([name,,href])=><a key={href} href={href}>{name}</a>)}<a href="/login">Sign in</a></nav>
    <section className="hero"><div className="eyebrow">A world with less food waste</div><h1>Good food should reach people, not landfills.</h1><p>WORLDLINK connects food donors, charities, community organisations and delivery partners so surplus food can reach people who need it.</p><div className="actions"><a className="btn" href="/donate">Donate surplus food</a><a className="btn alt" href="/marketplace">Find available food</a></div></section>
    <section><h2>One platform. Different ways to help.</h2><div className="grid">{areas.map(([name,desc,href])=><a className="tile" href={href} key={href}><h2>{name} →</h2><p>{desc}</p></a>)}</div></section>
    <footer className="footer">WORLDLINK · Built to connect surplus food with community needs. Always follow local food-safety guidance.</footer>
  </main>;
}
