import { Temporal } from "@js-temporal/polyfill";
import { dayOffset, localNow, toInstant } from "./dates";

export const REMINDER_KINDS = {
  meal: { label: "Makan", message: "Catat makananmu di jurnal nutrisi.", href: "/nutrisi#catat", action: "Catat makan" },
  workout: { label: "Latihan", message: "Buka jadwal atau lanjutkan sesimu.", href: "/latihan", action: "Buka latihan" },
  weight: { label: "Timbang berat", message: "Catat hasil timbang di Progres.", href: "/progres#pengukuran", action: "Catat berat" },
  bedtime: { label: "Waktu tidur", message: "Saatnya bersiap untuk tidur.", href: null, action: null },
} as const;

export const ZONE_LABELS: Record<string, string> = {
  "Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT",
};

export type ReminderKind = keyof typeof REMINDER_KINDS;
export type Reminder = {
  user_id: string; id: string; kind: ReminderKind; local_time: string; weekdays: number[];
  enabled: boolean; snoozed_until: string | null; acknowledged_at: string | null;
  last_notified_at: string | null; updated_at: string;
};

export const SNOOZE_MINUTES = 10;
const WINDOW_MINUTES = 120;

export function dueOccurrence(reminder: Reminder, timezone: string, now: Date) {
  if (!reminder.enabled) return null;
  const at = now.getTime();
  const snoozed = reminder.snoozed_until ? Date.parse(reminder.snoozed_until) : 0;
  if (snoozed > at) return null;

  const today = localNow(timezone, now).date;
  let latest = snoozed;
  for (const date of [today, dayOffset(today, -1)]) {
    if (!reminder.weekdays.includes(Temporal.PlainDate.from(date).dayOfWeek)) continue;
    const scheduled = Date.parse(toInstant(date, reminder.local_time.slice(0, 5), timezone));
    if (scheduled <= at && scheduled > latest) latest = scheduled;
  }

  const acknowledged = reminder.acknowledged_at ? Date.parse(reminder.acknowledged_at) : 0;
  if (latest <= acknowledged || at - latest >= WINDOW_MINUTES * 60_000) return null;
  return new Date(latest).toISOString();
}
