grant update (start_date) on public.profiles to authenticated;
create policy profiles_update_start on public.profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.complete_onboarding(
  p_name text, p_age smallint, p_sex text, p_height numeric, p_weight numeric, p_milestone numeric,
  p_activity text, p_goal text, p_equipment text, p_timezone text, p_start date,
  p_calories numeric, p_protein numeric, p_fat numeric
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_timezone is null or p_timezone not in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura') then
    raise exception 'Invalid profile timezone' using errcode = '22023';
  end if;

  insert into public.profiles (name, age_years, sex_for_bmr, height_cm, initial_weight_kg,
    milestone_kg, activity_level, goal, equipment, timezone, start_date)
  values (p_name, p_age, p_sex, p_height, p_weight, p_milestone, p_activity, p_goal, p_equipment,
    p_timezone, p_start) on conflict (user_id) do nothing;

  if found then
    insert into public.nutrition_targets (effective_from, calories, protein_g, fat_g)
    values (least(p_start, (now() at time zone p_timezone)::date), p_calories, p_protein, p_fat);
  end if;
end;
$$;
