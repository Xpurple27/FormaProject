"use client";

import { useState } from "react";
import { Check, Plus, Search, Utensils } from "lucide-react";
import { addEntry, changeEntry, logPrivateSnack, removeEntry } from "@/lib/actions";
import { CATALOG_GROUPS, fmt, MEALS, missingNutrients, scaleNutrition, servingGrams } from "@/lib/nutrition";
import type { Entry, Food, Nutrients } from "@/lib/types";
import { Feedback } from "./feedback";
import { NutritionLabelFields } from "./nutrition-label-fields";
import { useActionForm } from "./use-action-form";

export type DateProps = { date: string; time: string; today: string; meal?: Entry["meal_type"] };

export function DateFields({ date, time, today, meal = "lunch" }: DateProps) {
  return <div className="grid grid-cols-2 gap-3">
    <label className="label">Tanggal<input className="field" type="date" name="date" min="1900-01-01" max={today} defaultValue={date} required /></label>
    <label className="label">Jam<input className="field" type="time" name="time" defaultValue={time} required /></label>
    <label className="label col-span-2">Waktu makan<select className="field" name="meal" defaultValue={meal}>
      {Object.entries(MEALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
  </div>;
}

function NutrientPreview({ nutrients, grams, known }: { nutrients: Nutrients; grams: number; known: (keyof Nutrients)[] }) {
  return <NutrientTotals values={scaleNutrition(nutrients, grams)} missing={missingNutrients([{ known_nutrients: known }])} />;
}

export function NutrientTotals({ values, missing = [] }: { values: Nutrients; missing?: (keyof Nutrients)[] }) {
  return <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--inset)] p-3 text-sm numeric sm:grid-cols-4" aria-live="polite">
    {([["calories", "Kalori", "kkal"], ["protein_g", "Protein", "g"], ["carbs_g", "Karbohidrat", "g"], ["fat_g", "Lemak", "g"]] as const)
      .map(([key, label, unit]) => <div key={key}><span className="muted caption block">{label}</span>
        <b>{missing.includes(key) ? values[key] > 0 ? "≥ " + fmt(values[key], 2) + " " + unit : "—" : fmt(values[key], 2) + " " + unit}</b></div>)}
  </div>;
}

export function PortionChoices({ current, choose }: { current: string; choose: (portion: string) => void }) {
  return <div className="portion-choices" role="group" aria-label="Porsi cepat">
    {([["0.5", "½ porsi"], ["1", "1 porsi"], ["1.5", "1½ porsi"], ["2", "2 porsi"]] as const)
      .map(([value, label]) => <button type="button" key={value}
        className={Number(current) === Number(value) ? "btn btn-primary" : "btn btn-secondary"}
        aria-pressed={Number(current) === Number(value)} onClick={() => choose(value)}>{label}</button>)}
  </div>;
}

function FoodChoices({ items, selected, choose }: { items: Food[]; selected?: string; choose: (item: Food) => void }) {
  return <ul className="divide-y divide-[var(--border)]">
    {items.map(item => <li key={item.id}>
      <button className="food-option" type="button" onClick={() => choose(item)} aria-pressed={item.id === selected}>
        <span className="tile-icon" aria-hidden="true"><Utensils size={15} /></span>
        <span className="min-w-0 flex-1 break-words"><b className="text-sm">{item.name}</b>
          <span className="block muted text-xs">{item.preparation} · {!item.known_nutrients.includes("calories") ? "Kalori belum diisi" : item.serving_g
            ? `≈ ${fmt(item.calories * item.serving_g / 100, 0)} kkal/${item.serving_label}`
            : `${fmt(item.calories)} kkal/100 g`}{item.user_id ? " · Pribadi" : ""}</span></span>
        {item.id === selected ? <Check className="shrink-0" size={17} aria-hidden="true" /> : <Plus className="shrink-0" size={16} aria-hidden="true" />}
      </button>
    </li>)}
  </ul>;
}

