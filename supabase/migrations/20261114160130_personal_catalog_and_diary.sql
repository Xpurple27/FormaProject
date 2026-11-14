alter table public.foods
  add column catalog_group text not null default 'personal'
    check (catalog_group in ('main','side','snack','drink','ingredient','personal','archive')),
  add column known_nutrients text[] not null default array['calories','protein_g','carbs_g','fat_g']
    check (known_nutrients <@ array['calories','protein_g','carbs_g','fat_g']::text[]),
  add column portion_weight_known boolean not null default true;

alter table public.food_entries
  add column known_nutrients text[] not null default array['calories','protein_g','carbs_g','fat_g'],
  add column portion_weight_known boolean not null default true;

-- Keep referenced rows for the journal's foreign key and existing snapshots.
update public.foods set catalog_group = 'archive' where user_id is null;
update public.foods set catalog_group = 'ingredient'
  where user_id is null and name in ('Nasi putih matang', 'Dada ayam panggang', 'Telur dadar polos', 'Telur ayam rebus', 'Nugget ayam');
update public.foods set serving_label = 'centong acuan', serving_g = 100,
  portion_note = 'Satu centong acuan 100 g nasi matang. Isi centong bisa berbeda.'
  where user_id is null and id = 'c160fc45-670c-46bd-a521-6dd2d054ec09';

-- Accounts can create personal foods. Shared catalog visibility remains managed by migrations.
alter policy foods_insert on public.foods with check (user_id = (select auth.uid()) and catalog_group = 'personal');

create or replace function public.set_entry_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  food public.foods%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.food_id is distinct from old.food_id or new.user_id is distinct from old.user_id
      or new.id is distinct from old.id then
      raise exception 'Entry identity is immutable' using errcode = '22023';
    end if;
    new.known_nutrients := old.known_nutrients;
    new.portion_weight_known := old.portion_weight_known;
    new.timezone := old.timezone;
    new.created_at := old.created_at;
    new.food_name := old.food_name;
    new.preparation := old.preparation;
    new.source := old.source;
    new.source_url := old.source_url;
    new.reference_calories := old.reference_calories;
    new.reference_protein_g := old.reference_protein_g;
    new.reference_carbs_g := old.reference_carbs_g;
    new.reference_fat_g := old.reference_fat_g;
    new.reference_serving_g := old.reference_serving_g;
    new.reference_serving_label := old.reference_serving_label;
  else
    select * into food from public.foods where id = new.food_id;
    if not found or food.catalog_group = 'archive' then
      raise exception 'Food is unavailable' using errcode = '22023';
    end if;
    select timezone into strict new.timezone from public.profiles where user_id = new.user_id;
    new.created_at := now();
    new.known_nutrients := food.known_nutrients;
    new.portion_weight_known := food.portion_weight_known;
    new.food_name := food.name;
    new.preparation := food.preparation;
    new.source := food.source;
    new.source_url := food.source_url;
    new.reference_calories := food.calories;
    new.reference_protein_g := food.protein_g;
    new.reference_carbs_g := food.carbs_g;
    new.reference_fat_g := food.fat_g;
    new.reference_serving_g := food.serving_g;
    new.reference_serving_label := food.serving_label;
  end if;

  new.local_date := (new.consumed_at at time zone new.timezone)::date;
  new.updated_at := now();
  if new.local_date > (now() at time zone new.timezone)::date then
    raise exception 'Future date is not allowed' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Delete the complete selection or roll back if a row changed or was unavailable.
