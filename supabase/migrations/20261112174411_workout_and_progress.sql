create table public.workout_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade default auth.uid(),
  weekdays smallint[] not null check (
    cardinality(weekdays) between 1 and 3 and array_position(weekdays, null) is null
    and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
    and (cardinality(weekdays) < 2 or weekdays[1] < weekdays[2])
    and (cardinality(weekdays) < 3 or weekdays[2] < weekdays[3])
  )
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  routine text not null check (routine in ('A','B')),
  program_week smallint check (program_week between 1 and 12),
  local_date date not null,
  exercise_ids text[] not null check (
    cardinality(exercise_ids) = 4 and array_position(exercise_ids, null) is null
    and exercise_ids <@ array['goblet-squat','chair-squat','floor-press','wall-pushup','dumbbell-row','supported-row',
      'plank','elevated-plank','romanian-deadlift','hip-hinge','shoulder-press','unloaded-press',
      'reverse-lunge','supported-lunge','biceps-curl','unloaded-curl']::text[]
  ),
  skipped_slots smallint[] not null default '{}' check (
    array_position(skipped_slots, null) is null and skipped_slots <@ array[1,2,3,4]::smallint[]
  ),
  prescribed_sets smallint not null check (prescribed_sets in (2,3)),
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  started_at timestamptz not null default now(),
  active_since timestamptz default now(),
  finished_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  unique (id, user_id),
  check ((status = 'active') = (active_since is not null)),
  check ((status in ('completed','cancelled')) = (finished_at is not null))
);
create unique index workout_sessions_single_open on public.workout_sessions (user_id)
where status in ('active','paused');
create index workout_sessions_history on public.workout_sessions (user_id, local_date desc, started_at desc);

create table public.workout_sets (
  user_id uuid not null default auth.uid(),
  session_id uuid not null,
  slot smallint not null check (slot between 1 and 4),
  set_number smallint not null check (set_number between 1 and 3),
  exercise_id text not null,
  amount smallint not null check (amount between 1 and 600),
  load_kg numeric(5,2) check (load_kg between 0 and 100),
  recorded_at timestamptz not null default now(),
  primary key (session_id, slot, set_number),
  foreign key (session_id, user_id) references public.workout_sessions(id,user_id) on delete cascade
);
create index workout_sets_by_owner on public.workout_sets (user_id, session_id);

create table public.body_measurements (
  user_id uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  measured_date date not null check (measured_date between '1900-01-01' and '9999-12-31'),
  weight_kg numeric(5,2) check (weight_kg between 25 and 350),
  waist_cm numeric(5,2) check (waist_cm between 30 and 300),
  notes text not null default '' check (char_length(notes) <= 300),
  updated_at timestamptz not null default now(),
  primary key (user_id, measured_date),
  check (weight_kg is not null or waist_cm is not null)
);

alter table public.workout_preferences enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_measurements enable row level security;

revoke all on public.workout_preferences, public.workout_sessions, public.workout_sets, public.body_measurements from public, anon, authenticated;
grant select, insert, update on public.workout_preferences to authenticated;
grant select, insert on public.workout_sessions to authenticated;
grant update (exercise_ids, skipped_slots, status, active_since, finished_at, elapsed_seconds) on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_sets, public.body_measurements to authenticated;

create policy own_workout_preferences on public.workout_preferences for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_workout_sessions on public.workout_sessions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_workout_sets on public.workout_sets for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_body_measurements on public.body_measurements for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.check_workout_history() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status in ('completed','cancelled') then
    raise exception 'Completed history is immutable' using errcode = '22023';
  end if;
  if new.status = 'completed' and not exists (
    select 1 from public.workout_sets where session_id = old.id
  ) then
    raise exception 'Record at least one set' using errcode = '22023';
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
revoke all on function public.check_workout_history() from public, anon, authenticated;
create trigger workout_history_guard before update on public.workout_sessions
for each row execute function public.check_workout_history();

-- Lock the parent session for any set mutation so finish/pause cannot race a set save.
create function public.check_workout_set() returns trigger
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
  if not found or parent.status <> 'active' then
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
  new.recorded_at := now();
  return new;
end;
$$;
revoke all on function public.check_workout_set() from public, anon, authenticated;
create trigger workout_set_guard before insert or update or delete on public.workout_sets
for each row execute function public.check_workout_set();

create function public.change_workout(
  p_id uuid, p_action text, p_slot smallint default null, p_exercise text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  item public.workout_sessions%rowtype;
  stamp timestamptz := now();
  seconds integer;
begin
  select * into item from public.workout_sessions where id = p_id and user_id = (select auth.uid()) for update;
  if not found or item.status in ('completed','cancelled') then
    raise exception 'Session is closed' using errcode = '22023';
  end if;
  seconds := item.elapsed_seconds + coalesce(greatest(0, floor(extract(epoch from stamp - item.active_since)))::integer, 0);

  case p_action
    when 'pause' then
      if item.status <> 'active' then return; end if;
      update public.workout_sessions set status='paused', active_since=null, elapsed_seconds=seconds where id=p_id;
    when 'resume' then
      if item.status <> 'paused' then return; end if;
      update public.workout_sessions set status='active', active_since=stamp where id=p_id;
    when 'finish' then
      update public.workout_sessions set status='completed', active_since=null, finished_at=stamp, elapsed_seconds=seconds where id=p_id;
    when 'cancel' then
      update public.workout_sessions set status='cancelled', active_since=null, finished_at=stamp, elapsed_seconds=seconds where id=p_id;
    else
      if p_slot is null or p_slot not between 1 and 4 or item.status <> 'active' then
        raise exception 'Invalid exercise change' using errcode = '22023';
      end if;
      if p_action = 'restore' then
        update public.workout_sessions set skipped_slots=array_remove(skipped_slots,p_slot) where id=p_id;
        return;
      end if;
      if exists(select 1 from public.workout_sets where session_id=p_id and slot=p_slot) then
        raise exception 'Exercise has saved sets' using errcode = '22023';
      end if;
      if p_action = 'skip' then
        if not (p_slot = any(item.skipped_slots)) then
          update public.workout_sessions set skipped_slots=array_append(skipped_slots,p_slot) where id=p_id;
        end if;
      elsif p_action = 'replace' then
        update public.workout_sessions set exercise_ids[p_slot]=p_exercise where id=p_id;
      else
        raise exception 'Invalid workout action' using errcode = '22023';
      end if;
  end case;
end;
$$;
revoke all on function public.change_workout(uuid,text,smallint,text) from public, anon;
grant execute on function public.change_workout(uuid,text,smallint,text) to authenticated;

create function public.check_measurement_date() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  zone text;
begin
  if tg_op = 'UPDATE' and (new.user_id, new.measured_date) is distinct from (old.user_id, old.measured_date) then
    raise exception 'Measurement identity is immutable' using errcode = '22023';
  end if;
  select timezone into zone from public.profiles where user_id=new.user_id;
  if zone is null or new.measured_date > (now() at time zone zone)::date then
    raise exception 'Measurement date is in the future' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.check_measurement_date() from public, anon, authenticated;
create trigger body_measurement_date_guard before insert or update on public.body_measurements
for each row execute function public.check_measurement_date();
