-- Run once in the Supabase SQL editor. Data is accessible only to the backend.
begin;
create table if not exists public.sheet_sources (
  source_key text primary key,
  spreadsheet_url text not null,
  current_snapshot_id bigint,
  last_checked_at timestamptz not null default now()
);
create table if not exists public.sheet_snapshots (
  id bigint generated always as identity primary key,
  source_key text not null references public.sheet_sources(source_key),
  checksum text not null,
  headers text[] not null,
  row_count integer not null check (row_count > 0),
  imported_at timestamptz not null default now()
);
create table if not exists public.sheet_records (
  snapshot_id bigint not null references public.sheet_snapshots(id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  primary key (snapshot_id, row_number)
);
create index if not exists sheet_snapshots_source_date
  on public.sheet_snapshots(source_key, imported_at desc);
-- Deferrable relationship allows the source and its snapshot to be created together.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sheet_sources_snapshot_fk'
    and conrelid = 'public.sheet_sources'::regclass) then
    alter table public.sheet_sources add constraint sheet_sources_snapshot_fk
      foreign key (current_snapshot_id) references public.sheet_snapshots(id);
  end if;
end $$;

alter table public.sheet_sources enable row level security;
alter table public.sheet_snapshots enable row level security;
alter table public.sheet_records enable row level security;
-- There are intentionally no anonymous/browser read policies: this sheet can contain PIC data.
revoke all on public.sheet_sources, public.sheet_snapshots, public.sheet_records from anon, authenticated;
grant all on public.sheet_sources, public.sheet_snapshots, public.sheet_records to service_role;
grant usage, select on sequence public.sheet_snapshots_id_seq to service_role;

create or replace view public.current_sheet_records with (security_invoker = true) as
  select s.source_key, r.row_number, r.fields, b.imported_at
  from public.sheet_sources s
  join public.sheet_snapshots b on b.id = s.current_snapshot_id and b.source_key = s.source_key
  join public.sheet_records r on r.snapshot_id = b.id;
revoke all on public.current_sheet_records from anon, authenticated;
grant select on public.current_sheet_records to service_role;

create or replace function public.import_sheet_snapshot(
  p_source_key text, p_spreadsheet_url text, p_checksum text,
  p_headers text[], p_records jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_snapshot_id bigint;
  v_previous_checksum text;
  v_count integer;
begin
  if coalesce(trim(p_source_key), '') = '' or coalesce(trim(p_spreadsheet_url), '') = ''
    or p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid source metadata';
  end if;
  if p_headers is null or cardinality(p_headers) = 0
    or exists (select 1 from unnest(p_headers) h where h is null or trim(h) = '')
    or (select count(distinct h) from unnest(p_headers) h) <> cardinality(p_headers) then
    raise exception 'CSV headers must be nonempty and unique';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'Records must be a JSON array';
  end if;
  v_count := jsonb_array_length(p_records);
  if v_count = 0 then raise exception 'Empty sheet rejected; previous data retained'; end if;
  if exists (select 1 from jsonb_array_elements(p_records) r where jsonb_typeof(r) <> 'object') then
    raise exception 'Every record must be an object';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_records) r
    where (select count(*) from jsonb_object_keys(r)) <> cardinality(p_headers)
      or not (r ?& p_headers)
      or exists (select 1 from jsonb_each(r) kv where jsonb_typeof(kv.value) <> 'string')
  ) then raise exception 'Every record must contain exactly the CSV headers and string values'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_source_key, 0));
  insert into sheet_sources(source_key, spreadsheet_url)
    values (p_source_key, p_spreadsheet_url)
    on conflict (source_key) do update set spreadsheet_url = excluded.spreadsheet_url, last_checked_at = now();
  select b.checksum into v_previous_checksum from sheet_sources s
    join sheet_snapshots b on b.id = s.current_snapshot_id where s.source_key = p_source_key;
  if v_previous_checksum = p_checksum then
    return jsonb_build_object('changed', false, 'row_count', v_count);
  end if;
  insert into sheet_snapshots(source_key, checksum, headers, row_count)
    values (p_source_key, p_checksum, p_headers, v_count) returning id into v_snapshot_id;
  insert into sheet_records(snapshot_id, row_number, fields)
    select v_snapshot_id, ordinality::integer + 1, value
    from jsonb_array_elements(p_records) with ordinality;
  update sheet_sources set current_snapshot_id = v_snapshot_id where source_key = p_source_key;
  return jsonb_build_object('changed', true, 'snapshot_id', v_snapshot_id, 'row_count', v_count);
end $$;
revoke all on function public.import_sheet_snapshot(text, text, text, text[], jsonb)
  from public, anon, authenticated;
grant execute on function public.import_sheet_snapshot(text, text, text, text[], jsonb) to service_role;
commit;
