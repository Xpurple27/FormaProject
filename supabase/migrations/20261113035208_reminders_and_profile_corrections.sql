grant update (name, age_years, sex_for_bmr, height_cm, initial_weight_kg, milestone_kg,
  activity_level, goal, equipment, timezone) on public.profiles to authenticated;

alter table public.food_entries
  add column reference_serving_g numeric(6,2),
  add column reference_serving_label text;

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

alter table public.workout_sessions
  add column completed_set_count smallint check (completed_set_count between 0 and 12);

alter table public.workout_sessions disable trigger workout_history_guard;
update public.workout_sessions s
  set completed_set_count = (select count(*) from public.workout_sets where session_id = s.id)
  where s.status = 'completed';
alter table public.workout_sessions enable trigger workout_history_guard;
alter table public.workout_sessions add constraint workout_completion_count
  check ((status = 'completed') = (completed_set_count is not null));
revoke insert on public.workout_sessions from authenticated;
grant insert (id, routine, program_week, local_date, exercise_ids, prescribed_sets) on public.workout_sessions to authenticated;

create or replace function public.check_workout_history() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status in ('completed','cancelled') then
    raise exception 'Completed history is immutable' using errcode = '22023';
  end if;
  if new.status = 'completed' then
    select count(*) into new.completed_set_count from public.workout_sets where session_id = old.id;
    if new.completed_set_count = 0 then
      raise exception 'Record at least one set' using errcode = '22023';
    end if;
  end if;
  if new.exercise_ids is distinct from old.exercise_ids or new.skipped_slots is distinct from old.skipped_slots then
    if exists (select 1 from public.workout_sets
      where session_id = old.id and (slot = any(new.skipped_slots) or exercise_id is distinct from new.exercise_ids[slot])) then
      raise exception 'Exercise has saved sets' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
-- Finished sessions allow correction of an existing set's results.
create or replace function public.check_workout_set() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  parent public.workout_sessions%rowtype;
  item public.workout_sets%rowtype;
begin
  if tg_op = 'DELETE' then
    -- Preserve the foreign key cascade when an account or session is removed.
    if pg_trigger_depth() > 1 then return old; end if;
    item := old;
  else
    item := new;
  end if;

  select * into parent from public.workout_sessions
    where id = item.session_id and user_id = item.user_id for update;
  if not found or (parent.status <> 'active' and not (parent.status = 'completed' and tg_op = 'UPDATE')) then
    raise exception 'Session is not active' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and (new.session_id, new.user_id, new.slot, new.set_number)
       is distinct from (old.session_id, old.user_id, old.slot, old.set_number) then
    raise exception 'Set identity is immutable' using errcode = '22023';
  end if;
  if item.slot = any(parent.skipped_slots) or item.set_number > parent.prescribed_sets
    or item.exercise_id is distinct from parent.exercise_ids[item.slot]
    or (item.exercise_id not in ('plank','elevated-plank') and item.amount > 100)
    or (item.exercise_id in ('chair-squat','wall-pushup','plank','elevated-plank','hip-hinge',
      'unloaded-press','supported-lunge','unloaded-curl') and item.load_kg is not null) then
    raise exception 'Set does not match the session' using errcode = '22023';
  end if;
  new.recorded_at := clock_timestamp();
  return new;
end;
$$;
create table public.reminders (
  user_id uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('meal','workout','weight','bedtime')),
  local_time time(0) not null check (local_time < time '24:00' and extract(second from local_time) = 0),
  weekdays smallint[] not null check (
    array_ndims(weekdays) = 1 and cardinality(weekdays) between 1 and 7
    and array_position(weekdays, null) is null and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
  ),
  enabled boolean not null default true,
  snoozed_until timestamptz check (isfinite(snoozed_until)),
  acknowledged_at timestamptz check (isfinite(acknowledged_at)),
  last_notified_at timestamptz check (isfinite(last_notified_at)),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.reminders enable row level security;
revoke all on public.reminders from public, anon, authenticated;
grant select, insert, delete on public.reminders to authenticated;
grant update (kind, local_time, weekdays, enabled, snoozed_until, acknowledged_at, last_notified_at, updated_at)
  on public.reminders to authenticated;
create policy own_reminders on public.reminders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
