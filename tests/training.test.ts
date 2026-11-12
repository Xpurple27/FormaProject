import { describe, expect, it } from "vitest";
import { average, bestSet, chartPoints, measuredSeries, milestoneProgress } from "../src/lib/progress";
import { nextRoutine, programWeek, trainingWeek, workoutExercises } from "../src/lib/workout";
import type { Measurement, WorkoutSet } from "../src/lib/types";

describe("Workout A/B", () => {
  it("anchors 12 weeks to the program date and caps the first two weeks at two selected days", () => {
    const start = "2026-11-11";
    expect(programWeek(start, "2026-11-10")).toBeNull();
    expect(programWeek(start, "2026-11-11")).toBe(1);
    expect(programWeek(start, "2027-02-02")).toBe(12);
    expect(programWeek(start, "2027-02-03")).toBeNull();
    expect(trainingWeek(start, 1, [1, 4, 6]).days).toEqual(["2026-11-12", "2026-11-14"]);
    expect(trainingWeek(start, 3, [1, 4, 6]).days).toEqual(["2026-11-26", "2026-11-28", "2026-11-30"]);
    expect(trainingWeek(start, 4, [1, 4]).sets).toBe(2);
    expect(trainingWeek(start, 5, [1, 4]).sets).toBe(3);
  });
  it("alternates routines and chooses beginner variants when the profile lacks dumbbells", () => {
    expect(nextRoutine()).toBe("A");
    expect(nextRoutine("A")).toBe("B");
    expect(nextRoutine("B")).toBe("A");
    expect(workoutExercises("A", true)).toContain("goblet-squat");
    expect(workoutExercises("B", false)).toEqual(["hip-hinge", "unloaded-press", "supported-lunge", "unloaded-curl"]);
  });
});

describe("body progress", () => {
  it("omits missing weights and spaces measurements by date", () => {
    const rows = [
      { measured_date: "2026-11-10", weight_kg: 89 },
      { measured_date: "2026-11-03", weight_kg: null, waist_cm: 100 },
      { measured_date: "2026-11-04", weight_kg: 90 },
      { measured_date: "2026-11-01", weight_kg: 91 },
    ] as Measurement[];
    const series = measuredSeries(rows, "weight_kg");
    expect(series.map(point => point.value)).toEqual([91, 90, 89]);
    expect(chartPoints(series, 90, 20)).toEqual([{ x: 0, y: 0 }, { x: 30, y: 10 }, { x: 90, y: 20 }]);
    expect(average(series.map(point => point.value))).toBe(90);
    expect(average([])).toBeNull();
  });
  it("supports gain or loss milestones and keeps progress in range", () => {
    expect(milestoneProgress(90, 87, 84)).toBe(50);
    expect(milestoneProgress(70, 73, 76)).toBe(50);
    expect(milestoneProgress(90, 91, 84)).toBe(0);
    expect(milestoneProgress(90, 80, 84)).toBe(100);
    expect(milestoneProgress(90, 90, 90)).toBeNull();
  });
  it("compares loads before repetitions and can rank bodyweight sets by duration", () => {
    expect(bestSet([{ load_kg: 5, amount: 8 }, { load_kg: 4, amount: 12 }] as WorkoutSet[])?.amount).toBe(8);
    expect(bestSet([{ load_kg: null, amount: 30 }, { load_kg: null, amount: 40 }] as WorkoutSet[])?.amount).toBe(40);
  });
});
