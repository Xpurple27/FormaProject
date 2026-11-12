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
  serving_label: string | null; serving_g: number | null; source: string; source_url: string | null; created_at: string;
};
export type Entry = {
  id: string; user_id: string; food_id: string; consumed_at: string; local_date: string; timezone: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack"; quantity_g: number;
  food_name: string; preparation: string; source: string; source_url: string | null;
  reference_calories: number; reference_protein_g: number; reference_carbs_g: number; reference_fat_g: number;
  calories_snapshot: number; protein_snapshot: number; carbs_snapshot: number; fat_snapshot: number;
  created_at: string; updated_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

type EntryInput = Pick<Entry, "id" | "food_id" | "meal_type" | "quantity_g" | "consumed_at">;
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
      foods: Table<Food, Omit<Food, "user_id" | "created_at" | "source_url">>;
      food_entries: Table<Entry, EntryInput, Partial<Omit<EntryInput, "id" | "food_id">>>;
    };
    Views: Record<never, never>;
    Functions: { complete_onboarding: { Args: OnboardingArgs; Returns: undefined } };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
