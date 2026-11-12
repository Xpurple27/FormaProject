import { z } from "zod";
import { validDate } from "./dates";
import { remainingCarbs } from "./nutrition";

export const date = z.string().refine(validDate);
const number = (min: number, max: number, digits: number) => z.string().trim()
  .regex(new RegExp("^\\d+(?:[.,]\\d{1," + digits + "})?$"))
  .transform(value => Number(value.replace(",", ".")))
  .pipe(z.number().min(min).max(max));
const string = (max: number) => z.string().trim().min(1).max(max);

export const credentials = z.object({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(72).refine(value => new TextEncoder().encode(value).length <= 72),
});

const targetFields = {
  calories: number(1, 15000, 1),
  protein: number(0, 1500, 1),
  fat: number(0, 1000, 1),
};
const validTarget = (input: { calories: number; protein: number; fat: number }) =>
  remainingCarbs(input.calories, input.protein, input.fat) >= 0;

export const targets = z.object(targetFields).refine(validTarget);
export const onboarding = z.object({
  targetMode: z.enum(["auto", "manual"]), name: string(60), age: number(18, 100, 1).pipe(z.number().int()),
  sex: z.enum(["male", "female"]), height: number(100, 250, 1), weight: number(25, 350, 1),
  milestone: z.union([z.literal("").transform(() => null), number(25, 350, 1)]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["recomposition", "maintain", "gain", "track"]),
  equipment: z.enum(["dumbbells", "none", "other"]),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]), start: date,
});

export const entryFields = {
  id: z.uuid(), date, time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantity: number(0.01, 3000, 2),
};
export const newEntry = z.object({ ...entryFields, food: z.uuid(), unit: z.enum(["gram", "serving"]) });
export const version = z.iso.datetime({ offset: true });
export const editEntry = z.object({ ...entryFields, version });
export const deleteEntry = z.object({ id: z.uuid(), date, version });

export const customFood = z.object({
  id: z.uuid(), name: string(100), preparation: string(60),
  category: z.enum(["karbohidrat", "lauk", "buah", "sayuran", "minuman", "lainnya"]),
  servingLabel: z.string().trim().max(60), serving: z.union([z.literal("").transform(() => null), number(0.01, 3000, 2)]),
  calories: number(0, 950, 2), protein: number(0, 100, 2),
  carbs: number(0, 100, 2), fat: number(0, 100, 2),
  source: z.string().trim().max(140),
}).refine(input => Boolean(input.servingLabel) === (input.serving !== null))
  .refine(input => Math.round(input.protein * 100) + Math.round(input.carbs * 100) + Math.round(input.fat * 100) <= 10000);
