export default function PrivacyPage() {
  return <main className="shell">
    <a className="brand" href="/">WORLDLINK</a>
    <section className="hero"><div className="eyebrow">Draft policy · legal review required</div><h1>Privacy notice</h1><p>This draft explains the personal information WORLDLINK is designed to process. It must be completed with the legal operator's identity and reviewed for each launch country before public operation.</p></section>
    <article className="tile">
      <h2>Who operates WORLDLINK</h2><p>Data controller: [insert registered legal operator name and address]. Privacy contact: [insert monitored privacy email address]. Do not launch until these details are completed.</p>
      <h2>Information we process</h2><p>Depending on how you use the service, WORLDLINK may process account email and profile details; organisation registration and verification information; food listing details; reservation records; assistance requests, household size, city and food needs; and collection or handover records.</p>
      <h2>Private assistance requests</h2><p>Assistance requests are private by default. A request is shared with a verified charity only when the requester actively consents and an administrator assigns that charity. Platform administrators may access requests to operate and protect the service.</p>
      <h2>Public marketplace information</h2><p>Public food listings show information needed to discover available food. Donor pickup addresses are excluded from the public marketplace. Do not upload personal information or photographs containing people to the public food-image area.</p>
      <h2>Service providers and international processing</h2><p>WORLDLINK uses Supabase for database, authentication and file storage, and Vercel for website hosting. The initial database region is London, United Kingdom. Depending on the user's location and service routing, information may be processed in other countries. Country-specific transfer safeguards must be reviewed before launch.</p>
      <h2>Retention and your rights</h2><p>Retention periods, deletion procedures, legal bases and country-specific rights must be finalised by the operator before launch. For access, correction, deletion or privacy questions, contact [insert privacy contact email].</p>
      <h2>Security</h2><p>WORLDLINK uses account authentication, database row-level security and restricted access to private records. No internet service can guarantee absolute security. Report suspected unauthorised access to [insert security contact email].</p>
      <h2>Policy changes</h2><p>Insert the effective date and explain how users will be notified of material changes before accepting this policy as final.</p>
    </article>
    <p className="muted">This is a product draft, not legal advice or a final privacy notice.</p>
  </main>;
}
