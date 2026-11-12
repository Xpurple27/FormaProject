import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions, supabaseConfig } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const settings = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!settings) return response;

  const client = createServerClient(settings.url, settings.key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/beranda", "/nutrisi", "/profil", "/latihan", "/progres", "/api/progres/foto/:path*", "/orientasi", "/masuk", "/daftar", "/api/ekspor"] };
