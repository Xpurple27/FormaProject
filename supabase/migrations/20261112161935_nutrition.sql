create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  category text not null check (category in ('karbohidrat', 'lauk', 'buah', 'sayuran', 'minuman', 'lainnya')),
  preparation text not null check (char_length(btrim(preparation)) between 1 and 60),
  serving_label text,
  serving_g numeric(6,2) check (serving_g > 0 and serving_g <= 3000),
  calories numeric(6,2) not null check (calories between 0 and 950),
  protein_g numeric(5,2) not null check (protein_g between 0 and 100),
  carbs_g numeric(5,2) not null check (carbs_g between 0 and 100),
  fat_g numeric(5,2) not null check (fat_g between 0 and 100),
  source text not null default 'Estimasi pribadi' check (char_length(btrim(source)) between 1 and 140),
  source_url text,
  created_at timestamptz not null default now(),
  check (protein_g + carbs_g + fat_g <= 100),
  check ((serving_g is null and serving_label is null) or
    (serving_g is not null and serving_label is not null and char_length(btrim(serving_label)) between 1 and 60)),
  check ((user_id is null and source_url like 'https://%' and source_url is not null)
    or (user_id is not null and source_url is null))
);
create index foods_owner_idx on public.foods (user_id, id);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  food_id uuid not null references public.foods(id),
  consumed_at timestamptz not null check (isfinite(consumed_at)),
  local_date date not null check (local_date between '1900-01-01' and '9999-12-31'),
  timezone text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  quantity_g numeric(6,2) not null check (quantity_g > 0 and quantity_g <= 3000),
  food_name text not null,
  preparation text not null,
  source text not null,
  source_url text,
  reference_calories numeric(6,2) not null,
  reference_protein_g numeric(5,2) not null,
  reference_carbs_g numeric(5,2) not null,
  reference_fat_g numeric(5,2) not null,
  calories_snapshot numeric(11,6) generated always as (reference_calories * quantity_g / 100) stored,
  protein_snapshot numeric(11,6) generated always as (reference_protein_g * quantity_g / 100) stored,
  carbs_snapshot numeric(11,6) generated always as (reference_carbs_g * quantity_g / 100) stored,
  fat_snapshot numeric(11,6) generated always as (reference_fat_g * quantity_g / 100) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_entries_diary_idx on public.food_entries (user_id, local_date, consumed_at, id);
create index food_entries_recent_idx on public.food_entries (user_id, consumed_at desc, id desc);
create index food_entries_food_idx on public.food_entries (food_id);

alter table public.foods enable row level security;
alter table public.food_entries enable row level security;
revoke all on public.foods, public.food_entries from anon, authenticated, public;
grant select, insert on public.foods to authenticated;
grant select, insert, update, delete on public.food_entries to authenticated;

create policy foods_read on public.foods for select to authenticated
using (user_id is null or user_id = (select auth.uid()));
create policy foods_insert on public.foods for insert to authenticated with check (user_id = (select auth.uid()));
create policy entries_read on public.food_entries for select to authenticated using (user_id = (select auth.uid()));
create policy entries_insert on public.food_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy entries_update on public.food_entries for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy entries_delete on public.food_entries for delete to authenticated using (user_id = (select auth.uid()));

-- Always calculate from the accessible catalog on insert. Preserve the original
-- reference on edits, including when the catalog is corrected later.
create function public.set_entry_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  food public.foods%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.food_id is distinct from old.food_id or new.user_id is distinct from old.user_id
      or new.id is distinct from old.id then
      raise exception 'Entry identity is immutable' using errcode = '22023';
    end if;
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
  else
    select * into food from public.foods where id = new.food_id;
    if not found then
      raise exception 'Food is unavailable' using errcode = '22023';
    end if;
    select timezone into strict new.timezone from public.profiles where user_id = new.user_id;
    new.created_at := now();
    new.food_name := food.name;
    new.preparation := food.preparation;
    new.source := food.source;
    new.source_url := food.source_url;
    new.reference_calories := food.calories;
    new.reference_protein_g := food.protein_g;
    new.reference_carbs_g := food.carbs_g;
    new.reference_fat_g := food.fat_g;
  end if;

  new.local_date := (new.consumed_at at time zone new.timezone)::date;
  new.updated_at := now();
  if new.local_date > (now() at time zone new.timezone)::date then
    raise exception 'Future date is not allowed' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.set_entry_snapshot() from public, anon, authenticated;
create trigger food_entries_snapshot before insert or update on public.food_entries
for each row execute function public.set_entry_snapshot();
