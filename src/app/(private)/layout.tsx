import Link from "next/link";
import { Brand } from "@/components/brand";
import { Navigation } from "@/components/navigation";
import { getProfile, requireSession } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const profile = await getProfile();
  if (!profile) return <main id="isi" className="mx-auto max-w-3xl px-4 py-6 sm:p-10">
    <div className="mb-8"><Brand /></div>{children}
  </main>;
  return <div className="app-shell">
    <aside className="rail">
      <Link href="/beranda" aria-label="Beranda FORMA"><Brand /></Link>
      <Navigation />
      <p className="muted caption mt-auto pl-2">Jurnal pribadi</p>
    </aside>
    <div>
      <header className="topbar px-4 py-3"><Link href="/beranda" aria-label="Beranda FORMA"><Brand /></Link></header>
      <main id="isi" className="shell-content">{children}</main>
      <Navigation mobile />
    </div>
  </div>;
}
