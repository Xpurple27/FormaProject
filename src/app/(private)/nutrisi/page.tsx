import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Coffee, Cookie, Layers2, ListChecks, Moon, Plus, Sun } from "lucide-react";
import { z } from "zod";
import { DiarySelection } from "@/components/diary-selection";
import { DiaryDate } from "@/components/diary-date";
import { Feedback } from "@/components/feedback";
import { CustomFoodForm, EditEntryForm, FoodForm } from "@/components/food-forms";
import { MealBuilder } from "@/components/meal-builder";
import { NutritionSummary } from "@/components/nutrition-summary";
import { dailyNutrition, getCatalog, recentFoods } from "@/lib/data";
import { dayOffset, localNow, longDate, validDate } from "@/lib/dates";
import { entryAmount, fmt, groupDiaryEntries, MEALS, missingNutrients, recordedCalories, sumEntries } from "@/lib/nutrition";
import type { Entry, Nutrients } from "@/lib/types";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "Nutrisi" };

const mealIcons = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Cookie };

const messages = {
  ditambah: "Makanan tercatat.", diubah: "Perubahan tersimpan.", dihapus: "Catatan dihapus.",
  makanan: "Makanan pribadi tersimpan. Pilih jumlah untuk mencatatnya.",
  menu: "Semua bahan dan minuman tercatat.",
  jajanan: "Jajanan tercatat.",
  "hapus-banyak": "Catatan terpilih dihapus.",
};

