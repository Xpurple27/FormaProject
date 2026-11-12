import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sessionCookieOptions, supabaseConfig } from "./env";
import type { Database } from "../types";

export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Missing FORMA Supabase configuration");
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Proxy persists refreshed cookies when rendering Server Components.
        }
      },
    },
  });
}

export const getSession = cache(async () => {
  await connection();
  if (!supabaseConfig()) return null;
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  return data?.claims.sub ? { client, userId: data.claims.sub } : null;
});

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return session;
});

export const getProfile = cache(async () => {
  const { client, userId } = await requireSession();
  const { data, error } = await client.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load FORMA profile");
  return data;
});

export const requireProfile = cache(async () => {
  const session = await requireSession();
  const profile = await getProfile();
  if (!profile) redirect("/orientasi");
  return { ...session, profile };
});
