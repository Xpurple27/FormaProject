"use client";

import { useState } from "react";
import { completeOnboarding, signOut } from "@/lib/actions";
import { ACTIVITIES, energyEstimate, EQUIPMENT, fmt, GOALS } from "@/lib/nutrition";
import { Feedback } from "./feedback";
import { PERSONAL_TARGET, TargetFields } from "./targets";
import { useActionForm } from "./use-action-form";
import type { Profile } from "@/lib/types";

const emptyBaseline = { age: "", height: "", weight: "", milestone: "", sex: "male", activity: "light", goal: "recomposition", equipment: "none" };
const exampleBaseline = { age: "30", height: "170", weight: "75", milestone: "72", sex: "male", activity: "light", goal: "recomposition", equipment: "dumbbells" };

export function SignOutForm() {
  const { state, pending, form } = useActionForm(signOut);
  return <form {...form} className="grid gap-2 justify-items-start">
    <Feedback {...state} />
    <button className="btn btn-secondary" disabled={pending}>{pending ? "Memproses…" : "Keluar dari akun"}</button>
  </form>;
}

export function Onboarding({ today }: { today: string }) {
  const { state, pending, form } = useActionForm(completeOnboarding);
  const [base, setBase] = useState(emptyBaseline);
  const [targets, setTargets] = useState({ calories: "", protein: "", fat: "" });
  const ready = Number(base.age) >= 18 && Number(base.age) <= 100 && Number(base.height) >= 100 &&
    Number(base.height) <= 250 && Number(base.weight) >= 25 && Number(base.weight) <= 350;
  const estimate = ready ? energyEstimate(Number(base.weight), Number(base.height), Number(base.age),
    base.sex as Profile["sex_for_bmr"], base.activity as Profile["activity_level"]) : null;
  return <div className="grid gap-5">
    <header><p className="eyebrow mb-2">Pengaturan awal</p><h1>Siapkan profilmu</h1>
      <p className="muted mt-2">Tetapkan titik awal dan target yang ingin kamu pantau.</p></header>
    <form {...form} className="grid gap-4">
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Data awal</h2>
          <button type="button" className="btn btn-secondary" onClick={() => { setBase(exampleBaseline); setTargets(PERSONAL_TARGET); }}>Gunakan profil awal FORMA</button>
        </div>
        <label className="label">Nama panggilan<input name="name" className="field" autoComplete="nickname" maxLength={60} required /></label>
        <div className="grid grid-cols-2 gap-3">
          {([["age", "Usia (tahun)", 18, 100], ["height", "Tinggi (cm)", 100, 250], ["weight", "Berat awal (kg)", 25, 350], ["milestone", "Target berat (opsional)", 25, 350]] as const)
            .map(([key, label, min, max]) => <label key={key} className="label">{label}
              <input name={key} className="field" type="number" inputMode="decimal" min={min} max={max}
                step={key === "age" ? 1 : ".1"} value={base[key]} required={key !== "milestone"}
                onChange={event => setBase({ ...base, [key]: event.target.value })} />
            </label>)}
          <label className="label">Jenis kelamin untuk BMR<select name="sex" className="field" value={base.sex}
            onChange={event => setBase({ ...base, sex: event.target.value })}><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
          <label className="label">Tingkat aktivitas<select name="activity" className="field" value={base.activity}
            onChange={event => setBase({ ...base, activity: event.target.value })}>
            {Object.entries(ACTIVITIES).map(([key, activity]) => <option key={key} value={key}>{activity.label}</option>)}
          </select></label>
          <label className="label">Tujuan<select name="goal" className="field" value={base.goal}
            onChange={event => setBase({ ...base, goal: event.target.value })}>
            {Object.entries(GOALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label className="label">Peralatan<select name="equipment" className="field" value={base.equipment}
            onChange={event => setBase({ ...base, equipment: event.target.value })}>
            {Object.entries(EQUIPMENT).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label className="label">Zona waktu<select name="timezone" className="field" defaultValue="Asia/Jakarta">
            <option value="Asia/Jakarta">WIB</option><option value="Asia/Makassar">WITA</option><option value="Asia/Jayapura">WIT</option>
          </select></label>
          <label className="label">Tanggal mulai<input name="start" className="field" type="date" min="1900-01-01" defaultValue={today} required /></label>
        </div>
        <div className="rounded-xl bg-[#132332] p-4">
          <h3>Estimasi energi</h3>
          <p className="mt-2 caption muted" aria-live="polite">{estimate
            ? <>BMR <b className="accent">{fmt(estimate.bmr)} kkal</b> · TDEE <b className="accent">{fmt(estimate.tdee)} kkal</b> per hari</>
            : "Isi usia, tinggi, dan berat untuk melihat estimasi."}</p>
          <details className="caption muted mt-1">
            <summary>Rumus dan asumsi</summary>
            <p>BMR Mifflin–St Jeor = 10 × berat (kg) + 6,25 × tinggi (cm) − 5 × usia + konstanta (+5 atau −161).
              TDEE = BMR × pengali aktivitas ({fmt(ACTIVITIES[base.activity as Profile["activity_level"]].factor, 3)} untuk pilihan saat ini).</p>
          </details>
        </div>
      </section>
      <section className="card grid gap-4">
        <h2>Target harian</h2>
        <TargetFields values={targets} change={setTargets} />
        <Feedback {...state} />
        <button className="btn btn-primary justify-self-start" disabled={pending}>{pending ? "Menyimpan…" : "Simpan profil dan target"}</button>
      </section>
    </form>
    <SignOutForm />
  </div>;
}
