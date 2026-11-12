"use client";

import { useState } from "react";
import { completeOnboarding, signOut } from "@/lib/actions";
import { ACTIVITIES, bodyMassIndex, energyEstimate, EQUIPMENT, fmt, GOALS, recommendNutrition } from "@/lib/nutrition";
import { Feedback } from "./feedback";
import { TargetFields, targetValues } from "./targets";
import { useActionForm } from "./use-action-form";
import type { Profile } from "@/lib/types";

type Baseline = { age: string; height: string; weight: string; milestone: string; sex: Profile["sex_for_bmr"];
  activity: Profile["activity_level"]; goal: Profile["goal"]; equipment: Profile["equipment"] };
const emptyBaseline: Baseline = { age: "", height: "", weight: "", milestone: "", sex: "male", activity: "light", goal: "recomposition", equipment: "none" };
const exampleBaseline: Baseline = { age: "30", height: "170", weight: "75", milestone: "72", sex: "male", activity: "light", goal: "recomposition", equipment: "dumbbells" };

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
  const [manual, setManual] = useState(false);
  const [targets, setTargets] = useState(() => targetValues(null));
  const body = { age: Number(base.age), height: Number(base.height), weight: Number(base.weight),
    sex: base.sex, activity: base.activity, goal: base.goal };
  const ready = Number.isInteger(body.age) && body.age >= 18 && body.age <= 100 &&
    body.height >= 100 && body.height <= 250 && body.weight >= 25 && body.weight <= 350;
  const estimate = ready ? energyEstimate(body.weight, body.height, body.age, body.sex, body.activity) : null;
  const suggested = ready ? recommendNutrition(body) : null;
  return <div className="grid gap-5">
    <header><p className="eyebrow mb-2">Pengaturan awal</p><h1>Siapkan profilmu</h1>
      <p className="muted mt-2">Tetapkan titik awal dan target yang ingin kamu pantau.</p></header>
    <form {...form} className="grid gap-4">
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Data awal</h2>
          <button type="button" className="btn btn-secondary" onClick={() => { setBase(exampleBaseline); setManual(false); }}>Gunakan profil awal FORMA</button>
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
            onChange={event => setBase({ ...base, sex: event.target.value as Baseline["sex"] })}><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
          <label className="label">Tingkat aktivitas<select name="activity" className="field" value={base.activity}
            onChange={event => setBase({ ...base, activity: event.target.value as Baseline["activity"] })}>
            {Object.entries(ACTIVITIES).map(([key, activity]) => <option key={key} value={key}>{activity.label}</option>)}
          </select></label>
          <label className="label">Tujuan<select name="goal" className="field" value={base.goal}
            onChange={event => setBase({ ...base, goal: event.target.value as Baseline["goal"] })}>
            {Object.entries(GOALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label className="label">Peralatan<select name="equipment" className="field" value={base.equipment}
            onChange={event => setBase({ ...base, equipment: event.target.value as Baseline["equipment"] })}>
            {Object.entries(EQUIPMENT).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label className="label">Zona waktu<select name="timezone" className="field" defaultValue="Asia/Jakarta">
            <option value="Asia/Jakarta">WIB</option><option value="Asia/Makassar">WITA</option><option value="Asia/Jayapura">WIT</option>
          </select></label>
          <label className="label">Tanggal mulai program<input name="start" className="field" type="date" min="1900-01-01" max="9999-12-31" defaultValue={today} required /></label>
        </div>
        <p className="caption muted">Pilih tanggal mulai program. Kamu tetap bisa mencatat makanan hari ini.</p>
        <div className="rounded-xl bg-[#132332] p-4">
          <h3>Estimasi energi</h3>
          <p className="mt-2 caption muted" aria-live="polite">{estimate
            ? <>IMT <b className="accent">{fmt(bodyMassIndex(body.weight, body.height))}</b> · BMR <b className="accent">{fmt(estimate.bmr)} kkal</b> · TDEE <b className="accent">{fmt(estimate.tdee)} kkal</b> per hari</>
            : "Isi usia, tinggi, dan berat untuk melihat estimasi."}</p>
          <details className="caption muted mt-1">
            <summary>Rumus dan asumsi</summary>
            <p>IMT = berat (kg) ÷ tinggi (m)².</p>
            <p>BMR Mifflin–St Jeor = 10 × berat (kg) + 6,25 × tinggi (cm) − 5 × usia + konstanta (+5 atau −161).
              TDEE = BMR × pengali aktivitas ({fmt(ACTIVITIES[base.activity].factor, 3)} untuk pilihan saat ini). Target energi disesuaikan dengan tujuan.</p>
          </details>
        </div>
      </section>
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>{manual ? "Target harian manual" : "Estimasi target harian"}</h2>
          <button type="button" className="btn btn-secondary" onClick={() => {
            if (!manual) setTargets(targetValues(suggested));
            setManual(!manual);
          }}>{manual ? "Pakai estimasi otomatis" : "Isi manual"}</button>
        </div>
        <input type="hidden" name="targetMode" value={manual ? "manual" : "auto"} />
        {manual ? <TargetFields values={targets} change={setTargets} /> : suggested ? <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
            {[
              ["Kalori", fmt(suggested.calories, 0) + " kkal"],
              ["Protein", fmt(suggested.protein_g) + " g"],
              ["Karbohidrat", fmt(suggested.carbs_g, 2) + " g"],
              ["Lemak", fmt(suggested.fat_g) + " g"],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-[#132332] p-3">
              <dt className="caption muted">{label}</dt><dd className="font-semibold accent">{value}</dd>
            </div>)}
          </dl>
          <p className="caption muted">Estimasi awal dari kebutuhan energi, aktivitas dan tujuanmu. Bisa diubah nanti dari Profil.</p>
        </> : <p className="caption muted" role="status">{ready
          ? "Estimasi belum tersedia untuk data ini. Periksa data tubuh atau pilih isi manual."
          : "Isi usia, tinggi, dan berat. FORMA akan menghitung target untukmu."}</p>}
        <Feedback {...state} />
        <button className="btn btn-primary justify-self-start" disabled={pending || (!manual && !suggested)}>{pending ? "Menyimpan…" : "Simpan profil dan target"}</button>
      </section>
    </form>
    <SignOutForm />
  </div>;
}