export default async function NutritionPage({ searchParams }: {
  searchParams: Promise<{ tanggal?: string; status?: string; catat?: string; makan?: string; mode?: string; tambah?: string; pilih?: string }>;
}) {
  const [{ client, userId, profile }, query] = await Promise.all([requireProfile(), searchParams]);
  const { date: today, time } = localNow(profile.timezone);
  const requested = query.tanggal;
  const date = typeof requested === "string" && validDate(requested) && requested <= today ? requested : today;
  const meal = typeof query.makan === "string" && Object.hasOwn(MEALS, query.makan)
    ? query.makan as keyof typeof MEALS : undefined;
  const chosen = z.uuid().safeParse(query.catat);
  const selecting = query.pilih === "1";
  const adding = !selecting && (query.tambah === "1" || meal !== undefined || query.mode === "susun" || chosen.success);
  const catalogRequest = adding ? getCatalog(client) : Promise.resolve([]);
  const [{ entries, target }, catalog, recent] = await Promise.all([
    dailyNutrition(client, userId, date),
    catalogRequest,
    adding ? recentFoods(client, userId, catalogRequest) : [],
  ]);
  const selection = chosen.success ? catalog.find(food => food.id === chosen.data) : undefined;
  const message = typeof query.status === "string" && Object.hasOwn(messages, query.status)
    ? messages[query.status as keyof typeof messages] : undefined;

  const composing = query.mode === "susun";
  const dates = { date, today, time, meal };
  const foodFormId = randomUUID();
  const diary = "/nutrisi?tanggal=" + date;
  const base = diary + "&tambah=1" + (meal ? "&makan=" + meal : "");
  return <div className="grid gap-4 md:gap-6">
    <header className="page-heading"><h1>Jurnal nutrisi</h1><p className="page-date">{longDate(date)}</p></header>
    <DiaryDate date={date} today={today} prev={date === "1900-01-01" ? null : dayOffset(date, -1)} next={date < today ? dayOffset(date, 1) : null} />
    <NutritionSummary totals={sumEntries(entries)} target={target} missing={missingNutrients(entries)} label={date === today ? "Kalori hari ini" : "Kalori tercatat"} />
    <div className={adding ? "nutrition-layout" : "grid gap-4"}>
      <section id="jurnal" className="card diary-card grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2>Riwayat makan</h2>
          {!selecting && <div className="flex flex-wrap justify-end gap-1.5">
            {entries.length > 0 && <Link prefetch={false} href={diary + "&pilih=1#jurnal"} className="btn btn-quiet !px-2">
              <ListChecks size={17} aria-hidden="true" />Pilih catatan
            </Link>}
            <Link prefetch={false} href={base + "#catat"} className="btn btn-secondary !px-2.5">
              <Plus size={17} className="shrink-0" aria-hidden="true" />Catat makanan
            </Link>
          </div>}
        </div>
        {query.status !== "makanan" && <Feedback message={message} />}
        {selecting ? <DiarySelection key={date} date={date} entries={entries} /> : (Object.entries(MEALS) as [keyof typeof MEALS, string][]).map(([type, label]) => {
          const group = entries.filter(entry => entry.meal_type === type);
          const Icon = mealIcons[type];
          const calories = sumEntries(group).calories;
          const hasMissing = missingNutrients(group).includes("calories");
          const href = "/nutrisi?tanggal=" + date + "&makan=" + type + "#catat";
          return <section key={type} className="diary-meal">
            <div className="diary-meal-header">
              <span className="tile-icon" aria-hidden="true"><Icon size={17} /></span>
              <div className="min-w-0 flex-1"><h3>{label}</h3><p className="caption muted">
                {group.length ? recordedCalories(calories, hasMissing) : "Belum dicatat"}
              </p></div>
              <Link prefetch={false} href={href} className="topbar-action" aria-label={"Catat " + label.toLowerCase()}>
                <Plus size={19} aria-hidden="true" />
              </Link>
            </div>
            {group.length > 0 && <ul className="divide-y divide-[var(--border)]">
              {groupDiaryEntries(group).map(items => {
                const entry = items[0];
                return <li key={entry.meal_batch_id ?? entry.id}>
                  {entry.meal_batch_id ? <details className="px-2.5">
                    <summary className="break-words">
                      <strong>{entry.meal_batch_name ?? "Susunan makanan"}</strong>
                      <span className="caption muted"> · {items.length} komponen · {recordedCalories(sumEntries(items).calories, missingNutrients(items).includes("calories"))}</span>
                    </summary>
                    <ul>{items.map(item => <li key={item.id}><DiaryEntry entry={item} /></li>)}</ul>
                  </details> : <DiaryEntry entry={entry} />}
                </li>;
              })}
            </ul>}
          </section>;
        })}
      </section>
      {adding && <div id="catat" className="grid gap-3 min-w-0">
        <Link prefetch={false} href={diary + "#jurnal"} className="btn btn-quiet justify-self-start !px-2">Tutup katalog</Link>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cara mencatat">
          <Link prefetch={false} href={base + "#catat"} aria-current={!composing ? "page" : undefined}
            className={composing ? "btn btn-secondary !px-2" : "btn btn-primary !px-2"}>Satu makanan</Link>
          <Link prefetch={false} href={base + "&mode=susun#catat"} aria-current={composing ? "page" : undefined}
            className={composing ? "btn btn-primary !px-2" : "btn btn-secondary !px-2"}>
            <Layers2 size={17} aria-hidden="true" className="shrink-0" />Susun sekali makan
          </Link>
        </div>
        {composing ? <section className="card grid gap-4">
          <div><h2>Susun sekali makan</h2>
            <p className="caption muted mt-1">Pilih bahan, lauk, dan minuman. FORMA menghitung total dari takaran yang kamu masukkan.</p>
          </div>
          <MealBuilder key={base} id={randomUUID()} initial={catalog} recent={recent} dates={dates} />
        </section> : <>
          {query.status === "makanan" && selection && <Feedback message={message} />}
          <FoodForm key={foodFormId} id={foodFormId} initial={catalog} recent={recent} preselected={selection ?? null} {...dates} />
          <CustomFoodForm key={date + meal} id={randomUUID()} dates={dates} />
        </>}
      </div>}
    </div>
  </div>;
}

function DiaryEntry({ entry }: { entry: Entry }) {
  const recorded = localNow(entry.timezone, new Date(entry.consumed_at));
  const known = (key: keyof Nutrients, amount: number, unit: string) =>
    entry.known_nutrients.includes(key) ? fmt(amount) + " " + unit : "—";
  return <div className="diary-entry">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><b className="break-words">{entry.food_name}</b>
        <p className="muted caption break-words">{recorded.time.replace(":", ".")} · {entryAmount(entry)} · {entry.preparation}</p></div>
      <b className="shrink-0 numeric">{known("calories", entry.calories_snapshot, "kkal")}</b>
    </div>
    <p className="muted caption mt-1">Protein {known("protein_g", entry.protein_snapshot, "g")} · Karbo {known("carbs_g", entry.carbs_snapshot, "g")} · Lemak {known("fat_g", entry.fat_snapshot, "g")}</p>
    <p className="muted caption mt-1 break-words">Estimasi · {entry.source_url
      ? <a href={entry.source_url} target="_blank" rel="noreferrer" className="underline">{entry.source}</a> : entry.source}</p>
    <EditEntryForm key={entry.updated_at} entry={entry} dates={{ ...recorded, today: localNow(entry.timezone).date }} />
  </div>;
}
