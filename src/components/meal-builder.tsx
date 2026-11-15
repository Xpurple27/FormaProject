"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { addMeal } from "@/lib/actions";
import type { MealPhotoResult } from "@/lib/meal-photo";
import { fmt, missingNutrients, scaleNutrition, servingGrams } from "@/lib/nutrition";
import type { Food, Nutrients } from "@/lib/types";
import { MAX_MEAL_ITEMS } from "@/lib/validation";
import { Feedback } from "./feedback";
import { DateFields, FoodPicker, NutrientTotals, PortionChoices, type DateProps } from "./food-forms";
import { MealPhotoPicker } from "./meal-photo-picker";
import { useActionForm } from "./use-action-form";

type Item = { id: string; food: Food; quantity: string; unit: "gram" | "serving" };

function gramsFor(item: Item) {
  return servingGrams(Number(item.quantity), item.unit === "serving" ? item.food.serving_g ?? 0 : 1);
}

function portionItem(food: Food): Item {
  const serving = Boolean(food.serving_g);
  return { id: crypto.randomUUID(), food, unit: serving ? "serving" : "gram", quantity: serving ? "1" : "100" };
}

export function MealBuilder({ id, initial, recent, dates, photoEnabled }: {
  id: string; initial: Food[]; recent: Food[]; dates: DateProps; photoEnabled: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [showPicker, setShowPicker] = useState(true);
  const [photoResult, setPhotoResult] = useState<MealPhotoResult | null>(null);
  const newItem = useRef<string | null>(null);
  const { state, pending, form } = useActionForm(addMeal);
  const canSave = items.length > 0 && items.every(item => {
    const grams = gramsFor(item);
    return grams >= .01 && grams <= 3000;
  });
  const totals = items.reduce<Nutrients>((total, item) => {
    const grams = gramsFor(item);
    const value = scaleNutrition(item.food, grams >= .01 && grams <= 3000 ? grams : 0);
    return {
      calories: total.calories + value.calories, protein_g: total.protein_g + value.protein_g,
      carbs_g: total.carbs_g + value.carbs_g, fat_g: total.fat_g + value.fat_g,
    };
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  function choose(food: Food) {
    if (items.length >= MAX_MEAL_ITEMS || pending) return;
    const item = portionItem(food);
    newItem.current = item.id;
    setItems([...items, item]);
    setShowPicker(false);
  }

  function applyPhoto(result: MealPhotoResult) {
    const foods = new Map(initial.map(food => [food.id, food]));
    const suggestions = result.foodIds.flatMap(id => {
      const food = foods.get(id);
      return food ? [portionItem(food)] : [];
    });
    setPhotoResult({ ...result, foodIds: suggestions.map(item => item.food.id) });
    setItems(suggestions);
    setShowPicker(!suggestions.length);
  }

  function updateItem(id: string, change: Partial<Pick<Item, "unit" | "quantity">>) {
    setItems(items.map(item => item.id === id ? { ...item, ...change } : item));
  }

  return <form {...form} className="grid gap-4" aria-label="Susun sekali makan">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="items" value={JSON.stringify(items.map(item => ({ ...item, food: item.food.id })))} />
    {photoEnabled && !items.length && <MealPhotoPicker ready={applyPhoto} />}
    {photoResult && <div role="status" className="grid gap-1 rounded-xl border line p-3">
      <p className="caption">{photoResult.foodIds.length
        ? "Cocokkan saran dengan foto dan sesuaikan takaran sebelum menyimpan."
        : "Belum ada menu yang cocok dari foto. Kamu bisa mencari bahan secara manual."}</p>
      {!!photoResult.unmatched.length && <p className="caption muted">Perlu dicek atau ditambahkan manual: {photoResult.unmatched.join(", ")}.</p>}
    </div>}
    <fieldset disabled={pending} className="grid min-w-0 gap-4">
      {items.length > 0 && <ol className="grid gap-2">
        {items.map(item => <li key={item.id} className="diary-meal p-3 grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words">{item.food.name}</h3>
              <p className="caption muted">{item.food.preparation}</p>
            </div>
            <button type="button" className="topbar-action" aria-label={"Keluarkan " + item.food.name}
              onClick={() => {
                setItems(items.filter(row => row.id !== item.id));
                if (items.length === 1) {
                  setShowPicker(true);
                  setPhotoResult(null);
                }
              }}><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="label">Jumlah<input className="field" aria-label={"Jumlah " + item.food.name} type="number"
              ref={element => {
                if (element && newItem.current === item.id) {
                  newItem.current = null;
                  element.closest("li")?.scrollIntoView({ block: "nearest" });
                }
              }} inputMode="decimal" min=".01" max="3000" step=".01" required value={item.quantity}
              onChange={event => updateItem(item.id, { quantity: event.target.value })} /></label>
            <label className="label">Takaran<select className="field" aria-label={"Takaran " + item.food.name} value={item.unit}
              onChange={event => {
                const serving = event.target.value === "serving";
                const grams = gramsFor(item);
                const quantity = serving ? 1 : grams > 0 ? grams : 100;
                updateItem(item.id, { unit: serving ? "serving" : "gram", quantity: String(quantity) });
              }}>
              {item.food.serving_g && <option value="serving">{item.food.serving_label}</option>}
              {item.food.portion_weight_known && <option value="gram">Gram</option>}
            </select></label>
          </div>
          {item.food.serving_g && <>
            {item.food.portion_weight_known && <p className="caption muted">1 {item.food.serving_label} ≈ {fmt(item.food.serving_g, 2)} g</p>}
            <PortionChoices current={item.unit === "serving" ? item.quantity : ""} choose={quantity =>
              updateItem(item.id, { unit: "serving", quantity })} />
          </>}
          {item.food.portion_note && <details className="caption muted">
            <summary>Asumsi takaran</summary><p>{item.food.portion_note}</p>
          </details>}
        </li>)}
      </ol>}
      {showPicker ? <FoodPicker initial={initial} recent={recent} choose={choose} label="Cari bahan atau minuman" />
        : items.length < MAX_MEAL_ITEMS ? <button type="button" className="btn btn-secondary justify-self-start" onClick={() => setShowPicker(true)}>
          <Plus size={18} aria-hidden="true" />Tambah bahan atau minuman
        </button> : <p className="caption muted">Maksimal {MAX_MEAL_ITEMS} bahan dalam satu kali makan.</p>}
      {items.length > 0 && <>
        <div className="grid gap-2">
          <h3>Estimasi total</h3>
          <NutrientTotals values={totals} missing={missingNutrients(items.map(item => item.food))} />
          {!canSave && <p className="caption muted">Periksa jumlah setiap bahan agar setara dengan 0,01–3.000 g.</p>}
        </div>
        <label className="label">Nama menu (opsional)
          <input className="field" name="name" maxLength={80} placeholder="Contoh: Sarapan nasi dan ayam" />
        </label>
        <DateFields {...dates} />
      </>}
    </fieldset>
    <Feedback {...state} />
    <button className="btn btn-primary" disabled={pending || !canSave}>
      {pending ? "Menyimpan…" : "Catat semua ke jurnal"}
    </button>
  </form>;
}
