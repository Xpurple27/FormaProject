import { Temporal } from "@js-temporal/polyfill";

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

export function localNow(timezone: string, now = new Date()) {
  const zoned = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(timezone);
  return { date: zoned.toPlainDate().toString(), time: zoned.toPlainTime().toString({ smallestUnit: "minute" }) };
}

export function toInstant(date: string, time: string, timezone: string) {
  return Temporal.PlainDateTime.from(date + "T" + time)
    .toZonedDateTime(timezone, { disambiguation: "reject" }).toInstant().toString();
}

export function dayOffset(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

export function longDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}

export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  try {
    return Temporal.PlainDate.from(date).year >= 1900;
  } catch {
    return false;
  }
}
