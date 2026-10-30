import { createClient } from "../../lib/supabase/server";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Restricted workspace</div><h1>Administrator sign-in</h1><p>Sign in with the account authorised to administer WORLDLINK.</p><a className="btn" href="/login">Sign in</a></section></main>;
  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");
  if (error || !isAdmin) return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Restricted workspace</div><h1>Administrator access not assigned</h1><p>This account is signed in, but it has not been granted the platform administrator role. This role is deliberately not self-service.</p><p className="muted">Account ID: {user.id}</p><p>After signing in for the first time, provide the email address used for this account so the project owner can grant the initial administrator role securely.</p><a className="btn alt" href="/account">Return to account</a></section></main>;
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/account">Account</a><a href="/business">Business portal</a></nav>
    <section className="hero"><div className="eyebrow">Platform operations</div><h1>WORLDLINK administration</h1><p>Verify organisations and assign assistance requests only when the requester has given explicit consent.</p></section>
    <AdminDashboard />
  </main>;
}
