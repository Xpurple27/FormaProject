"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORIES, servingGrams } from "./nutrition";
import { localNow, toInstant } from "./dates";
import { findFoods } from "./data";
import { createClient, getSession, requireProfile, requireSession } from "./supabase/server";
import { supabaseConfig } from "./supabase/env";
import * as schemas from "./validation";

export type FormState = { error?: string; message?: string };
const invalid = { error: "Periksa kembali isian formulir." };
const saveError = { error: "Penyimpanan belum terkonfirmasi. Coba lagi." };
const stale = { error: "Catatan sudah berubah atau dihapus. Muat ulang sebelum mencoba lagi." };

export async function authAction(mode: "login" | "signup", _: FormState, form: FormData): Promise<FormState> {
  const input = schemas.credentials.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Masukkan email yang valid dan kata sandi 8–72 byte." };
  if (!supabaseConfig()) return { error: "Koneksi FORMA belum dikonfigurasi." };
  const client = await createClient();
  const { email, password } = input.data;

  if (mode === "login") {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error?.code === "email_not_confirmed") return { error: "Konfirmasi email akun sebelum masuk." };
    if (error?.code === "invalid_credentials") return { error: "Email atau kata sandi belum cocok." };
    if (error) return { error: "Gagal masuk. Coba lagi beberapa saat." };
  } else {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error: "Pendaftaran belum berhasil. Periksa isian dan coba lagi." };
    if (!data.session) return { message: "Cek email untuk tautan konfirmasi. Setelah mengonfirmasi, kamu bisa masuk." };
  }
  redirect("/beranda");
}

export async function signOut(_: FormState, _form: FormData): Promise<FormState> {
  void _form;
  if (!supabaseConfig()) redirect("/masuk");
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return { error: "Belum berhasil keluar. Coba lagi." };
  redirect("/masuk");
}

