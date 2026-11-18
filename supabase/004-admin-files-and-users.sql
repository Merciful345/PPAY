begin;
-- Los supervisores conservan la lectura; solo el administrador gestiona originales.
drop policy if exists fcr_imports_insert on public.fcr_imports;
drop policy if exists fcr_imports_update on public.fcr_imports;
drop policy if exists fcr_imports_delete on public.fcr_imports;
create policy fcr_imports_insert on public.fcr_imports for insert to authenticated
 with check((select public.is_fcr_admin()) and created_by=(select auth.uid()));
create policy fcr_imports_update on public.fcr_imports for update to authenticated
 using((select public.is_fcr_admin())) with check((select public.is_fcr_admin()));
create policy fcr_imports_delete on public.fcr_imports for delete to authenticated
 using((select public.is_fcr_admin()));
drop policy if exists fcr_files_insert on storage.objects;
drop policy if exists fcr_files_delete on storage.objects;
create policy fcr_files_insert on storage.objects for insert to authenticated
 with check(bucket_id='fcr-files' and (select public.is_fcr_admin()) and (storage.foldername(name))[1]='files');
create policy fcr_files_delete on storage.objects for delete to authenticated
 using(bucket_id='fcr-files' and (select public.is_fcr_admin()));

create or replace function public.list_fcr_users(filter_status text default 'all',page_offset integer default 0,page_limit integer default 1000)
returns table(user_id uuid,email text,full_name text,status text,created_at timestamptz,requested_at timestamptz,reviewed_at timestamptz,last_sign_in_at timestamptz,is_admin boolean)
language plpgsql stable security definer set search_path=''
as $$begin
 if not public.is_fcr_admin() then raise exception 'Solo el administrador puede consultar los usuarios' using errcode='42501';end if;
 if filter_status not in ('all','pending','approved','rejected') or filter_status is null then raise exception 'Estado inválido' using errcode='22023';end if;
 return query
 select u.id,u.email::text,left(coalesce(r.full_name,u.raw_user_meta_data->>'full_name',''),160),
 coalesce(r.status,'pending'),u.created_at,coalesce(r.requested_at,u.created_at),r.reviewed_at,u.last_sign_in_at,
 exists(select 1 from public.fcr_access_admins a where a.user_id=u.id)
 from auth.users u left join public.fcr_access_requests r on r.user_id=u.id
 where filter_status='all' or coalesce(r.status,'pending')=filter_status
 order by coalesce(r.requested_at,u.created_at),u.id
 offset greatest(coalesce(page_offset,0),0) limit least(greatest(coalesce(page_limit,1000),1),1000);
end$$;
revoke all on function public.list_fcr_users(text,integer,integer) from public,anon;
grant execute on function public.list_fcr_users(text,integer,integer) to authenticated;
commit;
