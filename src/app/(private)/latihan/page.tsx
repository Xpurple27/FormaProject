import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Dumbbell, History } from "lucide-react";
import { Feedback } from "@/components/feedback";
import { ActiveWorkout, ExerciseGuide, ScheduleForm, StartWorkoutForm, WorkoutCorrections } from "@/components/workout-controls";
import { dayOffset, localNow, longDate } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { bestSet } from "@/lib/progress";
import { requireProfile } from "@/lib/supabase/server";
import { setsForSessions, trainingOverview } from "@/lib/training-data";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { exerciseFor, nextRoutine, programWeek, trainingWeek, workoutExercises, type Routine } from "@/lib/workout";
import { lastWorkoutByExercise, workoutSetLabel } from "@/lib/workout-history";

export const metadata = { title: "Latihan" };
export default async function WorkoutPage({ searchParams }: { searchParams: Promise<{ status?: string; sesi?: string }> }) {
  const { client, userId, profile } = await requireProfile();
  const today = localNow(profile.timezone).date;
  const week = programWeek(profile.start_date, today);
  const [{ open, history, weekdays }, query] = await Promise.all([trainingOverview(client, userId), searchParams]);
  const records = await setsForSessions(client, userId, [...(open ? [open.id] : []), ...history.map(session => session.id)]);
  const plan = trainingWeek(profile.start_date, week ?? (today < profile.start_date ? 1 : 12), weekdays);
  const recommendation = nextRoutine(history[0]?.routine);
  const early = today < profile.start_date;
  const useDumbbells = profile.equipment === "dumbbells";
  const recapIndex = history.findIndex(session => session.id === query.sesi);

  return <div className="grid gap-4 md:gap-6">
    <header className="page-heading"><h1>Latihan</h1>
      <p className="muted mt-2">{week ? "Minggu " + week + " dari 12" : early
        ? "Program dimulai " + longDate(profile.start_date) : "Program 12 minggu telah melewati tanggal akhir."}</p>
    </header>
    <nav aria-label="Bagian latihan" className="workout-jumps">
      <Link href="#jadwal" className="btn btn-secondary"><CalendarDays size={16} aria-hidden="true" />Jadwal</Link>
      <Link href="#riwayat" className="btn btn-secondary"><History size={16} aria-hidden="true" />Riwayat</Link>
    </nav>
    {query.status === "selesai" && recapIndex >= 0 && <Feedback message="Sesi selesai dan tercatat di riwayat." />}
    {query.status === "dibatalkan" && <Feedback message="Sesi dibatalkan." />}
    {recapIndex >= 0 && <WorkoutRecap session={history[recapIndex]} previousSessions={history.slice(recapIndex + 1)} records={records} />}
    {open ? <ActiveWorkout key={open.id} session={open} records={records.filter(record => record.session_id === open.id)}
      previous={lastWorkoutByExercise(history, records, open.exercise_ids)} /> :
      <section className="card workout-session grid gap-4">
        <h2 className="flex items-center gap-2"><Dumbbell size={21} aria-hidden="true" className="accent" />Latihan hari ini</h2>
        <p className="caption muted">{week && plan.days.includes(today) ? "Hari ini ada jadwal latihan." : "Mulai sesi sesuai waktumu."}
          {" · "}Berikutnya Workout {recommendation}</p>
        <StartWorkoutForm key={recommendation} id={randomUUID()} recommended={recommendation}
          optionalThird={week !== null && week >= 5} dumbbells={useDumbbells} />
      </section>}
    <section id="jadwal" className="card grid gap-4">
      <h2 className="flex items-center gap-2"><CalendarDays size={20} aria-hidden="true" className="accent" />Jadwal 12 minggu</h2>
      <p className="caption muted">Awal program · {longDate(profile.start_date)}. Akhir · {longDate(dayOffset(profile.start_date, 83))}.</p>
      {week && <div className="grid gap-1">
        <p><strong>Jadwal minggu ini</strong> · {plan.days.length} sesi</p>
        <p className="muted caption">{plan.days.map(longDate).join(" · ")}</p>
        <p className="muted caption">Jalan kaki · {plan.walk}. {plan.sets === 3 ? "Pilih 2 atau 3 set sesuai pemulihan." : "Mulai dengan 2 set per gerakan."}</p>
      </div>}
      {query.status === "jadwal-tersimpan" && <Feedback message="Jadwal latihan tersimpan." />}
      <ScheduleForm key={weekdays.join("-")} days={weekdays} />
      <p className="caption muted">Pada dua minggu pertama, program memakai maksimal dua hari terpilih. Beri jeda pemulihan antar sesi.</p>
    </section>
    <section className="card grid gap-3">
      <h2>Panduan gerakan A/B</h2>
      <p className="caption muted">Mulai ringan dan jaga teknik. Catat beban aktual per alat. Jika gerakan menimbulkan nyeri, hentikan gerakan tersebut.</p>
      {(["A", "B"] as Routine[]).map(routine => <details key={routine} className="rounded-xl border line px-3">
        <summary className="font-semibold">Workout {routine}</summary>
        <ol className="grid gap-4 pb-4">
          {workoutExercises(routine, useDumbbells).map((id, index) => {
            const exercise = exerciseFor(id);
            return <li className="grid gap-2" key={id}>
              <h3>{index + 1}. {exercise.name}</h3><p className="caption muted">{exercise.focus}</p>
              <ExerciseGuide id={id} routine={routine} slot={index + 1} />
            </li>;
          })}
        </ol>
      </details>)}
    </section>
    <section id="riwayat" className="card grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2>Riwayat sesi</h2>
        <Link href="/progres#kekuatan" className="btn btn-quiet">Lihat progres kekuatan</Link></div>
      {!history.length && <p className="muted">Sesi yang selesai akan muncul di sini.</p>}
      {history.map(session => {
        const sets = records.filter(record => record.session_id === session.id);
        const planned = session.prescribed_sets * session.exercise_ids.length;
        const complete = sets.length === planned;
        return <details className="border-t line" key={session.id}>
          <summary><strong>Workout {session.routine}</strong> · <span className="caption muted">{longDate(session.local_date)} · {complete ? "Selesai penuh" : "Selesai sebagian"} · {sets.length} dari {planned} set</span></summary>
          <p className="caption muted mb-2">Mulai {localNow(profile.timezone, new Date(session.started_at)).time}
            {" · "}{Math.floor(session.elapsed_seconds / 60)} m {session.elapsed_seconds % 60} dtk aktif
            {session.program_week ? " · Minggu " + session.program_week : " · Sesi bebas"}</p>
          <ul className="grid gap-1 pb-3">
            {sets.map(set => <li className="text-sm" key={set.slot + ":" + set.set_number}>
              {exerciseFor(set.exercise_id).name} · set {set.set_number} · {set.amount} {exerciseFor(set.exercise_id).kind === "hold" ? "detik" : "rep"}
              {set.load_kg !== null ? " · " + fmt(set.load_kg, 2) + " kg/alat" : ""}
            </li>)}
          </ul>
          <Link href={"/latihan?sesi=" + session.id + "#ringkasan"} prefetch={false} className="btn btn-quiet mb-2">Lihat ringkasan</Link>
          {!!sets.length && <WorkoutCorrections id={session.id} records={sets} />}
        </details>;
      })}
      {history.length === 30 && <p className="caption muted">Menampilkan 30 sesi terakhir. Riwayat lengkap dapat diekspor dari Profil.</p>}
    </section>
  </div>;
}

