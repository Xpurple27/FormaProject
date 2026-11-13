import Link from "next/link";
import { ArrowRight, BookOpen, Dumbbell, Plus, Ruler } from "lucide-react";
import { NutritionSummary } from "@/components/nutrition-summary";
import { dailyNutrition } from "@/lib/data";
import { localNow, longDate } from "@/lib/dates";
import { fmt, sumEntries } from "@/lib/nutrition";
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
  return <div className="grid gap-5 md:gap-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0"><p className="eyebrow mb-2">{longDate(day)}</p><h1 className="break-words">Halo, {profile.name}.</h1>
        <p className="mt-2 muted">Ringkasan asupan hari ini.</p></div>
      <Link href="/nutrisi#catat" className="btn btn-primary"><Plus size={19} aria-hidden="true" /> {query.awal === "1" ? "Catat makanan pertama" : "Catat makanan"}</Link>
    </header>
    {query.awal === "1" && <p role="status" className="card">Profil dan target awal tersimpan. Mulai dengan mencatat satu makanan yang kamu makan hari ini.</p>}
    <NutritionSummary totals={sumEntries(entries)} target={target} label="Kalori hari ini" />
    <section className="card flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2"><Dumbbell size={20} aria-hidden="true" className="accent" />Latihan</h2>
        <p className="mt-2 caption muted">{open ? "Workout " + open.routine + (open.status === "paused" ? " · Dijeda" : " · Sedang berjalan")
          : scheduled ? "Jadwal hari ini · Workout " + nextRoutine(history[0]?.routine)
            : "Buka program Workout A/B atau mulai sesi sesuai waktumu."}</p></div>
      <Link href={open ? "/latihan#sesi" : "/latihan"} className="btn btn-secondary">
        {open ? "Buka sesi" : "Lihat latihan"} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
    <section className="card flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2"><Ruler size={20} aria-hidden="true" className="accent" />Progres</h2>
        <p className="mt-2 caption muted">{measurement.error ? "Pengukuran belum dapat dimuat."
          : measurement.data?.weight_kg == null ? "Catat berat atau lingkar pinggang untuk melihat tren."
            : "Berat terakhir · " + fmt(measurement.data.weight_kg, 2) + " kg · " + longDate(measurement.data.measured_date)}</p></div>
      <Link href="/progres" className="btn btn-secondary">Buka progres <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
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
