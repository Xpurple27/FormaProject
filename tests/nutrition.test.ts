import { describe, expect, it } from "vitest";
import { dayOffset, localNow, toInstant, validDate } from "../src/lib/dates";
import { bodyMassIndex, energyEstimate, recommendNutrition, remainingCarbs, scaleNutrition, servingGrams, sumEntries } from "../src/lib/nutrition";
import { customFood, newEntry, targets } from "../src/lib/validation";
import type { Entry } from "../src/lib/types";

describe("nutrition", () => {
  it("scales the catalog rice to 200 g", () => {
    expect(scaleNutrition({ calories: 130, protein_g: 2.69, carbs_g: 28.17, fat_g: .28 }, 200))
      .toEqual({ calories: 260, protein_g: 5.38, carbs_g: 56.34, fat_g: .56 });
  });
  it("keeps subgram precision when converting servings", () => {
    expect(servingGrams(1.25, 33.33)).toBe(41.66);
    expect(servingGrams(1.5, 50)).toBe(75);
  });
  it("sums saved snapshots and handles empty days", () => {
    const row = { calories_snapshot: 33.95, protein_snapshot: 2.41, carbs_snapshot: 4.4, fat_snapshot: .8 } as Entry;
    expect(sumEntries([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(sumEntries([row, row])).toEqual({ calories: 67.9, protein_g: 4.82, carbs_g: 8.8, fat_g: 1.6 });
  });
  it("keeps the calorie target and all macros consistent", () => {
    expect(remainingCarbs(2100, 120, 70)).toBe(247.5);
    expect(remainingCarbs(5.2, .4, .4)).toBe(0);
    expect(remainingCarbs(500, 120, 70)).toBeLessThan(0);
  });
  it("estimates balanced targets using activity and goal as well as body measurements", () => {
    const body = { weight: 75, height: 170, age: 30, sex: "male", activity: "light", goal: "recomposition" } as const;
    expect(bodyMassIndex(body.weight, body.height)).toBeCloseTo(25.95, 2);
    expect(recommendNutrition(body)).toEqual({ calories: 2060, protein_g: 129, fat_g: 69, carbs_g: 230.75 });
    expect(recommendNutrition({ ...body, activity: "moderate" })?.calories).toBeGreaterThan(2060);
    expect(recommendNutrition({ ...body, goal: "maintain" })?.calories).toBe(2290);
    expect(recommendNutrition({ ...body, weight: 50, activity: "moderate" }))
      .toEqual(recommendNutrition({ ...body, weight: 50, activity: "moderate", goal: "maintain" }));
    expect(recommendNutrition({ ...body, weight: 25, age: 90, height: 100 })).toBeNull();
  });
  it("reproduces the handoff energy estimate", () => {
    const { bmr, tdee } = energyEstimate(90, 165, 27, "male", "light");
    expect(bmr).toBe(1801.25);
    expect(tdee).toBeCloseTo(2476.71875, 4);
    expect(energyEstimate(90, 165, 27, "female", "light").bmr).toBe(1635.25);
  });
});
describe("civil dates", () => {
  it("handles WIB midnight independently from UTC", () => {
    const instant = new Date("2026-11-12T17:01:00Z");
    expect(localNow("Asia/Jakarta", instant)).toEqual({ date: "2026-11-13", time: "00:01" });
    expect(toInstant("2026-11-13", "00:01", "Asia/Jakarta")).toBe("2026-11-12T17:01:00Z");
    expect(dayOffset("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("rejects invalid, ambiguous or nonexistent local times", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("1899-01-01")).toBe(false);
    expect(() => toInstant("2026-11-01", "01:30", "America/New_York")).toThrow();
    expect(() => toInstant("2026-03-08", "02:30", "America/New_York")).toThrow();
  });
});
describe("input validation", () => {
  it("rejects missing, oversized and malformed food quantity", () => {
    const fields = { id: crypto.randomUUID(), food: crypto.randomUUID(), date: "2026-11-12", time: "11:00", meal: "lunch", unit: "gram" };
    for (const quantity of ["", "0", "-1", "3001", "1.001", "2e1"]) {
      expect(newEntry.safeParse({ ...fields, quantity }).success).toBe(false);
    }
    expect(newEntry.parse({ ...fields, quantity: "1,5" }).quantity).toBe(1.5);
  });
  it("requires explicit zeroes and validates target coherence", () => {
    expect(targets.safeParse({ calories: "2100", protein: "", fat: "70" }).success).toBe(false);
    expect(targets.safeParse({ calories: "100", protein: "120", fat: "70" }).success).toBe(false);
    expect(targets.safeParse({ calories: "2100", protein: "0", fat: "70" }).success).toBe(true);
  });
  it("requires both parts of a serving definition", () => {
    const fields = { id: crypto.randomUUID(), name: "Roti", preparation: "Panggang", category: "lainnya", calories: "15", protein: "0", carbs: "1", fat: "1", source: "" };
    expect(customFood.safeParse({ ...fields, servingLabel: "iris", serving: "" }).success).toBe(false);
    expect(customFood.safeParse({ ...fields, servingLabel: "iris", serving: "25" }).success).toBe(true);
    expect(customFood.safeParse({ ...fields, protein: "100", servingLabel: "", serving: "" }).success).toBe(false);
  });
});
