begin;
drop function if exists public.list_fcr_teams();
create or replace function public.list_fcr_teams(page_offset integer default 0,page_limit integer default 1000)
returns table(supervisor_id uuid,name text,email text,members jsonb)
language plpgsql stable security definer set search_path=''
as $$begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede consultar todos los equipos' using errcode='42501';end if;
 return query
 select u.id,coalesce(nullif(r.full_name,''),nullif(u.raw_user_meta_data->>'full_name',''),u.email)::text,u.email::text,
 coalesce((select jsonb_agg(jsonb_build_object('agent_key',a.agent_key,'agent_name',a.agent_name,'user_code',a.user_code,'bms_code',a.bms_code) order by lower(a.agent_name),a.agent_key)
 from public.fcr_supervisor_agents a where a.supervisor_id=u.id),'[]'::jsonb)
 from public.fcr_supervisors s join auth.users u on u.id=s.user_id left join public.fcr_access_requests r on r.user_id=u.id
 order by lower(coalesce(nullif(r.full_name,''),u.email)),u.id
 offset greatest(coalesce(page_offset,0),0) limit least(greatest(coalesce(page_limit,1000),1),1000);
end$$;
revoke all on function public.list_fcr_teams(integer,integer) from public,anon;
grant execute on function public.list_fcr_teams(integer,integer) to authenticated;
commit;
