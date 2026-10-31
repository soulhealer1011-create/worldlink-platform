import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const allowedTypes: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const type = allowedTypes.find((candidate) => candidate === rawType);

  // Never forward the one-time token to the destination URL.
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");

  if (!tokenHash || !type) {
    url.pathname = "/login";
    url.searchParams.set("error", "confirmation");
    return NextResponse.redirect(url);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (error) {
      url.pathname = "/login";
      url.searchParams.set("error", "confirmation");
      return NextResponse.redirect(url);
    }

    url.pathname = "/account";
    url.searchParams.delete("error");
    return NextResponse.redirect(url);
  } catch {
    url.pathname = "/login";
    url.searchParams.set("error", "confirmation");
    return NextResponse.redirect(url);
  }
}
