import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Coffee, Cookie, Moon, Plus, Sun } from "lucide-react";
import { z } from "zod";
import { DiaryDate } from "@/components/diary-date";
import { Feedback } from "@/components/feedback";
import { CustomFoodForm, EditEntryForm, FoodForm } from "@/components/food-forms";
import { NutritionSummary } from "@/components/nutrition-summary";
import { dailyNutrition, findFoods, recentFoods } from "@/lib/data";
import { dayOffset, localNow, longDate, validDate } from "@/lib/dates";
import { fmt, MEALS, sumEntries } from "@/lib/nutrition";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "Nutrisi" };

const mealIcons = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Cookie };

const messages = {
  ditambah: "Makanan tercatat.", diubah: "Perubahan tersimpan.", dihapus: "Catatan dihapus.",
  makanan: "Makanan pribadi tersimpan. Pilih jumlah untuk mencatatnya.",
};

export default async function NutritionPage({ searchParams }: {
  searchParams: Promise<{ tanggal?: string; status?: string; catat?: string; makan?: string }>;
}) {
  const [{ client, userId, profile }, query] = await Promise.all([requireProfile(), searchParams]);
  const { date: today, time } = localNow(profile.timezone);
  const requested = query.tanggal;
  const date = typeof requested === "string" && validDate(requested) && requested <= today ? requested : today;
  const meal = typeof query.makan === "string" && Object.hasOwn(MEALS, query.makan)
    ? query.makan as keyof typeof MEALS : undefined;
  const chosen = z.uuid().safeParse(query.catat);
  const [{ entries, target }, catalog, recent, selection] = await Promise.all([
    dailyNutrition(client, userId, date), findFoods(client, "", ""), recentFoods(client, userId),
    chosen.success ? client.from("foods").select("*").eq("id", chosen.data).maybeSingle() : null,
  ]);
  if (selection?.error) throw new Error("Could not load selected food");
  const message = typeof query.status === "string" && Object.hasOwn(messages, query.status)
    ? messages[query.status as keyof typeof messages] : undefined;

  const foodFormId = randomUUID();
  return <div className="grid gap-4 md:gap-6">
    <header className="page-heading"><h1>Jurnal nutrisi</h1><p className="page-date">{longDate(date)}</p></header>
    <DiaryDate date={date} today={today} prev={date === "1900-01-01" ? null : dayOffset(date, -1)} next={date < today ? dayOffset(date, 1) : null} />
    <NutritionSummary totals={sumEntries(entries)} target={target} label={date === today ? "Kalori hari ini" : "Kalori tercatat"} />
    <div className="nutrition-layout">
      <section id="jurnal" className="card diary-card grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2>Riwayat makan</h2>
          <Link href="#catat" className="btn btn-secondary !px-2.5"><Plus size={17} className="shrink-0" aria-hidden="true" />Catat makanan</Link>
        </div>
        {query.status !== "makanan" && <Feedback message={message} />}
        {(Object.entries(MEALS) as [keyof typeof MEALS, string][]).map(([type, label]) => {
          const group = entries.filter(entry => entry.meal_type === type);
          const Icon = mealIcons[type];
          const calories = group.reduce((total, entry) => total + entry.calories_snapshot, 0);
          const href = "/nutrisi?tanggal=" + date + "&makan=" + type + "#catat";
          return <section key={type} className="diary-meal">
            <div className="diary-meal-header">
              <span className="tile-icon" aria-hidden="true"><Icon size={17} /></span>
              <div className="min-w-0 flex-1"><h3>{label}</h3><p className="caption muted">
                {group.length ? fmt(calories) + " kkal" : "Belum dicatat"}
              </p></div>
              <Link href={href} className="topbar-action" aria-label={"Catat " + label.toLowerCase()}>
                <Plus size={19} aria-hidden="true" />
              </Link>
            </div>
            {group.length > 0 && <ul className="divide-y divide-[var(--border)]">
              {group.map(entry => {
                const recorded = localNow(entry.timezone, new Date(entry.consumed_at));
                return <li key={entry.id} className="diary-entry">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><b className="break-words">{entry.food_name}</b>
                      <p className="muted caption break-words">{recorded.time.replace(":", ".")} · {fmt(entry.quantity_g, 2)} g · {entry.preparation}</p></div>
                    <b className="shrink-0 numeric">{fmt(entry.calories_snapshot)} <span className="muted font-medium">kkal</span></b>
                  </div>
                  <p className="muted caption mt-1">Protein {fmt(entry.protein_snapshot)} g · Karbo {fmt(entry.carbs_snapshot)} g · Lemak {fmt(entry.fat_snapshot)} g</p>
                  <p className="muted caption mt-1 break-words">Estimasi · {entry.source_url
                    ? <a href={entry.source_url} target="_blank" rel="noreferrer" className="underline">{entry.source}</a> : entry.source}</p>
                  <EditEntryForm key={entry.updated_at} entry={entry} dates={{ ...recorded, today: localNow(entry.timezone).date }} />
                </li>;
              })}
            </ul>}
          </section>;
        })}
      </section>
      <div className="grid gap-3 min-w-0">
        {query.status === "makanan" && selection?.data && <Feedback message={message} />}
        <FoodForm key={foodFormId} id={foodFormId} initial={catalog} recent={recent}
          preselected={selection?.data ?? null} date={date} today={today} time={time} meal={meal} />
        <CustomFoodForm key={date + meal} id={randomUUID()} diaryDate={date} meal={meal} />
      </div>
    </div>
  </div>;
}
