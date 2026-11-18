begin;
create or replace function public.fcr_supervisor_name_key(label text)
returns text language sql immutable set search_path=''
as $$select coalesce(string_agg(token,' ' order by token),'') from regexp_split_to_table(trim(regexp_replace(
 regexp_replace(normalize(lower(coalesce(label,'')),NFD),U&'[\0300-\036f]','','g'),
 '[^a-z0-9]+',' ','g')),'\s+') token where token<>'';$$;
revoke all on function public.fcr_supervisor_name_key(text) from public,anon,authenticated;

create table if not exists public.fcr_supervisor_profiles (
 id uuid primary key default gen_random_uuid(),
 name_key text not null unique,
 name text not null,
 user_id uuid unique references auth.users(id) on delete set null
);
alter table public.fcr_supervisor_profiles enable row level security;
revoke all on public.fcr_supervisor_profiles from anon,authenticated;
grant select on public.fcr_supervisor_profiles to authenticated;
drop policy if exists fcr_profiles_read on public.fcr_supervisor_profiles;
create policy fcr_profiles_read on public.fcr_supervisor_profiles for select to authenticated
 using((select public.is_fcr_admin()) or ((select public.is_fcr_supervisor()) and user_id=(select auth.uid())));

insert into public.fcr_supervisor_profiles(id,name_key,name,user_id)
 select u.id,'user:'||u.id,coalesce(nullif(r.full_name,''),nullif(u.raw_user_meta_data->>'full_name',''),u.email),u.id
 from public.fcr_supervisors s join auth.users u on u.id=s.user_id left join public.fcr_access_requests r on r.user_id=u.id
 on conflict do nothing;

alter table public.fcr_supervisor_agents alter column supervisor_id drop not null;
alter table public.fcr_supervisor_agents add column if not exists supervisor_profile_id uuid references public.fcr_supervisor_profiles(id);
alter table public.fcr_supervisor_agents add column if not exists assignment_mode text not null default 'manual' check(assignment_mode in ('manual','auto'));
alter table public.fcr_supervisor_agents add column if not exists source_period text not null default '';
alter table public.fcr_supervisor_agents add column if not exists source_uploaded_at timestamptz not null default 'epoch';
alter table public.fcr_supervisor_agents add column if not exists source_import_id uuid references public.fcr_imports(id) on delete set null;
update public.fcr_supervisor_agents set supervisor_profile_id=supervisor_id where supervisor_profile_id is null;
alter table public.fcr_supervisor_agents alter column supervisor_profile_id set not null;
create index if not exists fcr_agents_profile on public.fcr_supervisor_agents(supervisor_profile_id);

create table if not exists public.fcr_team_exclusions (
 agent_key text primary key,
 excluded_by uuid references auth.users(id) on delete set null,
 excluded_at timestamptz not null default now()
);
alter table public.fcr_team_exclusions enable row level security;
revoke all on public.fcr_team_exclusions from anon,authenticated;

