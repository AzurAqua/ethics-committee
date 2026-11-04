create table public.player_records (
  player_id uuid primary key references auth.users(id) on delete cascade,
  lit integer[] not null default array[0, 0, 0, 0],
  grey integer[] not null default array[0, 0, 0, 0],
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.player_records enable row level security;
revoke all on public.player_records from public, anon, authenticated;
grant select on public.player_records to authenticated;
create policy own_record on public.player_records for select to authenticated
  using ((select auth.uid()) = player_id);

create function public.apply_track_action(
  p_track integer, p_cell integer, p_action text, p_revision integer, p_player uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  player uuid := auth.uid();
  current_record public.player_records%rowtype;
  track_size integer;
  left_edge integer;
  right_edge integer;
begin
  if player is null or p_player is distinct from player or not exists (
    select 1 from auth.users where id = player and email_confirmed_at is not null
  ) then
    raise exception 'Verified account required' using errcode = '42501';
  end if;

  if p_track is null or p_track not between 1 and 4
     or p_revision is null or p_revision < 0 or p_action is null then
    raise exception 'Invalid action' using errcode = '22023';
  end if;
  track_size := case when p_track = 4 then 15 else 30 end;
  if p_cell is null or p_cell not between 1 and track_size then
    raise exception 'Invalid cell' using errcode = '22023';
  end if;

  insert into public.player_records (player_id) values (player) on conflict do nothing;
  select * into strict current_record from public.player_records
    where player_id = player for update;

  if current_record.revision <> p_revision then
    return jsonb_build_object('conflict', true, 'lit', current_record.lit,
      'grey', current_record.grey, 'revision', current_record.revision);
  end if;

  left_edge := current_record.lit[p_track];
  right_edge := track_size - current_record.grey[p_track];
  if p_action = 'light' and p_cell = left_edge + 1 and p_cell <= right_edge then
    current_record.lit[p_track] := left_edge + 1;
  elsif p_action = 'gray' and p_cell = right_edge and p_cell > left_edge then
    current_record.grey[p_track] := current_record.grey[p_track] + 1;
  elsif p_action = 'unlight' and p_cell = left_edge then
    current_record.lit[p_track] := left_edge - 1;
  elsif p_action = 'ungray' and p_cell = right_edge + 1 then
    current_record.grey[p_track] := current_record.grey[p_track] - 1;
  else
    raise exception 'Action is outside the legal boundary' using errcode = '22023';
  end if;

  update public.player_records
    set lit = current_record.lit, grey = current_record.grey,
        revision = revision + 1, updated_at = now()
    where player_id = player returning * into current_record;

  return jsonb_build_object('conflict', false, 'lit', current_record.lit,
    'grey', current_record.grey, 'revision', current_record.revision);
end;
$$;

revoke all on function public.apply_track_action(integer, integer, text, integer, uuid) from public, anon;
grant execute on function public.apply_track_action(integer, integer, text, integer, uuid) to authenticated;
