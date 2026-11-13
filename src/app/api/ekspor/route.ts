import { getProfile, getSession } from "@/lib/supabase/server";
import { allRows } from "@/lib/data";
import { getMeasurements } from "@/lib/training-data";
import { listReminders } from "@/lib/reminder-data";
import { progressPhotos } from "@/lib/progress-photos";
import type { Entry, Food, Target, WorkoutSession, WorkoutSet } from "@/lib/types";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await getSession();
  if (!session) return Response.json({ error: "Masuk untuk mengunduh data." }, { status: 401, headers });
  const { client, userId } = session;
  try {
    const [profile, targets, customFoods, entries, preferences, workoutSessions, workoutSets, bodyMeasurements, photoResult, reminders] = await Promise.all([
      getProfile(),
      allRows<Target>((start, end) => client.from("nutrition_targets").select("*")
        .eq("user_id", userId).order("effective_from").range(start, end)),
      allRows<Food>((start, end) => client.from("foods").select("*").eq("user_id", userId).order("id").range(start, end)),
      allRows<Entry>((start, end) => client.from("food_entries").select("*").eq("user_id", userId)
        .order("consumed_at").order("id").range(start, end)),
      client.from("workout_preferences").select("weekdays").eq("user_id", userId).maybeSingle(),
      allRows<WorkoutSession>((start, end) => client.from("workout_sessions").select("*").eq("user_id", userId)
        .order("started_at").order("id").range(start, end)),
      allRows<WorkoutSet>((start, end) => client.from("workout_sets").select("*").eq("user_id", userId)
        .order("session_id").order("slot").order("set_number").range(start, end)),
      getMeasurements(client, userId),
      progressPhotos(client, userId),
      listReminders(client, userId),
    ]);
    if (preferences.error) throw preferences.error;
    return Response.json({ version: 1, exportedAt: new Date().toISOString(), profile, targets, customFoods, entries,
      workoutPreferences: preferences.data, workoutSessions, workoutSets, bodyMeasurements, reminders,
      progressPhotos: photoResult.available ? photoResult.photos : null }, {
      headers: { ...headers, "Content-Disposition": 'attachment; filename="forma-ekspor.json"' },
    });
  } catch {
    return Response.json({ error: "Data belum bisa diekspor. Coba lagi." }, { status: 503, headers });
  }
}
