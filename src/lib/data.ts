import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Entry, Food, Target } from "./types";

type Client = SupabaseClient<Database>;
const PAGE_SIZE = 250;

export async function allRows<T>(fetch: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await fetch(start, start + PAGE_SIZE - 1);
    if (error || !data) throw new Error("Could not load FORMA records");
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function dailyNutrition(client: Client, userId: string, day: string) {
  const [entries, target] = await Promise.all([
    allRows<Entry>((start, end) => client.from("food_entries").select("*")
      .eq("user_id", userId).eq("local_date", day).order("consumed_at").order("id").range(start, end)),
    getTarget(client, userId, day),
  ]);
  return { entries, target };
}

export async function getTarget(client: Client, userId: string, day: string): Promise<Target | null> {
  const { data, error } = await client.from("nutrition_targets").select("*").eq("user_id", userId)
    .lte("effective_from", day).order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Could not load FORMA nutrition target");
  return data;
}

export function getCatalog(client: Client) {
  return allRows<Food>((start, end) => client.from("foods").select("*").neq("catalog_group", "archive")
    .order("name").order("id").range(start, end));
}

export async function recentFoods(client: Client, userId: string, catalog: Promise<Food[]>) {
  const { data, error } = await client.from("food_entries").select("food_id").eq("user_id", userId)
    .order("consumed_at", { ascending: false }).order("id", { ascending: false }).limit(100);
  if (error) throw new Error("Could not load recently logged foods");
  const counts = new Map<string, number>();
  for (const { food_id } of data) counts.set(food_id, (counts.get(food_id) ?? 0) + 1);
  const byId = new Map((await catalog).map(food => [food.id, food]));
  const ids = [...counts.keys()].filter(id => byId.has(id)).sort((a, b) => counts.get(b)! - counts.get(a)!).slice(0, 5);
  return ids.map(id => byId.get(id)!);
}
