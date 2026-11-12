alter table public.foods add column portion_note text
  check (portion_note is null or char_length(btrim(portion_note)) between 1 and 300);

-- Component values per 100 g. Recipe portions use estimated edible weights.
-- Ingredient record identifiers and assumptions are documented in docs/ARCHITECTURE.md.
with ingredients(code, kcal, protein, carbs, fat) as (values
  ('rice', 130, 2.69, 28.17, 0.28),
  ('egg', 143, 12.56, 0.72, 9.51),
  ('chicken', 165, 31.02, 0, 3.57),
  ('fried_chicken', 260, 24.84, 9, 13.20),
  ('oil', 884, 0, 0, 100),
  ('sweet_soy', 300, 0, 75, 0),
  ('chili', 40, 1.87, 8.81, 0.44),
  ('bread', 266, 8.85, 49.42, 3.33),
  ('spread', 539, 5.41, 62.36, 29.73),
  ('flour', 364, 10.33, 76.31, 0.98),
  ('water', 0, 0, 0, 0),
  ('chocolate_milk', 83, 3.17, 10.34, 3.39),
  ('fried_tofu', 115, 9.7, 2.5, 8.5),
  ('fried_tempeh', 350, 24.5, 10.4, 26.6)
), foods(code, id, name, category, preparation, serving_label, portion_note, source, source_url) as (values
  ('fried_rice_egg', '8ae3cafe-9a3b-4184-8bce-5392baf3c701', 'Nasi goreng + telur', 'karbohidrat', 'Tumis · kecap manis', 'piring', 'Nasi 200 g, telur 50 g, minyak 10 g, kecap 15 g. Minyak dan kecap bisa berbeda tiap warung.', 'Resep acuan FORMA · data bahan USDA dan label kecap', 'https://fdc.nal.usda.gov/'),
  ('fried_rice_chicken', '8ae3cafe-9a3b-4184-8bce-5392baf3c702', 'Nasi goreng + ayam', 'karbohidrat', 'Tumis · ayam suwir dan kecap manis', 'piring', 'Nasi 200 g, ayam matang 80 g, minyak 12 g, kecap 15 g. Porsi acuan tanpa telur tambahan.', 'Resep acuan FORMA · data bahan USDA dan label kecap', 'https://fdc.nal.usda.gov/'),
  ('geprek', '8ae3cafe-9a3b-4184-8bce-5392baf3c703', 'Nasi ayam geprek', 'karbohidrat', 'Ayam goreng tepung · sambal', 'piring', 'Nasi 180 g, ayam tepung 110 g tanpa tulang, sambal 15 g (cabai 10 g dan minyak 5 g).', 'Resep acuan FORMA · data bahan USDA', 'https://fdc.nal.usda.gov/'),
  ('sunti', '8ae3cafe-9a3b-4184-8bce-5392baf3c704', 'Nasi telur dadar sunti', 'karbohidrat', 'Telur dadar · bumbu asam sunti', 'piring', 'Nasi 180 g, telur 50 g, minyak 8 g, bumbu sunti sekitar 5 g. Kontribusi gizi bumbu belum dihitung.', 'Resep acuan FORMA · data bahan utama USDA', 'https://fdc.nal.usda.gov/'),
  ('toast_spread', '8ae3cafe-9a3b-4184-8bce-5392baf3c705', 'Roti tawar selai coklat', 'karbohidrat', 'Roti tawar · selai coklat hazelnut', 'lembar dengan selai', 'Satu lembar roti 28 g dengan selai coklat 15 g. Untuk dua lembar dengan olesan sama, pilih 2 porsi.', 'Resep acuan FORMA · USDA FDC 174924 dan 168000', 'https://fdc.nal.usda.gov/'),
  ('dimsum', '8ae3cafe-9a3b-4184-8bce-5392baf3c706', 'Dimsum ayam', 'lauk', 'Kukus · tanpa saus', 'buah', 'Satu buah 30 g. Model isi ayam 18 g, tepung 6 g, air 5 g, dan minyak 1 g. Saus dicatat terpisah.', 'Resep acuan FORMA · data bahan USDA', 'https://fdc.nal.usda.gov/'),
  ('milk', '8ae3cafe-9a3b-4184-8bce-5392baf3c707', 'Susu coklat', 'minuman', 'Susu coklat cair · whole milk', 'gelas kecil', 'Satu gelas acuan 200 g. Susu UHT atau minuman coklat merek lain bisa berbeda. Cek label kemasan jika tersedia.', 'USDA FoodData Central · 170879', 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/170879/nutrients'),
  ('fried_egg_rice', '8ae3cafe-9a3b-4184-8bce-5392baf3c708', 'Nasi telur ceplok', 'karbohidrat', 'Telur goreng · tanpa kecap', 'piring', 'Nasi 180 g, telur 50 g, minyak 6 g.', 'Resep acuan FORMA · data bahan USDA', 'https://fdc.nal.usda.gov/'),
  ('grilled_chicken_rice', '8ae3cafe-9a3b-4184-8bce-5392baf3c709', 'Nasi ayam bakar kecap', 'karbohidrat', 'Ayam bakar · kecap manis', 'piring', 'Nasi 180 g, ayam matang tanpa tulang 100 g, kecap 15 g, minyak 5 g.', 'Resep acuan FORMA · data bahan USDA dan label kecap', 'https://fdc.nal.usda.gov/'),
  ('white_bread', '8ae3cafe-9a3b-4184-8bce-5392baf3c710', 'Roti tawar', 'karbohidrat', 'Roti putih · tanpa olesan', 'lembar', 'Satu lembar acuan 28 g. Timbang atau cek label untuk lembar yang lebih tebal.', 'USDA FoodData Central · 174924', 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/174924/nutrients'),
  ('tofu_rice', '8ae3cafe-9a3b-4184-8bce-5392baf3c711', 'Nasi tahu goreng', 'karbohidrat', 'Nasi matang · tahu goreng', 'piring', 'Nasi 180 g dan tahu goreng 80 g. Minyak sudah tercakup dalam referensi tahu goreng.', 'Resep acuan FORMA · USDA dan TKPI CP062', 'https://repository.kemkes.go.id/book/777'),
  ('tempeh_rice', '8ae3cafe-9a3b-4184-8bce-5392baf3c712', 'Nasi tempe goreng', 'karbohidrat', 'Nasi matang · tempe goreng', 'piring', 'Nasi 180 g dan tempe goreng 60 g. Minyak sudah tercakup dalam referensi tempe goreng.', 'Resep acuan FORMA · USDA dan TKPI CP076', 'https://repository.kemkes.go.id/book/777')
), portions(food, ingredient, grams) as (values
  ('fried_rice_egg','rice',200), ('fried_rice_egg','egg',50), ('fried_rice_egg','oil',10), ('fried_rice_egg','sweet_soy',15),
  ('fried_rice_chicken','rice',200), ('fried_rice_chicken','chicken',80), ('fried_rice_chicken','oil',12), ('fried_rice_chicken','sweet_soy',15),
  ('geprek','rice',180), ('geprek','fried_chicken',110), ('geprek','chili',10), ('geprek','oil',5),
  ('sunti','rice',180), ('sunti','egg',50), ('sunti','oil',8), ('sunti','water',5),
  ('toast_spread','bread',28), ('toast_spread','spread',15),
  ('dimsum','chicken',18), ('dimsum','flour',6), ('dimsum','water',5), ('dimsum','oil',1),
  ('milk','chocolate_milk',200),
  ('fried_egg_rice','rice',180), ('fried_egg_rice','egg',50), ('fried_egg_rice','oil',6),
  ('grilled_chicken_rice','rice',180), ('grilled_chicken_rice','chicken',100), ('grilled_chicken_rice','sweet_soy',15), ('grilled_chicken_rice','oil',5),
  ('white_bread','bread',28),
  ('tofu_rice','rice',180), ('tofu_rice','fried_tofu',80),
  ('tempeh_rice','rice',180), ('tempeh_rice','fried_tempeh',60)
), totals as (
  select p.food, sum(p.grams) as serving_g,
    round(sum(p.grams * i.kcal) / sum(p.grams)::numeric, 2) as calories,
    round(sum(p.grams * i.protein) / sum(p.grams)::numeric, 2) as protein,
    round(sum(p.grams * i.carbs) / sum(p.grams)::numeric, 2) as carbs,
    round(sum(p.grams * i.fat) / sum(p.grams)::numeric, 2) as fat
  from portions p join ingredients i on i.code = p.ingredient
  group by p.food
)
insert into public.foods (id, user_id, name, category, preparation, serving_label, serving_g,
  portion_note, calories, protein_g, carbs_g, fat_g, source, source_url)
select f.id::uuid, null, f.name, f.category, f.preparation, f.serving_label, t.serving_g,
  f.portion_note, t.calories, t.protein, t.carbs, t.fat, f.source, f.source_url
from foods f join totals t on t.food = f.code;
