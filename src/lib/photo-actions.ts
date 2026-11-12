"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import type { FormState } from "./actions";
import { localNow } from "./dates";
import { isPhotoName, PHOTO_BUCKET } from "./progress-photos";
import { requireProfile } from "./supabase/server";
import { date } from "./validation";

const MAX_UPLOAD = 3 * 1024 * 1024;
export async function uploadProgressPhoto(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId, profile } = await requireProfile();
  const parsed = z.object({ date, id: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.date > localNow(profile.timezone).date) {
    return { error: "Pilih tanggal hari ini atau sebelumnya." };
  }
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size || file.size > MAX_UPLOAD) {
    return { error: "Pilih foto JPG, PNG, atau WebP maksimal 3 MB." };
  }
  let image: Buffer;
  try {
    const decoded = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 32_000_000 });
    const { format, pages } = await decoded.metadata();
    if (!["jpeg", "png", "webp"].includes(format ?? "") || (pages ?? 1) > 1) {
      return { error: "Pilih gambar JPG, PNG, atau WebP yang tidak bergerak." };
    }
    image = await decoded.rotate().resize(1440, 1440, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return { error: "Gambar tidak bisa dibaca. Coba foto lain atau gunakan ukuran lebih kecil." };
  }
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(
    userId + "/" + parsed.data.date + "_" + parsed.data.id + ".jpg", image,
    { contentType: "image/jpeg", upsert: false, cacheControl: "0" },
  );
  if (error && !("statusCode" in error && String(error.statusCode) === "409")) {
    return { error: "Foto belum tersimpan. Coba lagi." };
  }
  revalidatePath("/progres");
  redirect("/progres?status=foto-tersimpan#foto");
}

export async function deleteProgressPhoto(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const file = form.get("file");
  if (typeof file !== "string" || !isPhotoName(file)) return { error: "Foto tidak valid." };
  const { error } = await client.storage.from(PHOTO_BUCKET).remove([userId + "/" + file]);
  if (error) return { error: "Foto belum terhapus. Coba lagi." };
  revalidatePath("/progres");
  redirect("/progres?status=foto-dihapus#foto");
}
