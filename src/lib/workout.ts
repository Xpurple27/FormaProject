import { Temporal } from "@js-temporal/polyfill";
import { dayOffset } from "./dates";

export type Routine = "A" | "B";
type Exercise = {
  name: string; focus: string; cue: string; mistake: string; safety: string;
  image: string; weighted: boolean; kind: "reps" | "hold"; unilateral?: boolean;
};

export const EXERCISES = {
  "goblet-squat": {
    name: "Goblet squat", focus: "Paha depan dan bokong",
    cue: "Pegang satu dumbbell dekat dada. Turun dengan menekuk pinggul dan lutut, lalu dorong telapak kaki untuk berdiri.",
    mistake: "Tumit terangkat atau lutut jatuh ke dalam.",
    safety: "Gunakan kedalaman yang bisa kamu kendalikan tanpa nyeri.",
    image: "squat", weighted: true, kind: "reps",
  },
  "chair-squat": {
    name: "Duduk–berdiri dari kursi", focus: "Paha depan dan bokong",
    cue: "Pakai kursi stabil. Turun perlahan sampai duduk ringan, lalu berdiri dengan kedua telapak tetap menapak.",
    mistake: "Jatuh ke kursi atau mendorong lutut ke dalam.",
    safety: "Pilih kursi kokoh dan ketinggian yang nyaman.",
    image: "squat", weighted: false, kind: "reps",
  },
  "floor-press": {
    name: "Dumbbell floor press", focus: "Dada dan trisep",
    cue: "Telentang dengan lutut ditekuk. Turunkan dumbbell sampai lengan atas menyentuh lantai perlahan, lalu dorong kembali.",
    mistake: "Membenturkan siku atau membiarkan pergelangan melipat.",
    safety: "Gunakan beban yang dapat kamu turunkan dan letakkan dengan terkendali.",
    image: "press", weighted: true, kind: "reps",
  },
  "wall-pushup": {
    name: "Push-up dinding", focus: "Dada dan trisep",
    cue: "Letakkan kedua telapak pada dinding. Tekuk siku hingga badan mendekat, lalu dorong kembali sambil menjaga tubuh lurus.",
    mistake: "Pinggang melengkung atau kepala maju lebih dulu.",
    safety: "Gunakan permukaan kokoh dan alas kaki yang tidak licin.",
    image: "press", weighted: false, kind: "reps",
  },
  "dumbbell-row": {
    name: "One-arm dumbbell row", focus: "Punggung atas dan bisep",
    cue: "Topang satu tangan pada kursi atau bangku yang kokoh. Tarik siku tangan berbeban ke arah pinggul, lalu turunkan perlahan.",
    mistake: "Memutar badan atau mengangkat bahu ke telinga.",
    safety: "Gunakan penopang stabil. Catat repetisi yang diselesaikan di kedua sisi.",
    image: "row", weighted: true, kind: "reps", unilateral: true,
  },
  "supported-row": {
    name: "Row bertumpu dengan botol", focus: "Punggung atas dan bisep",
    cue: "Topang tangan bebas pada kursi kokoh. Tarik botol tertutup ke arah pinggul, lalu turunkan perlahan.",
    mistake: "Mengayun botol atau memutar badan.",
    safety: "Pilih botol yang mudah digenggam dan isi yang tidak bocor.",
    image: "row", weighted: true, kind: "reps", unilateral: true,
  },
  plank: {
    name: "Plank", focus: "Otot inti",
    cue: "Letakkan siku di bawah bahu. Tahan tubuh tetap segaris dari kepala hingga tumit sambil bernapas.",
    mistake: "Menahan napas atau membiarkan pinggul turun.",
    safety: "Akhiri set saat posisi tubuh mulai sulit dipertahankan.",
    image: "plank", weighted: false, kind: "hold",
  },
  "elevated-plank": {
    name: "Plank bertumpu tinggi", focus: "Otot inti",
    cue: "Topang telapak pada meja atau dinding kokoh. Langkahkan kaki ke belakang dan tahan tubuh segaris sambil bernapas.",
    mistake: "Menumpukan badan ke permukaan yang bisa bergeser.",
    safety: "Mulai dari penopang lebih tinggi untuk versi yang lebih ringan.",
    image: "plank", weighted: false, kind: "hold",
  },
  "romanian-deadlift": {
    name: "Dumbbell Romanian deadlift", focus: "Paha belakang dan bokong",
    cue: "Lutut sedikit lentur. Dorong pinggul ke belakang, jaga dumbbell dekat kaki, lalu berdiri dengan menggerakkan pinggul maju.",
    mistake: "Membulatkan punggung atau memaksa dumbbell sampai ke lantai.",
    safety: "Turun sejauh bisa menjaga punggung netral dan gerak terkendali.",
    image: "hinge", weighted: true, kind: "reps",
  },
  "hip-hinge": {
    name: "Hip hinge tanpa beban", focus: "Paha belakang dan bokong",
    cue: "Lenturkan lutut sedikit, dorong pinggul ke belakang dan kembali berdiri. Bayangkan pinggul menyentuh dinding di belakangmu.",
    mistake: "Badan turun dengan membungkukkan punggung.",
    safety: "Perpendek gerakan bila belum bisa mempertahankan posisi punggung.",
    image: "hinge", weighted: false, kind: "reps",
  },
  "shoulder-press": {
    name: "Dumbbell shoulder press", focus: "Bahu dan trisep",
    cue: "Mulai dengan dumbbell setinggi bahu. Dorong ke atas dalam rentang nyaman, lalu turunkan perlahan.",
    mistake: "Melengkungkan pinggang atau mengangkat beban dengan hentakan.",
    safety: "Pilih beban ringan yang bisa dikontrol. Hentikan bila gerakan menimbulkan nyeri.",
    image: "shoulder", weighted: true, kind: "reps",
  },
  "unloaded-press": {
    name: "Shoulder press tanpa beban", focus: "Bahu dan trisep",
    cue: "Mulai dari siku tertekuk setinggi bahu. Dorong tangan ke atas dalam rentang nyaman, lalu kembali perlahan.",
    mistake: "Melengkungkan pinggang untuk menambah jangkauan.",
    safety: "Gunakan rentang yang bebas nyeri.",
    image: "shoulder", weighted: false, kind: "reps",
  },
  "reverse-lunge": {
    name: "Reverse lunge", focus: "Paha depan, bokong, dan keseimbangan",
    cue: "Langkahkan satu kaki ke belakang, turunkan tubuh dengan terkendali, lalu dorong kaki depan untuk kembali berdiri.",
    mistake: "Kaki depan kehilangan tumpuan atau badan oleng.",
    safety: "Mulai tanpa beban bila perlu. Catat repetisi yang selesai di kedua sisi.",
    image: "lunge", weighted: true, kind: "reps", unilateral: true,
  },
  "supported-lunge": {
    name: "Reverse lunge dengan pegangan", focus: "Paha depan dan bokong",
    cue: "Pegang penopang stabil. Langkahkan satu kaki ke belakang, turunkan sedikit, lalu kembali berdiri.",
    mistake: "Memaksa kedalaman saat keseimbangan belum stabil.",
    safety: "Gunakan rentang pendek dan pegangan kokoh.",
    image: "lunge", weighted: false, kind: "reps", unilateral: true,
  },
  "biceps-curl": {
    name: "Dumbbell biceps curl", focus: "Bisep",
    cue: "Jaga siku dekat tubuh. Tekuk siku untuk mengangkat dumbbell, kemudian turunkan perlahan tanpa mengayun badan.",
    mistake: "Menggunakan ayunan pinggul atau bahu.",
    safety: "Kurangi beban jika repetisi mulai membutuhkan ayunan.",
    image: "curl", weighted: true, kind: "reps",
  },
  "unloaded-curl": {
    name: "Biceps curl tanpa beban", focus: "Pola gerak siku",
    cue: "Jaga siku dekat tubuh. Tekuk dan luruskan siku perlahan sambil menjaga lengan atas stabil.",
    mistake: "Membawa siku jauh ke depan.",
    safety: "Gerak perlahan dalam rentang nyaman.",
    image: "curl", weighted: false, kind: "reps",
  },
} satisfies Record<string, Exercise>;

