import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allRows } from "./data";
import type { Reminder } from "./reminders";
import type { Database } from "./types";

export function listReminders(client: SupabaseClient<Database>, userId: string) {
  return allRows<Reminder>((from, to) => client.from("reminders").select("*")
    .eq("user_id", userId).order("local_time").order("id").range(from, to));
}