export function FoodPicker({ initial, recent, selected, choose, label = "Cari makanan", startGroup = "" }: {
  initial: Food[]; recent: Food[]; selected?: string; choose: (food: Food) => void; label?: string; startGroup?: string;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(startGroup);
  const [limit, setLimit] = useState(24);
  const terms = query.toLocaleLowerCase("id").split(/[\s+]+/).filter(Boolean);
  const foods = initial.filter(item => (!group || item.catalog_group === group) && (group || terms.length || item.catalog_group !== "ingredient")
    && terms.every(term => item.name.toLocaleLowerCase("id").includes(term)));
  return <div className="grid gap-3">
    <label className="label">{label}
      <span className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 soft" aria-hidden="true" />
        <input className="field !pl-9" type="search" value={query} maxLength={100} placeholder="Cari nasi, siomay, atau minuman"
          onChange={event => { setQuery(event.target.value); setLimit(24); }} /></span>
    </label>
    <label className="label">Kategori<select className="field" value={group} onChange={event => {
      setGroup(event.target.value); setLimit(24);
    }}>
      <option value="">Semua kategori</option>
      {Object.entries(CATALOG_GROUPS).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
    </select></label>
    {!terms.length && recent.some(item => !group || item.catalog_group === group) && <details>
      <summary className="caption font-semibold">Sering dicatat</summary>
      <FoodChoices items={recent.filter(item => !group || item.catalog_group === group)} selected={selected} choose={choose} />
    </details>}
    {foods.length > 0 ? <div className="scroll-foods rounded-xl border line">
      <FoodChoices items={foods.slice(0, limit)} selected={selected} choose={choose} />
      {foods.length > limit && <button type="button" className="btn btn-quiet w-full" onClick={() => setLimit(limit + 24)}>Tampilkan lebih banyak</button>}
    </div> : <p className="muted caption">Tidak ada hasil. Coba nama atau kategori lain.</p>}
  </div>;
}

export function FoodForm({ initial, recent, preselected, id, ...dates }: DateProps & {
  initial: Food[]; recent: Food[]; preselected: Food | null; id: string;
}) {
  const { state, pending, form } = useActionForm(addEntry);
  const [food, setFood] = useState(preselected);
  const [showCatalog, setShowCatalog] = useState(!preselected);
  const startsWithServing = Boolean(preselected?.serving_g && (preselected.portion_note || !preselected.portion_weight_known));
  const [unit, setUnit] = useState(startsWithServing ? "serving" : "gram");
  const [quantity, setQuantity] = useState(startsWithServing ? "1" : "100");

  const grams = servingGrams(Number(quantity), unit === "serving" ? food?.serving_g ?? 0 : 1);
  const canSave = Number.isFinite(grams) && grams >= 0.01 && grams <= 3000;
  function choose(item: Food) {
    const hasServing = Boolean(item.serving_g && (item.portion_note || !item.portion_weight_known));
    setFood(item);
    setUnit(hasServing ? "serving" : "gram");
    setQuantity(hasServing ? "1" : "100");
    setShowCatalog(false);
  }

  return <section className="card grid content-start gap-4">
    <div><h2>Catat makanan</h2>{dates.meal && <p className="muted caption mt-1">{MEALS[dates.meal]}</p>}</div>
    {showCatalog && <FoodPicker initial={initial} recent={recent} selected={food?.id} choose={choose} startGroup={dates.meal === "snack" ? "snack" : "main"} />}
    {food && <form {...form} className="grid gap-3 border-t pt-4 line" aria-label="Tambah catatan makanan">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="food" value={food.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 break-words">{food.name}</h3>
        <button className="btn btn-quiet" type="button" onClick={() => setShowCatalog(!showCatalog)}>
          {showCatalog ? "Tutup katalog" : "Ganti makanan"}
        </button>
      </div>
      <div>
        <p className="caption muted mt-1 break-words">Estimasi · {food.source_url
          ? <a className="underline" href={food.source_url} target="_blank" rel="noreferrer">{food.source}</a> : food.source}</p>
        {food.serving_g && food.portion_weight_known && <p className="caption muted">1 {food.serving_label} ≈ {fmt(food.serving_g, 2)} g</p>}
        {food.portion_note && <p className="caption muted mt-1">{food.portion_note}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Jumlah<input className="field" name="quantity" type="number" inputMode="decimal" min=".01" max="3000" step=".01" value={quantity}
          onChange={event => setQuantity(event.target.value)} required /></label>
        <label className="label">Satuan<select className="field" name="unit" value={unit}
          onChange={event => { setUnit(event.target.value); setQuantity(event.target.value === "serving" ? "1" : "100"); }}>
          {food.portion_weight_known && <option value="gram">Gram</option>}{food.serving_g && <option value="serving">{food.serving_label}</option>}
        </select></label>
      </div>
      {food.serving_g && <PortionChoices current={unit === "serving" ? quantity : ""} choose={portion => {
        setUnit("serving");
        setQuantity(portion);
      }} />}
      {canSave && <NutrientPreview nutrients={food} grams={grams} known={food.known_nutrients} />}
      {unit === "serving" && canSave && food.portion_weight_known && <p className="caption muted">Berat yang dicatat · {fmt(grams, 2)} g</p>}
      {!canSave && <p className="caption muted">Masukkan jumlah setara 0,01–3.000 g.</p>}
      <DateFields {...dates} />
      <Feedback {...state} />
      <button className="btn btn-primary" disabled={pending || !canSave}>{pending ? "Menyimpan…" : "Simpan ke jurnal"}</button>
    </form>}
  </section>;
}

export function CustomFoodForm({ id, dates }: { id: string; dates: DateProps }) {
  const { state, pending, form } = useActionForm(logPrivateSnack);
  const [readingLabel, setReadingLabel] = useState(false);
  return <details className="card !py-2">
    <summary className="font-semibold accent">Tambah jajanan sendiri</summary>
    <form {...form} className="grid gap-3 pb-3" aria-label="Tambah jajanan sendiri">
      <input type="hidden" name="id" value={id} />
      <p className="caption muted">Isi nama dan jumlah porsi. Rincian gizi boleh dikosongkan.</p>
      <label className="label">Nama jajanan<input name="name" className="field" maxLength={100} required /></label>
      <label className="label">Jumlah porsi<input name="quantity" className="field" type="number" min=".01" max="3000"
        step=".01" defaultValue="1" inputMode="decimal" required /></label>
      <details className="rounded-xl border line px-3">
        <summary className="font-semibold">Rincian gizi per porsi (opsional)</summary>
        <NutritionLabelFields onReading={setReadingLabel} />
      </details>
      <details className="rounded-xl border line px-3">
        <summary className="font-semibold">Waktu dan tanggal</summary>
        <div className="pb-3"><DateFields {...dates} meal={dates.meal ?? "snack"} /></div>
      </details>
      <Feedback {...state} />
      <button className="btn btn-primary" disabled={pending || readingLabel}>{pending ? "Menyimpan…" : "Catat jajanan"}</button>
    </form>
  </details>;
}

export function EditEntryForm({ entry, dates }: { entry: Entry; dates: DateProps }) {
  const [loaded, setLoaded] = useState(false);
  return <details className="mt-1" onToggle={event => {
    if (event.currentTarget.open) setLoaded(true);
  }}>
    <summary className="accent caption font-semibold">Kelola catatan</summary>
    {loaded && <EntryEditor entry={entry} dates={dates} />}
  </details>;
}

function EntryEditor({ entry, dates }: { entry: Entry; dates: DateProps }) {
  const edit = useActionForm(changeEntry);
  const remove = useActionForm(removeEntry);
  const [confirm, setConfirm] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.portion_weight_known ? entry.quantity_g : entry.quantity_g / (entry.reference_serving_g ?? 100)));
  const [unit, setUnit] = useState(entry.portion_weight_known ? "gram" : "serving");
  const grams = servingGrams(Number(quantity), unit === "serving" ? entry.reference_serving_g ?? 0 : 1);
  const canSave = grams >= .01 && grams <= 3000;
  const reference = {
    calories: entry.reference_calories, protein_g: entry.reference_protein_g,
    carbs_g: entry.reference_carbs_g, fat_g: entry.reference_fat_g,
  };
  return <div className="grid gap-3">
      <form {...edit.form} className="grid gap-3" aria-label={"Ubah " + entry.food_name}>
        <input type="hidden" name="id" value={entry.id} /><input type="hidden" name="version" value={entry.updated_at} />
        <input type="hidden" name="unit" value={unit} />
        {entry.reference_serving_g && <>
          {entry.portion_weight_known && <p className="caption muted">1 {entry.reference_serving_label} ≈ {fmt(entry.reference_serving_g, 2)} g</p>}
          <PortionChoices current={unit === "serving" ? quantity : ""} choose={portion => {
            setUnit("serving");
            setQuantity(portion);
          }} />
        </>}
        <label className="label">{unit === "serving" ? "Jumlah porsi" : "Jumlah (g)"}<input className="field" type="number"
          name="quantity" value={quantity} onChange={event => setQuantity(event.target.value)} min=".01" max="3000"
          step=".01" inputMode="decimal" required /></label>
        {unit === "serving" && canSave && entry.portion_weight_known && <p className="caption muted">Berat yang dicatat · {fmt(grams, 2)} g</p>}
        {unit === "serving" && entry.portion_weight_known && <button type="button" className="btn btn-quiet justify-self-start" onClick={() => {
          setQuantity(canSave ? String(grams) : String(entry.quantity_g));
          setUnit("gram");
        }}>Gunakan gram</button>}
        {canSave && <NutrientPreview nutrients={reference} grams={grams} known={entry.known_nutrients} />}
        <DateFields {...dates} meal={entry.meal_type} />
        <Feedback {...edit.state} />
        <button className="btn btn-secondary justify-self-start" disabled={edit.pending || remove.pending || !canSave}>{edit.pending ? "Menyimpan…" : "Simpan perubahan"}</button>
      </form>
      {confirm ? <form {...remove.form} className="grid gap-2 rounded-xl border line p-3" aria-label={"Hapus " + entry.food_name}>
        <input type="hidden" name="id" value={entry.id} /><input type="hidden" name="date" value={entry.local_date} />
        <input type="hidden" name="version" value={entry.updated_at} />
        <p className="caption">Hapus catatan ini dari jurnal?</p>
        <Feedback {...remove.state} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-danger" disabled={edit.pending || remove.pending}>{remove.pending ? "Menghapus…" : "Ya, hapus"}</button>
          <button type="button" className="btn btn-quiet" onClick={() => setConfirm(false)} disabled={remove.pending}>Batal</button>
        </div>
      </form> : <button type="button" className="btn btn-danger justify-self-start" onClick={() => setConfirm(true)}>Hapus catatan</button>}
  </div>;
}
