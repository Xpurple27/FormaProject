import Link from "next/link";
import { Brand } from "@/components/brand";
import { Navigation } from "@/components/navigation";
import { ReminderRuntime } from "@/components/reminder-controls";
import { listReminders } from "@/lib/reminder-data";
import { getProfile, requireSession } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { client, userId } = await requireSession();
  const profile = await getProfile();
  if (!profile) return <main id="isi" className="mx-auto max-w-3xl px-4 py-6 sm:p-10">
    <div className="mb-8"><Brand /></div>{children}
  </main>;
  const reminders = await listReminders(client, userId).catch(() => []);
  return <div className="app-shell">
    <aside className="rail">
      <Link href="/beranda" aria-label="Beranda FORMA"><Brand /></Link>
      <Navigation />
      <p className="muted caption mt-auto pl-2">Jurnal pribadi</p>
    </aside>
    <div>
      <header className="topbar px-4 py-3"><Link href="/beranda" aria-label="Beranda FORMA"><Brand /></Link></header>
      <main id="isi" className="shell-content"><ReminderRuntime reminders={reminders} timezone={profile.timezone} />{children}</main>
      <Navigation mobile />
    </div>
  </div>;
}
