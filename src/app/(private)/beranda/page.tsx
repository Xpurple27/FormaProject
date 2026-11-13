import Link from "next/link";
import { ArrowUpRight, BookOpen, Dumbbell, Plus, Scale, Utensils } from "lucide-react";
import { NutritionSummary } from "@/components/nutrition-summary";
import { dailyNutrition } from "@/lib/data";
import { localNow, longDate } from "@/lib/dates";
import { fmt, MEALS, sumEntries } from "@/lib/nutrition";
import { trainingOverview } from "@/lib/training-data";
import { nextRoutine, programWeek, trainingWeek } from "@/lib/workout";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "Beranda" };
export default async function Home({ searchParams }: { searchParams: Promise<{ awal?: string }> }) {
  const { client, profile, userId } = await requireProfile();
  const day = localNow(profile.timezone).date;
  const [{ entries, target }, { open, history, weekdays }, measurement, query] = await Promise.all([
    dailyNutrition(client, userId, day), trainingOverview(client, userId, 1),
    client.from("body_measurements").select("measured_date,weight_kg").eq("user_id", userId)
      .not("weight_kg", "is", null).order("measured_date", { ascending: false }).limit(1).maybeSingle(),
    searchParams,
  ]);
  const week = programWeek(profile.start_date, day);
  const scheduled = week !== null && trainingWeek(profile.start_date, week, weekdays).days.includes(day);
  const weight = measurement.data?.weight_kg;
  return <div className="dashboard grid gap-4 md:gap-6">
    <header className="page-heading">
      <p className="page-date">{longDate(day)}</p>
      <h1 className="break-words">Halo, {profile.name}.</h1>
    </header>
    {query.awal === "1" && <p role="status" className="notice">Profil dan target awal tersimpan. Mulai dengan mencatat satu makanan yang kamu makan hari ini.</p>}
    <div className="dashboard-main">
      <NutritionSummary totals={sumEntries(entries)} target={target} label="Kalori hari ini" />
      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/nutrisi#catat" className="btn btn-primary !px-2.5"><Plus size={19} aria-hidden="true" className="shrink-0" />
          {query.awal === "1" ? "Catat makanan pertama" : "Catat makanan"}
        </Link>
        <Link href="/nutrisi#jurnal" className="btn btn-secondary !px-2.5"><BookOpen size={18} aria-hidden="true" className="shrink-0" />Buka jurnal</Link>
      </div>
    </div>
    <section aria-label="Latihan dan progres" className="dashboard-side grid grid-cols-2 gap-2.5">
      <Link href={open ? "/latihan#sesi" : "/latihan"} className="card dashboard-tile">
        <div className="tile-top"><span className="tile-icon tile-icon-blue"><Dumbbell size={18} aria-hidden="true" /></span>
          <ArrowUpRight size={17} className="muted shrink-0" aria-hidden="true" /></div>
        <h2>Latihan</h2>
        <p>{open ? "Workout " + open.routine + (open.status === "paused" ? " · Dijeda" : " · Aktif")
          : scheduled ? "Jadwal hari ini · Workout " + nextRoutine(history[0]?.routine) : "Program Workout A/B"}</p>
      </Link>
      <Link href="/progres" className="card dashboard-tile">
        <div className="tile-top"><span className="tile-icon tile-icon-lilac"><Scale size={18} aria-hidden="true" /></span>
          <ArrowUpRight size={17} className="muted shrink-0" aria-hidden="true" /></div>
        <h2>Progres</h2>
        <p>{measurement.error ? "Pengukuran belum dapat dimuat." : weight == null ? "Catat berat badan" : "Berat terakhir · " + fmt(weight, 2) + " kg"}</p>
      </Link>
    </section>
    <section className="card dashboard-journal">
      <div className="flex items-start justify-between gap-3">
        <div><h2>Jurnal hari ini</h2>
          <p className="caption muted mt-1">{entries.length ? entries.length + " catatan makanan" : "Belum ada makanan yang dicatat."}</p>
        </div>
        <Link href="/nutrisi#jurnal" className="btn btn-quiet !px-2" aria-label="Lihat seluruh jurnal"><ArrowUpRight size={19} aria-hidden="true" /></Link>
      </div>
      {entries.length > 0 && <ul className="mt-2 divide-y divide-[var(--border)]">
        {entries.slice(-4).reverse().map(entry => <li className="journal-preview-row" key={entry.id}>
          <span className="tile-icon" aria-hidden="true"><Utensils size={15} /></span>
          <div className="min-w-0 flex-1"><strong className="break-words">{entry.food_name}</strong>
            <p className="caption muted">{MEALS[entry.meal_type]} · {fmt(entry.quantity_g, 2)} g</p></div>
          <b className="shrink-0 numeric">{fmt(entry.calories_snapshot)} <span className="muted font-medium">kkal</span></b>
        </li>)}
      </ul>}
    </section>
  </div>;
}
