import type { Reminder } from "./reminders";
import type { ExerciseId, Routine } from "./workout";

export type Nutrients = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export type Profile = {
  user_id: string; name: string; age_years: number; sex_for_bmr: "male" | "female";
  height_cm: number; initial_weight_kg: number; milestone_kg: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "recomposition" | "maintain" | "gain" | "track";
  equipment: "dumbbells" | "none" | "other"; timezone: string; start_date: string; created_at: string;
};
export type Target = Nutrients & { user_id: string; effective_from: string; updated_at: string };
export type Food = Nutrients & {
  id: string; user_id: string | null; name: string; category: string; preparation: string;
  serving_label: string | null; serving_g: number | null; portion_note: string | null; source: string; source_url: string | null; created_at: string;
};
export type Entry = {
  id: string; user_id: string; food_id: string; consumed_at: string; local_date: string; timezone: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack"; quantity_g: number;
  meal_batch_id: string | null; meal_batch_name: string | null; meal_batch_position: number | null;
  food_name: string; preparation: string; source: string; source_url: string | null;
  reference_serving_g: number | null; reference_serving_label: string | null;
  reference_calories: number; reference_protein_g: number; reference_carbs_g: number; reference_fat_g: number;
  calories_snapshot: number; protein_snapshot: number; carbs_snapshot: number; fat_snapshot: number;
  created_at: string; updated_at: string;
};

export type WorkoutPreference = { user_id: string; weekdays: number[] };
export type WorkoutSession = {
  id: string; user_id: string; routine: Routine; program_week: number | null; local_date: string;
  exercise_ids: ExerciseId[]; skipped_slots: number[]; prescribed_sets: number;
  status: "active" | "paused" | "completed" | "cancelled";
  completed_set_count: number | null;
  started_at: string; active_since: string | null; finished_at: string | null; elapsed_seconds: number;
};
export type WorkoutSet = {
  user_id: string; session_id: string; slot: number; set_number: number; exercise_id: ExerciseId;
  amount: number; load_kg: number | null; recorded_at: string;
};
export type Measurement = {
  user_id: string; measured_date: string; weight_kg: number | null; waist_cm: number | null; notes: string; updated_at: string;
};
type WorkoutStart = Pick<WorkoutSession, "id" | "routine" | "program_week" | "local_date" | "exercise_ids" | "prescribed_sets">;
type WorkoutSetInput = Omit<WorkoutSet, "recorded_at">;
type MeasurementInput = Omit<Measurement, "updated_at">;

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

type EntryInput = Pick<Entry, "id" | "food_id" | "meal_type" | "quantity_g" | "consumed_at">
  & Partial<Pick<Entry, "meal_batch_id" | "meal_batch_name" | "meal_batch_position">>;
type OnboardingArgs = {
  p_name: string; p_age: number; p_sex: string; p_height: number; p_weight: number;
  p_milestone: number | null; p_activity: string; p_goal: string; p_equipment: string;
  p_timezone: string; p_start: string; p_calories: number; p_protein: number; p_fat: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Omit<Profile, "created_at" | "user_id">>;
      nutrition_targets: Table<Target, Omit<Target, "carbs_g">>;
      foods: Table<Food, Omit<Food, "user_id" | "created_at" | "source_url" | "portion_note">>;
      food_entries: Table<Entry, EntryInput, Partial<Omit<EntryInput, "id" | "food_id">>>;
      workout_preferences: Table<WorkoutPreference, WorkoutPreference>;
      workout_sessions: Table<WorkoutSession, WorkoutStart>;
      workout_sets: Table<WorkoutSet, WorkoutSetInput>;
      reminders: Table<Reminder, Pick<Reminder, "id" | "kind" | "local_time" | "weekdays" | "enabled">,
        Partial<Omit<Reminder, "id" | "user_id">>>;
      body_measurements: Table<Measurement, MeasurementInput>;
    };
    Views: Record<never, never>;
    Functions: {
      complete_onboarding: { Args: OnboardingArgs; Returns: undefined };
      change_workout: { Args: { p_id: string; p_action: string; p_slot?: number; p_exercise?: string }; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