-- Resuelve únicamente coincidencias completas de nombre, sin aproximaciones.
create or replace function public.fcr_profile_for_name(label text)
returns uuid language plpgsql security definer set search_path=''
as $$declare k text;pid uuid;linked uuid;other_profile uuid;matches integer;begin
 perform pg_advisory_xact_lock(hashtextextended('fcr-team-sync',0));
 k=public.fcr_supervisor_name_key(label);if k='' then raise exception 'Supervisor sin nombre' using errcode='22023';end if;
 select count(*),min(u.id::text)::uuid into matches,linked
 from auth.users u join public.fcr_supervisors s on s.user_id=u.id left join public.fcr_access_requests r on r.user_id=u.id
 where public.fcr_supervisor_name_key(coalesce(nullif(r.full_name,''),u.raw_user_meta_data->>'full_name',''))=k;
 if matches<>1 then linked=null;end if;
 select id into pid from public.fcr_supervisor_profiles where name_key=k;
 if linked is not null and pid is not null and exists(select 1 from public.fcr_supervisor_profiles where id=pid and user_id is not null and user_id<>linked) then linked=null;end if;
 if linked is not null then
   select id into other_profile from public.fcr_supervisor_profiles where user_id=linked;
   if pid is not null and other_profile is not null and pid<>other_profile then
     -- Conserva la ruta ya utilizada por la cuenta y todas las asignaciones.
     update public.fcr_supervisor_agents set supervisor_profile_id=other_profile,supervisor_id=linked where supervisor_profile_id=pid;
     delete from public.fcr_supervisor_profiles where id=pid and user_id is null;
     if not exists(select 1 from public.fcr_supervisor_profiles where id=pid) then pid=null;end if;
   end if;
   if pid is null and other_profile is not null then
     update public.fcr_supervisor_profiles set name_key=k,name=trim(label) where id=other_profile;
     return other_profile;
   end if;
 end if;
 if pid is null then
   insert into public.fcr_supervisor_profiles(name_key,name,user_id) values(k,trim(label),linked) returning id into pid;
 elsif linked is not null then
   update public.fcr_supervisor_profiles set user_id=linked where id=pid and (user_id is null or user_id=linked);
   update public.fcr_supervisor_agents set supervisor_id=linked where supervisor_profile_id=pid;
 end if;
 return pid;
end$$;

create or replace function public.fcr_ensure_user_profile(target_user uuid)
returns uuid language plpgsql security definer set search_path=''
as $$declare pid uuid;label text;email text;resolved uuid;begin
 perform pg_advisory_xact_lock(hashtextextended('fcr-team-sync',0));
 select coalesce(nullif(r.full_name,''),nullif(u.raw_user_meta_data->>'full_name','')),u.email into label,email
 from auth.users u join public.fcr_supervisors s on s.user_id=u.id left join public.fcr_access_requests r on r.user_id=u.id where u.id=target_user;
 if email is null then raise exception 'Supervisor sin acceso habilitado' using errcode='P0002';end if;
 if public.fcr_supervisor_name_key(label)<>'' then
   resolved=public.fcr_profile_for_name(label);
   if exists(select 1 from public.fcr_supervisor_profiles where id=resolved and user_id=target_user) then return resolved;end if;
 end if;
 select id into pid from public.fcr_supervisor_profiles where user_id=target_user;
 if pid is null then insert into public.fcr_supervisor_profiles(id,name_key,name,user_id) values(target_user,'user:'||target_user,coalesce(label,email),target_user) returning id into pid;end if;
 return pid;
end$$;
revoke all on function public.fcr_profile_for_name(text),public.fcr_ensure_user_profile(uuid) from public,anon,authenticated;

drop policy if exists fcr_team_read on public.fcr_supervisor_agents;
create policy fcr_team_read on public.fcr_supervisor_agents for select to authenticated
 using((select public.is_fcr_supervisor()) and ((select public.is_fcr_admin()) or exists(
 select 1 from public.fcr_supervisor_profiles p where p.id=supervisor_profile_id and p.user_id=(select auth.uid()))));

create or replace function public.get_fcr_team(target_supervisor uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$declare p public.fcr_supervisor_profiles;members jsonb;pid uuid;begin
 if not public.is_fcr_supervisor() then raise exception 'Sin permiso para consultar equipos' using errcode='42501';end if;
 if target_supervisor=auth.uid() or (public.is_fcr_admin() and exists(select 1 from public.fcr_supervisors where user_id=target_supervisor)) then
   pid=public.fcr_ensure_user_profile(target_supervisor);
 else pid=target_supervisor;end if;
 select * into p from public.fcr_supervisor_profiles where id=pid;
 if p.id is null then raise exception 'Equipo inexistente' using errcode='P0002';end if;
 if not public.is_fcr_admin() and p.user_id is distinct from auth.uid() then raise exception 'No tenés permiso para consultar este equipo' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(a) order by lower(a.agent_name),a.agent_key),'[]'::jsonb) into members from public.fcr_supervisor_agents a where a.supervisor_profile_id=pid;
 return jsonb_build_object('supervisor',jsonb_build_object('id',p.id,'user_id',p.user_id,'name',p.name,'email',coalesce((select email from auth.users where id=p.user_id),'')),'members',members);
