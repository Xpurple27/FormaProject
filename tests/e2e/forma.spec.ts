import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

const password = "Forma-test-only-42!";
const riceId = "c160fc45-670c-46bd-a521-6dd2d054ec09";
const mailUrl = process.env.FORMA_TEST_MAIL_URL ?? "http://127.0.0.1:54324";

async function signUp(page: Page, request: APIRequestContext, name: string) {
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
  const confirmation = message.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/)?.[1];
  expect(confirmation).toBeTruthy();
  const confirmUrl = new URL(confirmation.replaceAll("&amp;", "&"));
  await page.goto(confirmUrl.pathname + confirmUrl.search);
  await expect(page).toHaveURL(/\/orientasi$/);
  await page.getByRole("button", { name: "Gunakan profil awal FORMA" }).click();
  await page.getByLabel("Nama panggilan").fill(name);
  await expect(page.getByText("247,5 g", { exact: true })).toBeVisible();
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
  expect(json.targets.at(-1).carbs_g).toBe(272.5);
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
