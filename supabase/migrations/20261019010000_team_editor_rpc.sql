-- Team editing API: effective-dated assignments, additive to existing Testing Studio schema.
begin;
create or replace function public.save_testing_studio_team_assignment(
 p_employee_name text, p_supervisor_name text, p_l2_name text, p_effective_from date
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare previous_id bigint; new_id bigint; recent_start date;
begin
 if trim(coalesce(p_employee_name,''))='' or trim(coalesce(p_supervisor_name,''))=''
    or trim(coalesce(p_l2_name,''))='' or p_effective_from is null then
    raise exception 'Employee, SPV, L2 and effective date are required';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_employee_name)),0));
 -- Prevent ambiguous history: only append changes after the latest effective date.
 select id,effective_from into previous_id,recent_start
 from public.testing_studio_team_assignment_history
 where lower(trim(employee_name))=lower(trim(p_employee_name))
 order by effective_from desc,id desc limit 1;
 if recent_start is not null and p_effective_from<=recent_start then
   raise exception 'Effective date must be later than the latest existing assignment (%)',recent_start;
 end if;
 if previous_id is not null then
   update public.testing_studio_team_assignment_history
   set effective_until=p_effective_from-1 where id=previous_id and effective_until is null;
 end if;
 insert into public.testing_studio_team_assignment_history
  (employee_name,supervisor_name,l2_name,effective_from,effective_until)
 values(trim(p_employee_name),trim(p_supervisor_name),trim(p_l2_name),p_effective_from,null)
 returning id into new_id;
 return jsonb_build_object('id',new_id,'employee_name',trim(p_employee_name),'effective_from',p_effective_from);
end $$;
revoke all on function public.save_testing_studio_team_assignment(text,text,text,date) from public,anon,authenticated;
grant execute on function public.save_testing_studio_team_assignment(text,text,text,date) to service_role;
commit;