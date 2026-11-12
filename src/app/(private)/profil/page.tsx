import { Download } from "lucide-react";
import { Feedback } from "@/components/feedback";
import { TargetForm } from "@/components/targets";
import { SignOutForm } from "@/components/onboarding";
import { requireProfile } from "@/lib/supabase/server";
import { getTarget } from "@/lib/data";
import { localNow, longDate } from "@/lib/dates";
import { ACTIVITIES, energyEstimate, EQUIPMENT, fmt, GOALS } from "@/lib/nutrition";

export const metadata = { title: "Profil" };
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { client, profile, userId } = await requireProfile();
  const [target, query] = await Promise.all([getTarget(client, userId, localNow(profile.timezone).date), searchParams]);
  const energy = energyEstimate(profile.initial_weight_kg, profile.height_cm, profile.age_years, profile.sex_for_bmr, profile.activity_level);
  const details = [
    ["Tujuan", GOALS[profile.goal]], ["Berat awal", fmt(profile.initial_weight_kg) + " kg"],
    ["Tinggi", fmt(profile.height_cm) + " cm"], ["Aktivitas", ACTIVITIES[profile.activity_level].label],
    ["Mulai", longDate(profile.start_date)], ["Peralatan", EQUIPMENT[profile.equipment]],
    ["Zona waktu", profile.timezone], ["Target berat", profile.milestone_kg === null ? "Belum ditetapkan" : fmt(profile.milestone_kg) + " kg"],
  ];
  return <div className="grid gap-5">
    <header><p className="eyebrow mb-2">Akun pribadi</p><h1>Profil</h1><p className="muted mt-2 break-words">{profile.name}</p></header>
    <section className="card grid gap-4">
      <h2>Target nutrisi</h2>
      <p className="caption muted">Target baru berlaku mulai hari ini menurut zona waktu profil.</p>
      {query.target === "tersimpan" && <Feedback message="Target nutrisi tersimpan." />}
      <TargetForm target={target} key={target?.updated_at ?? "empty"} />
    </section>
    <section className="card grid gap-4">
      <h2>Data awal</h2>
      <dl className="grid grid-cols-2 gap-4">
        {details.map(([label, value]) => <div key={label} className="min-w-0">
          <dt className="caption muted">{label}</dt><dd className="break-words">{value}</dd>
        </div>)}
      </dl>
      <p className="caption muted">Estimasi dari data awal · BMR {fmt(energy.bmr)} kkal · TDEE {fmt(energy.tdee)} kkal/hari.</p>
    </section>
    <section className="card grid justify-items-start gap-4">
      <h2>Data dan akun</h2>
      <a href="/api/ekspor" className="btn btn-secondary"><Download size={17} aria-hidden="true" /> Unduh data (JSON)</a>
      <SignOutForm />
    </section>
  </div>;
}
