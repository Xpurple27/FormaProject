"use client";

import { useState } from "react";
import { updateProgramStart, updateTargets } from "@/lib/actions";
import { fmt, remainingCarbs } from "@/lib/nutrition";
import type { Nutrients, Target } from "@/lib/types";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export type TargetValues = { calories: string; protein: string; fat: string };
const emptyValues: TargetValues = { calories: "", protein: "", fat: "" };

export function targetValues(target: Nutrients | null): TargetValues {
  return target ? { calories: String(target.calories), protein: String(target.protein_g), fat: String(target.fat_g) } : emptyValues;
}

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

export function TargetForm({ target, suggestion }: { target: Target | null; suggestion: Nutrients | null }) {
  const { state, pending, form } = useActionForm(updateTargets);
  const [values, setValues] = useState(() => targetValues(target));
  return <form {...form} className="grid gap-4">
    {suggestion && <button type="button" className="btn btn-secondary justify-self-start"
      onClick={() => setValues(targetValues(suggestion))}>Isi dari estimasi profil</button>}
    <TargetFields values={values} change={setValues} />
    <Feedback {...state} />
    <button className="btn btn-primary justify-self-start" disabled={pending}>{pending ? "Menyimpan…" : "Simpan target"}</button>
  </form>;
}

export function ProgramStartForm({ date }: { date: string }) {
  const { state, pending, form } = useActionForm(updateProgramStart);
  return <form {...form} className="grid gap-3 border-t line pt-4">
    <label className="label max-w-64">Tanggal mulai program
      <input type="date" className="field" name="start" defaultValue={date} min="1900-01-01" max="9999-12-31" required />
    </label>
    <p className="caption muted">Boleh pilih tanggal lampau atau mendatang. Jurnal bisa dipakai hari ini.</p>
    <Feedback {...state} />
    <button className="btn btn-secondary justify-self-start" disabled={pending}>{pending ? "Menyimpan…" : "Simpan tanggal mulai"}</button>
  </form>;
}
