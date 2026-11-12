"use client";

import { useState } from "react";
import { updateTargets } from "@/lib/actions";
import { fmt, remainingCarbs } from "@/lib/nutrition";
import type { Target } from "@/lib/types";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export const PERSONAL_TARGET = { calories: "2100", protein: "120", fat: "70" };
export type TargetValues = typeof PERSONAL_TARGET;

export function TargetFields({ values, change }: { values: TargetValues; change: (value: TargetValues) => void }) {
  const calories = Number(values.calories);
  const protein = Number(values.protein);
  const fat = Number(values.fat);
  const carbs = remainingCarbs(calories, protein, fat);
  const ready = Object.values(values).every(Boolean) && Number.isFinite(carbs);
  return <>
    <div className="grid gap-3 sm:grid-cols-3">
      {([["calories", "Kalori (kkal)", 1, 15000], ["protein", "Protein (g)", 0, 1500], ["fat", "Lemak (g)", 0, 1000]] as const)
        .map(([key, label, min, max]) => <label key={key} className="label">{label}
          <input className="field" type="number" inputMode="decimal" name={key} value={values[key]} min={min} max={max} step=".1"
            onChange={event => change({ ...values, [key]: event.target.value })} required />
        </label>)}
    </div>
    <p aria-live="polite" className="muted caption">
      {ready && carbs >= 0 ? <>Karbohidrat <strong className="accent">{fmt(carbs, 3)} g</strong> dari sisa kalori setelah protein dan lemak.</> :
        ready ? "Jumlah protein dan lemak melebihi target kalori." : "Isi ketiga target untuk menghitung karbohidrat."}
    </p>
  </>;
}

export function TargetForm({ target }: { target: Target | null }) {
  const { state, pending, form } = useActionForm(updateTargets);
  const [values, setValues] = useState(target
    ? { calories: String(target.calories), protein: String(target.protein_g), fat: String(target.fat_g) }
    : { calories: "", protein: "", fat: "" });
  return <form {...form} className="grid gap-4">
    <TargetFields values={values} change={setValues} />
    <Feedback {...state} />
    <button className="btn btn-primary justify-self-start" disabled={pending}>{pending ? "Menyimpan…" : "Simpan target"}</button>
  </form>;
}