end$$;

create or replace function public.assign_fcr_agent(target_supervisor uuid,p_agent_key text,p_agent_name text,p_user_code text default '',p_bms_code text default '')
returns public.fcr_supervisor_agents language plpgsql security definer set search_path=''
as $$declare assigned public.fcr_supervisor_agents;pid uuid;linked uuid;begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede asignar agentes' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('fcr-team-sync',0));
 if exists(select 1 from public.fcr_supervisors where user_id=target_supervisor) then pid=public.fcr_ensure_user_profile(target_supervisor);else pid=target_supervisor;end if;
 select user_id into linked from public.fcr_supervisor_profiles where id=pid;
 if not found then raise exception 'Equipo inexistente' using errcode='P0002';end if;
 p_user_code=trim(coalesce(p_user_code,''));p_bms_code=trim(coalesce(p_bms_code,''));p_agent_name=trim(coalesce(p_agent_name,''));
 if p_agent_key is null or p_agent_name='' or not ((p_user_code<>'' and p_agent_key='teco:'||p_user_code) or (p_user_code='' and p_bms_code<>'' and p_agent_key='bms:'||p_bms_code) or (p_user_code='' and p_bms_code='' and p_agent_key='nombre:'||p_agent_name)) then raise exception 'Identificador de agente inválido' using errcode='22023';end if;
 insert into public.fcr_supervisor_agents(agent_key,supervisor_id,supervisor_profile_id,agent_name,user_code,bms_code,assigned_by,assignment_mode)
 values(p_agent_key,linked,pid,p_agent_name,p_user_code,p_bms_code,auth.uid(),'manual')
 on conflict(agent_key) do update set agent_name=excluded.agent_name,user_code=excluded.user_code,bms_code=excluded.bms_code,assignment_mode='manual',assigned_by=auth.uid(),assigned_at=now()
 where fcr_supervisor_agents.supervisor_profile_id=excluded.supervisor_profile_id returning * into assigned;
 if assigned.agent_key is null then raise exception 'El agente ya pertenece a otro supervisor' using errcode='23505';end if;
 delete from public.fcr_team_exclusions where agent_key=p_agent_key;
 return assigned;
end$$;

create or replace function public.remove_fcr_agent(target_supervisor uuid,p_agent_key text)
returns boolean language plpgsql security definer set search_path=''
as $$declare pid uuid;begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede quitar agentes' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('fcr-team-sync',0));
 if exists(select 1 from public.fcr_supervisors where user_id=target_supervisor) then pid=public.fcr_ensure_user_profile(target_supervisor);else pid=target_supervisor;end if;
 delete from public.fcr_supervisor_agents where supervisor_profile_id=pid and agent_key=p_agent_key;
 if not found then raise exception 'La asignación cambió. Actualizá el equipo.' using errcode='40001';end if;
 insert into public.fcr_team_exclusions(agent_key,excluded_by) values(p_agent_key,auth.uid()) on conflict(agent_key) do update set excluded_by=auth.uid(),excluded_at=now();
 return true;
end$$;

