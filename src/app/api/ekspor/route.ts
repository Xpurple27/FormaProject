import { getProfile, getSession } from "@/lib/supabase/server";
import { allRows } from "@/lib/data";
import type { Entry, Food, Target } from "@/lib/types";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await getSession();
  if (!session) return Response.json({ error: "Masuk untuk mengunduh data." }, { status: 401, headers });
  const { client, userId } = session;
  try {
    const [profile, targets, customFoods, entries] = await Promise.all([
      getProfile(),
      allRows<Target>((start, end) => client.from("nutrition_targets").select("*")
        .eq("user_id", userId).order("effective_from").range(start, end)),
      allRows<Food>((start, end) => client.from("foods").select("*").eq("user_id", userId).order("id").range(start, end)),
      allRows<Entry>((start, end) => client.from("food_entries").select("*").eq("user_id", userId)
        .order("consumed_at").order("id").range(start, end)),
    ]);
    return Response.json({ version: 1, exportedAt: new Date().toISOString(), profile, targets, customFoods, entries }, {
      headers: { ...headers, "Content-Disposition": 'attachment; filename="forma-ekspor.json"' },
    });
  } catch {
    return Response.json({ error: "Data belum bisa diekspor. Coba lagi." }, { status: 503, headers });
  }
}
