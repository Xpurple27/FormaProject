"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Timer } from "lucide-react";
import { changeWorkout, removeWorkoutSet, saveWorkoutDays, saveWorkoutSet, startWorkout } from "@/lib/training-actions";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { DAY_NAMES, exerciseFor, exerciseOptions, workoutExercises, type ExerciseId, type Routine } from "@/lib/workout";
import { nextWorkoutSet, workoutSetLabel } from "@/lib/workout-history";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export function ScheduleForm({ days }: { days: number[] }) {
  const { state, pending, form } = useActionForm(saveWorkoutDays);
  return <form {...form} className="grid gap-3">
    <fieldset className="grid gap-2">
      <legend className="caption muted mb-2">Pilih satu sampai tiga hari</legend>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {DAY_NAMES.map((day, index) => <label key={day}
          className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border line text-xs">
          <input type="checkbox" name="weekday" value={index + 1} defaultChecked={days.includes(index + 1)}
            className="accent-[var(--accent)]" />{day}
        </label>)}
      </div>
    </fieldset>
    <Feedback {...state} />
    <button className="btn btn-secondary justify-self-start" disabled={pending}>Simpan jadwal</button>
  </form>;
}

export function StartWorkoutForm({ id, recommended, optionalThird, dumbbells }: {
  id: string; recommended: Routine; optionalThird: boolean; dumbbells: boolean;
}) {
  const { state, pending, form } = useActionForm(startWorkout);
  const [routine, setRoutine] = useState(recommended);
  return <form {...form} className="grid gap-3">
    <input type="hidden" name="id" value={id} />
    <label className="label sm:max-w-xs">Pilih workout
      <select className="field" name="routine" value={routine} onChange={event => setRoutine(event.target.value === "B" ? "B" : "A")}>
        <option value="A">Workout A</option><option value="B">Workout B</option>
      </select>
    </label>
    {optionalThird ? <label className="label sm:max-w-xs">Set per gerakan
      <select className="field" name="sets" defaultValue="2">
        <option value="2">2 set</option><option value="3">3 set</option>
      </select>
    </label> : <input type="hidden" name="sets" value="2" />}
    <ul aria-label="Gerakan sesi ini" className="grid grid-cols-2 gap-2">
      {workoutExercises(routine, dumbbells).map(id => <li className="rounded-lg border line bg-[var(--inset)] p-2 text-sm" key={id}>{exerciseFor(id).name}</li>)}
    </ul>
    <Feedback {...state} />
    <button className="btn btn-primary sm:justify-self-start" disabled={pending}>{pending ? "Membuka sesi…" : "Mulai latihan"}</button>
  </form>;
}

export function ExerciseGuide({ id, routine, slot }: { id: ExerciseId; routine: Routine; slot: number }) {
  const exercise = exerciseFor(id);
  const isMain = exerciseOptions(routine, slot)[0] === id;
  return <div className="grid items-start gap-3 sm:grid-cols-2">
    <div>
      <Image src={"/exercises/" + exercise.image + ".webp"} width={400} height={196}
        alt={isMain ? "Skema " + exercise.name : "Skema gerakan utama untuk alternatif ini"}
        className="exercise-image w-full max-w-sm rounded-xl" />
      {!isMain && <p className="caption muted mt-1">Skema gerakan utama. Ikuti petunjuk varian ini.</p>}
    </div>
    <div className="grid gap-2 text-sm">
      <p>{exercise.cue}</p>
      <p className="muted"><strong>Kesalahan umum</strong> · {exercise.mistake}</p>
      <p className="muted"><strong>Perhatian</strong> · {exercise.safety}</p>
    </div>
  </div>;
}

type Intent = "pause" | "resume" | "finish" | "cancel" | "skip" | "restore" | "replace";
function WorkoutCommand({ id, action, label, slot, exercise, primary = false, disabled = false }: {
  id: string; action: Intent; label: string; slot?: number; exercise?: ExerciseId; primary?: boolean; disabled?: boolean;
}) {
  const { state, pending, form } = useActionForm(changeWorkout);
  return <form {...form} className="grid gap-1">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="action" value={action} />
    {slot !== undefined && <input type="hidden" name="slot" value={slot} />}
    {exercise && <input type="hidden" name="exercise" value={exercise} />}
    <button className={primary ? "btn btn-primary" : "btn btn-secondary"} disabled={disabled || pending}>
      {pending ? "Menyimpan…" : label}
    </button>
    <Feedback {...state} />
  </form>;
}

