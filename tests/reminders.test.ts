import { describe, expect, it } from "vitest";
import { dueOccurrence, type Reminder } from "../src/lib/reminders";

const schedule: Reminder = {
  id: "reminder", user_id: "user", kind: "workout", local_time: "06:00:00", weekdays: [1, 3, 5],
  enabled: true, snoozed_until: null, acknowledged_at: null, last_notified_at: null,
  updated_at: "2026-11-12T00:00:00.000Z",
};

describe("local reminders", () => {
  it("uses profile time, checks the selected weekdays, and expires old occurrences", () => {
    const at = new Date("2026-11-12T23:10:00Z"); // Friday at 06.10 WIB.
    expect(dueOccurrence(schedule, "Asia/Jakarta", at)).toBe("2026-11-12T23:00:00.000Z");
    expect(dueOccurrence(schedule, "Asia/Jayapura", at)).toBeNull();
    expect(dueOccurrence({ ...schedule, weekdays: [4] }, "Asia/Jakarta", at)).toBeNull();
    expect(dueOccurrence({ ...schedule, enabled: false }, "Asia/Jakarta", at)).toBeNull();
  });

  it("finds late-night reminders after midnight", () => {
    const bedtime = { ...schedule, weekdays: [4], local_time: "23:55:00" };
    expect(dueOccurrence(bedtime, "Asia/Jakarta", new Date("2026-11-12T17:03:00Z")))
      .toBe("2026-11-12T16:55:00.000Z");
  });

  it("honors snooze and dismissal without muting the next recurrence", () => {
    const snoozed = { ...schedule, snoozed_until: "2026-11-12T23:15:00Z", acknowledged_at: "2026-11-12T23:05:00Z" };
    expect(dueOccurrence(snoozed, "Asia/Jakarta", new Date("2026-11-12T23:10:00Z"))).toBeNull();
    expect(dueOccurrence(snoozed, "Asia/Jakarta", new Date("2026-11-12T23:15:00Z")))
      .toBe("2026-11-12T23:15:00.000Z");
    const dismissed = { ...snoozed, snoozed_until: null, acknowledged_at: "2026-11-12T23:15:00Z" };
    expect(dueOccurrence(dismissed, "Asia/Jakarta", new Date("2026-11-12T23:17:00Z"))).toBeNull();
    expect(dueOccurrence(dismissed, "Asia/Jakarta", new Date("2026-11-15T23:07:00Z")))
      .toBe("2026-11-15T23:00:00.000Z");
  });
});
