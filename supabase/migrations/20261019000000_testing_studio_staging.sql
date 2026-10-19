-- Testing Studio: additive staging tables for all six source worksheets.
-- Apply manually after review. No existing table, policy or dashboard is replaced.
begin;
create table if not exists public.testing_studio_imports (
 id bigint generated always as identity primary key,
 sheet_key text not null check (sheet_key in ('raw_data_visit','raw_data_tiket','team_master','csat','omni_timeline','csat_rating_reference')),
 source_name text not null default 'Testing-Studio',
 imported_at timestamptz not null default now(),
 row_count integer not null default 0,
 checksum text,
 is_active boolean not null default false
);
create unique index if not exists testing_studio_one_active_import on public.testing_studio_imports(sheet_key) where is_active;
-- Raw source values stay as JSONB to avoid loss of unknown or repeated source columns.
create table if not exists public.testing_studio_raw_data_visit (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, ticket_id text, date_visit text, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_raw_data_tiket (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, period text, pic text, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_team_master (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, employee_name text, email text, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_csat (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, ticket_id text, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_omni_timeline (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, ticket_id text, event_at text, action text, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_csat_rating_reference (
 import_id bigint not null references public.testing_studio_imports(id) on delete cascade,
 source_row integer not null, title text, score numeric, payload jsonb not null,
 primary key (import_id, source_row)
);
create table if not exists public.testing_studio_team_assignment_history (
 id bigint generated always as identity primary key,
 employee_name text not null, supervisor_name text not null, l2_name text not null,
 effective_from date not null, effective_until date,
 check (effective_until is null or effective_until >= effective_from)
);
insert into public.testing_studio_team_assignment_history
 (employee_name, supervisor_name, l2_name, effective_from, effective_until)
select 'Tegar Rangga','Jane Margareth Widjaja','Dika Anugerah Pratama','1900-01-01','2026-07-31'
where not exists (select 1 from public.testing_studio_team_assignment_history
 where employee_name='Tegar Rangga' and effective_from='1900-01-01');
insert into public.testing_studio_team_assignment_history
 (employee_name, supervisor_name, l2_name, effective_from, effective_until)
select 'Tegar Rangga','M. Iriansyah Suhendar','Agung Setiawan','2026-08-01',null
where not exists (select 1 from public.testing_studio_team_assignment_history
 where employee_name='Tegar Rangga' and effective_from='2026-08-01');
create index if not exists testing_studio_visit_ticket_idx on public.testing_studio_raw_data_visit(ticket_id);
create index if not exists testing_studio_csat_ticket_idx on public.testing_studio_csat(ticket_id);
create index if not exists testing_studio_timeline_ticket_idx on public.testing_studio_omni_timeline(ticket_id);
create index if not exists testing_studio_master_name_idx on public.testing_studio_team_master(employee_name);
-- Audit only the active snapshots, without assuming that a timeline or CSAT event is unique by ticket.
create or replace view public.testing_studio_mapping_audit with (security_invoker=true) as
select v.ticket_id, v.date_visit, v.source_row as visit_source_row,
  (select count(*) from public.testing_studio_omni_timeline t
    join public.testing_studio_imports ti on ti.id=t.import_id and ti.is_active
    where t.ticket_id=v.ticket_id) as timeline_events,
  (select count(*) from public.testing_studio_csat c
    join public.testing_studio_imports ci on ci.id=c.import_id and ci.is_active
    where c.ticket_id=v.ticket_id) as csat_responses,
  case when v.ticket_id is null or trim(v.ticket_id)='' then 'MISSING_TICKET_ID'
    when exists (select 1 from public.testing_studio_omni_timeline t
      join public.testing_studio_imports ti on ti.id=t.import_id and ti.is_active
      where t.ticket_id=v.ticket_id) then 'TIMELINE_MATCHED'
    else 'TIMELINE_UNMATCHED' end as timeline_mapping_status
from public.testing_studio_raw_data_visit v
join public.testing_studio_imports i on i.id=v.import_id and i.is_active;
do $$
declare t text;
begin
 foreach t in array array[
 'testing_studio_imports','testing_studio_raw_data_visit','testing_studio_raw_data_tiket',
 'testing_studio_team_master','testing_studio_csat','testing_studio_omni_timeline',
 'testing_studio_csat_rating_reference','testing_studio_team_assignment_history'
 ] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on public.testing_studio_mapping_audit from anon, authenticated;
grant select on public.testing_studio_mapping_audit to service_role;
commit;
