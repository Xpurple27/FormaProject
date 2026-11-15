import { fmt } from "./nutrition";
import type { WorkoutSession, WorkoutSet } from "./types";
import { exerciseFor, type ExerciseId } from "./workout";

export function lastWorkoutByExercise(history: WorkoutSession[], records: WorkoutSet[], exercises: ExerciseId[]) {
  const previous: Partial<Record<ExerciseId, WorkoutSet[]>> = {};
  const bySession = new Map<string, WorkoutSet[]>();
  for (const record of records) {
    const sets = bySession.get(record.session_id);
    if (sets) sets.push(record);
    else bySession.set(record.session_id, [record]);
  }
  for (const session of history) {
    const sets = bySession.get(session.id);
    if (!sets) continue;
    for (const exercise of exercises) {
      if (previous[exercise]) continue;
      const matching = sets.filter(set => set.exercise_id === exercise).sort((a, b) => a.set_number - b.set_number);
      if (matching.length) previous[exercise] = matching;
    }
  }
  return previous;
}

export function nextWorkoutSet(records: WorkoutSet[], count: number) {
  return Array.from({ length: count }, (_, index) => index + 1).find(set => !records.some(record => record.set_number === set));
}

export function workoutSetLabel(set: WorkoutSet) {
  const exercise = exerciseFor(set.exercise_id);
  const amount = set.amount + (exercise.kind === "hold" ? " dtk" : exercise.unilateral ? " rep/sisi" : " rep");
  return set.load_kg === null ? amount : fmt(set.load_kg, 2) + " kg/alat × " + amount;
}
