"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { changeWorkout, removeWorkoutSet, saveWorkoutDays, saveWorkoutSet, startWorkout } from "@/lib/training-actions";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { DAY_NAMES, exerciseFor, exerciseOptions, type ExerciseId, type Routine } from "@/lib/workout";
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
            className="accent-[var(--mint)]" />{day}
        </label>)}
      </div>
    </fieldset>
    <Feedback {...state} />
    <button className="btn btn-secondary justify-self-start" disabled={pending}>Simpan jadwal</button>
  </form>;
}

export function StartWorkoutForm({ id, recommended, optionalThird }: { id: string; recommended: Routine; optionalThird: boolean }) {
  const { state, pending, form } = useActionForm(startWorkout);
  return <form {...form} className="grid gap-3 sm:max-w-xs">
    <input type="hidden" name="id" value={id} />
    <label className="label">Pilih workout
      <select className="field" name="routine" defaultValue={recommended}>
        <option value="A">Workout A</option><option value="B">Workout B</option>
      </select>
    </label>
    {optionalThird ? <label className="label">Set per gerakan
      <select className="field" name="sets" defaultValue="2">
        <option value="2">2 set</option><option value="3">3 set</option>
      </select>
    </label> : <input type="hidden" name="sets" value="2" />}
    <Feedback {...state} />
    <button className="btn btn-primary" disabled={pending}>{pending ? "Membuka sesi…" : "Mulai latihan"}</button>
  </form>;
}

export function ExerciseGuide({ id, routine, slot }: { id: ExerciseId; routine: Routine; slot: number }) {
  const exercise = exerciseFor(id);
  const isMain = exerciseOptions(routine, slot)[0] === id;
  return <div className="grid items-start gap-3 sm:grid-cols-2">
    <div>
      <Image src={"/exercises/" + exercise.image + ".webp"} width={400} height={196}
        alt={isMain ? "Skema " + exercise.name : "Skema gerakan utama untuk alternatif ini"}
        className="w-full max-w-sm rounded-xl" />
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

export function SetEditor({ id, slot, set, exerciseId, record, correction = false }: {
  id: string; slot: number; set: number; exerciseId: ExerciseId; record?: WorkoutSet; correction?: boolean;
}) {
  const { state, pending, form } = useActionForm(saveWorkoutSet);
  const remove = useActionForm(removeWorkoutSet);
  const exercise = exerciseFor(exerciseId);
  const amountLabel = exercise.kind === "hold" ? "Durasi (detik)" : exercise.unilateral ? "Repetisi per sisi" : "Repetisi";
  return <div className="set-editor">
    <form {...form} aria-label={"Set " + set} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="set" value={set} />
      {correction && record && <input type="hidden" name="version" value={record.recorded_at} />}
      <div className="flex items-center gap-2 font-semibold">Set {set}
        {record && <span className="accent text-xs flex items-center gap-1"><Check size={15} aria-hidden="true" />Tercatat</span>}
      </div>
      <div className={exercise.weighted ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
        <label className="label">{amountLabel}
          <input className="field" name="amount" type="number" min="1" max={exercise.kind === "hold" ? 600 : 100}
            step="1" inputMode="numeric" required defaultValue={record?.amount ?? ""} />
        </label>
        {exercise.weighted && <label className="label">Beban per alat (kg)
          <input className="field" name="load" type="number" min="0" max="100" step=".01"
            inputMode="decimal" defaultValue={record?.load_kg ?? ""} />
        </label>}
      </div>
      <button className="btn btn-secondary justify-self-start" disabled={pending || remove.pending}>
        {pending ? "Menyimpan…" : record ? "Perbarui set" : "Tandai set selesai"}
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

function RestTimer() {
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const start = (duration: number) => { setSeconds(duration); setDeadline(Date.now() + duration * 1000); };
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border line p-2 sm:p-3">
    <span className="flex items-center gap-1.5 caption font-semibold"><Timer size={17} aria-hidden="true" />Istirahat</span>
    <button type="button" className="btn btn-secondary" onClick={() => start(60)}>60 dtk</button>
    <button type="button" className="btn btn-secondary" onClick={() => start(90)}>90 dtk</button>
    {deadline > 0 && <><span role="timer" className="numeric accent text-sm">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
      {seconds === 0 && <span className="caption accent" role="status">Selesai</span>}
      <button type="button" className="btn btn-quiet" onClick={() => { setDeadline(0); setSeconds(0); }}>Reset</button></>}
  </div>;
}

export function ActiveWorkout({ session, records }: { session: WorkoutSession; records: WorkoutSet[] }) {
  const firstIncomplete = session.exercise_ids.findIndex((_, index) => !session.skipped_slots.includes(index + 1)
    && records.filter(record => record.slot === index + 1).length < session.prescribed_sets);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [slot, setSlot] = useState(firstIncomplete >= 0 ? firstIncomplete + 1 : 1);
  const id = session.exercise_ids[slot - 1];
  const exercise = exerciseFor(id);
  const options = exerciseOptions(session.routine, slot);
  const alternate = options.find(option => option !== id);
  const skipped = session.skipped_slots.includes(slot);
  const currentRecords = records.filter(record => record.slot === slot);
  const paused = session.status === "paused";
  const progress = session.prescribed_sets * session.exercise_ids.length;
  const partial = records.length > 0 && records.length < progress;
  return <section id="sesi" className="card workout-session grid gap-4">
    <header className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="eyebrow">{paused ? "Sesi dijeda" : "Sesi aktif"}</p><h2 className="mt-1">Workout {session.routine}</h2></div>
        <p className="caption muted numeric">{records.length} dari {progress} set tercatat</p>
      </div>
      <progress className="meter" style={{ "--fill-color": "var(--mint)" } as React.CSSProperties}
        aria-label="Set tercatat" value={records.length} max={progress} />
    </header>
    {paused ? <div className="grid gap-3">
      <p className="muted">Set yang sudah tercatat tersimpan. Lanjutkan saat siap.</p>
      <WorkoutCommand id={session.id} action="resume" label="Lanjutkan sesi" primary />
    </div> : <>
      <RestTimer />
      <div className="exercise-switcher">
        <button type="button" className="topbar-action" aria-label="Gerakan sebelumnya"
          disabled={slot === 1} onClick={() => setSlot(slot - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <div className="text-center min-w-0"><p className="caption muted">Gerakan {slot} dari 4</p>
          <h3 className="mt-1">{exercise.name}</h3><p className="caption muted">{exercise.focus}</p></div>
        <button type="button" className="topbar-action" aria-label="Gerakan berikutnya"
          disabled={slot === 4} onClick={() => setSlot(slot + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      {skipped ? <div className="grid gap-2"><p className="caption muted">Gerakan dilewati.</p>
        <WorkoutCommand id={session.id} action="restore" label="Kembalikan gerakan" slot={slot} />
      </div> : <>
        <p className="caption muted">{session.prescribed_sets} set · {exercise.kind === "hold" ? "tahan 15–30 detik"
          : "8–12 repetisi" + (exercise.unilateral ? " per sisi" : "")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: session.prescribed_sets }, (_, index) => {
            const set = index + 1;
            const record = currentRecords.find(item => item.set_number === set);
            return <SetEditor key={slot + ":" + id + ":" + set + ":" + (record?.recorded_at ?? "new")}
              id={session.id} slot={slot} exerciseId={id} set={set} record={record} />;
          })}
        </div>
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
