import Link from "next/link";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { NutritionSummary } from "@/components/nutrition-summary";
import { dailyNutrition } from "@/lib/data";
import { localNow, longDate } from "@/lib/dates";
import { fmt, sumEntries } from "@/lib/nutrition";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "Beranda" };
export default async function Home() {
  const { client, profile, userId } = await requireProfile();
  const day = localNow(profile.timezone).date;
  const { entries, target } = await dailyNutrition(client, userId, day);
  return <div className="grid gap-5 md:gap-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0"><p className="eyebrow mb-2">{longDate(day)}</p><h1 className="break-words">Halo, {profile.name}.</h1>
        <p className="mt-2 muted">Ringkasan asupan hari ini.</p></div>
      <Link href="/nutrisi#catat" className="btn btn-primary"><Plus size={19} aria-hidden="true" /> Catat makanan</Link>
    </header>
    <NutritionSummary totals={sumEntries(entries)} target={target} label="Kalori hari ini" />
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2"><BookOpen size={20} aria-hidden="true" className="accent" /> Jurnal hari ini</h2>
        <Link href="/nutrisi#jurnal" className="btn btn-quiet">Buka jurnal <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      {entries.length ? <ul className="mt-3 divide-y divide-[var(--border)]">
        {entries.slice(-4).reverse().map(entry => <li className="flex justify-between gap-3 py-3 text-sm" key={entry.id}>
          <span className="min-w-0 break-words">{entry.food_name} <span className="muted caption">· {fmt(entry.quantity_g, 2)} g</span></span>
          <b className="shrink-0 numeric">{fmt(entry.calories_snapshot)} kkal</b>
        </li>)}
      </ul> : <p className="muted mt-4">Belum ada makanan yang dicatat hari ini.</p>}
    </section>
  </div>;
}
