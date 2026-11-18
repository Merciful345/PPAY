begin;
drop function if exists public.review_fcr_access(uuid,text);
create or replace function public.review_fcr_access(target_user uuid,decision text,expected_status text default 'pending')
returns public.fcr_access_requests language plpgsql security definer set search_path=''
as $$declare request public.fcr_access_requests;begin
 if not public.is_fcr_admin() then raise exception 'Solo el administrador puede revisar solicitudes' using errcode='42501';end if;
 if decision not in ('approved','rejected') or decision is null then raise exception 'Decisión inválida' using errcode='22023';end if;
 select * into request from public.fcr_access_requests where user_id=target_user for update;
 if not found then raise exception 'Solicitud inexistente' using errcode='P0002';end if;
 if exists(select 1 from public.fcr_access_admins where user_id=target_user) then raise exception 'No se modifica un administrador desde solicitudes' using errcode='42501';end if;
 if expected_status is null or expected_status not in ('pending','rejected') or request.status<>expected_status then raise exception 'La solicitud cambió. Actualizá la lista.' using errcode='40001';end if;
 if request.status='rejected' and decision<>'approved' then raise exception 'Una solicitud rechazada solo puede aprobarse' using errcode='22023';end if;
 if decision='approved' then
   insert into public.fcr_supervisors(user_id) values(target_user) on conflict do nothing;
 else
   delete from public.fcr_supervisors where user_id=target_user;
 end if;
 update public.fcr_access_requests set status=decision,reviewed_by=auth.uid(),reviewed_at=now()
 where user_id=target_user returning * into request;
 return request;
end$$;
revoke all on function public.review_fcr_access(uuid,text,text) from public,anon;
grant execute on function public.review_fcr_access(uuid,text,text) to authenticated;
commit;
