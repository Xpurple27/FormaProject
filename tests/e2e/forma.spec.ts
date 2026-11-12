import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

import { dayOffset, localNow } from "../../src/lib/dates";

const password = "Forma-test-only-42!";
const riceId = "c160fc45-670c-46bd-a521-6dd2d054ec09";
const mailUrl = process.env.FORMA_TEST_MAIL_URL ?? "http://127.0.0.1:54324";

async function signUp(page: Page, request: APIRequestContext, name: string, start = "2099-02-01") {
  const email = "forma-" + randomUUID() + "@example.com";
  await page.goto("/daftar");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page.getByRole("status")).toHaveText(/Cek email/);
  let messageId = "";
  await expect.poll(async () => {
    const response = await request.get(mailUrl + "/api/v1/search", { params: { query: "to:" + email } });
    if (!response.ok()) return "";
    const data = await response.json();
    messageId = data.messages?.[0]?.ID ?? "";
    return messageId;
  }, { timeout: 12000 }).not.toBe("");
  const message = await (await request.get(mailUrl + "/api/v1/message/" + messageId)).json();
  const confirmation = message.HTML.match(/href="([^"]*\/(?:auth\/confirm|(?:auth\/v1\/)?verify)\?[^"]+)"/)?.[1];
  expect(confirmation).toBeTruthy();
  const confirmUrl = new URL(confirmation.replaceAll("&amp;", "&"));
  await page.goto(confirmUrl.href);
  await expect(page).toHaveURL(/\/orientasi$/);
  await page.getByRole("button", { name: "Gunakan profil awal FORMA" }).click();
  await page.getByLabel("Nama panggilan").fill(name);
  await page.getByLabel("Tanggal mulai program", { exact: true }).fill(start);
  await expect(page.getByText("230,75 g", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Kalori (kkal)")).toHaveCount(0);
  await page.getByRole("button", { name: "Simpan profil dan target" }).click();
  await expect(page.getByRole("heading", { name: "Halo, " + name + "." })).toBeVisible();
  return email;
}

async function logRice(page: Page, grams: number) {
  await page.goto("/nutrisi");
  await page.getByLabel("Cari makanan").fill("nasi");
  await page.getByRole("button", { name: /Nasi putih matang/ }).click();
  const entry = page.getByRole("form", { name: "Tambah catatan makanan" });
  await entry.getByLabel("Jumlah").fill(String(grams));
  await entry.getByLabel("Jam").fill("00:01");
  await entry.getByRole("button", { name: "Simpan ke jurnal" }).click();
  await expect(page.getByText("Makanan tercatat.", { exact: true })).toBeVisible();
}

test("email confirmation, onboarding, rice CRUD, cross-session persistence and profile export on mobile", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/beranda");
  await expect(page).toHaveURL(/\/masuk$/);
  expect((await page.request.get("/api/ekspor")).status()).toBe(401);
  const email = await signUp(page, request, "Pengguna Uji A");

  await logRice(page, 200);
  await expect(page.getByTestId("total-calories")).toHaveText("260");
  await expect(page.getByText(/Protein 5,4 g · Karbo 56,3 g · Lemak 0,6 g/)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("total-calories")).toHaveText("260");
  await page.getByRole("link", { name: "Hari sebelumnya" }).click();
  await expect(page.getByTestId("total-calories")).toHaveText("0");
  const previousDay = new URL(page.url()).searchParams.get("tanggal")!;
  await page.getByRole("link", { name: "Hari ini", exact: true }).click();
  await expect(page.getByTestId("total-calories")).toHaveText("260");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByText("Kelola catatan", { exact: true }).click();
  const edit = page.getByRole("form", { name: "Ubah Nasi putih matang" });
  await edit.getByLabel("Jumlah (g)", { exact: true }).fill("150");
  await edit.getByLabel("Tanggal", { exact: true }).fill(previousDay);
  await edit.getByRole("combobox", { name: "Waktu makan", exact: true }).selectOption("dinner");
  await edit.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByText("Perubahan tersimpan.")).toBeVisible();
  await expect(page.getByTestId("total-calories")).toHaveText("195");
  await expect(page.getByRole("heading", { name: "Makan malam", exact: true })).toBeVisible();
  await expect(page.getByLabel("Tanggal jurnal")).toHaveValue(previousDay);
  await page.getByRole("link", { name: "Hari ini", exact: true }).click();
  await expect(page.getByTestId("total-calories")).toHaveText("0");

  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await expect(page.getByLabel("Kalori (kkal)")).toHaveValue("2060");
  await page.getByLabel("Tanggal mulai program").fill("2099-02-02");
  await page.getByRole("button", { name: "Simpan tanggal mulai" }).click();
  await expect(page.getByText("Tanggal mulai tersimpan.")).toBeVisible();
  await expect(page.getByLabel("Kalori (kkal)")).toHaveValue("2060");
  await page.getByLabel("Kalori (kkal)").fill("100");
  await page.getByRole("button", { name: "Simpan target" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Kalori harus cukup" })).toBeVisible();
  await expect(page.getByLabel("Kalori (kkal)")).toHaveValue("100");
  await page.getByLabel("Kalori (kkal)").fill("2200");
  await page.getByRole("button", { name: "Simpan target" }).click();
  await expect(page.getByText("Target nutrisi tersimpan.")).toBeVisible();
  await expect(page.getByLabel("Kalori (kkal)")).toHaveValue("2200");
  const response = await page.request.get("/api/ekspor");
  expect(response.headers()["cache-control"]).toMatch(/no-store/);
  expect(response.headers()["content-disposition"]).toMatch(/attachment/);
  const json = await response.json();
  expect(json.entries).toEqual([expect.objectContaining({ local_date: previousDay, quantity_g: 150, calories_snapshot: 195 })]);
  expect(json.profile.start_date).toBe("2099-02-02");
  expect(json.targets.at(-1).carbs_g).toBe(265.75);
  await page.getByRole("button", { name: "Keluar dari akun" }).click();
  await expect(page).toHaveURL(/\/masuk$/);

  const anotherDevice = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const nextPage = await anotherDevice.newPage();
    await nextPage.goto("/masuk");
    await nextPage.getByLabel("Email", { exact: true }).fill(email);
    await nextPage.getByLabel("Kata sandi").fill(password);
    await nextPage.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(nextPage.getByRole("heading", { name: "Halo, Pengguna Uji A." })).toBeVisible();
    await nextPage.goto("/nutrisi?tanggal=" + previousDay);
    await expect(nextPage.getByTestId("total-calories")).toHaveText("195");
    await nextPage.getByText("Kelola catatan", { exact: true }).click();
    await nextPage.getByRole("button", { name: "Hapus catatan" }).click();
    await nextPage.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(nextPage.getByText("Catatan dihapus.")).toBeVisible();
    await expect(nextPage.getByTestId("total-calories")).toHaveText("0");
  } finally {
    await anotherDevice.close();
  }
  expect(errors).toEqual([]);
});

