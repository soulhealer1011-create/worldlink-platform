import { createClient } from "../../lib/supabase/server";
export default async function AccountPage() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 const heading = user ? "You are signed in" : "Sign in required";
 const description = user ? "Signed in as " + user.email + ". Your profile is ready for the next onboarding step." : "Please sign in to access your private account.";
 return <main className="shell"><a className="brand" href="/">WORLDLINK</a><section className="hero"><div className="eyebrow">Your account</div><h1>{heading}</h1><p>{description}</p><a className="btn" href={user?"/":"/login"}>{user?"Return home":"Sign in"}</a></section></main>;
}
