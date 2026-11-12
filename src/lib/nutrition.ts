import type { Entry, Nutrients, Profile } from "./types";

export const MEALS = {
  breakfast: "Sarapan", lunch: "Makan siang", dinner: "Makan malam", snack: "Camilan",
} as const;
export const CATEGORIES = {
  karbohidrat: "Sumber karbohidrat", lauk: "Lauk", buah: "Buah",
  sayuran: "Sayuran", minuman: "Minuman", lainnya: "Lainnya",
} as const;
export const ACTIVITIES = {
  sedentary: { label: "Minim aktivitas", factor: 1.2 },
  light: { label: "Ringan", factor: 1.375 },
  moderate: { label: "Sedang", factor: 1.55 },
  active: { label: "Aktif", factor: 1.725 },
  very_active: { label: "Sangat aktif", factor: 1.9 },
} as const;
export const GOALS = {
  recomposition: "Rekomposisi tubuh", maintain: "Menjaga berat badan",
  gain: "Menambah berat badan", track: "Mencatat kebiasaan makan",
} as const;
export const EQUIPMENT = { dumbbells: "Dumbbell", none: "Tanpa alat", other: "Peralatan lain" } as const;

export const fmt = (value: number, digits = 1) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);

export function servingGrams(quantity: number, gramsPerUnit: number) {
  const product = Math.round(quantity * 100) * Math.round(gramsPerUnit * 100);
  return Math.round(product / 100) / 100;
}

export function scaleNutrition(reference: Nutrients, grams: number): Nutrients {
  return {
    calories: reference.calories * grams / 100, protein_g: reference.protein_g * grams / 100,
    carbs_g: reference.carbs_g * grams / 100, fat_g: reference.fat_g * grams / 100,
  };
}

export function sumEntries(entries: Entry[]): Nutrients {
  return entries.reduce((total, entry) => ({
    calories: total.calories + entry.calories_snapshot, protein_g: total.protein_g + entry.protein_snapshot,
    carbs_g: total.carbs_g + entry.carbs_snapshot, fat_g: total.fat_g + entry.fat_snapshot,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

export function remainingCarbs(calories: number, protein: number, fat: number) {
  return (Math.round(calories * 10) - 4 * Math.round(protein * 10) - 9 * Math.round(fat * 10)) / 40;
}

export function energyEstimate(weight: number, height: number, age: number,
  sex: Profile["sex_for_bmr"], activity: Profile["activity_level"]) {
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
  return { bmr, tdee: bmr * ACTIVITIES[activity].factor };
}
