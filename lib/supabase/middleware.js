import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Refresh the Supabase auth session on every request.
 * Must be called from Next.js middleware to keep sessions alive.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session — do NOT use getSession() as it reads from storage
    // and may be stale. getUser() hits the auth server for validation.
    await supabase.auth.getUser();
  } catch (err) {
    console.warn("Middleware session refresh skipped:", err.message);
  }

  return supabaseResponse;
}
