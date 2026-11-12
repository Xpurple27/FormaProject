import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allRows } from "./data";
import type { Database, Measurement, WorkoutSet } from "./types";
import { DEFAULT_WORKOUT_DAYS } from "./workout";

type Client = SupabaseClient<Database>;
export async function trainingOverview(client: Client, userId: string, historyLimit = 30) {
  const [preference, open, history] = await Promise.all([
    client.from("workout_preferences").select("weekdays").eq("user_id", userId).maybeSingle(),
    client.from("workout_sessions").select("*").eq("user_id", userId)
      .in("status", ["active", "paused"]).maybeSingle(),
    client.from("workout_sessions").select("*").eq("user_id", userId).eq("status", "completed")
      .order("started_at", { ascending: false }).limit(historyLimit),
  ]);
  if (preference.error || open.error || history.error) throw new Error("Could not load training");
  return { weekdays: preference.data?.weekdays ?? DEFAULT_WORKOUT_DAYS, open: open.data, history: history.data };
}

export async function setsForSessions(client: Client, userId: string, sessionIds: string[]) {
  if (!sessionIds.length) return [];
  return allRows<WorkoutSet>((from, to) => client.from("workout_sets").select("*")
    .eq("user_id", userId).in("session_id", sessionIds).order("session_id").order("slot").order("set_number").range(from, to));
}

export async function getMeasurements(client: Client, userId: string) {
  return allRows<Measurement>((from, to) => client.from("body_measurements").select("*")
    .eq("user_id", userId).order("measured_date", { ascending: false }).range(from, to));
}
