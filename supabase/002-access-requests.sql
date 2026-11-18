begin;
-- La autorización ahora depende de una decisión del administrador, no de confirmar email.
drop trigger if exists sync_fcr_supervisor_user on auth.users;

create table if not exists public.fcr_access_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.fcr_access_admins enable row level security;
revoke all on public.fcr_access_admins from anon,authenticated;
grant select on public.fcr_access_admins to authenticated;
drop policy if exists fcr_admin_self on public.fcr_access_admins;
create policy fcr_admin_self on public.fcr_access_admins for select to authenticated using(user_id=(select auth.uid()));

create table if not exists public.fcr_access_requests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null
);
alter table public.fcr_access_requests enable row level security;
revoke all on public.fcr_access_requests from anon,authenticated;
grant select on public.fcr_access_requests to authenticated;

create or replace function public.is_fcr_admin()
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.fcr_access_admins a join public.fcr_supervisors s using(user_id) where a.user_id=(select auth.uid()));$$;
revoke all on function public.is_fcr_admin() from public,anon;
grant execute on function public.is_fcr_admin() to authenticated;
drop policy if exists fcr_requests_read on public.fcr_access_requests;
create policy fcr_requests_read on public.fcr_access_requests for select to authenticated
 using(user_id=(select auth.uid()) or (select public.is_fcr_admin()));

create or replace function public.capture_fcr_access_request()
returns trigger language plpgsql security definer set search_path=''
as $$begin
 if tg_op='INSERT' then
   insert into public.fcr_access_requests(user_id,email,full_name)
   values(new.id,lower(trim(new.email)),left(coalesce(new.raw_user_meta_data->>'full_name',''),160)) on conflict do nothing;
 elsif new.email is distinct from old.email then
   delete from public.fcr_access_admins where user_id=new.id;
   delete from public.fcr_supervisors where user_id=new.id;
   insert into public.fcr_access_requests(user_id,email,full_name)
   values(new.id,lower(trim(new.email)),left(coalesce(new.raw_user_meta_data->>'full_name',''),160))
   on conflict(user_id) do update set email=excluded.email,status='pending',requested_at=now(),reviewed_at=null,reviewed_by=null;
 end if;
 return new;
end$$;
revoke all on function public.capture_fcr_access_request() from public,anon,authenticated;
drop trigger if exists capture_fcr_access_request on auth.users;
create trigger capture_fcr_access_request after insert or update of email on auth.users
 for each row execute function public.capture_fcr_access_request();

insert into public.fcr_access_requests(user_id,email,full_name,status)
 select u.id,lower(trim(u.email)),left(coalesce(u.raw_user_meta_data->>'full_name',''),160),
 case when s.user_id is null then 'pending' else 'approved' end
 from auth.users u left join public.fcr_supervisors s on s.user_id=u.id
 where u.email is not null on conflict do nothing;

create or replace function public.review_fcr_access(target_user uuid,decision text)
returns public.fcr_access_requests language plpgsql security definer set search_path=''
as $$declare request public.fcr_access_requests;begin
 if not public.is_fcr_admin() then raise exception 'Solo el administrador puede revisar solicitudes' using errcode='42501';end if;
 if decision not in ('approved','rejected') or decision is null then raise exception 'Decisión inválida' using errcode='22023';end if;
 select * into request from public.fcr_access_requests where user_id=target_user for update;
 if not found then raise exception 'Solicitud inexistente' using errcode='P0002';end if;
 if exists(select 1 from public.fcr_access_admins where user_id=target_user) then raise exception 'No se modifica un administrador desde solicitudes' using errcode='42501';end if;
 if request.status<>'pending' then raise exception 'La solicitud ya fue revisada' using errcode='40001';end if;
 if decision='approved' then
   insert into public.fcr_supervisors(user_id) values(target_user) on conflict do nothing;
 else
   delete from public.fcr_supervisors where user_id=target_user;
 end if;
 update public.fcr_access_requests set status=decision,reviewed_by=auth.uid(),reviewed_at=now()
 where user_id=target_user returning * into request;
 return request;
end$$;
revoke all on function public.review_fcr_access(uuid,text) from public,anon;
grant execute on function public.review_fcr_access(uuid,text) to authenticated;
commit;
