"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "./actions";
import { localNow } from "./dates";
import { requireProfile } from "./supabase/server";
import { date, version } from "./validation";
import { exerciseFor, exerciseOptions, isExerciseId, programWeek, workoutExercises } from "./workout";

const unable = { error: "Perubahan belum tersimpan. Muat ulang halaman dan coba lagi." };
const invalid = { error: "Periksa kembali isian." };
const integer = (min: number, max: number) => z.string().regex(/^\d+$/)
  .transform(Number).pipe(z.number().int().min(min).max(max));
const decimal = (min: number, max: number) => z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/)
  .transform(value => Number(value.replace(",", "."))).pipe(z.number().min(min).max(max));
const optionalNumber = (min: number, max: number) => z.union([
  z.literal("").transform(() => null), decimal(min, max),
]);
const sessionId = z.uuid();
const routine = z.enum(["A", "B"]);
const actionInput = z.object({
  id: sessionId, action: z.enum(["pause", "resume", "finish", "cancel", "skip", "restore", "replace"]),
  slot: integer(1, 4).optional(), exercise: z.string().refine(isExerciseId).optional(),
});
const setInput = z.object({
  id: sessionId, slot: integer(1, 4), set: integer(1, 3),
  amount: integer(1, 600), load: optionalNumber(0, 100).optional(), version: version.optional(),
});
const bodyInput = z.object({
  date, weight: optionalNumber(25, 350), waist: optionalNumber(30, 300),
  notes: z.string().trim().max(300), version: version.optional(),
}).refine(input => input.weight !== null || input.waist !== null);

function refreshWorkout() {
  revalidatePath("/latihan");
  revalidatePath("/progres");
  revalidatePath("/beranda");
}

export async function saveWorkoutDays(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = z.array(integer(1, 7)).min(1).max(3).safeParse(form.getAll("weekday"));
  if (!parsed.success || new Set(parsed.data).size !== parsed.data.length) {
    return { error: "Pilih antara satu sampai tiga hari latihan." };
  }
  const weekdays = [...parsed.data].sort((a, b) => a - b);
  const { error } = await client.from("workout_preferences").upsert({ user_id: userId, weekdays });
  if (error) return unable;
  refreshWorkout();
  redirect("/latihan?status=jadwal-tersimpan#jadwal");
}

