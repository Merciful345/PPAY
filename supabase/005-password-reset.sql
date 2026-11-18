begin;
create table if not exists public.fcr_password_resets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reset_at timestamptz not null default now(),
 reset_by uuid references auth.users(id) on delete set null
);
alter table public.fcr_password_resets enable row level security;
revoke all on public.fcr_password_resets from anon,authenticated;

create or replace function public.valid_fcr_session()
returns boolean language sql stable security definer set search_path=''
as $$select auth.uid() is not null and (
 not exists(select 1 from public.fcr_password_resets where user_id=auth.uid())
 or exists(select 1 from auth.sessions where user_id=auth.uid() and id::text=auth.jwt()->>'session_id')
);$$;
revoke all on function public.valid_fcr_session() from public,anon;
grant execute on function public.valid_fcr_session() to authenticated;

create or replace function public.is_fcr_supervisor()
returns boolean language sql stable security definer set search_path=''
as $$select public.valid_fcr_session() and exists(select 1 from public.fcr_supervisors where user_id=auth.uid());$$;
create or replace function public.is_fcr_admin()
returns boolean language sql stable security definer set search_path=''
as $$select public.valid_fcr_session() and exists(select 1 from public.fcr_access_admins a join public.fcr_supervisors s using(user_id) where a.user_id=auth.uid());$$;
revoke all on function public.is_fcr_supervisor(),public.is_fcr_admin() from public,anon;
grant execute on function public.is_fcr_supervisor(),public.is_fcr_admin() to authenticated;
drop policy if exists fcr_supervisor_self on public.fcr_supervisors;
create policy fcr_supervisor_self on public.fcr_supervisors for select to authenticated
 using(user_id=(select auth.uid()) and (select public.valid_fcr_session()));

create or replace function public.reset_fcr_password(target_user uuid)
returns text language plpgsql security definer set search_path=''
as $$declare temporary_password text;last_reset timestamptz;begin
 if not public.is_fcr_admin() then raise exception 'Solo el administrador puede blanquear contraseñas' using errcode='42501';end if;
 if exists(select 1 from public.fcr_access_admins where user_id=target_user) then raise exception 'No se blanquean cuentas administradoras desde esta pantalla' using errcode='42501';end if;
 perform 1 from auth.users where id=target_user for update;
 if not found then raise exception 'Usuario inexistente' using errcode='P0002';end if;
 select reset_at into last_reset from public.fcr_password_resets where user_id=target_user;
 if last_reset is not null and last_reset>now()-interval '1 minute' then raise exception 'Esperá un minuto antes de volver a blanquear esta cuenta' using errcode='42901';end if;
 temporary_password=encode(extensions.gen_random_bytes(18),'hex') || '!aA7';
 update auth.users set encrypted_password=extensions.crypt(temporary_password,extensions.gen_salt('bf',10)),
 recovery_token='',recovery_sent_at=null,reauthentication_token='',reauthentication_sent_at=null,updated_at=now()
 where id=target_user;
 delete from auth.refresh_tokens where user_id=target_user::text;
 delete from auth.sessions where user_id=target_user;
 insert into public.fcr_password_resets(user_id,reset_by) values(target_user,auth.uid())
 on conflict(user_id) do update set reset_at=now(),reset_by=auth.uid();
 return temporary_password;
end$$;
revoke all on function public.reset_fcr_password(uuid) from public,anon;
grant execute on function public.reset_fcr_password(uuid) to authenticated;
commit;
