import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.FORMA_SITE_URL || url.origin;
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (supabaseConfig() && token_hash && (type === "signup" || type === "email")) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL("/beranda", base), { headers });
  }
  return NextResponse.redirect(new URL("/masuk?status=konfirmasi-gagal", base), { headers });
}
