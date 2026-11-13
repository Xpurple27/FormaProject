import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { ReminderForm, ReminderPermission } from "@/components/reminder-controls";
import { InstallForma } from "@/components/pwa";
import { localNow } from "@/lib/dates";
import { listReminders } from "@/lib/reminder-data";
import { REMINDER_KINDS, ZONE_LABELS } from "@/lib/reminders";
import { requireProfile } from "@/lib/supabase/server";
import { DAY_NAMES } from "@/lib/workout";

export const metadata = { title: "Pengingat" };

export default async function ReminderPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { client, profile, userId } = await requireProfile();
  const [reminders, query] = await Promise.all([listReminders(client, userId), searchParams]);
  const now = new Date();
  return <div className="grid gap-4">
    <header>
      <Link href="/profil" className="btn btn-quiet mb-2">Kembali ke Profil</Link>
      <h1>Pengingat</h1>
      <p className="caption muted mt-2">Jadwal mengikuti zona waktu profil ({ZONE_LABELS[profile.timezone]}). Pengingat hanya diproses selama FORMA terbuka.</p>
    </header>
    <section id="jadwal" className="card grid gap-3">
      <h2>Jadwal pengingat</h2>
      {query.status === "tersimpan" && <Feedback message="Pengingat tersimpan." />}
      {query.status === "dihapus" && <Feedback message="Pengingat dihapus." />}
      {!reminders.length && <p className="caption muted">Belum ada jadwal.</p>}
      {reminders.map(reminder => <details className="rounded-xl border line px-3 pb-2" key={reminder.id + reminder.updated_at}>
        <summary>
          <strong>{REMINDER_KINDS[reminder.kind].label} · {reminder.local_time.slice(0, 5).replace(":", ".")}</strong>
          <span className="caption muted block">
            {reminder.weekdays.length === 7 ? "Setiap hari" : reminder.weekdays.map(day => DAY_NAMES[day - 1]).join(", ")}
            {" · "}{reminder.enabled ? "Aktif" : "Nonaktif"}
            {reminder.enabled && reminder.snoozed_until && Date.parse(reminder.snoozed_until) > now.getTime()
              ? " · Ditunda sampai " + localNow(profile.timezone, new Date(reminder.snoozed_until)).time.replace(":", ".") : ""}
          </span>
        </summary>
        <ReminderForm id={reminder.id} reminder={reminder} />
      </details>)}
    </section>
    <section className="card grid gap-3">
      <h2>Buat pengingat</h2>
      <ReminderForm key={reminders.map(item => item.id).join()} id={randomUUID()} />
    </section>
    <ReminderPermission />
    <InstallForma />
  </div>;
}