export type ExerciseId = keyof typeof EXERCISES;
export function exerciseFor(id: ExerciseId): Exercise {
  return EXERCISES[id];
}
export function isExerciseId(id: string): id is ExerciseId {
  return Object.hasOwn(EXERCISES, id);
}

const ROUTINES = {
  A: [
    ["goblet-squat", "chair-squat"], ["floor-press", "wall-pushup"],
    ["dumbbell-row", "supported-row"], ["plank", "elevated-plank"],
  ],
  B: [
    ["romanian-deadlift", "hip-hinge"], ["shoulder-press", "unloaded-press"],
    ["reverse-lunge", "supported-lunge"], ["biceps-curl", "unloaded-curl"],
  ],
} as const satisfies Record<Routine, readonly (readonly ExerciseId[])[]>;

export const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const DEFAULT_WORKOUT_DAYS = [1, 4, 6];

export function workoutExercises(routine: Routine, dumbbells: boolean): ExerciseId[] {
  return ROUTINES[routine].map(pair => pair[dumbbells ? 0 : 1]);
}
export function exerciseOptions(routine: Routine, slot: number): readonly ExerciseId[] {
  return ROUTINES[routine][slot - 1] ?? [];
}
export function dayDistance(start: string, end: string) {
  return Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end)).days;
}
export function programWeek(start: string, date: string): number | null {
  const week = Math.floor(dayDistance(start, date) / 7) + 1;
  return week >= 1 && week <= 12 ? week : null;
}
export function trainingWeek(start: string, week: number, weekdays: number[]) {
  const first = dayOffset(start, (week - 1) * 7);
  const days = Array.from({ length: 7 }, (_, i) => dayOffset(first, i))
    .filter(date => weekdays.includes(Temporal.PlainDate.from(date).dayOfWeek))
    .slice(0, week <= 2 ? 2 : 3);
  return {
    first, last: dayOffset(first, 6), days,
    sets: week >= 5 ? 3 : 2,
    walk: week <= 2 ? "15–20 menit · 3 kali/minggu" : week <= 4 ? "20–25 menit"
      : week <= 8 ? "25–35 menit" : "30–40 menit · 4–5 kali/minggu",
  };
}
export function nextRoutine(last?: Routine): Routine {
  return last === "A" ? "B" : "A";
}