export async function startWorkout(_: FormState, form: FormData): Promise<FormState> {
  const { client, profile, userId } = await requireProfile();
  const parsed = z.object({ id: sessionId, routine, sets: integer(2, 3) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid;
  const localDate = localNow(profile.timezone).date;
  const week = programWeek(profile.start_date, localDate);
  const { error } = await client.from("workout_sessions").insert({
    id: parsed.data.id, routine: parsed.data.routine, local_date: localDate, program_week: week,
    exercise_ids: workoutExercises(parsed.data.routine, profile.equipment === "dumbbells"),
    prescribed_sets: week !== null && week >= 5 ? parsed.data.sets : 2,
  });
  if (error) {
    if (error.code !== "23505") return unable;
    const open = await client.from("workout_sessions").select("id").eq("user_id", userId)
      .in("status", ["active", "paused"]).maybeSingle();
    if (!open.data) return unable;
  }
  refreshWorkout();
  redirect("/latihan#sesi");
}

export async function changeWorkout(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = actionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid;
  const x = parsed.data;
  if (x.action === "replace") {
    const row = await client.from("workout_sessions").select("routine")
      .eq("user_id", userId).eq("id", x.id).maybeSingle();
    if (!row.data || !x.slot || !x.exercise || !isExerciseId(x.exercise)
      || !exerciseOptions(row.data.routine, x.slot).includes(x.exercise)) return invalid;
  }
  const { error } = await client.rpc("change_workout", {
    p_id: x.id, p_action: x.action, p_slot: x.slot, p_exercise: x.exercise,
  });
  if (error) {
    if (error.message.includes("Record at least one set")) return { error: "Catat set yang selesai sebelum menutup sesi." };
    if (error.message.includes("Exercise has saved sets")) return { error: "Gerakan sudah memiliki set yang tercatat." };
    return unable;
  }
  refreshWorkout();
  if (x.action === "finish") redirect("/latihan?status=selesai#riwayat");
  if (x.action === "cancel") redirect("/latihan?status=dibatalkan");
  return { message: x.action === "pause" ? "Sesi dijeda." : x.action === "resume" ? "Sesi dilanjutkan." : "Gerakan diperbarui." };
}

export async function saveWorkoutSet(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = setInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid;
  const x = parsed.data;
  const session = await client.from("workout_sessions").select("exercise_ids,status").eq("user_id", userId)
    .eq("id", x.id).maybeSingle();
  if (session.error || !session.data || session.data.status !== (x.version ? "completed" : "active")) return unable;
  const exerciseId = session.data.exercise_ids[x.slot - 1];
  if (!exerciseId) return invalid;
  const exercise = exerciseFor(exerciseId);
  if (exercise.kind === "reps" && x.amount > 100) return invalid;

  const values = { amount: x.amount, load_kg: exercise.weighted ? x.load ?? null : null };
  if (x.version) {
    const { data, error } = await client.from("workout_sets").update(values)
      .eq("user_id", userId).eq("session_id", x.id).eq("slot", x.slot).eq("set_number", x.set)
      .eq("recorded_at", x.version).select("slot").maybeSingle();
    if (error || !data) return unable;
  } else {
    const { error } = await client.from("workout_sets").upsert({
      ...values, user_id: userId, session_id: x.id, exercise_id: exerciseId, slot: x.slot, set_number: x.set,
    }, { onConflict: "session_id,slot,set_number" });
    if (error) return unable;
  }
  refreshWorkout();
  return { message: "Set " + x.set + " tersimpan." };
}

export async function removeWorkoutSet(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = setInput.pick({ id: true, slot: true, set: true }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid;
  const x = parsed.data;
  const { data, error } = await client.from("workout_sets").delete().eq("user_id", userId)
    .eq("session_id", x.id).eq("slot", x.slot).eq("set_number", x.set).select("slot").maybeSingle();
  if (error || !data) return unable;
  refreshWorkout();
  return { message: "Set dihapus." };
}

export async function saveMeasurement(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId, profile } = await requireProfile();
  const parsed = bodyInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Isi berat atau lingkar pinggang dengan angka yang valid." };
  const x = parsed.data;
  if (x.date > localNow(profile.timezone).date) return { error: "Pilih tanggal hari ini atau sebelumnya." };
  const values = { weight_kg: x.weight, waist_cm: x.waist, notes: x.notes };
  if (x.version) {
    const { data, error } = await client.from("body_measurements").update(values)
      .eq("user_id", userId).eq("measured_date", x.date).eq("updated_at", x.version)
      .select("measured_date").maybeSingle();
    if (error || !data) return unable;
  } else {
    const { error } = await client.from("body_measurements").insert({
      ...values, user_id: userId, measured_date: x.date,
    });
    if (error?.code === "23505") return { error: "Tanggal ini sudah tercatat. Gunakan Ubah di riwayat." };
    if (error) return unable;
  }
  revalidatePath("/progres");
  revalidatePath("/beranda");
  redirect("/progres?status=tersimpan#pengukuran");
}

export async function deleteMeasurement(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = z.object({ date, version }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid;
  const { data, error } = await client.from("body_measurements").delete()
    .eq("user_id", userId).eq("measured_date", parsed.data.date).eq("updated_at", parsed.data.version)
    .select("measured_date").maybeSingle();
  if (error || !data) return unable;
  revalidatePath("/progres");
  revalidatePath("/beranda");
  redirect("/progres?status=dihapus#pengukuran");
}
