import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const validTypes = ["email", "signup", "magiclink", "recovery", "invite", "email_change"] as const;
  if (tokenHash && validTypes.some((item) => item === type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as typeof validTypes[number] });
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
