"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { addEntry, changeEntry, removeEntry, saveFood, searchFoods } from "@/lib/actions";
import { CATEGORIES, fmt, MEALS, scaleNutrition, servingGrams } from "@/lib/nutrition";
import type { Entry, Food, Nutrients } from "@/lib/types";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

type DateProps = { date: string; time: string; today: string; meal?: Entry["meal_type"] };

function DateFields({ date, time, today, meal = "lunch" }: DateProps) {
  return <div className="grid grid-cols-2 gap-3">
    <label className="label">Tanggal<input className="field" type="date" name="date" min="1900-01-01" max={today} defaultValue={date} required /></label>
    <label className="label">Jam<input className="field" type="time" name="time" defaultValue={time} required /></label>
    <label className="label col-span-2">Waktu makan<select className="field" name="meal" defaultValue={meal}>
      {Object.entries(MEALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
  </div>;
}

function NutrientPreview({ nutrients, grams }: { nutrients: Nutrients; grams: number }) {
  const values = scaleNutrition(nutrients, grams);
  return <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#132332] p-3 text-sm numeric sm:grid-cols-4" aria-live="polite">
    {([["calories", "Kalori", "kkal"], ["protein_g", "Protein", "g"], ["carbs_g", "Karbohidrat", "g"], ["fat_g", "Lemak", "g"]] as const)
      .map(([key, label, unit]) => <div key={key}><span className="muted caption block">{label}</span>
        <b>{fmt(values[key], 2)} {unit}</b></div>)}
  </div>;
}

function PortionChoices({ current, choose }: { current: string; choose: (portion: string) => void }) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Porsi cepat">
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
        <span className="min-w-0 break-words"><b className="text-sm">{item.name}</b>
          <span className="block muted text-xs">{item.preparation} · {item.portion_note && item.serving_g
            ? `≈ ${fmt(item.calories * item.serving_g / 100, 0)} kkal/${item.serving_label}`
            : `${fmt(item.calories)} kkal/100 g`}{item.user_id ? " · Pribadi" : ""}</span></span>
        {item.id === selected ? <Check className="shrink-0" size={17} aria-hidden="true" /> : <Plus className="shrink-0" size={16} aria-hidden="true" />}
      </button>
    </li>)}
  </ul>;
}

