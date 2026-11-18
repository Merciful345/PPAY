begin;
create table if not exists public.fcr_audit_events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default clock_timestamp(),
 actor_id uuid,
 actor_email text not null default '',
 category text not null,
 action text not null,
 target text not null,
 details jsonb not null default '{}'
);
alter table public.fcr_audit_events enable row level security;
revoke all on public.fcr_audit_events from public,anon,authenticated;
create index if not exists fcr_audit_date on public.fcr_audit_events(occurred_at desc,id desc);
create or replace function public.record_fcr_audit()
returns trigger language plpgsql security definer set search_path=''
as $$declare actor uuid:=auth.uid();label text;cat text;verb text;info jsonb;begin
 if tg_table_name='fcr_imports' then
   cat='files';
   if tg_op='INSERT' then verb='Archivo cargado';label=new.name;info=jsonb_build_object('period',new.period,'file_id',new.id);
   elsif tg_op='DELETE' then verb='Archivo eliminado';label=old.name;info=jsonb_build_object('period',old.period,'file_id',old.id);
   elsif old.period is distinct from new.period then verb='Período modificado';label=new.name;info=jsonb_build_object('before',old.period,'after',new.period,'file_id',new.id);
   else return null;end if;
 elsif tg_table_name='fcr_supervisor_agents' then
   cat='teams';
   if tg_op='INSERT' then verb=case when new.assignment_mode='auto' then 'Asignación automática' else 'Agente agregado' end;label=new.agent_name;info=jsonb_build_object('agent_key',new.agent_key,'team',new.supervisor_profile_id,'mode',new.assignment_mode);
   elsif tg_op='DELETE' then verb='Agente quitado';label=old.agent_name;info=jsonb_build_object('agent_key',old.agent_key,'team',old.supervisor_profile_id);
   elsif (old.supervisor_profile_id,old.assignment_mode,old.agent_name,old.user_code,old.bms_code) is distinct from (new.supervisor_profile_id,new.assignment_mode,new.agent_name,new.user_code,new.bms_code) then verb='Asignación modificada';label=new.agent_name;info=jsonb_build_object('agent_key',new.agent_key,'before_team',old.supervisor_profile_id,'team',new.supervisor_profile_id,'mode',new.assignment_mode);
   else return null;end if;
   info=info||jsonb_build_object('supervisor',coalesce((select p.name from public.fcr_supervisor_profiles p where p.id=(info->>'team')::uuid),''));
 elsif tg_table_name='fcr_access_requests' then
   cat='access';label=new.email;
   if tg_op='INSERT' then verb='Acceso solicitado';
   elsif old.status is distinct from new.status then verb=case new.status when 'approved' then 'Acceso aprobado' when 'rejected' then 'Acceso rechazado' else 'Acceso solicitado nuevamente' end;
   else return null;end if;
   info=jsonb_build_object('status',new.status,'name',new.full_name);
 elsif tg_table_name='fcr_password_resets' then
   cat='access';verb='Contraseña blanqueada';label=coalesce((select email from auth.users where id=new.user_id),'Usuario');info=jsonb_build_object('user_id',new.user_id);
 else return null;end if;
 insert into public.fcr_audit_events(actor_id,actor_email,category,action,target,details)
 values(actor,coalesce((select email from auth.users where id=actor),''),cat,verb,label,info);
 return null;
end$$;
revoke all on function public.record_fcr_audit() from public,anon,authenticated;
drop trigger if exists fcr_audit_files on public.fcr_imports;
create trigger fcr_audit_files after insert or update or delete on public.fcr_imports for each row execute function public.record_fcr_audit();
drop trigger if exists fcr_audit_teams on public.fcr_supervisor_agents;
create trigger fcr_audit_teams after insert or update or delete on public.fcr_supervisor_agents for each row execute function public.record_fcr_audit();
drop trigger if exists fcr_audit_access on public.fcr_access_requests;
create trigger fcr_audit_access after insert or update on public.fcr_access_requests for each row execute function public.record_fcr_audit();
drop trigger if exists fcr_audit_passwords on public.fcr_password_resets;
create trigger fcr_audit_passwords after insert or update on public.fcr_password_resets for each row execute function public.record_fcr_audit();
create or replace function public.list_fcr_audit(filter_category text default '',page_offset integer default 0,page_limit integer default 50)
returns setof public.fcr_audit_events language plpgsql security definer set search_path=''
as $$begin
 if not public.is_fcr_admin() then raise exception 'Solo Gonzalo puede consultar el historial' using errcode='42501';end if;
 if coalesce(filter_category,'') not in ('','files','teams','access') then raise exception 'Categoría inválida' using errcode='22023';end if;
 return query select * from public.fcr_audit_events a where coalesce(filter_category,'')='' or a.category=filter_category order by a.occurred_at desc,a.id desc offset greatest(coalesce(page_offset,0),0) limit least(greatest(coalesce(page_limit,50),1),100);
end$$;
revoke all on function public.list_fcr_audit(text,integer,integer) from public,anon;
grant execute on function public.list_fcr_audit(text,integer,integer) to authenticated;
commit;
