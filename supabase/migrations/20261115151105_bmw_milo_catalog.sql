-- BMW Milo serving estimate: 17 g egg yolk (USDA 01125), 22 g Milo Activ-Go,
-- 20 g Frisian Flag Bendera Kental Manis (label per 30 g), and 141 g water.
-- Catalog values are grams or kcal per 100 g of the prepared 200 g drink.
insert into public.foods (
  user_id, id, catalog_group, name, category, preparation, serving_label, serving_g,
  calories, protein_g, carbs_g, fat_g, portion_note, source, source_url
) values (
  null, 'f2e81633-feac-4ccc-8260-f57ce16c9b84', 'drink', 'BMW Milo', 'minuman',
  'Boh Manok Weng · kuning telur, Milo, dan susu', 'gelas', 200, 105.70, 2.68, 14.31, 4.51,
  '1 gelas acuan: 17 g kuning telur kampung kocok, 22 g Milo, 20 g susu kental manis, dan 141 g air. Jenis susu, jumlah telur, dan takaran tiap warkop bisa berbeda.',
  'Resep acuan FORMA · menu Barona Kupi, USDA 01125, label Milo dan Frisian Flag',
  'https://menukuliner.net/menu/44985/spesial-boh-manok-weng-barona-kupi-lampineung'
) on conflict (id) do nothing;
