"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { claimReminderNotification, deleteReminder, handleReminder, saveReminder } from "@/lib/reminder-actions";
import { dueOccurrence, REMINDER_KINDS, SNOOZE_MINUTES, type Reminder } from "@/lib/reminders";
import { DAY_NAMES } from "@/lib/workout";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export function ReminderForm({ id, reminder }: { id: string; reminder?: Reminder }) {
  const save = useActionForm(saveReminder);
  const remove = useActionForm(deleteReminder);
  const [confirm, setConfirm] = useState(false);
  return <div className="grid gap-2">
    <form {...save.form} aria-label={reminder ? "Ubah pengingat" : "Buat pengingat"} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      {reminder && <input type="hidden" name="version" value={reminder.updated_at} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Jenis<select name="kind" className="field" defaultValue={reminder?.kind ?? "meal"}>
          {Object.entries(REMINDER_KINDS).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}
        </select></label>
        <label className="label">Jam<input className="field" type="time" name="time" required defaultValue={reminder?.local_time.slice(0, 5) ?? "07:00"} /></label>
      </div>
      <fieldset>
        <legend className="caption muted mb-2">Hari pengingat</legend>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((label, index) => <label key={label}
            className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border line text-xs">
            <input type="checkbox" name="weekday" value={index + 1} defaultChecked={reminder?.weekdays.includes(index + 1) ?? true}
              className="accent-[var(--accent)]" />{label}
          </label>)}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" className="accent-[var(--accent)]" defaultChecked={reminder?.enabled ?? true} />Aktif
      </label>
      <Feedback {...save.state} />
      <button className="btn btn-primary justify-self-start" disabled={save.pending || remove.pending}>
        {save.pending ? "Menyimpan…" : "Simpan pengingat"}
      </button>
    </form>
    {reminder && (confirm ? <form {...remove.form} className="grid gap-2 border-t line pt-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={reminder.updated_at} />
      <p className="caption">Hapus jadwal ini?</p>
      <Feedback {...remove.state} />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-danger" disabled={save.pending || remove.pending}>{remove.pending ? "Menghapus…" : "Ya, hapus"}</button>
        <button className="btn btn-quiet" type="button" onClick={() => setConfirm(false)} disabled={remove.pending}>Batal</button>
      </div>
    </form> : <button className="btn btn-quiet justify-self-start" type="button" onClick={() => setConfirm(true)}>Hapus pengingat</button>)}
  </div>;
}

type DevicePermission = NotificationPermission | "unavailable" | "checking";
function notificationPermission(): DevicePermission {
  return window.isSecureContext && "Notification" in window && "serviceWorker" in navigator
    ? Notification.permission : "unavailable";
}

export function ReminderPermission() {
  const [permission, setPermission] = useState<DevicePermission>("checking");
  useEffect(() => {
    const update = () => setPermission(notificationPermission());
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, []);
  async function request() {
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission("unavailable");
    }
  }
  return <section className="card grid gap-3">
    <h2>Notifikasi perangkat</h2>
    <p className="caption muted">Pengingat tampil di dalam FORMA saat aplikasi dibuka. Dengan izin browser, notifikasi perangkat juga bisa muncul saat FORMA terbuka dan terhubung.</p>
    {permission === "default" && <button className="btn btn-secondary justify-self-start" type="button" onClick={request}>Izinkan notifikasi</button>}
    <p className="caption muted" role="status">
      {permission === "granted" && "Izin diberikan di perangkat ini."}
      {permission === "denied" && "Izin diblokir. Kamu bisa mengubahnya dari pengaturan situs. Pengingat di FORMA tetap tersedia."}
      {permission === "unavailable" && "Notifikasi perangkat belum tersedia di browser ini. Pengingat di FORMA tetap tersedia."}
    </p>
  </section>;
}

function DueReminder({ reminder, occurrence }: { reminder: Reminder; occurrence: string }) {
  const { state, pending, form } = useActionForm(handleReminder);
  const item = REMINDER_KINDS[reminder.kind];
  return <section className="rounded-xl border line bg-[var(--lift)] p-3 grid gap-2" aria-label={"Pengingat " + item.label}>
    <h2 className="flex items-center gap-2 text-base"><Bell size={18} aria-hidden="true" className="accent" />{item.label}</h2>
    <p className="caption muted">{item.message}</p>
    <form {...form} className="grid gap-2">
      <input type="hidden" name="id" value={reminder.id} />
      <input type="hidden" name="occurrence" value={occurrence} />
      <div className="flex flex-wrap items-center gap-2">
        {item.href && <Link className="btn btn-secondary" href={item.href}>{item.action}</Link>}
        <button className="btn btn-quiet" name="intent" value="snooze" disabled={pending}>Tunda {SNOOZE_MINUTES} menit</button>
        <button className="btn btn-quiet" name="intent" value="done" disabled={pending}>Tutup pengingat</button>
      </div>
      <Feedback {...state} />
    </form>
  </section>;
}

export function ReminderRuntime({ reminders, timezone }: { reminders: Reminder[]; timezone: string }) {
  const [now, setNow] = useState<Date>();
  const attempted = useRef(new Set<string>());
  useEffect(() => {
    if (!reminders.some(item => item.enabled)) return;
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 15_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("online", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("online", update);
    };
  }, [reminders]);

  useEffect(() => {
    if (!now || !navigator.onLine || notificationPermission() !== "granted") return;
    const timestamp = now;
    let active = true;
    async function notify() {
      const worker = await navigator.serviceWorker.getRegistration("/");
      if (!active || !worker?.active) return;
      for (const reminder of reminders) {
        const occurrence = dueOccurrence(reminder, timezone, timestamp);
        const key = reminder.id + ":" + occurrence;
        if (!occurrence || attempted.current.has(key) ||
          (reminder.last_notified_at && Date.parse(reminder.last_notified_at) >= Date.parse(occurrence))) continue;
        attempted.current.add(key);
        try {
          if (await claimReminderNotification(reminder.id, occurrence)) {
            await worker.showNotification("FORMA · " + REMINDER_KINDS[reminder.kind].label, {
              body: "Buka FORMA untuk melihat pengingat.",
              icon: "/forma.png", tag: key, data: { kind: reminder.kind },
            });
          }
        } catch {
          // The in-app reminder stays available even if the device rejects a notification.
        }
      }
    }
    void notify().catch(() => {});
    return () => { active = false; };
  }, [now, reminders, timezone]);

  const due = now ? reminders.flatMap(reminder => {
    const occurrence = dueOccurrence(reminder, timezone, now);
    return occurrence ? [{ reminder, occurrence }] : [];
  }) : [];
  return due.length ? <aside className="mb-4 grid gap-2" aria-label="Pengingat aktif">
    {due.map(({ reminder, occurrence }) => <DueReminder key={reminder.id + occurrence} reminder={reminder} occurrence={occurrence} />)}
  </aside> : null;
}