test("custom food, serving conversion, frequent foods, and isolation of two users", async ({ page, request, browser }) => {
  const emailA = await signUp(page, request, "Pemilik Makanan");
  await page.goto("/nutrisi");
  await page.getByRole("combobox", { name: "Kategori", exact: true }).selectOption("lauk");
  await expect(page.getByRole("button", { name: /Tahu goreng/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nasi putih matang/ })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Kategori", exact: true }).selectOption("");
  await page.getByLabel("Cari makanan").fill("nasi goreng telur");
  await page.getByRole("button", { name: /Nasi goreng \+ telur/ }).click();
  const recipe = page.getByRole("form", { name: "Tambah catatan makanan" });
  await expect(recipe.getByLabel("Satuan")).toHaveValue("serving");
  await expect(recipe.getByLabel("Jumlah")).toHaveValue("1");
  await expect(recipe.getByText(/minyak 10 g/)).toBeVisible();
  await expect(recipe.getByText("464,89 kkal", { exact: true })).toBeVisible();
  await page.getByText("Buat makanan sendiri", { exact: true }).click();
  const privateName = "Camilan pribadi QA";
  await page.getByLabel("Nama makanan").fill(privateName);
  await page.getByLabel("Cara pengolahan").fill("Kukus");
  await page.getByLabel("Kalori (kkal)").fill("200");
  await page.getByLabel("Protein (g)").fill("10");
  await page.getByLabel("Karbohidrat (g)").fill("30");
  await page.getByLabel("Lemak (g)").fill("4");
  await page.getByLabel("Nama porsi (opsional)").fill("potong");
  await page.getByLabel("Berat per porsi (g)").fill("25");
  await page.getByRole("button", { name: "Simpan makanan pribadi" }).click();
  await expect(page.getByText(/Makanan pribadi tersimpan/)).toBeVisible();
  const entry = page.getByRole("form", { name: "Tambah catatan makanan" });
  await entry.getByLabel("Satuan").selectOption("serving");
  await entry.getByLabel("Jumlah").fill("1.5");
  await expect(entry.getByText("75 kkal")).toBeVisible();
  await entry.getByRole("button", { name: "Simpan ke jurnal" }).click();
  await expect(page.getByTestId("total-calories")).toHaveText("75");
  await page.getByText("Sering dicatat", { exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(privateName) }).first()).toBeVisible();
  const data = await (await page.request.get("/api/ekspor")).json();
  expect(data.entries[0].quantity_g).toBe(37.5);
  const privateFood = data.customFoods[0].id;
  const privateEntry = data.entries[0].id;
  const contextB = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const pageB = await contextB.newPage();
    const emailB = await signUp(pageB, request, "Akun Terpisah");
    await expect(pageB.getByTestId("total-calories")).toHaveText("0");
    await pageB.goto("/nutrisi");
    await pageB.getByLabel("Cari makanan").fill(privateName);
    await expect(pageB.getByText(/Tidak ada hasil/)).toBeVisible();
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(key && url).toBeTruthy();
    const api = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    expect((await api.auth.signInWithPassword({ email: emailB, password })).error).toBeNull();
    expect((await api.from("food_entries").select("id").eq("id", privateEntry)).data).toEqual([]);
    expect((await api.from("food_entries").update({ quantity_g: 1 }).eq("id", privateEntry).select("id")).data).toEqual([]);
    expect((await api.from("food_entries").delete().eq("id", privateEntry).select("id")).data).toEqual([]);
    expect((await api.from("foods").select("id").eq("id", privateFood)).data).toEqual([]);
    const submission = {
      id: randomUUID(), food_id: privateFood, consumed_at: new Date().toISOString(), meal_type: "lunch", quantity_g: 100,
    };
    expect((await api.from("food_entries").insert(submission)).error?.code).toBe("22023");
    expect((await api.auth.signInWithPassword({ email: emailA, password })).error).toBeNull();
    const owner = await api.from("food_entries").select("id,quantity_g").eq("id", privateEntry).single();
    expect(owner.data?.quantity_g).toBe(37.5);
    const retry = { ...submission, food_id: riceId };
    expect((await api.from("food_entries").insert(retry)).error).toBeNull();
    expect((await api.from("food_entries").insert(retry)).error?.code).toBe("23505");
  } finally {
    await contextB.close();
  }
});

