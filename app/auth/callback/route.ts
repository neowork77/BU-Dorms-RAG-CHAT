import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 *
 * After the user authenticates with Google, Supabase redirects here
 * with a `code` query parameter. We exchange that code for a session
 * and then redirect the user to /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const nextUrl = next ? `?next=${encodeURIComponent(next)}` : "";
      return NextResponse.redirect(`${origin}/auth/success${nextUrl}`);
    }
  }

  // If something went wrong, redirect back to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
