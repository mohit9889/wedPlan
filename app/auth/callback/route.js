import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

/**
 * Auth callback handler for Supabase email confirmation and OAuth redirects.
 * Exchanges the auth code for a session, then redirects to the app.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // If no code or error, redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
