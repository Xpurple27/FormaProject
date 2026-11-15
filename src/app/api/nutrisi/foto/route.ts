import sharp from "sharp";
import { getCatalog } from "@/lib/data";
import { MAX_MEAL_PHOTO_BYTES, MEAL_PHOTO_EDGE } from "@/lib/meal-photo";
import { mealPhotoKey, recognizeMeal } from "@/lib/meal-photo-server";
import { getSession } from "@/lib/supabase/server";

export const runtime = "nodejs";

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function readPhoto(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > MAX_MEAL_PHOTO_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (request.headers.get("origin") !== origin) return json({ error: "Akses foto ini ditolak." }, 403);
  const session = await getSession();
  if (!session) return json({ error: "Masuk untuk menganalisis foto." }, 401);
  const key = mealPhotoKey(session.email);
  if (!key) return json({ error: "Analisis foto belum tersedia untuk akun ini." }, 403);

  if (request.headers.get("content-type") !== "image/jpeg" || !request.body) {
    return json({ error: "Pilih foto makanan yang bisa dibuka." }, 415);
  }
  let photo: Buffer;
  try {
    const bytes = await readPhoto(request.body);
    if (!bytes) return json({ error: "Pilih foto dengan ukuran yang lebih kecil." }, 413);
    const image = sharp(bytes, { limitInputPixels: MEAL_PHOTO_EDGE ** 2 });
    if ((await image.metadata()).format !== "jpeg") return json({ error: "Pilih file foto yang valid." }, 415);
    photo = await image.rotate().resize(MEAL_PHOTO_EDGE, MEAL_PHOTO_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 }).toBuffer();
  } catch {
    return json({ error: "Foto belum bisa dibuka. Coba pilih foto lain." }, 422);
  }

  try {
    const result = await recognizeMeal(photo, await getCatalog(session.client), key, request.signal);
    if (!result) return json({ error: "Kuota foto gratis sedang terbatas. Coba nanti atau susun menu manual." }, 429);
    return json(result);
  } catch {
    return json({ error: "Analisis foto sedang tidak tersedia. Kamu bisa susun menu manual." }, 503);
  }
}