function SetStepper({ label, name, value, change, min, max, jump, required = false }: {
  label: string; name: string; value: string; change: (value: string) => void;
  min: number; max: number; jump: number; required?: boolean;
}) {
  const id = useId();
  const current = Number(value);
  function adjust(diff: number) {
    const next = Math.round((current + diff) * 100) / 100;
    change(String(Math.min(max, Math.max(min, next))));
  }
  return <div className="grid min-w-0 gap-1">
    <label className="label" htmlFor={id}>{label}</label>
    <div className="workout-stepper">
      <button type="button" className="btn btn-secondary !px-0" aria-label={"Kurangi " + label.toLowerCase()}
        onClick={() => adjust(-jump)} disabled={!value || current <= min}><Minus size={18} aria-hidden="true" /></button>
      <input id={id} className="field !px-1 text-center numeric" type="number" name={name} min={min} max={max}
        inputMode={jump < 1 ? "decimal" : "numeric"} step={jump < 1 ? ".01" : "1"} required={required}
        value={value} onChange={event => change(event.target.value)} />
      <button type="button" className="btn btn-secondary !px-0" aria-label={"Tambah " + label.toLowerCase()}
        onClick={() => adjust(jump)} disabled={current >= max}><Plus size={18} aria-hidden="true" /></button>
    </div>
  </div>;
}

