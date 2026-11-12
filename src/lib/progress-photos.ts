import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { validDate } from "./dates";

export const PHOTO_BUCKET = "progress-photos";
export function isPhotoName(name: string) {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/.test(name)
    && validDate(name.slice(0, 10));
}
export async function progressPhotos(client: SupabaseClient<Database>, userId: string) {
  const bucket = client.storage.from(PHOTO_BUCKET);
  const limit = 100;
  const photos: { name: string; date: string }[] = [];
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await bucket.list(userId, { limit, offset, sortBy: { column: "name", order: "desc" } });
    if (error) return { photos: [], available: false };
    for (const item of data) if (item.id && isPhotoName(item.name)) photos.push({ name: item.name, date: item.name.slice(0, 10) });
    if (data.length < limit) return { photos, available: true };
  }
}
