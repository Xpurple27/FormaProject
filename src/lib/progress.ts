import { dayDistance } from "./workout";
import type { Measurement, WorkoutSet } from "./types";

type MeasureKey = "weight_kg" | "waist_cm";
export function measuredSeries(rows: Measurement[], key: MeasureKey) {
  return rows.flatMap(row => row[key] === null ? [] : [{ date: row.measured_date, value: row[key] }])
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}
export function milestoneProgress(initial: number, latest: number, milestone: number) {
  const distance = milestone - initial;
  return distance === 0 ? null : Math.min(100, Math.max(0, (latest - initial) / distance * 100));
}

export function chartPoints(series: ReturnType<typeof measuredSeries>, width: number, height: number) {
  const first = series[0];
  const last = series.at(-1);
  if (!first || !last) return [];
  const values = series.map(point => point.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const duration = dayDistance(first.date, last.date);
  return series.map(point => ({
    x: duration ? dayDistance(first.date, point.date) / duration * width : width / 2,
    y: hi === lo ? height / 2 : height - (point.value - lo) / (hi - lo) * height,
  }));
}

export function bestSet(sets: WorkoutSet[]) {
  return sets.reduce<WorkoutSet | null>((best, current) => {
    if (!best) return current;
    const load = (current.load_kg ?? 0) - (best.load_kg ?? 0);
    return load > 0 || (load === 0 && current.amount > best.amount) ? current : best;
  }, null);
}
