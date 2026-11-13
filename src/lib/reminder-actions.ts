"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "./actions";
import { dueOccurrence, REMINDER_KINDS, SNOOZE_MINUTES, type ReminderKind } from "./reminders";
import { getProfile, getSession, requireProfile } from "./supabase/server";
import { version } from "./validation";

const saveError = { error: "Perubahan pengingat belum tersimpan. Coba lagi." };
const key = z.object({ id: z.uuid(), version: version.optional() });
const settings = key.extend({
  kind: z.enum(Object.keys(REMINDER_KINDS) as ReminderKind[]),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  weekdays: z.array(z.enum(["1", "2", "3", "4", "5", "6", "7"])).min(1).max(7),
  enabled: z.boolean(),
});

export async function saveReminder(_: FormState, form: FormData): Promise<FormState> {
  const parsed = settings.safeParse({
    ...Object.fromEntries(form), weekdays: form.getAll("weekday"), enabled: form.get("enabled") === "on",
  });
  if (!parsed.success) return { error: "Pilih jenis, jam, dan minimal satu hari." };
  const x = parsed.data;
  const { client, userId } = await requireProfile();
  const values = {
    kind: x.kind, local_time: x.time,
    weekdays: [...new Set(x.weekdays.map(Number))].sort((a, b) => a - b), enabled: x.enabled,
  };

  if (x.version) {
    const { data, error } = await client.from("reminders").update({
      ...values, snoozed_until: null, updated_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("id", x.id).eq("updated_at", x.version).select("id").maybeSingle();
    if (error || !data) return saveError;
  } else {
    const { error } = await client.from("reminders").upsert({ ...values, id: x.id },
      { onConflict: "user_id,id", ignoreDuplicates: true });
    if (error) return saveError;
  }

  revalidatePath("/", "layout");
  redirect("/pengingat?status=tersimpan#jadwal");
}

export async function deleteReminder(_: FormState, form: FormData): Promise<FormState> {
  const x = key.safeParse(Object.fromEntries(form));
  if (!x.success || !x.data.version) return saveError;
  const { client, userId } = await requireProfile();
  const { data, error } = await client.from("reminders").delete().eq("user_id", userId)
    .eq("id", x.data.id).eq("updated_at", x.data.version).select("id").maybeSingle();
  if (error || !data) return saveError;
  revalidatePath("/", "layout");
  redirect("/pengingat?status=dihapus#jadwal");
}

export async function handleReminder(_: FormState, form: FormData): Promise<FormState> {
  const x = z.object({ id: z.uuid(), occurrence: version, intent: z.enum(["snooze", "done"]) })
    .safeParse(Object.fromEntries(form));
  if (!x.success) return saveError;
  const { client, userId, profile } = await requireProfile();
  const { data: reminder, error: readError } = await client.from("reminders").select("*")
    .eq("user_id", userId).eq("id", x.data.id).maybeSingle();
  if (readError || !reminder) return saveError;
  const now = new Date();
  if (dueOccurrence(reminder, profile.timezone, now) !== x.data.occurrence) {
    revalidatePath("/", "layout");
    return { error: "Jadwal pengingat sudah berubah." };
  }

  const { data, error } = await client.from("reminders").update({
    acknowledged_at: now.toISOString(),
    snoozed_until: x.data.intent === "snooze" ? new Date(now.getTime() + SNOOZE_MINUTES * 60_000).toISOString() : null,
    updated_at: now.toISOString(),
  }).eq("user_id", userId).eq("id", reminder.id).eq("updated_at", reminder.updated_at).select("id").maybeSingle();
  revalidatePath("/", "layout");
  if (error || !data) return saveError;
  return {};
}

export async function claimReminderNotification(id: string, occurrence: string) {
  const x = z.object({ id: z.uuid(), occurrence: version }).safeParse({ id, occurrence });
  if (!x.success) return false;
  const session = await getSession();
  if (!session) return false;
  const profile = await getProfile();
  if (!profile) return false;
  const { client, userId } = session;
  const { data: reminder, error: readError } = await client.from("reminders").select("*")
    .eq("user_id", userId).eq("id", id).maybeSingle();
  if (readError || !reminder || dueOccurrence(reminder, profile.timezone, new Date()) !== occurrence) return false;
  const { data, error } = await client.from("reminders").update({ last_notified_at: occurrence })
    .eq("user_id", userId).eq("id", id).eq("updated_at", reminder.updated_at)
    .or("last_notified_at.is.null,last_notified_at.lt." + occurrence).select("id").maybeSingle();
  return !error && Boolean(data);
}
