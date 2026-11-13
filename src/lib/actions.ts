"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORIES, recommendNutrition, servingGrams } from "./nutrition";
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
    const site = process.env.FORMA_SITE_URL;
    const { data, error } = await client.auth.signUp({
      email, password, options: site ? { emailRedirectTo: new URL("/auth/confirm", site).href } : undefined,
    });
    if (error?.code === "email_address_not_authorized") {
      return { error: "Gunakan alamat email yang terdaftar di tim Supabase FORMA untuk menerima konfirmasi." };
    }
    if (error?.code === "over_email_send_rate_limit") {
      return { error: "Batas pengiriman email tercapai. Coba lagi nanti." };
    }
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
  const payload = Object.fromEntries(form);
  const result = schemas.onboarding.safeParse(payload);
  if (!result.success) return { error: "Periksa data awal dan tanggal mulai." };
  const x = result.data;
  let target;
  if (x.targetMode === "manual") {
    const manual = schemas.targets.safeParse(payload);
    if (!manual.success) return { error: "Periksa target manual. Kalori harus cukup untuk protein dan lemak." };
    target = { calories: manual.data.calories, protein_g: manual.data.protein, fat_g: manual.data.fat };
  } else {
    target = recommendNutrition(x);
    if (!target) return { error: "Estimasi belum tersedia untuk data ini. Periksa data tubuh atau pilih target manual." };
  }
  const { error } = await client.rpc("complete_onboarding", {
    p_name: x.name, p_age: x.age, p_sex: x.sex, p_height: x.height,
    p_weight: x.weight, p_milestone: x.milestone, p_activity: x.activity, p_goal: x.goal,
    p_equipment: x.equipment, p_timezone: x.timezone, p_start: x.start,
    p_calories: target.calories, p_protein: target.protein_g, p_fat: target.fat_g,
  });
  if (error) return saveError;
  revalidatePath("/", "layout");
  redirect("/beranda?awal=1");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = schemas.profileFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Periksa kembali data profil." };
  const x = parsed.data;
  const { data, error } = await client.from("profiles").update({
    name: x.name, age_years: x.age, sex_for_bmr: x.sex, height_cm: x.height,
    initial_weight_kg: x.weight, milestone_kg: x.milestone, activity_level: x.activity,
    goal: x.goal, equipment: x.equipment, timezone: x.timezone,
  }).eq("user_id", userId).select("user_id").maybeSingle();
  if (error || !data) return saveError;
  revalidatePath("/", "layout");
  redirect("/profil?data=tersimpan#data-awal");
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

export async function updateProgramStart(_: FormState, form: FormData): Promise<FormState> {
  const { client, userId } = await requireProfile();
  const parsed = schemas.date.safeParse(form.get("start"));
  if (!parsed.success) return { error: "Pilih tanggal mulai yang valid." };
  const { data, error } = await client.from("profiles").update({ start_date: parsed.data })
    .eq("user_id", userId).select("user_id").maybeSingle();
  if (error || !data) return saveError;
  revalidatePath("/profil");
  redirect("/profil?mulai=tersimpan");
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
  const record = await client.from("food_entries").select("timezone,reference_serving_g").eq("id", x.id).eq("user_id", userId).maybeSingle();
  if (record.error) return saveError;
  if (!record.data) return stale;
  const instant = entryTime(x.date, x.time, record.data.timezone);
  if (!instant) return { error: "Tanggal atau jam tidak valid untuk zona waktu catatan." };
  if (x.unit === "serving" && !record.data.reference_serving_g) return invalid;
  const grams = servingGrams(x.quantity, x.unit === "serving" ? record.data.reference_serving_g! : 1);
  if (grams < 0.01 || grams > 3000) return { error: "Berat makanan harus antara 0,01 dan 3.000 gram." };
  const { data, error } = await client.from("food_entries")
    .update({ meal_type: x.meal, quantity_g: grams, consumed_at: instant })
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
