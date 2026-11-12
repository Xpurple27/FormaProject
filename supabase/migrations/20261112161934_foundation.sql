create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  age_years smallint not null check (age_years between 18 and 100),
  sex_for_bmr text not null check (sex_for_bmr in ('male', 'female')),
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  initial_weight_kg numeric(5,1) not null check (initial_weight_kg between 25 and 350),
  milestone_kg numeric(5,1) check (milestone_kg between 25 and 350),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null check (goal in ('recomposition', 'maintain', 'gain', 'track')),
  equipment text not null check (equipment in ('dumbbells', 'none', 'other')),
  timezone text not null check (timezone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  start_date date not null check (start_date between '1900-01-01' and '9999-12-31'),
  created_at timestamptz not null default now()
);

create table public.nutrition_targets (
  user_id uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  effective_from date not null check (effective_from between '1900-01-01' and '9999-12-31'),
  calories numeric(6,1) not null check (calories between 1 and 15000),
  protein_g numeric(6,1) not null check (protein_g between 0 and 1500),
  fat_g numeric(6,1) not null check (fat_g between 0 and 1000),
  carbs_g numeric(8,3) generated always as ((calories - 4 * protein_g - 9 * fat_g) / 4) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, effective_from),
  check (carbs_g >= 0)
);

alter table public.profiles enable row level security;
alter table public.nutrition_targets enable row level security;
revoke all on public.profiles, public.nutrition_targets from anon, authenticated, public;
grant select, insert on public.profiles to authenticated;
grant select, insert, update on public.nutrition_targets to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy targets_read on public.nutrition_targets for select to authenticated using (user_id = (select auth.uid()));
create policy targets_insert on public.nutrition_targets for insert to authenticated with check (user_id = (select auth.uid()));
create policy targets_update on public.nutrition_targets for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.complete_onboarding(
  p_name text, p_age smallint, p_sex text, p_height numeric, p_weight numeric, p_milestone numeric,
  p_activity text, p_goal text, p_equipment text, p_timezone text, p_start date,
  p_calories numeric, p_protein numeric, p_fat numeric
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_start > (now() at time zone p_timezone)::date then
    raise exception 'Invalid timezone or program start' using errcode = '22023';
  end if;

  insert into public.profiles (name, age_years, sex_for_bmr, height_cm, initial_weight_kg,
    milestone_kg, activity_level, goal, equipment, timezone, start_date)
  values (p_name, p_age, p_sex, p_height, p_weight, p_milestone, p_activity, p_goal, p_equipment,
    p_timezone, p_start) on conflict (user_id) do nothing;

  if found then
    insert into public.nutrition_targets (effective_from, calories, protein_g, fat_g)
    values (p_start, p_calories, p_protein, p_fat);
  end if;
end;
$$;
revoke all on function public.complete_onboarding(text, smallint, text, numeric, numeric, numeric,
  text, text, text, text, date, numeric, numeric, numeric) from public, anon;
grant execute on function public.complete_onboarding(text, smallint, text, numeric, numeric, numeric,
  text, text, text, text, date, numeric, numeric, numeric) to authenticated;