create or replace function public.sync_fcr_teams(source_import uuid,assignments jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$declare src public.fcr_imports;r record;profile_id uuid;p public.fcr_supervisor_profiles;old public.fcr_supervisor_agents;changed integer:=0;manual integer:=0;older integer:=0;begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede actualizar equipos desde archivos' using errcode='42501';end if;
 if jsonb_typeof(assignments) is distinct from 'array' or jsonb_array_length(assignments)>500 then raise exception 'Lote de agentes inválido' using errcode='22023';end if;
 select * into src from public.fcr_imports where id=source_import;if not found then raise exception 'Archivo no guardado' using errcode='P0002';end if;
 perform pg_advisory_xact_lock(hashtextextended('fcr-team-sync',0));
 if exists(select 1 from jsonb_to_recordset(assignments) as x(agent_key text) group by x.agent_key having count(*)>1) then raise exception 'Agente repetido en el lote' using errcode='22023';end if;
 for r in select * from jsonb_to_recordset(assignments) as x(agent_key text,agent_name text,user_code text,bms_code text,supervisor_name text) loop
   if coalesce(trim(r.agent_name),'')='' or coalesce(r.agent_key,'')='' or public.fcr_supervisor_name_key(r.supervisor_name)='' then raise exception 'Asignación incompleta' using errcode='22023';end if;
   if not ((coalesce(r.user_code,'')<>'' and r.agent_key='teco:'||r.user_code) or (coalesce(r.user_code,'')='' and coalesce(r.bms_code,'')<>'' and r.agent_key='bms:'||r.bms_code) or (coalesce(r.user_code,'')='' and coalesce(r.bms_code,'')='' and r.agent_key='nombre:'||r.agent_name)) then raise exception 'Identificador de agente inválido' using errcode='22023';end if;
   select * into old from public.fcr_supervisor_agents where agent_key=r.agent_key;
   if old.assignment_mode='manual' or exists(select 1 from public.fcr_team_exclusions where agent_key=r.agent_key) then manual=manual+1;continue;end if;
   if old.agent_key is not null and (src.period<old.source_period or (src.period=old.source_period and src.created_at<old.source_uploaded_at)) then older=older+1;continue;end if;
   profile_id=public.fcr_profile_for_name(r.supervisor_name);
   select * into p from public.fcr_supervisor_profiles where id=profile_id;
   insert into public.fcr_supervisor_agents(agent_key,supervisor_id,supervisor_profile_id,agent_name,user_code,bms_code,assigned_by,assignment_mode,source_period,source_uploaded_at,source_import_id)
   values(r.agent_key,p.user_id,p.id,trim(r.agent_name),coalesce(r.user_code,''),coalesce(r.bms_code,''),auth.uid(),'auto',src.period,src.created_at,src.id)
   on conflict(agent_key) do update set supervisor_id=excluded.supervisor_id,supervisor_profile_id=excluded.supervisor_profile_id,agent_name=excluded.agent_name,user_code=excluded.user_code,bms_code=excluded.bms_code,assignment_mode='auto',assigned_by=auth.uid(),assigned_at=now(),source_period=excluded.source_period,source_uploaded_at=excluded.source_uploaded_at,source_import_id=excluded.source_import_id;
   changed=changed+1;
 end loop;
 return jsonb_build_object('updated',changed,'manual_preserved',manual,'older_ignored',older);
end$$;

create or replace function public.list_fcr_teams(page_offset integer default 0,page_limit integer default 1000)
returns table(supervisor_id uuid,name text,email text,members jsonb)
language plpgsql security definer set search_path=''
as $$declare account_row record;begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede consultar todos los equipos' using errcode='42501';end if;
 for account_row in select user_id from public.fcr_supervisors loop perform public.fcr_ensure_user_profile(account_row.user_id);end loop;
 return query select p.id,p.name,coalesce(u.email,'')::text,coalesce((select jsonb_agg(jsonb_build_object('agent_key',a.agent_key,'agent_name',a.agent_name,'user_code',a.user_code,'bms_code',a.bms_code,'assignment_mode',a.assignment_mode) order by lower(a.agent_name),a.agent_key) from public.fcr_supervisor_agents a where a.supervisor_profile_id=p.id),'[]'::jsonb)
 from public.fcr_supervisor_profiles p left join auth.users u on u.id=p.user_id order by lower(p.name),p.id
 offset greatest(coalesce(page_offset,0),0) limit least(greatest(coalesce(page_limit,1000),1),1000);
end$$;
revoke all on function public.get_fcr_team(uuid),public.assign_fcr_agent(uuid,text,text,text,text),public.remove_fcr_agent(uuid,text),public.sync_fcr_teams(uuid,jsonb),public.list_fcr_teams(integer,integer) from public,anon;
grant execute on function public.get_fcr_team(uuid),public.assign_fcr_agent(uuid,text,text,text,text),public.remove_fcr_agent(uuid,text),public.sync_fcr_teams(uuid,jsonb),public.list_fcr_teams(integer,integer) to authenticated;
commit;