test("Workout A and B session, measured trends and a private progress photo", async ({ page, request, browser }) => {
  const today = localNow("Asia/Jakarta").date;
  const yesterday = dayOffset(today, -1);
  await signUp(page, request, "Latihan Uji", yesterday);

  await page.goto("/latihan");
  await expect(page.getByRole("heading", { name: "Latihan", exact: true })).toBeVisible();
  await expect(page.getByText("Minggu 1 dari 12")).toBeVisible();
  await page.getByLabel("Sab", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Simpan jadwal" }).click();
  await expect(page.getByText("Jadwal latihan tersimpan.")).toBeVisible();
  await page.getByRole("button", { name: "Mulai latihan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout A", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "60 dtk" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  const first = page.getByRole("form", { name: "Set 1", exact: true });
  await first.getByLabel("Repetisi", { exact: true }).fill("10");
  await first.getByLabel("Beban per alat (kg)").fill("4");
  await first.getByRole("button", { name: "Tandai set selesai" }).click();
  await expect(first.getByText("Tercatat", { exact: true })).toBeVisible();
  await page.reload();
  await expect(first.getByLabel("Repetisi", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: "Jeda sesi", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lanjutkan sesi" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Lanjutkan sesi" }).click();
  await expect(first.getByText("Tercatat", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gerakan berikutnya" }).click();
  await page.getByText("Teknik dan pilihan gerakan", { exact: true }).click();
  await page.getByRole("button", { name: "Ganti ke Push-up dinding" }).click();
  await expect(page.getByRole("heading", { name: "Push-up dinding", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selesaikan sesi" }).click();
  await expect(page.getByText("Sesi selesai dan tercatat di riwayat.")).toBeVisible();
  await expect(page.getByLabel("Pilih workout")).toHaveValue("B");
  await page.getByRole("button", { name: "Mulai latihan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout B", exact: true })).toBeVisible();
  const bSet = page.getByRole("form", { name: "Set 1", exact: true });
  await bSet.getByLabel("Repetisi", { exact: true }).fill("8");
  await bSet.getByRole("button", { name: "Tandai set selesai" }).click();
  await expect(bSet.getByText("Tercatat", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selesaikan sesi" }).click();
  await expect(page.getByText("Sesi selesai dan tercatat di riwayat.")).toBeVisible();

  await page.goto("/progres");
  await expect(page.getByRole("heading", { name: "Progres", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Goblet squat", exact: true })).toBeVisible();
  await expect(page.getByText("Terakhir · 4 kg/alat · 10 rep")).toBeVisible();
  await page.getByLabel("Tanggal pengukuran").fill(yesterday);
  await page.getByLabel("Berat (kg)", { exact: true }).fill("76");
  await page.getByRole("button", { name: "Simpan pengukuran" }).click();
  await expect(page.getByText("Pengukuran tersimpan.")).toBeVisible();
  await expect(page.getByLabel("Tanggal pengukuran")).toHaveValue(today);
  await page.getByLabel("Berat (kg)", { exact: true }).fill("74");
  await page.getByLabel("Lingkar pinggang (cm)").fill("98");
  await page.getByRole("button", { name: "Simpan pengukuran" }).click();
  await expect(page.getByRole("img", { name: /Grafik Berat badan/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Grafik Lingkar pinggang/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "75 kg", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "98 cm", exact: true })).toBeVisible();

  await page.getByLabel("Foto (JPG, PNG, atau WebP)").setInputFiles("public/forma.png");
  await page.getByRole("button", { name: "Simpan foto", exact: true }).click();
  await expect(page.getByText("Foto tersimpan di galeri privat.")).toBeVisible();
  const image = page.getByRole("img", { name: /^Foto progres/ });
  await expect(image).toBeVisible();
  const src = (await image.getAttribute("src"))!;
  expect((await page.request.get(src)).status()).toBe(200);
  const unauth = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect((await unauth.request.get(src)).status()).toBe(404);
  } finally {
    await unauth.close();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const json = await (await page.request.get("/api/ekspor")).json();
  expect(json.workoutSessions).toHaveLength(2);
  expect(json.workoutSessions.every((session: { status: string }) => session.status === "completed")).toBe(true);
  expect(json.workoutSets).toHaveLength(2);
  expect(json.bodyMeasurements).toHaveLength(2);
  expect(json.progressPhotos).toHaveLength(1);

  await page.getByText("Hapus foto", { exact: true }).click();
  await page.getByRole("button", { name: "Ya, hapus foto" }).click();
  await expect(page.getByText("Foto dihapus.", { exact: true })).toBeVisible();
  expect((await page.request.get(src)).status()).toBe(404);
});
