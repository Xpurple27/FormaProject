alter table public.food_entries
  add column meal_batch_id uuid,
  add column meal_batch_name text,
  add column meal_batch_position smallint,
  add constraint food_entries_meal_batch_position check (
    (meal_batch_id is null and meal_batch_position is null)
    or (meal_batch_id is not null and meal_batch_position is not null and meal_batch_position between 1 and 20)
  ),
  add constraint food_entries_meal_batch_name check (
    meal_batch_name is null or (meal_batch_id is not null and char_length(btrim(meal_batch_name)) between 1 and 80)
  );

create unique index food_entries_meal_batch_idx on public.food_entries (user_id, meal_batch_id, meal_batch_position)
  where meal_batch_id is not null;

update public.foods
set serving_label = 'potong acuan', serving_g = 100,
  portion_note = 'Satu potong acuan 100 g daging matang tanpa kulit. Ukuran potong bisa berbeda.'
where id = '59bcc81a-aac0-4256-b2d5-1f86fa06168b' and user_id is null;

insert into public.foods (id, user_id, name, category, preparation, serving_label, serving_g,
  portion_note, calories, protein_g, carbs_g, fat_g, source, source_url)
values
  ('abf24e78-0a44-4d15-94a9-c736c03c1b04', null, 'Telur dadar polos', 'lauk', 'Omelet matang · tanpa isian',
   'telur besar', 61, 'Satu telur dadar besar acuan 61 g. Takaran minyak dan isian bisa berbeda.',
   154, 10.57, 0.64, 11.66, 'USDA SR28 · 01130',
   'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg01.pdf'),
  ('abf24e78-0a44-4d15-94a9-c736c03c1b05', null, 'Nugget ayam', 'lauk', 'Nugget beku · sudah dimasak',
   'buah', 18, 'Satu buah acuan 18 g. Berat, kandungan gizi, dan minyak tambahan berbeda menurut merek dan cara masak.',
   296, 15.27, 14.09, 19.82, 'USDA Standard Reference · 05321',
   'https://www.fitwatch.com/caloriecounter/viewfood?descr=Chicken+nuggets%2C+frozen%2C+cooked&ndb_no=05321'),
  ('abf24e78-0a44-4d15-94a9-c736c03c1b06', null, 'Kopi susu manis', 'minuman', 'Kopi seduh · susu full cream · gula',
   'gelas', 200, 'Satu gelas acuan berisi 90 g kopi seduh, 100 g susu full cream, dan 10 g gula. Resep kedai atau kemasan bisa berbeda.',
   50.30, 1.63, 7.40, 1.63, 'Resep acuan FORMA · USDA 14209, 01077, 19335',
   'https://fdc.nal.usda.gov/');