export async function completeOnboarding(_: FormState, form: FormData): Promise<FormState> {
  const { client } = await requireSession();
  const result = schemas.onboarding.safeParse(Object.fromEntries(form));
  if (!result.success) return { error: "Periksa profil dan pastikan kalori cukup untuk target protein dan lemak." };
  const x = result.data;
  if (x.start > localNow(x.timezone).date) return { error: "Tanggal mulai maksimal hari ini." };
  const { error } = await client.rpc("complete_onboarding", {
    p_name: x.name, p_age: x.age, p_sex: x.sex, p_height: x.height,
    p_weight: x.weight, p_milestone: x.milestone, p_activity: x.activity, p_goal: x.goal,
    p_equipment: x.equipment, p_timezone: x.timezone, p_start: x.start,
    p_calories: x.calories, p_protein: x.protein, p_fat: x.fat,
  });
  if (error) return saveError;
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function updateTargets(_: FormState, form: FormData): Promise<FormState> {
  const { client, profile, userId } = await requireProfile();
  const result = schemas.targets.safeParse(Object.fromEntries(form));
  if (!result.success) return { error: "Periksa target. Kalori harus cukup untuk jumlah protein dan lemak." };
  const x = result.data;
  const { error } = await client.from("nutrition_targets").upsert({
    user_id: userId, effective_from: localNow(profile.timezone).date, calories: x.calories,
    protein_g: x.protein, fat_g: x.fat, updated_at: new Date().toISOString(),
  });
  if (error) return saveError;
  revalidatePath("/profil");
  revalidatePath("/beranda");
  revalidatePath("/nutrisi");
  redirect("/profil?target=tersimpan");
}

const searchSchema = z.object({
  query: z.string().trim().max(100),
  category: z.string().refine(value => !value || Object.hasOwn(CATEGORIES, value)),
});
export async function searchFoods(query: string, category: string) {
  const parsed = searchSchema.safeParse({ query, category });
  const session = await getSession();
  if (!session || !parsed.success) return { error: "Pencarian tidak dapat diproses." };
  try {
    return { foods: await findFoods(session.client, parsed.data.query, parsed.data.category) };
  } catch {
    return { error: "Katalog belum bisa dimuat. Coba lagi." };
  }
}

function refreshDiary() {
  revalidatePath("/nutrisi");
  revalidatePath("/beranda");
}

function entryTime(date: string, time: string, timezone: string) {
  if (date > localNow(timezone).date) return null;
  try {
    return toInstant(date, time, timezone);
  } catch {
    return null;
  }
}

export async function addEntry(_: FormState, form: FormData): Promise<FormState> {
  const { client, profile, userId } = await requireProfile();
  const result = schemas.newEntry.safeParse(Object.fromEntries(form));
  if (!result.success) return invalid;
  const x = result.data;
  const instant = entryTime(x.date, x.time, profile.timezone);
  if (!instant) return { error: "Tanggal atau jam tidak valid untuk zona waktu profil." };
  const { data: food, error: foodError } = await client.from("foods").select("serving_g").eq("id", x.food).maybeSingle();
  if (foodError) return saveError;
  if (!food || (x.unit === "serving" && !food.serving_g)) return { error: "Makanan atau satuan porsi tidak tersedia." };
  const grams = servingGrams(x.quantity, x.unit === "serving" ? food.serving_g! : 1);
  if (grams < 0.01 || grams > 3000) return { error: "Berat makanan harus antara 0,01 dan 3.000 gram." };
  const { error } = await client.from("food_entries").insert({
    id: x.id, food_id: x.food, meal_type: x.meal, quantity_g: grams, consumed_at: instant,
  });
  if (error) {
    if (error.code !== "23505") return saveError;
    const { data } = await client.from("food_entries").select("id, local_date")
      .eq("id", x.id).eq("user_id", userId).maybeSingle();
    if (!data) return saveError;
    refreshDiary();
    redirect("/nutrisi?tanggal=" + data.local_date + "&status=ditambah#jurnal");
  }
  refreshDiary();
  redirect("/nutrisi?tanggal=" + x.date + "&status=ditambah#jurnal");
}

export async function changeEntry(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const result = schemas.editEntry.safeParse(Object.fromEntries(form));
  if (!result.success) return invalid;
  const x = result.data;
  const record = await client.from("food_entries").select("timezone").eq("id", x.id).eq("user_id", userId).maybeSingle();
  if (record.error) return saveError;
  if (!record.data) return stale;
  const instant = entryTime(x.date, x.time, record.data.timezone);
  if (!instant) return { error: "Tanggal atau jam tidak valid untuk zona waktu catatan." };
  const { data, error } = await client.from("food_entries")
    .update({ meal_type: x.meal, quantity_g: x.quantity, consumed_at: instant })
    .eq("id", x.id).eq("user_id", userId).eq("updated_at", x.version).select("id").maybeSingle();
  if (error) return saveError;
  if (!data) return stale;
  refreshDiary();
  redirect("/nutrisi?tanggal=" + x.date + "&status=diubah#jurnal");
}

export async function removeEntry(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const result = schemas.deleteEntry.safeParse(Object.fromEntries(form));
  if (!result.success) return invalid;
  const x = result.data;
  const { data, error } = await client.from("food_entries").delete()
    .eq("id", x.id).eq("user_id", userId).eq("updated_at", x.version).select("id").maybeSingle();
  if (error) return saveError;
  if (!data) return stale;
  refreshDiary();
  redirect("/nutrisi?tanggal=" + x.date + "&status=dihapus#jurnal");
}

export async function saveFood(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const payload = Object.fromEntries(form);
  const result = schemas.customFood.safeParse(payload);
  const day = schemas.date.safeParse(payload.diaryDate);
  if (!result.success || !day.success) {
    return { error: "Periksa angka per 100 g. Total makro maksimal 100 g. Isi nama dan berat porsi bersama, atau kosongkan keduanya." };
  }
  const x = result.data;
  const { error } = await client.from("foods").insert({
    id: x.id, name: x.name, category: x.category, preparation: x.preparation, serving_label: x.servingLabel || null,
    serving_g: x.serving, calories: x.calories, protein_g: x.protein, carbs_g: x.carbs, fat_g: x.fat,
    source: x.source || "Estimasi pribadi",
  });
  if (error) {
    if (error.code !== "23505") return saveError;
    const { data } = await client.from("foods").select("id").eq("id", x.id).eq("user_id", userId).maybeSingle();
    if (!data) return saveError;
  }
  revalidatePath("/nutrisi");
  redirect("/nutrisi?tanggal=" + day.data + "&catat=" + x.id + "&status=makanan#catat");
}