export function FoodForm({ initial, recent, preselected, id, ...dates }: DateProps & {
  initial: Food[]; recent: Food[]; preselected: Food | null; id: string;
}) {
  const { state, pending, form } = useActionForm(addEntry);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<{ key: string; foods?: Food[]; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [food, setFood] = useState(preselected);
  const [showCatalog, setShowCatalog] = useState(!preselected);
  const startsWithServing = Boolean(preselected?.portion_note && preselected.serving_g);
  const [unit, setUnit] = useState(startsWithServing ? "serving" : "gram");
  const [quantity, setQuantity] = useState(startsWithServing ? "1" : "100");

  const search = query.trim();
  const filtered = Boolean(search || category);
  const key = search + "\0" + category + "\0" + retry;
  const waiting = filtered && result?.key !== key;

  useEffect(() => {
    if (!showCatalog || !filtered) return;
    let live = true;
    const timeout = setTimeout(() => {
      searchFoods(search, category).then(
        response => { if (live) setResult({ key, ...response }); },
        () => { if (live) setResult({ key, error: "Katalog belum bisa dimuat. Coba lagi." }); },
      );
    }, 220);
    return () => { live = false; clearTimeout(timeout); };
  }, [search, category, key, filtered, showCatalog]);

  const foods = filtered ? result?.foods ?? [] : initial;
  const grams = servingGrams(Number(quantity), unit === "serving" ? food?.serving_g ?? 0 : 1);
  const canSave = Number.isFinite(grams) && grams >= 0.01 && grams <= 3000;
  function choose(item: Food) {
    const hasServing = Boolean(item.portion_note && item.serving_g);
    setFood(item);
    setUnit(hasServing ? "serving" : "gram");
    setQuantity(hasServing ? "1" : "100");
    setShowCatalog(false);
  }

  return <section id="catat" className="card grid content-start gap-4">
    <div><h2>Catat makanan</h2><p className="muted caption mt-1">Pilih makanan sesuai cara pengolahannya.</p></div>
    {showCatalog && <div className="grid gap-3">
      <label className="label">Cari makanan
        <span className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 soft" aria-hidden="true" />
          <input className="field !pl-9" type="search" value={query} maxLength={100} placeholder="Contoh: nasi goreng, dimsum, susu coklat"
            onChange={event => setQuery(event.target.value)} /></span>
      </label>
      <label className="label">Kategori<select className="field" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">Semua kategori</option>
        {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {!filtered && recent.length > 0 && <details><summary className="caption font-semibold">Sering dicatat</summary>
        <FoodChoices items={recent} selected={food?.id} choose={choose} />
      </details>}
      {waiting ? <p className="muted caption" role="status">Mencari makanan…</p> :
        filtered && result?.error ? <div className="grid gap-2"><Feedback error={result.error} />
          <button className="btn btn-secondary justify-self-start" type="button" onClick={() => setRetry(retry + 1)}>Coba lagi</button></div> :
          foods.length ? <div className="scroll-foods rounded-lg border line p-1"><FoodChoices items={foods} selected={food?.id} choose={choose} /></div> :
            <p className="muted caption">Tidak ada hasil. Coba kata lain atau buat makanan sendiri.</p>}
    </div>}
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
        {food.serving_g && <p className="caption muted">1 {food.serving_label} ≈ {fmt(food.serving_g, 2)} g</p>}
        {food.portion_note && <p className="caption muted mt-1">{food.portion_note}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Jumlah<input className="field" name="quantity" type="number" inputMode="decimal" min=".01" max="3000" step=".01" value={quantity}
          onChange={event => setQuantity(event.target.value)} required /></label>
        <label className="label">Satuan<select className="field" name="unit" value={unit}
          onChange={event => { setUnit(event.target.value); setQuantity(event.target.value === "serving" ? "1" : "100"); }}>
          <option value="gram">Gram</option>{food.serving_g && <option value="serving">{food.serving_label}</option>}
        </select></label>
      </div>
      {food.serving_g && <PortionChoices current={unit === "serving" ? quantity : ""} choose={portion => {
        setUnit("serving");
        setQuantity(portion);
      }} />}
      {canSave && <NutrientPreview nutrients={food} grams={grams} />}
      {unit === "serving" && canSave && <p className="caption muted">Berat yang dicatat · {fmt(grams, 2)} g</p>}
      {!canSave && <p className="caption muted">Masukkan jumlah setara 0,01–3.000 g.</p>}
      <DateFields {...dates} />
      <Feedback {...state} />
      <button className="btn btn-primary" disabled={pending || !canSave}>{pending ? "Menyimpan…" : "Simpan ke jurnal"}</button>
    </form>}
  </section>;
}

export function CustomFoodForm({ id, diaryDate }: { id: string; diaryDate: string }) {
  const { state, pending, form } = useActionForm(saveFood);
  return <details className="card !py-2">
    <summary className="font-semibold accent">Buat makanan sendiri</summary>
    <form {...form} className="grid gap-3 pb-3">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="diaryDate" value={diaryDate} />
      <p className="caption muted">Gunakan label kemasan atau estimasi bahan. Masukkan nilai untuk 100 g makanan.</p>
      <label className="label">Nama makanan<input name="name" className="field" maxLength={100} required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Cara pengolahan<input name="preparation" className="field" maxLength={60} placeholder="Contoh: kukus" required /></label>
        <label className="label">Kategori<select name="category" className="field">
          {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {([["calories", "Kalori (kkal)", 950], ["protein", "Protein (g)", 100], ["carbs", "Karbohidrat (g)", 100], ["fat", "Lemak (g)", 100]] as const)
          .map(([name, label, max]) => <label key={name} className="label">{label}
            <input className="field" type="number" name={name} min="0" max={max} step=".01" inputMode="decimal" required /></label>)}
        <label className="label">Nama porsi (opsional)<input className="field" name="servingLabel" maxLength={60} placeholder="Contoh: potong" /></label>
        <label className="label">Berat per porsi (g)<input className="field" name="serving" type="number" min=".01" max="3000" step=".01" inputMode="decimal" /></label>
      </div>
      <label className="label">Sumber (opsional)<input className="field" name="source" maxLength={140} placeholder="Contoh: label kemasan" /></label>
      <Feedback {...state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Menyimpan…" : "Simpan makanan pribadi"}</button>
    </form>
  </details>;
}

export function EditEntryForm({ entry, dates }: { entry: Entry; dates: DateProps }) {
  const edit = useActionForm(changeEntry);
  const remove = useActionForm(removeEntry);
  const [confirm, setConfirm] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity_g));
  const [unit, setUnit] = useState("gram");
  const grams = servingGrams(Number(quantity), unit === "serving" ? entry.reference_serving_g ?? 0 : 1);
  const canSave = grams >= .01 && grams <= 3000;
  const reference = {
    calories: entry.reference_calories, protein_g: entry.reference_protein_g,
    carbs_g: entry.reference_carbs_g, fat_g: entry.reference_fat_g,
  };
  return <details className="mt-1">
    <summary className="accent caption font-semibold">Kelola catatan</summary>
    <div className="grid gap-3">
      <form {...edit.form} className="grid gap-3" aria-label={"Ubah " + entry.food_name}>
        <input type="hidden" name="id" value={entry.id} /><input type="hidden" name="version" value={entry.updated_at} />
        <input type="hidden" name="unit" value={unit} />
        {entry.reference_serving_g && <>
          <p className="caption muted">1 {entry.reference_serving_label} ≈ {fmt(entry.reference_serving_g, 2)} g</p>
          <PortionChoices current={unit === "serving" ? quantity : ""} choose={portion => {
            setUnit("serving");
            setQuantity(portion);
          }} />
        </>}
        <label className="label">{unit === "serving" ? "Jumlah porsi" : "Jumlah (g)"}<input className="field" type="number"
          name="quantity" value={quantity} onChange={event => setQuantity(event.target.value)} min=".01" max="3000"
          step=".01" inputMode="decimal" required /></label>
        {unit === "serving" && canSave && <p className="caption muted">Berat yang dicatat · {fmt(grams, 2)} g</p>}
        {unit === "serving" && <button type="button" className="btn btn-quiet justify-self-start" onClick={() => {
          setQuantity(canSave ? String(grams) : String(entry.quantity_g));
          setUnit("gram");
        }}>Gunakan gram</button>}
        {canSave && <NutrientPreview nutrients={reference} grams={grams} />}
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
    </div>
  </details>;
}
