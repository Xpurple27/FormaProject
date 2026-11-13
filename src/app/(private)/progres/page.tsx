import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { Camera, Dumbbell, Ruler } from "lucide-react";
import { Feedback } from "@/components/feedback";
import { ProgressChart } from "@/components/progress-chart";
import { MeasurementForm, PhotoForm, RemoveMeasurementForm, RemovePhotoForm } from "@/components/progress-forms";
import { allRows } from "@/lib/data";
import { localNow, longDate } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { average, bestSet, measuredSeries, milestoneProgress } from "@/lib/progress";
import { progressPhotos } from "@/lib/progress-photos";
import { requireProfile } from "@/lib/supabase/server";
import { getMeasurements, setsForSessions } from "@/lib/training-data";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { DEFAULT_WORKOUT_DAYS, exerciseFor, programWeek, trainingWeek, type ExerciseId } from "@/lib/workout";

export const metadata = { title: "Progres" };

function setLabel(set: WorkoutSet) {
  const exercise = exerciseFor(set.exercise_id);
  const amount = set.amount + (exercise.kind === "hold" ? " detik" : exercise.unilateral ? " rep/sisi" : " rep");
  return set.load_kg === null ? amount : fmt(set.load_kg, 2) + " kg/alat · " + amount;
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ status?: string; edit?: string }> }) {
  const { client, userId, profile } = await requireProfile();
  const today = localNow(profile.timezone).date;
  const [measurements, sessions, preference, photoResult, query] = await Promise.all([
    getMeasurements(client, userId),
    allRows<WorkoutSession>((from, to) => client.from("workout_sessions").select("*").eq("user_id", userId)
      .eq("status", "completed").order("started_at", { ascending: false }).order("id").range(from, to)),
    client.from("workout_preferences").select("weekdays").eq("user_id", userId).maybeSingle(),
    progressPhotos(client, userId),
    searchParams,
  ]);
  if (preference.error) throw new Error("Could not load training schedule");

  const recent = sessions.slice(0, 30);
  const sets = await setsForSessions(client, userId, recent.map(session => session.id));
  const byMovement = new Map<ExerciseId, Map<string, WorkoutSet[]>>();
  for (const set of sets) {
    const movement = byMovement.get(set.exercise_id) ?? new Map<string, WorkoutSet[]>();
    movement.set(set.session_id, [...(movement.get(set.session_id) ?? []), set]);
    byMovement.set(set.exercise_id, movement);
  }
  const weights = measuredSeries(measurements, "weight_kg");
  const waists = measuredSeries(measurements, "waist_cm");
  const currentWeight = weights.at(-1)?.value;
  const milestone = profile.milestone_kg;
  const goalProgress = currentWeight !== undefined && milestone !== null
    ? milestoneProgress(profile.initial_weight_kg, currentWeight, milestone) : null;
  const week = programWeek(profile.start_date, today);
  const elapsedWeeks = week ?? (today < profile.start_date ? 0 : 12);
  const weekly = Array.from({ length: elapsedWeeks }, (_, index) => {
    const period = trainingWeek(profile.start_date, index + 1, preference.data?.weekdays ?? DEFAULT_WORKOUT_DAYS);
    const within = (date: string) => date >= period.first && date <= period.last;
    const completed = sessions.filter(item => within(item.local_date));
    const full = completed.filter(item => item.completed_set_count === item.prescribed_sets * item.exercise_ids.length).length;
    return { week: index + 1, period, weight: average(weights.filter(item => within(item.date)).map(item => item.value)),
      waist: average(waists.filter(item => within(item.date)).map(item => item.value)),
      full, partial: completed.length - full };
  }).reverse();
  const existing = measurements.find(item => item.measured_date === query.edit);
  const shownMeasurements = measurements.slice(0, 60);
  const shownPhotos = photoResult.photos.slice(0, 40);

  return <div className="grid gap-4 md:gap-6">
    <header><p className="eyebrow mb-2">Jurnal perkembangan</p><h1>Progres</h1>
      <p className="muted mt-2">{week ? "Minggu " + week + " dari 12" : elapsedWeeks ? "Ringkasan program 12 minggu" : "Program dimulai " + longDate(profile.start_date)}</p>
    </header>
    <section className="card grid gap-3">
      <h2>Target berat</h2>
      <div className="grid gap-3 grid-cols-3">
        <div><p className="caption muted">Berat awal profil</p><strong className="numeric">{fmt(profile.initial_weight_kg, 2)} kg</strong></div>
        <div><p className="caption muted">Terakhir diukur</p><strong className="numeric">{currentWeight === undefined ? "—" : fmt(currentWeight, 2) + " kg"}</strong></div>
        <div><p className="caption muted">Target profil</p><strong className="numeric">{milestone === null ? "—" : fmt(milestone, 2) + " kg"}</strong></div>
      </div>
      {currentWeight !== undefined && <p className="caption muted">Perubahan dari berat awal profil · {
        currentWeight > profile.initial_weight_kg ? "+" : ""}{fmt(currentWeight - profile.initial_weight_kg, 2)} kg</p>}
      {goalProgress !== null && <div className="grid gap-1">
        <label htmlFor="milestone" className="caption">Jarak menuju target · {fmt(goalProgress, 0)}% tercapai</label>
        <progress id="milestone" className="meter" style={{ "--fill-color": "var(--mint)" } as React.CSSProperties}
          max={100} value={goalProgress} />
      </div>}
    </section>
    <div className="grid gap-3 md:grid-cols-2">
      <ProgressChart title="Berat badan" unit="kg" color="#8be2bb" series={weights} />
      <ProgressChart title="Lingkar pinggang" unit="cm" color="#8ccaff" series={waists} />
    </div>
    <section id="pengukuran" className="card grid gap-3">
      <h2 className="flex items-center gap-2"><Ruler size={20} className="accent" aria-hidden="true" />{existing ? "Ubah pengukuran" : "Catat pengukuran"}</h2>
      {query.status === "tersimpan" && <Feedback message="Pengukuran tersimpan." />}
      {query.status === "dihapus" && <Feedback message="Pengukuran dihapus." />}
      <MeasurementForm key={existing?.updated_at ?? "new-" + measurements.length} today={today} existing={existing} />
      {existing && <Link href="/progres#pengukuran" className="btn btn-quiet justify-self-start">Batal ubah</Link>}
    </section>
    <section className="card grid gap-3">
      <h2>Ringkasan mingguan</h2>
      {weekly.length ? <>
        <p className="caption muted">Rata-rata memakai hari yang punya pengukuran. Tanda — berarti belum tercatat.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm">
          <thead className="muted"><tr className="border-b line">
            <th scope="col" className="py-2 pr-2">Minggu</th><th scope="col" className="p-2">Rerata berat</th>
            <th scope="col" className="p-2">Rerata pinggang</th><th scope="col" className="py-2 pl-2">Sesi</th>
          </tr></thead>
          <tbody>{weekly.map(item => <tr className="border-b line" key={item.week}>
            <th scope="row" className="py-2 pr-2" title={longDate(item.period.first) + " sampai " + longDate(item.period.last)}>{item.week}</th>
            <td className="p-2">{item.weight === null ? "—" : fmt(item.weight, 2) + " kg"}</td>
            <td className="p-2">{item.waist === null ? "—" : fmt(item.waist, 2) + " cm"}</td>
            <td className="py-2 pl-2 whitespace-nowrap">{item.full} / {item.period.days.length}{item.partial > 0 && <span className="block muted">{item.partial} sebagian</span>}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="caption muted">Sesi penuh dibandingkan dengan jadwal saat ini. Sesi sebagian ditampilkan terpisah, dan set yang tercatat tetap masuk progres kekuatan.</p>
      </> : <p className="muted">Ringkasan program muncul setelah tanggal mulai.</p>}
    </section>
    <section id="kekuatan" className="card grid gap-3">
      <h2 className="flex items-center gap-2"><Dumbbell size={20} className="accent" aria-hidden="true" />Progres kekuatan</h2>
      {byMovement.size ? <>
        <p className="caption muted">Set terbaik dari dua sesi terakhir pada gerakan yang sama, diambil dari 30 sesi terbaru. Dibandingkan menurut beban, lalu repetisi atau durasi.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...byMovement].map(([id, grouped]) => {
            const comparable = recent.filter(session => grouped.has(session.id)).slice(0, 2);
            const last = bestSet(grouped.get(comparable[0].id) ?? []);
            const previous = comparable[1] ? bestSet(grouped.get(comparable[1].id) ?? []) : null;
            return <li className="rounded-xl border line p-3" key={id}>
              <h3>{exerciseFor(id).name}</h3>
              {last && <p className="mt-1 numeric text-sm">Terakhir · {setLabel(last)}</p>}
              <p className="muted caption">{previous ? "Sebelumnya · " + setLabel(previous) : "Tambahkan sesi sejenis untuk membandingkan."}</p>
            </li>;
          })}
        </ul>
      </> : <p className="muted">Selesaikan sesi latihan untuk melihat catatan kekuatan.</p>}
    </section>
    <section className="card grid gap-3">
      <h2>Riwayat pengukuran</h2>
      {shownMeasurements.length ? <ul className="divide-y divide-[var(--border)]">
        {shownMeasurements.map(item => <li className="py-3 grid gap-1" key={item.measured_date}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <strong>{longDate(item.measured_date)}</strong>
            <Link href={"/progres?edit=" + item.measured_date + "#pengukuran"} className="btn btn-quiet">Ubah</Link>
          </div>
          <p className="numeric">{[item.weight_kg !== null ? fmt(item.weight_kg, 2) + " kg" : "",
            item.waist_cm !== null ? fmt(item.waist_cm, 2) + " cm pinggang" : ""].filter(Boolean).join(" · ")}</p>
          {item.notes && <p className="caption muted break-words">{item.notes}</p>}
          <RemoveMeasurementForm measurement={item} />
        </li>)}
      </ul> : <p className="muted">Catatan yang kamu simpan akan muncul di sini.</p>}
      {measurements.length > shownMeasurements.length && <p className="caption muted">Menampilkan 60 catatan terakhir. Ekspor dari Profil memuat seluruh catatan.</p>}
    </section>
    <section id="foto" className="card grid gap-3">
      <h2 className="flex items-center gap-2"><Camera size={20} className="accent" aria-hidden="true" />Foto progres</h2>
      {query.status === "foto-tersimpan" && <Feedback message="Foto tersimpan di galeri privat." />}
      {query.status === "foto-dihapus" && <Feedback message="Foto dihapus." />}
      {photoResult.available ? <>
        <PhotoForm key={photoResult.photos.length} today={today} id={randomUUID()} />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {shownPhotos.map(photo => <figure className="rounded-xl border line p-2" key={photo.name}>
            <a href={"/api/progres/foto/" + photo.name} target="_blank" rel="noreferrer">
              <Image src={"/api/progres/foto/" + photo.name} unoptimized width={240} height={240}
                className="w-full aspect-square object-cover rounded-lg" alt={"Foto progres " + longDate(photo.date)} />
            </a>
            <figcaption className="caption mt-1">{longDate(photo.date)}</figcaption>
            <RemovePhotoForm file={photo.name} />
          </figure>)}
        </div>
        {photoResult.photos.length > shownPhotos.length && <p className="caption muted">Menampilkan 40 foto terakhir.</p>}
      </> : <p className="muted">Galeri belum dapat dimuat. Coba buka ulang halaman.</p>}
    </section>
  </div>;
}
