-- Serving estimate: 17 g egg yolk (USDA 01125), 178 g brewed coffee (14209),
-- and 5 g granulated sugar (19335). Catalog values are per 100 g.
insert into public.foods (
  user_id, id, catalog_group, name, category, preparation, serving_label, serving_g,
  calories, protein_g, carbs_g, fat_g, portion_note, source, source_url
) values (
  null, '67943050-a161-4e68-be56-a15dab06cf02', 'drink', 'BMW Kopi', 'minuman',
  'Boh Manok Weng · kuning telur dan kopi', 'gelas', 200, 37.94, 1.45, 2.80, 2.27,
  '1 gelas acuan: 17 g kuning telur kampung kocok, 178 g kopi seduh, dan 5 g gula. Gula, takaran telur, dan tambahan susu tiap warkop bisa berbeda.',
  'Resep acuan FORMA · menu Barona Kupi, USDA 01125, 14209, dan 19335',
  'https://menukuliner.net/menu/44985/spesial-boh-manok-weng-barona-kupi-lampineung'
) on conflict (id) do nothing;
