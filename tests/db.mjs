import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const userA = "10000000-0000-4000-8000-000000000001";
const userB = "10000000-0000-4000-8000-000000000002";
const userC = "10000000-0000-4000-8000-000000000003";
const rice = "c160fc45-670c-46bd-a521-6dd2d054ec09";
const food = "10000000-0000-4000-8000-000000000004";
const entry = "10000000-0000-4000-8000-000000000005";
const migrations = new URL("../supabase/migrations/", import.meta.url);
let passed = 0;
const query = async (sql, params) => (await db.query(sql, params)).rows;
const setup = async (id) => {
  await db.exec("reset role; set role authenticated");
  await query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
};
const check = async (name, fn) => { await fn(); console.log("✓ " + name); passed += 1; };
const onboard = (name, calories = 2100, start = "2024-01-01") => query(
  "select public.complete_onboarding($1,27::smallint,'male',165,90,85.5,'light','recomposition','dumbbells','Asia/Jakarta',$3,$2,120,70)",
  [name, calories, start]);
const add = (foodId, id = entry) => query(
  "insert into public.food_entries(id,food_id,consumed_at,meal_type,quantity_g) values ($1,$2,'2024-01-01 17:01Z','lunch',200) returning *",
  [id, foodId]);

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text, name text, primary key(bucket_id,name));
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1] $$;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, delete on storage.objects to authenticated;
    alter table storage.objects enable row level security;
    insert into auth.users values ('${userA}'), ('${userB}'), ('${userC}');
  `);
  for (const file of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  await check("migrations and 20 catalog entries with reproducible portion sizes", async () => {
    assert.equal((await query("select count(*)::int as count from public.foods"))[0].count, 20);
    const [friedRice] = await query("select serving_g, calories * serving_g / 100 as kcal, portion_note from public.foods where name='Nasi goreng + telur'");
    assert.equal(Number(friedRice.serving_g), 275);
    assert.ok(Math.abs(Number(friedRice.kcal) - 464.9) <= .02);
    assert.match(friedRice.portion_note, /minyak 10 g/);
  });
  await check("atomic onboarding and retry", async () => {
    await setup(userA);
    await onboard("A");
    await onboard("Duplicate");
    assert.equal((await query("select name from public.profiles"))[0].name, "A");
    assert.equal(Number((await query("select carbs_g from public.nutrition_targets"))[0].carbs_g), 247.5);
    await setup(userC);
    await assert.rejects(onboard("C", 1), /check constraint/);
    assert.equal((await query("select * from public.profiles")).length, 0);
  });
  await check("future start date and owner-only edits keep the nutrition target active", async () => {
    await setup(userC);
    await onboard("C", 2100, "2099-02-01");
    const [before] = await query("select start_date::text, (select effective_from::text from public.nutrition_targets) as effective_from, (now() at time zone 'Asia/Jakarta')::date::text as today from public.profiles");
    assert.equal(before.start_date, "2099-02-01");
    assert.equal(before.effective_from, before.today);
    await query("update public.profiles set start_date='2099-03-01' where user_id=$1", [userC]);
    assert.equal((await query("select start_date::text from public.profiles"))[0].start_date, "2099-03-01");
    assert.equal((await query("select effective_from::text from public.nutrition_targets"))[0].effective_from, before.today);
    await assert.rejects(query("update public.profiles set name='Altered'"), /permission denied/);
    await setup(userA);
    assert.equal((await query("update public.profiles set start_date='2099-04-01' where user_id=$1 returning start_date", [userC])).length, 0);
  });
  await check("stored snapshots and WIB midnight", async () => {
    await setup(userA);
    const [row] = await add(rice);
    assert.equal(row.local_date.toISOString().slice(0, 10), "2024-01-02");
    assert.deepEqual([row.calories_snapshot, row.protein_snapshot, row.carbs_snapshot, row.fat_snapshot].map(Number),
      [260, 5.38, 56.34, .56]);
    await assert.rejects(add(rice), /duplicate key/);
  });
  await check("historical snapshots survive catalog changes and edits", async () => {
    await db.exec("reset role");
    await query("update public.foods set calories=199, name='Catalog correction' where id=$1", [rice]);
    await setup(userA);
    const [row] = await query("update public.food_entries set quantity_g=150, reference_calories=0 where id=$1 returning *", [entry]);
    assert.equal(Number(row.calories_snapshot), 195);
    assert.equal(Number(row.reference_calories), 130);
    assert.equal(row.food_name, "Nasi putih matang");
    await assert.rejects(query("update public.food_entries set quantity_g=0 where id=$1", [entry]), /check constraint/);
    await assert.rejects(query("update public.food_entries set consumed_at=now()+interval '2 days' where id=$1", [entry]), /Future date/);
  });
  await check("private foods and journal mutations are owner-only", async () => {
    await setup(userA);
    await query("insert into public.foods(id,name,category,preparation,calories,protein_g,carbs_g,fat_g) values ($1,'Private A','lainnya','Mentah',10,1,1,0)", [food]);
    await setup(userB);
    await onboard("B");
    assert.equal((await query("select * from public.foods where id=$1", [food])).length, 0);
    assert.equal((await query("select * from public.food_entries where id=$1", [entry])).length, 0);
    assert.equal((await query("update public.food_entries set quantity_g=50 where id=$1 returning id", [entry])).length, 0);
    assert.equal((await query("delete from public.food_entries where id=$1 returning id", [entry])).length, 0);
    await assert.rejects(add(food, crypto.randomUUID()), /Food is unavailable/);
    assert.equal((await query("select * from public.nutrition_targets where user_id=$1", [userA])).length, 0);
    assert.equal((await query("select * from public.profiles where user_id=$1", [userA])).length, 0);
    await assert.rejects(query("insert into public.foods(user_id,name,category,preparation,calories,protein_g,carbs_g,fat_g) values (null,'Fake','lainnya','Mentah',10,1,1,0)"),
      /row-level security/);
  });
  await check("anonymous access denied, owner can delete", async () => {
    await db.exec("reset role; set role anon");
    await assert.rejects(query("select * from public.food_entries"), /permission denied/);
    await assert.rejects(onboard("Anonymous"), /permission denied/);
    await setup(userA);
    assert.equal((await query("delete from public.food_entries where id=$1 returning id", [entry])).length, 1);
  });
  await check("workout lifecycle, set deduplication and cross-user isolation", async () => {
    await setup(userA);
    const id = crypto.randomUUID();
    const open = (session) => query("insert into public.workout_sessions(id,routine,local_date,exercise_ids,prescribed_sets) values ($1,'A','2024-01-01',array['goblet-squat','floor-press','dumbbell-row','plank'],2)", [session]);
    const log = (reps) => query("insert into public.workout_sets(session_id,slot,set_number,exercise_id,amount,load_kg) values ($1,1,1,'goblet-squat',$2,4) on conflict(session_id,slot,set_number) do update set amount=excluded.amount", [id, reps]);
    const transition = (action) => query("select public.change_workout($1,$2)", [id, action]);
    await open(id);
    await assert.rejects(open(crypto.randomUUID()), /duplicate key/);
    await assert.rejects(transition("finish"), /at least one set/);
    await log(8);
    await log(10);
    assert.deepEqual((await query("select amount from public.workout_sets where session_id=$1", [id])).map(row => row.amount), [10]);
    await transition("pause");
    await assert.rejects(log(9), /not active/);
    await transition("resume");
    await transition("finish");
    await assert.rejects(log(9), /not active/);
    assert.equal((await query("select status from public.workout_sessions where id=$1", [id]))[0].status, "completed");
    await setup(userB);
    assert.equal((await query("select * from public.workout_sessions where id=$1", [id])).length, 0);
    assert.equal((await query("select * from public.workout_sets where session_id=$1", [id])).length, 0);
    await assert.rejects(transition("resume"), /Session is closed/);
    await assert.rejects(log(8), /not active/);
  });
  await check("measurement date and ownership, including missing weight", async () => {
    await setup(userA);
    await query("insert into public.body_measurements(measured_date,waist_cm) values ('2024-01-02',100)");
    await assert.rejects(query("insert into public.body_measurements(measured_date,weight_kg) values ('2099-01-01',90)"), /future/);
    await assert.rejects(query("insert into public.body_measurements(measured_date) values ('2024-01-03')"), /check constraint/);
    assert.equal((await query("select weight_kg from public.body_measurements"))[0].weight_kg, null);
    await setup(userB);
    assert.equal((await query("select * from public.body_measurements where user_id=$1", [userA])).length, 0);
    assert.equal((await query("delete from public.body_measurements where user_id=$1 returning measured_date", [userA])).length, 0);
  });
  await check("private photo policies restrict list, upload and deletion to the folder owner", async () => {
    const file = userA + "/2024-01-02_" + crypto.randomUUID() + ".jpg";
    await setup(userA);
    await query("insert into storage.objects values ('progress-photos',$1)", [file]);
    assert.equal((await query("select * from storage.objects")).length, 1);
    await setup(userB);
    assert.equal((await query("select * from storage.objects")).length, 0);
    await assert.rejects(query("insert into storage.objects values ('progress-photos',$1)", [file]), /row-level security/);
    assert.equal((await query("delete from storage.objects where name=$1 returning name", [file])).length, 0);
    await db.exec("reset role; set role anon");
    await assert.rejects(query("select * from storage.objects"), /permission denied/);
    await setup(userA);
    assert.equal((await query("delete from storage.objects where name=$1 returning name", [file])).length, 1);
  });
  console.log(passed + " database scenarios passed");
} finally {
  await db.close();
}
