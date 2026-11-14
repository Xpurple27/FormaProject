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
export const profileFields = z.object({
  name: string(60), age: number(18, 100, 1).pipe(z.number().int()),
  sex: z.enum(["male", "female"]), height: number(100, 250, 1), weight: number(25, 350, 1),
  milestone: z.union([z.literal("").transform(() => null), number(25, 350, 1)]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["recomposition", "maintain", "gain", "track"]),
  equipment: z.enum(["dumbbells", "none", "other"]),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
});

export const onboarding = profileFields.extend({ targetMode: z.enum(["auto", "manual"]), start: date });

export const entryFields = {
  id: z.uuid(), date, time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantity: number(0.01, 3000, 2),
};
export const newEntry = z.object({ ...entryFields, food: z.uuid(), unit: z.enum(["gram", "serving"]) });
export const MAX_MEAL_ITEMS = 20;
export const mealItems = z.array(z.object({
  id: entryFields.id,
  food: z.uuid(),
  quantity: entryFields.quantity,
  unit: z.enum(["gram", "serving"]),
})).min(1).max(MAX_MEAL_ITEMS).refine(items => new Set(items.map(item => item.id)).size === items.length);
export const mealBatch = z.object({
  id: entryFields.id,
  date,
  time: entryFields.time,
  meal: entryFields.meal,
  name: z.string().trim().max(80),
});
export const version = z.iso.datetime({ offset: true });
export const editEntry = z.object({ ...entryFields, version, unit: z.enum(["gram", "serving"]).default("gram") });
export const deleteEntry = z.object({ id: z.uuid(), date, version });

const optionalNumber = (max: number) => z.union([z.literal("").transform(() => null), number(0, max, 2)]);
export const quickSnack = z.object({
  ...entryFields, name: string(100), weight: z.union([z.literal("").transform(() => null), number(.01, 3000, 2)]),
  calories: optionalNumber(9500), protein: optionalNumber(3000), carbs: optionalNumber(3000), fat: optionalNumber(3000),
}).refine(input => {
  const weight = input.weight ?? 100;
  return input.quantity * weight <= 3000 && (input.calories ?? 0) * 100 <= 950 * weight
    && [input.protein, input.carbs, input.fat].reduce<number>((sum, n) => sum + (n ?? 0), 0) <= weight;
});
export const MAX_DELETE_ENTRIES = 150;
export const diarySelection = z.array(z.object({ id: z.uuid(), version }))
  .min(1).max(MAX_DELETE_ENTRIES).refine(items => new Set(items.map(item => item.id)).size === items.length);