function WorkoutRecap({ session, previousSessions, records }: {
  session: WorkoutSession; previousSessions: WorkoutSession[]; records: WorkoutSet[];
}) {
  const saved = records.filter(record => record.session_id === session.id);
  const planned = session.prescribed_sets * session.exercise_ids.length;
  const exercises = [...new Set(saved.map(record => record.exercise_id))];
  const previous = lastWorkoutByExercise(previousSessions, records, exercises);
  return <section id="ringkasan" aria-labelledby="ringkasan-title" className="card workout-session grid scroll-mt-20 gap-4">
    <div>
      <p className="caption muted">{longDate(session.local_date)}</p>
      <h2 id="ringkasan-title" className="mt-1 flex items-center gap-2">
        <CheckCircle2 size={21} className="accent shrink-0" aria-hidden="true" />Ringkasan Workout {session.routine}
      </h2>
    </div>
    <dl className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border line bg-[var(--inset)] p-2.5">
        <dt className="caption muted">Set tercatat</dt><dd className="numeric font-semibold">{saved.length} dari {planned}</dd>
        <dd className="caption muted">{saved.length === planned ? "Selesai penuh" : "Selesai sebagian"}</dd>
      </div>
      <div className="rounded-xl border line bg-[var(--inset)] p-2.5">
        <dt className="caption muted">Waktu aktif</dt>
        <dd className="numeric font-semibold">{Math.floor(session.elapsed_seconds / 60)} m {session.elapsed_seconds % 60} dtk</dd>
      </div>
    </dl>
    {exercises.length > 0 && <div className="grid gap-2">
      <h3>Set terbaik per gerakan</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {exercises.map(id => {
          const current = bestSet(saved.filter(record => record.exercise_id === id))!;
          const earlier = bestSet(previous[id] ?? []);
          return <li className="min-w-0 rounded-xl border line bg-[var(--inset)] p-2.5" key={id}>
            <strong className="text-sm">{exerciseFor(id).name}</strong>
            <p className="caption numeric"><span className="muted">Sesi ini</span> · {workoutSetLabel(current)}</p>
            {earlier && <p className="caption muted numeric">Sesi sebelumnya · {workoutSetLabel(earlier)}</p>}
          </li>;
        })}
      </ul>
    </div>}
    <div className="flex flex-wrap gap-2">
      <Link href="/progres#kekuatan" className="btn btn-secondary">Lihat progres kekuatan</Link>
      <Link href="#riwayat" className="btn btn-quiet">Riwayat sesi</Link>
    </div>
  </section>;
}