create function public.delete_diary_selection(p_day date, p_items jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  removed integer;
  wanted integer;
begin
  if auth.uid() is null or p_day is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid selection' using errcode = '22023';
  end if;
  wanted := jsonb_array_length(p_items);
  if wanted not between 1 and 150 then
    raise exception 'Invalid selection size' using errcode = '22023';
  end if;
  delete from public.food_entries as entry
  using jsonb_to_recordset(p_items) as item(id uuid, version timestamptz)
  where entry.user_id = (select auth.uid()) and entry.local_date = p_day
    and entry.id = item.id and entry.updated_at = item.version;
  get diagnostics removed = row_count;
  if removed <> wanted then
    raise exception 'Selection changed' using errcode = '22023';
  end if;
  return removed;
end;
$$;
revoke all on function public.delete_diary_selection(date, jsonb) from public, anon;
grant execute on function public.delete_diary_selection(date, jsonb) to authenticated;

create function public.log_private_snack(
  p_id uuid, p_name text, p_meal text, p_time timestamptz, p_weight numeric,
  p_quantity numeric, p_calories numeric, p_protein numeric, p_carbs numeric, p_fat numeric
)
returns date language plpgsql security invoker set search_path = '' as $$
declare
  serving numeric := coalesce(p_weight, 100);
  day date;
  known text[] := array[]::text[];
  consumed numeric := round(serving * p_quantity, 2);
begin
  if p_calories is not null then known := array_append(known, 'calories'); end if;
  if p_protein is not null then known := array_append(known, 'protein_g'); end if;
  if p_carbs is not null then known := array_append(known, 'carbs_g'); end if;
  if p_fat is not null then known := array_append(known, 'fat_g'); end if;
  insert into public.foods (id,name,category,preparation,serving_label,serving_g,
    calories,protein_g,carbs_g,fat_g,source,known_nutrients,portion_weight_known)
  values (p_id,btrim(p_name),'lainnya','Jajanan pribadi','porsi',serving,
    coalesce(p_calories,0)*100/serving,coalesce(p_protein,0)*100/serving,
    coalesce(p_carbs,0)*100/serving,coalesce(p_fat,0)*100/serving,
    case when cardinality(known)=0 then 'Nilai gizi belum diisi' else 'Nilai gizi dari pengguna' end,
    known,p_weight is not null)
  on conflict (id) do nothing;
  if not exists (select from public.foods where id=p_id and user_id=(select auth.uid()) and preparation='Jajanan pribadi') then
    raise exception 'Invalid snack' using errcode = '22023';
  end if;
  insert into public.food_entries (id,food_id,meal_type,consumed_at,quantity_g)
  values (p_id,p_id,p_meal,p_time,consumed)
  on conflict (id) do nothing;
  select local_date into day from public.food_entries
  where id=p_id and food_id=p_id and user_id=(select auth.uid());
  if day is null then
    raise exception 'Snack was not saved' using errcode = '22023';
  end if;
  return day;
end;
$$;
revoke all on function public.log_private_snack(uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.log_private_snack(uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;

-- Ready-to-log meals and drinks. Values are per 100 g and serving notes describe the assumed recipe.
insert into public.foods (user_id,id,catalog_group,name,category,preparation,serving_label,serving_g,
  calories,protein_g,carbs_g,fat_g,portion_note,source,source_url)
values
  (null, '8315326f-80e3-5991-ae56-727776c0355d', 'main', 'Nasi putih + telur dadar', 'karbohidrat', 'Nasi dan telur dadar polos', 'piring', 241, 136.07, 4.68, 21.20, 3.16, 'Nasi matang 180 g + telur dadar 61 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '77a6b0b7-c424-540a-8f66-a720c977ccc8', 'main', 'Nasi putih + telur ceplok', 'karbohidrat', 'Nasi dan telur ceplok', 'piring', 226, 143.43, 4.91, 22.61, 3.24, 'Nasi matang 180 g + telur ceplok 46 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '10830b4a-2d6d-59d7-ae59-8d0140b560a1', 'main', 'Nasi goreng + telur dadar', 'karbohidrat', 'Nasi goreng kecap dan telur dadar', 'piring', 269, 164.89, 4.43, 23.01, 5.82, 'Nasi 180 g, minyak 8 g, kecap 10 g, bumbu 10 g, telur dadar 61 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '044b9727-5f96-59cb-850a-1ce833c51ea8', 'main', 'Nasi goreng + ayam goreng', 'karbohidrat', 'Nasi goreng kecap dan ayam goreng', 'piring', 308, 197.93, 9.84, 22.89, 7.06, 'Nasi goreng acuan 208 g + ayam goreng 100 g tanpa tulang.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '64fd2b13-dd27-5ae3-bbe4-796d125858e4', 'main', 'Nasi putih + ayam goreng', 'karbohidrat', 'Nasi dan ayam goreng', 'piring', 280, 176.43, 10.60, 21.32, 4.89, 'Nasi matang 180 g + 100 g bagian ayam goreng yang dimakan.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '247df798-b3ba-5fed-bd53-4da2db6cca9c', 'main', 'Nasi putih + ayam bakar', 'karbohidrat', 'Ayam bakar bumbu kecap', 'piring', 300, 162.73, 11.95, 20.65, 3.02, 'Nasi matang 180 g, ayam matang 100 g, kecap 15 g dan minyak oles 5 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '22c3e4e0-fd66-596e-9d93-ebf2ce5b9517', 'main', 'Nasi putih + ayam sambal kecap', 'karbohidrat', 'Ayam panggang dan sambal kecap', 'piring', 305, 146.89, 11.82, 20.60, 1.35, 'Nasi 180 g, ayam matang 100 g, kecap 15 g dan cabai 10 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '11d5f884-42f4-5e9f-bc31-6a27a2efc30a', 'main', 'Nasi putih + ayam asam manis', 'karbohidrat', 'Ayam goreng dan saus asam manis', 'piring', 320, 167.56, 9.33, 22.03, 4.29, 'Nasi 180 g, ayam goreng 100 g, saus 40 g (air 20 g, gula 10 g, sayur 10 g).', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, 'dbfe83fa-09d0-515b-99e2-5f45fc98fa8f', 'main', 'Nasi uduk + ayam geprek', 'karbohidrat', 'Nasi santan dan ayam geprek', 'piring', 300, 191.23, 9.97, 18.78, 8.22, 'Nasi uduk 185 g (nasi 160 g, santan 25 g), ayam 100 g, sambal 15 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '077a369f-d7f3-5590-88a8-73662ea7309d', 'main', 'Nasi uduk + lele goreng', 'karbohidrat', 'Nasi santan dan lele goreng', 'piring', 270, 170.43, 7.50, 19.74, 6.57, 'Nasi uduk 185 g dan lele 85 g tanpa tulang. Acuan lele goreng berbalut tipis.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg15.pdf'),
  (null, '3b7bae89-e7f7-5dd0-9583-aa667b5ab796', 'main', 'Nasi goreng + lele goreng', 'karbohidrat', 'Nasi goreng kecap dan lele', 'piring', 293, 185.76, 7.12, 23.33, 6.79, 'Nasi goreng 208 g dan lele goreng 85 g tanpa tulang.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg15.pdf'),
  (null, 'd03fe48a-11fc-51ef-8eb9-06d01e1bcd81', 'main', 'Mie Aceh goreng basah', 'karbohidrat', 'Mi kuning tumis, sedikit kuah', 'piring', 285, 147.32, 3.64, 22.18, 5.03, 'Mi matang 200 g, sayur 25 g, kuah 30 g, minyak 10 g, bumbu 10 g dan kecap 10 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://cookpad.com/id/resep/11617668'),
  (null, '0b259fb5-d7bd-5902-beb3-1555bcf2832d', 'main', 'Mie Aceh goreng basah + telur', 'karbohidrat', 'Mi kuning tumis dan telur', 'piring', 331, 154.08, 5.03, 19.21, 6.39, 'Mi Aceh acuan 285 g + satu telur ceplok acuan 46 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://cookpad.com/id/resep/11617668'),
  (null, '968e4c9c-09f1-55eb-8561-533a0f26ff04', 'main', 'Mie Aceh goreng basah + udang', 'karbohidrat', 'Mi kuning tumis dan udang', 'piring', 345, 138.91, 7.18, 18.36, 4.20, 'Mi Aceh acuan 285 g + udang matang 60 g tanpa kulit.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://cookpad.com/id/resep/11617668'),
  (null, '5648e041-53ef-5125-9969-7828b08c5ee6', 'main', 'Nasi putih + udang tepung goreng', 'karbohidrat', 'Nasi dan udang goreng tepung', 'piring', 265, 165.92, 8.69, 22.81, 4.13, 'Nasi matang 180 g + udang tepung goreng 85 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg15.pdf'),
  (null, 'ad1cf9a6-994d-5c8d-90b1-e27cb043c0bb', 'main', 'Indomie rebus + telur', 'karbohidrat', 'Ayam Bawang dan telur rebus', 'mangkuk', 369, 105.01, 3.33, 11.80, 4.96, 'Satu bungkus Ayam Bawang 69 g dengan semua bumbu, telur 50 g dan air acuan 250 g. Kuah mengencerkan berat.', 'Resep acuan · label Indomie dan USDA', 'https://www.fatsecret.co.id/kalori-gizi/indomie/indomie-ayam-bawang/1-porsi'),
  (null, 'f6981153-a040-54b8-ad02-5860bf019a46', 'side', 'Sayur-sayuran rebus', 'lauk', 'Campuran sayur rebus', 'porsi', 80, 35.00, 1.89, 7.81, 0.28, 'Campuran sayur tanpa kuah berminyak. Acuan 80 g.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '0daf6ef5-6d80-5b67-9568-1ff94bd52c80', 'side', 'Daun kol', 'lauk', 'Kol mentah', 'porsi', 30, 25.00, 1.28, 5.80, 0.10, 'Satu porsi lalapan 30 g.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '0646ba84-2f58-54dc-a806-418681c47f47', 'side', 'Timun', 'lauk', 'Timun mentah dengan kulit', 'porsi', 40, 15.00, 0.65, 3.63, 0.11, 'Satu porsi lalapan acuan 40 g.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '6dda7daf-ef7e-519f-b7f6-f31f06aefa86', 'side', 'Tempe goreng', 'lauk', 'Tempe kedelai goreng', 'potong', 30, 350.00, 24.50, 10.40, 26.60, 'Satu potong acuan 30 g. Minyak sudah tercakup.', 'TKPI · CP076', 'https://repository.kemkes.go.id/book/777'),
  (null, 'f1f7c003-8f41-560b-add9-6af6a355fb0e', 'side', 'Kerupuk', 'lauk', 'Kerupuk udang goreng', 'buah', 8, 477.00, 4.70, 68.50, 20.50, 'Acuan satu kerupuk udang 8 g. Jenis dan ukuran bisa berbeda.', 'TKPI · BP045', 'https://repository.kemkes.go.id/book/777'),
  (null, 'edc41a8e-5dfc-5775-9171-36a3757330ad', 'side', 'Tahu goreng', 'lauk', 'Tahu goreng', 'potong', 40, 115.00, 9.70, 2.50, 8.50, 'Acuan satu potong 40 g.', 'TKPI · CP062', 'https://repository.kemkes.go.id/book/777'),
  (null, '56256ac4-8b49-52a2-a8ed-9b301b829636', 'side', 'Sambal cabai', 'lauk', 'Cabai, garam, sedikit minyak', 'sendok', 15, 154.00, 1.62, 7.63, 13.71, 'Acuan 13 g cabai dan 2 g minyak. Sambal berminyak atau manis bisa lebih tinggi.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '62fd21f3-8138-55c6-9124-90bc67a654cd', 'side', 'Telur rebus tambahan', 'lauk', 'Telur utuh rebus', 'butir', 50, 155.00, 12.58, 1.12, 10.61, 'Satu telur 50 g tanpa cangkang.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, 'e352ede9-c1e8-5619-a370-76231f317efa', 'side', 'Perkedel kentang', 'lauk', 'Kentang lumat, telur, dan minyak', 'buah', 40, 172.30, 2.75, 16.18, 11.03, 'Satu perkedel acuan 40 g: kentang 32 g, telur 4 g, minyak terserap 4 g.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '67bceaaa-6224-5e24-82b3-4df10d0af85c', 'snack', 'Siomay + saus kacang', 'lainnya', 'Siomay kukus · perkiraan porsi kecil', 'porsi', 105, 186.96, 6.27, 18.11, 8.50, '4 siomay kecil (4 × 20 g) + 25 g saus kacang acuan. Rp5.000 tidak menentukan jumlah atau berat; sesuaikan dengan porsi yang dibeli.', 'Acuan FORMA · siomay ikan kemasan sebagai pembanding, saus/kuah USDA', 'https://www.fatsecret.co.id/kalori-gizi/minaku/siomay-ikan/100g'),
  (null, '1224772c-9f69-5704-b62e-7ef2486289dd', 'snack', 'Siomay + kuah', 'lainnya', 'Siomay kukus · perkiraan porsi kecil', 'porsi', 160, 83.00, 2.82, 9.22, 2.61, '4 siomay kecil (4 × 20 g) + 80 g kuah bening acuan. Rp5.000 tidak menentukan jumlah atau berat; sesuaikan dengan porsi yang dibeli.', 'Acuan FORMA · siomay ikan kemasan sebagai pembanding, saus/kuah USDA', 'https://www.fatsecret.co.id/kalori-gizi/minaku/siomay-ikan/100g'),
  (null, '741d1179-ad25-5a0b-b1b4-be0791a52680', 'snack', 'Siomay + kuah + kacang', 'lainnya', 'Siomay kukus · perkiraan porsi kecil', 'porsi', 185, 108.71, 3.83, 10.47, 4.91, '4 siomay kecil (4 × 20 g) + 80 g kuah bening + 25 g saus kacang acuan. Rp5.000 tidak menentukan jumlah atau berat; sesuaikan dengan porsi yang dibeli.', 'Acuan FORMA · siomay ikan kemasan sebagai pembanding, saus/kuah USDA', 'https://www.fatsecret.co.id/kalori-gizi/minaku/siomay-ikan/100g'),
  (null, 'c73ede97-7bfd-5fae-89e0-d71d22030505', 'snack', 'Bakso goreng', 'lainnya', 'Bakso tusuk goreng · tanpa saus', 'tusuk', 60, 217.60, 8.40, 15.87, 13.20, '1 tusuk = 4 butir. Model 56 g bakso kecil + 4 g minyak terserap, tanpa saus. Berat dan minyak bisa berbeda.', 'Resep acuan · bola ikan sebagai pembanding + minyak USDA', 'https://www.fatsecret.co.id/kalori-gizi/minaku/bola-ikan/100g'),
  (null, '5b05c25e-7779-59db-b52d-a3cc2424a62a', 'snack', 'Bakpao coklat', 'lainnya', 'Bakpao coklat kukus', 'buah', 80, 261.25, 5.53, 46.19, 6.26, 'Satu buah acuan 80 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Bakpao Coklat', 'https://www.fatsecret.co.id/kalori-gizi/search?q=Bakpao'),
  (null, '7871f95d-d99c-557e-8f6f-c3944f7d3b10', 'snack', 'Beng-Beng MAXX', 'lainnya', 'Wafer cokelat · MAXX', 'bungkus', 32, 500.00, 6.25, 65.63, 25.00, 'Satu bungkus acuan 32 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Beng-Beng MAXX 32 g', 'https://www.fatsecret.co.id/kalori-gizi/beng-beng'),
  (null, '1dddaa84-a083-556b-b2cc-9b52c7d33868', 'snack', 'Nissin wafer', 'lainnya', 'Wafers Chocolate', 'sajian', 29, 517.24, 6.90, 65.51, 27.59, 'Satu sajian acuan 29 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Nissin Wafers Chocolate, 5 wafer', 'https://www.fatsecret.co.id/kalori-gizi/search?q=wafers'),
  (null, 'eef7e4b1-206f-5989-8897-32031aff2d22', 'snack', 'Wafello', 'lainnya', 'Choco Blast', 'sajian', 17, 529.41, 5.88, 64.71, 26.47, 'Satu sajian acuan 17 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Wafello Choco Blast 17 g', 'https://www.fatsecret.co.id/kalori-gizi/search?q=Wafel'),
  (null, 'f2f7e5fd-87bc-5cd1-81fc-31b2347191fe', 'snack', 'Good Time', 'lainnya', 'Classic Chocochips', 'sajian', 18, 500.00, 5.56, 72.22, 19.44, 'Satu sajian acuan 18 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Good Time Classic 18 g', 'https://www.fatsecret.co.id/kalori-gizi/search?q=Good+Time+Good+Time+Classic'),
  (null, 'a32ca641-ec18-5ec5-a4e9-e58f19bf5d40', 'snack', 'Chocolatos Dark', 'lainnya', 'Wafer roll rasa dark', 'sajian', 8, 500.00, 12.50, 62.50, 18.75, 'Satu sajian acuan 8 g. Cek berat dan varian kemasan yang kamu beli.', 'FatSecret · Gery Chocolatos Dark 8 g', 'https://www.fatsecret.co.id/kalori-gizi/search?q=gery+Cokelat'),
  (null, '387b6ae6-d86a-54fc-baf5-5e1668164a3f', 'drink', 'Es teh', 'minuman', 'Teh hitam manis dingin', 'gelas', 200, 20.30, 0.00, 5.28, 0.00, 'Acuan 190 g teh seduh + 10 g gula. Pilih takaran sesuai minuman yang diminum.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '669e8581-a723-5947-8db2-a36da4cda286', 'drink', 'Teh hangat', 'minuman', 'Teh hitam manis hangat', 'gelas', 200, 20.30, 0.00, 5.28, 0.00, 'Acuan 190 g teh seduh + 10 g gula.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '2d023de6-721b-5013-94c6-e205449cf87c', 'drink', 'Teh hijau hangat tawar', 'minuman', 'Teh hijau seduh tanpa gula', 'gelas', 200, 1.00, 0.22, 0.00, 0.00, 'Acuan 200 g teh seduh tanpa gula.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '3a50759f-c116-5fe5-a164-0cf89bf051e2', 'drink', 'Teh hijau hangat', 'minuman', 'Teh hijau manis hangat', 'gelas', 200, 20.30, 0.21, 5.00, 0.00, 'Acuan 190 g teh seduh + 10 g gula.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, 'c4a17974-8223-52f2-a0be-c5d5076bc4e1', 'drink', 'Jahe sachet hangat', 'minuman', 'Jahe merah instan', 'gelas', 200, 40.00, 0.00, 10.00, 0.00, 'Acuan sachet AMH Jahe Merah 20 g + 180 g air.', 'Acuan FatSecret · AMH Jahe Merah 20 g', 'https://www.fatsecret.co.id/Diary.aspx?frc=True&pa=fjs&q=jahe'),
  (null, '1d98c8b6-43d8-584d-b83d-0dbe1f9d62aa', 'drink', 'Kopi susu panas', 'minuman', 'Susu full cream dan gula', 'gelas', 200, 50.30, 1.63, 7.40, 1.63, 'Acuan 90 g kopi, 100 g susu full cream dan 10 g gula.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '5b0ed26b-59bf-5522-a0de-2a27482ec6f0', 'drink', 'Kopi susu dingin', 'minuman', 'Susu full cream dan gula', 'gelas', 200, 50.30, 1.63, 7.40, 1.63, 'Acuan 90 g kopi, 100 g susu full cream dan 10 g gula, sebelum es mencair.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, 'c7ff7c81-8314-5ce0-89b3-ac8c549faa47', 'drink', 'Kopi panas', 'minuman', 'Kopi hitam seduh tanpa gula', 'gelas', 200, 1.00, 0.12, 0.00, 0.02, 'Acuan 200 g kopi seduh. Penggunaan gula atau susu menambah estimasi.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '0ddad1f1-04fb-50cd-a27b-64de05fab95a', 'drink', 'Kopi dingin', 'minuman', 'Kopi hitam seduh tanpa gula', 'gelas', 200, 1.00, 0.12, 0.00, 0.02, 'Acuan 200 g kopi seduh. Penggunaan gula atau susu menambah estimasi.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, 'cc9aa38f-f71a-59e1-be7f-9af12aa7ee26', 'drink', 'Milo hangat', 'minuman', 'Milo bubuk diseduh air', 'gelas', 200, 45.00, 1.00, 8.00, 1.25, 'Acuan 22 g Milo + 178 g air, tanpa susu atau gula tambahan.', 'FatSecret · Milo Susu Bubuk 22 g', 'https://www.fatsecret.co.id/kalori-gizi/milo/susu-bubuk/1-gelas'),
  (null, '1982ce14-8e54-56f3-8238-57719d60fbac', 'drink', 'Milo dingin', 'minuman', 'Milo bubuk diseduh air', 'gelas', 200, 45.00, 1.00, 8.00, 1.25, 'Acuan 22 g Milo + 178 g air, tanpa susu atau gula tambahan.', 'FatSecret · Milo Susu Bubuk 22 g', 'https://www.fatsecret.co.id/kalori-gizi/milo/susu-bubuk/1-gelas'),
  (null, 'e88f7530-32fa-522b-b0b9-f2c4767a91a6', 'drink', 'Es teh hijau', 'minuman', 'Teh hijau manis dingin', 'gelas', 200, 20.30, 0.21, 5.00, 0.00, 'Acuan 190 g teh seduh + 10 g gula.', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '6cfb28d6-26a3-5573-9aeb-95684fa1acdc', 'drink', 'Beng-Beng hangat', 'minuman', 'Beng-Beng Drink diseduh air', 'gelas', 200, 60.00, 0.50, 11.50, 1.50, 'Acuan 29 g bubuk + 171 g air, tanpa susu tambahan.', 'FatSecret · Beng-Beng Drink 29 g', 'https://www.fatsecret.co.id/kalori-gizi/beng-beng/beng-beng-drink/1-cangkir'),
  (null, 'f4927b44-df9b-50dc-8b96-5d8774d86813', 'drink', 'Beng-Beng dingin', 'minuman', 'Beng-Beng Drink diseduh air', 'gelas', 200, 60.00, 0.50, 11.50, 1.50, 'Acuan 29 g bubuk + 171 g air, tanpa susu tambahan.', 'FatSecret · Beng-Beng Drink 29 g', 'https://www.fatsecret.co.id/kalori-gizi/beng-beng/beng-beng-drink/1-cangkir'),
  (null, 'ad3d70a5-8efa-5f75-8a83-4ed19e4479ba', 'drink', 'Cappuccino + cincau', 'minuman', 'Cappuccino sachet dan cincau', 'gelas', 200, 56.20, 0.52, 10.76, 1.25, 'Acuan 25 g Good Day Cappuccino, 40 g cincau tawar dan 135 g air. Susu kental manis belum termasuk.', 'Resep acuan FORMA + FatSecret Good Day', 'https://www.fatsecret.co.id/kalori-gizi/good-day/cappuccino/1-bedak-wangi'),
  (null, 'adc79d2d-cff2-5909-947a-4bb466ee43f6', 'drink', 'Kopi susu pandan', 'minuman', 'Kopi, susu dan sirup pandan', 'gelas', 200, 57.99, 1.62, 9.40, 1.63, 'Acuan 80 g kopi, 100 g susu, dan 20 g sirup pandan (setara 14 g gula).', 'Resep acuan FORMA · komposisi bahan USDA/TKPI', 'https://fdc.nal.usda.gov/'),
  (null, '1920eb0d-5b30-53f1-b6a3-f9d1f8ca6f3a', 'drink', 'Es kosong', 'minuman', 'Air putih dingin atau es', 'gelas', 200, 0.00, 0.00, 0.00, 0.00, 'Acuan 200 g air/es, tanpa pemanis.', 'Acuan bahan USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  (null, '6e70caac-6ca3-537e-8b66-27809afe6b57', 'drink', 'Susu coklat dingin', 'minuman', 'Susu coklat cair full cream', 'gelas', 200, 83.00, 3.17, 10.34, 3.39, 'Acuan 200 g susu coklat cair. Susu UHT merek lain bisa berbeda.', 'USDA FoodData Central · 170879', 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/170879/nutrients');