function SetEditor({ id, slot, set, exerciseId, record, correction = false, guided = false, reference }: {
  id: string; slot: number; set: number; exerciseId: ExerciseId; record?: WorkoutSet; correction?: boolean;
  guided?: boolean; reference?: WorkoutSet;
}) {
  const { state, pending, form } = useActionForm(saveWorkoutSet);
  const remove = useActionForm(removeWorkoutSet);
  const exercise = exerciseFor(exerciseId);
  const amountLabel = exercise.kind === "hold" ? "Durasi (detik)" : exercise.unilateral ? "Repetisi per sisi" : "Repetisi";
  const maxAmount = exercise.kind === "hold" ? 600 : 100;
  const [amount, setAmount] = useState(record ? String(record.amount) : "");
  const [load, setLoad] = useState(record?.load_kg != null ? String(record.load_kg) : "");
  return <div className="set-editor">
    <form {...form} aria-label={"Set " + set} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="set" value={set} />
      {correction && record && <input type="hidden" name="version" value={record.recorded_at} />}
      <div className="flex items-center gap-2 font-semibold">Set {set}
        {record && <span className="accent text-xs flex items-center gap-1"><Check size={15} aria-hidden="true" />Tercatat</span>}
      </div>
      {reference && <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="caption muted numeric">{reference.session_id === id ? "Set sebelumnya" : "Sesi sebelumnya"} · {workoutSetLabel(reference)}</span>
        <button type="button" className="btn btn-quiet !px-2" onClick={() => {
          setAmount(String(reference.amount));
          setLoad(reference.load_kg === null ? "" : String(reference.load_kg));
        }}>Pakai angka terakhir</button>
      </div>}
      <div className={exercise.weighted ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
        {guided ? <SetStepper label={amountLabel} name="amount" value={amount} change={setAmount}
          min={1} max={maxAmount} jump={1} required /> : <label className="label">{amountLabel}
          <input className="field" name="amount" type="number" min="1" max={maxAmount}
            step="1" inputMode="numeric" required defaultValue={record?.amount ?? ""} />
        </label>}
        {exercise.weighted && (guided ? <SetStepper label="Beban per alat (kg)" name="load" value={load}
          change={setLoad} min={0} max={100} jump={.5} /> : <label className="label">Beban per alat (kg)
          <input className="field" name="load" type="number" min="0" max="100" step=".01"
            inputMode="decimal" defaultValue={record?.load_kg ?? ""} />
        </label>)}
      </div>
      <button className={guided ? "btn btn-primary mt-1" : "btn btn-secondary justify-self-start"} disabled={pending || remove.pending}>
        {pending ? "Menyimpan…" : record ? "Perbarui set" : "Simpan set & mulai istirahat"}
      </button>
      <Feedback {...state} />
    </form>
    {record && !correction && <form {...remove.form} className="mt-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="set" value={set} />
      <button className="btn btn-quiet" disabled={pending || remove.pending}>Hapus set {set}</button>
      <Feedback {...remove.state} />
    </form>}
  </div>;
}

export function WorkoutCorrections({ id, records }: { id: string; records: WorkoutSet[] }) {
  const [opened, setOpened] = useState(false);
  return <details className="rounded-xl border line px-3 pb-2" onToggle={event => setOpened(event.currentTarget.open)}>
    <summary className="caption font-semibold">Koreksi set</summary>
    {opened && <div className="grid gap-3 pb-2 sm:grid-cols-2">
      {records.map(set => <div className="grid gap-1" key={set.slot + ":" + set.set_number + ":" + set.recorded_at}>
        <h3 className="text-sm">{exerciseFor(set.exercise_id).name}</h3>
        <SetEditor id={id} slot={set.slot} set={set.set_number} exerciseId={set.exercise_id} record={set} correction />
      </div>)}
    </div>}
  </details>;
}

function SavedSet({ record, id }: { record: WorkoutSet; id: string }) {
  const [opened, setOpened] = useState(false);
  return <details className="border-t line px-1" onToggle={event => setOpened(event.currentTarget.open)}>
    <summary className="caption numeric"><strong>Set {record.set_number}</strong> · {workoutSetLabel(record)}
      <Check size={15} className="accent ml-2 inline" aria-hidden="true" />
    </summary>
    {opened && <SetEditor id={id} slot={record.slot} set={record.set_number} exerciseId={record.exercise_id} record={record} />}
  </details>;
}

function RestTimer({ savedAt }: { savedAt: number }) {
  const [manual, setManual] = useState<{ savedAt: number; deadline: number } | null>(null);
  const [tick, setTick] = useState<{ deadline: number; seconds: number } | null>(null);
  const deadline = manual?.savedAt === savedAt ? manual.deadline : savedAt ? savedAt + 60_000 : 0;
  useEffect(() => {
    if (!deadline || deadline <= Date.now()) return;
    function update() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTick({ deadline, seconds: remaining });
      if (!remaining) window.clearInterval(interval);
    }
    const first = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [deadline]);
  const seconds = tick?.deadline === deadline ? tick.seconds : null;
  const start = (duration: number) => setManual({ savedAt, deadline: Date.now() + duration * 1000 });
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border line bg-[var(--inset)] p-2 sm:p-3">
    <span className="flex items-center gap-1.5 caption font-semibold"><Timer size={17} aria-hidden="true" />Istirahat</span>
    {seconds !== null && <span role="timer" aria-label="Sisa istirahat" className="numeric accent text-xl font-semibold">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>}
    <button type="button" className="btn btn-secondary" onClick={() => start(60)}>60 dtk</button>
    <button type="button" className="btn btn-secondary" onClick={() => start(90)}>90 dtk</button>
    {seconds === 0 && <span className="caption accent" role="status">Istirahat selesai</span>}
    {seconds !== null && <button type="button" className="btn btn-quiet" onClick={() => setManual({ savedAt, deadline: 0 })}>Reset</button>}
  </div>;
}

export function ActiveWorkout({ session, records, previous }: {
  session: WorkoutSession; records: WorkoutSet[]; previous: Partial<Record<ExerciseId, WorkoutSet[]>>;
}) {
  const firstIncomplete = session.exercise_ids.findIndex((_, index) => !session.skipped_slots.includes(index + 1)
    && nextWorkoutSet(records.filter(record => record.slot === index + 1), session.prescribed_sets) !== undefined);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [chosen, setChosen] = useState<{ slot: number; recordCount: number } | null>(null);
  const slot = chosen?.recordCount === records.length ? chosen.slot : firstIncomplete >= 0 ? firstIncomplete + 1 : session.exercise_ids.length;
  const selectSlot = (next: number) => setChosen({ slot: next, recordCount: records.length });
  const id = session.exercise_ids[slot - 1];
  const exercise = exerciseFor(id);
  const options = exerciseOptions(session.routine, slot);
  const alternate = options.find(option => option !== id);
  const skipped = session.skipped_slots.includes(slot);
  const currentRecords = records.filter(record => record.slot === slot);
  const nextSet = nextWorkoutSet(currentRecords, session.prescribed_sets);
  const earlier = previous[id] ?? [];
  const reference = currentRecords.filter(set => set.set_number < (nextSet ?? 0)).at(-1)
    ?? earlier.find(set => set.set_number === nextSet) ?? earlier.at(-1);
  const paused = session.status === "paused";
  const activeFrom = session.active_since ? Date.parse(session.active_since) : Infinity;
  const lastSaved = records.reduce((latest, record) => Math.max(latest, Date.parse(record.recorded_at)), 0);
  const progress = session.prescribed_sets * session.exercise_ids.length;
  const partial = records.length > 0 && records.length < progress;
  return <section id="sesi" className="card workout-session grid gap-4">
    <header className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="eyebrow">{paused ? "Sesi dijeda" : "Sesi aktif"}</p><h2 className="mt-1">Workout {session.routine}</h2></div>
        <p className="caption muted numeric">{records.length} dari {progress} set tercatat</p>
      </div>
      <progress className="meter" style={{ "--fill-color": "var(--accent)" } as React.CSSProperties}
        aria-label="Set tercatat" value={records.length} max={progress} />
    </header>
    {paused ? <div className="grid gap-3">
      <p className="muted">Set yang sudah tercatat tersimpan. Lanjutkan saat siap.</p>
      <WorkoutCommand id={session.id} action="resume" label="Lanjutkan sesi" primary />
    </div> : <>
      <RestTimer key={session.active_since} savedAt={lastSaved >= activeFrom ? lastSaved : 0} />
      <div className="exercise-switcher">
        <button type="button" className="topbar-action" aria-label="Gerakan sebelumnya"
          disabled={slot === 1} onClick={() => selectSlot(slot - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <div className="text-center min-w-0"><p className="caption muted">Gerakan {slot} dari {session.exercise_ids.length}</p>
          <h3 className="mt-1">{exercise.name}</h3><p className="caption muted">{exercise.focus}</p></div>
        <button type="button" className="topbar-action" aria-label="Gerakan berikutnya"
          disabled={slot === session.exercise_ids.length} onClick={() => selectSlot(slot + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      {skipped ? <div className="grid gap-2"><p className="caption muted">Gerakan dilewati.</p>
        <WorkoutCommand id={session.id} action="restore" label="Kembalikan gerakan" slot={slot} />
      </div> : <>
        <p className="caption muted">{session.prescribed_sets} set · {exercise.kind === "hold" ? "tahan 15–30 detik"
          : "8–12 repetisi" + (exercise.unilateral ? " per sisi" : "")}</p>
        {earlier.length > 0 && <p className="caption muted numeric">Terakhir · {workoutSetLabel(earlier.at(-1)!)}</p>}
        {nextSet !== undefined ? <SetEditor key={slot + ":" + id + ":" + nextSet}
          id={session.id} slot={slot} exerciseId={id} set={nextSet} guided reference={reference} />
          : <p className="caption accent">Semua set gerakan ini tercatat.</p>}
        {currentRecords.length > 0 && <section aria-label="Set yang sudah tercatat">
          {currentRecords.map(record => <SavedSet key={record.set_number + ":" + record.recorded_at} id={session.id} record={record} />)}
        </section>}
        <details className="rounded-xl border line px-3 pb-3">
          <summary className="text-sm font-semibold">Teknik dan pilihan gerakan</summary>
          <ExerciseGuide id={id} routine={session.routine} slot={slot} />
          {!currentRecords.length && <div className="mt-3 flex flex-wrap gap-2">
            {alternate && <WorkoutCommand id={session.id} action="replace" label={"Ganti ke " + exerciseFor(alternate).name}
              slot={slot} exercise={alternate} />}
            <WorkoutCommand id={session.id} action="skip" label="Lewati gerakan" slot={slot} />
          </div>}
        </details>
      </>}
      <WorkoutCommand id={session.id} action="pause" label="Jeda sesi" />
    </>}
    <div className="grid gap-2 border-t line pt-3">
      {partial && !confirmFinish ? <button className="btn btn-primary" type="button" onClick={() => setConfirmFinish(true)}>
        Selesaikan sesi
      </button> : <>
        {partial && <p className="caption">Simpan sesi sebagai selesai sebagian dengan {records.length} dari {progress} set.</p>}
        <WorkoutCommand id={session.id} action="finish"
          label={partial ? "Simpan sesi sebagian" : "Selesaikan sesi"} primary disabled={!records.length} />
        {partial && <button className="btn btn-quiet" type="button" onClick={() => setConfirmFinish(false)}>Kembali ke sesi</button>}
      </>}
      {!records.length && <p className="caption muted">Catat minimal satu set untuk menyelesaikan sesi.</p>}
      <details>
        <summary className="caption muted">Batalkan sesi</summary>
        <p className="caption muted mb-2">Sesi yang dibatalkan dikeluarkan dari perhitungan progres.</p>
        <WorkoutCommand id={session.id} action="cancel" label="Ya, batalkan sesi" />
      </details>
    </div>
  </section>;
}
