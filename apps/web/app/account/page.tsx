import { createClient } from "../../lib/supabase/server";
import AccountDashboard from "./account-dashboard";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Your account</div><h1>Sign in required</h1><p>Please sign in to view your private reservations, assistance requests and organisation memberships.</p><a className="btn" href="/login">Sign in</a></section></main>;
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/">WORLDLINK</a><a href="/marketplace">Marketplace</a><a href="/business">Business portal</a><a href="/charities">Charities</a></nav>
    <section className="hero"><div className="eyebrow">Your account</div><h1>Welcome back</h1><p>Signed in as {user.email}. Manage your organisation memberships and review your food requests.</p></section>
    <AccountDashboard />
  </main>;
}
