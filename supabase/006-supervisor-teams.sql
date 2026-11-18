begin;
create table if not exists public.fcr_supervisor_agents (
 agent_key text primary key check(length(agent_key) between 1 and 300),
 supervisor_id uuid not null references auth.users(id) on delete cascade,
 agent_name text not null check(length(trim(agent_name)) between 1 and 200),
 user_code text not null default '' check(length(user_code)<=120),
 bms_code text not null default '' check(length(bms_code)<=120),
 assigned_by uuid references auth.users(id) on delete set null,
 assigned_at timestamptz not null default now()
);
create index if not exists fcr_supervisor_agents_supervisor on public.fcr_supervisor_agents(supervisor_id);
alter table public.fcr_supervisor_agents enable row level security;
revoke all on public.fcr_supervisor_agents from anon,authenticated;
grant select on public.fcr_supervisor_agents to authenticated;
drop policy if exists fcr_team_read on public.fcr_supervisor_agents;
create policy fcr_team_read on public.fcr_supervisor_agents for select to authenticated
 using((select public.is_fcr_supervisor()) and (supervisor_id=(select auth.uid()) or (select public.is_fcr_admin())));

create or replace function public.get_fcr_team(target_supervisor uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$declare supervisor jsonb;members jsonb;begin
 if not public.is_fcr_supervisor() or (target_supervisor is distinct from auth.uid() and not public.is_fcr_admin()) then raise exception 'No tenés permiso para consultar este equipo' using errcode='42501';end if;
 select jsonb_build_object('id',u.id,'email',u.email,'name',coalesce(nullif(r.full_name,''),nullif(u.raw_user_meta_data->>'full_name',''),u.email))
 into supervisor from auth.users u join public.fcr_supervisors s on s.user_id=u.id
 left join public.fcr_access_requests r on r.user_id=u.id where u.id=target_supervisor;
 if supervisor is null then raise exception 'El supervisor no tiene acceso habilitado' using errcode='P0002';end if;
 select coalesce(jsonb_agg(to_jsonb(a) order by lower(a.agent_name),a.agent_key),'[]'::jsonb) into members
 from public.fcr_supervisor_agents a where a.supervisor_id=target_supervisor;
 return jsonb_build_object('supervisor',supervisor,'members',members);
end$$;

create or replace function public.assign_fcr_agent(target_supervisor uuid,p_agent_key text,p_agent_name text,p_user_code text default '',p_bms_code text default '')
returns public.fcr_supervisor_agents language plpgsql security definer set search_path=''
as $$declare assigned public.fcr_supervisor_agents;begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede asignar agentes' using errcode='42501';end if;
 if not exists(select 1 from public.fcr_supervisors where user_id=target_supervisor) then raise exception 'Primero se debe aprobar la cuenta del supervisor' using errcode='22023';end if;
 p_user_code=trim(coalesce(p_user_code,''));p_bms_code=trim(coalesce(p_bms_code,''));p_agent_name=trim(coalesce(p_agent_name,''));
 if p_agent_key is null or p_agent_name='' or not (
 (p_user_code<>'' and p_agent_key='teco:'||p_user_code) or
 (p_user_code='' and p_bms_code<>'' and p_agent_key='bms:'||p_bms_code) or
 (p_user_code='' and p_bms_code='' and p_agent_key='nombre:'||p_agent_name)
 ) then raise exception 'El identificador no coincide con el agente' using errcode='22023';end if;
 insert into public.fcr_supervisor_agents(agent_key,supervisor_id,agent_name,user_code,bms_code,assigned_by)
 values(p_agent_key,target_supervisor,p_agent_name,p_user_code,p_bms_code,auth.uid())
 on conflict(agent_key) do update set agent_name=excluded.agent_name,user_code=excluded.user_code,bms_code=excluded.bms_code
 where fcr_supervisor_agents.supervisor_id=excluded.supervisor_id returning * into assigned;
 if assigned.agent_key is null then raise exception 'El agente ya pertenece a otro supervisor. Primero quitalo de ese equipo.' using errcode='23505';end if;
 return assigned;
end$$;

create or replace function public.remove_fcr_agent(target_supervisor uuid,p_agent_key text)
returns boolean language plpgsql security definer set search_path=''
as $$begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede quitar agentes' using errcode='42501';end if;
 delete from public.fcr_supervisor_agents where supervisor_id=target_supervisor and agent_key=p_agent_key;
 if not found then raise exception 'La asignación cambió. Actualizá el equipo.' using errcode='40001';end if;
 return true;
end$$;
revoke all on function public.get_fcr_team(uuid),public.assign_fcr_agent(uuid,text,text,text,text),public.remove_fcr_agent(uuid,text) from public,anon;
grant execute on function public.get_fcr_team(uuid),public.assign_fcr_agent(uuid,text,text,text,text),public.remove_fcr_agent(uuid,text) to authenticated;
commit;
