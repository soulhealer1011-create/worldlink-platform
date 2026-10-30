const pages: Record<string,{title:string;intro:string;detail:string;cta:string}> = {
  marketplace:{title:"Food marketplace",intro:"Discover surplus food available for collection in your area.",detail:"Live listings will appear here once donors publish available food and the marketplace is connected to your account.",cta:"Browse food"},
  donate:{title:"Donate food",intro:"Help good food find its next destination.",detail:"Create an organisation profile, provide food details, quantity, allergens, location and collection window. Only publish food that meets local safety requirements.",cta:"Start a donation"},
  "request-help":{title:"Request food assistance",intro:"Tell a participating organisation what support you need.",detail:"Requests are private by default. A participating charity or authorised organisation can review requests assigned to it.",cta:"Create a request"},
  business:{title:"Business portal",intro:"Manage your organisation's surplus food programme.",detail:"Business accounts can manage team membership, publish listings and coordinate collection.",cta:"Set up organisation"},
  charities:{title:"Charity portal",intro:"Coordinate food support for your community.",detail:"Charities can manage organisation details, review requests routed to them and coordinate handovers.",cta:"Register charity"},
  logistics:{title:"Delivery partner portal",intro:"Coordinate collection and delivery handovers.",detail:"Logistics organisations can record assigned handovers and proof of completion.",cta:"Join logistics network"},
  impact:{title:"Community impact",intro:"Measure the difference food rescue can make.",detail:"Impact indicators will be calculated from verified completed handovers. No estimated impact figures are presented as measured results.",cta:"View impact"}
};
export default async function SectionPage({params}:{params:Promise<{section:string}>}) {
  const {section}=await params; const page=pages[section];
  if(!page) return <main className="shell"><a href="/">← WORLDLINK</a><h1>Page not found</h1></main>;
  return <main className="shell"><nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/donate">Donate</a><a href="/request-help">Request help</a><a href="/impact">Impact</a><a href="/login">Sign in</a></nav><section className="hero"><div className="eyebrow">WORLDLINK workspace</div><h1>{page.title}</h1><p>{page.intro}</p><div className="tile"><p>{page.detail}</p><a className="btn" href="/login">{page.cta}</a></div></section><footer className="footer"><a href="/">← Back to home</a></footer></main>;
}
