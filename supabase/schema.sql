begin;

create table if not exists public.fcr_supervisor_emails (
 email text primary key check(email=lower(trim(email)))
);
alter table public.fcr_supervisor_emails enable row level security;
revoke all on public.fcr_supervisor_emails from anon,authenticated;

create table if not exists public.fcr_supervisors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.fcr_supervisors enable row level security;
revoke all on public.fcr_supervisors from anon, authenticated;
grant select on public.fcr_supervisors to authenticated;
drop policy if exists fcr_supervisor_self on public.fcr_supervisors;
create policy fcr_supervisor_self on public.fcr_supervisors
 for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.sync_fcr_supervisor()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if new.email_confirmed_at is not null and exists(select 1 from public.fcr_supervisor_emails where email=lower(trim(new.email))) then
   insert into public.fcr_supervisors(user_id) values(new.id) on conflict do nothing;
 else
   delete from public.fcr_supervisors where user_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.sync_fcr_supervisor() from public,anon,authenticated;
drop trigger if exists sync_fcr_supervisor_user on auth.users;
create trigger sync_fcr_supervisor_user after insert or update of email,email_confirmed_at on auth.users
 for each row execute function public.sync_fcr_supervisor();

create or replace function public.is_fcr_supervisor()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.fcr_supervisors where user_id=(select auth.uid())); $$;
revoke all on function public.is_fcr_supervisor() from public;
grant execute on function public.is_fcr_supervisor() to authenticated;

create table if not exists public.fcr_imports (
 id uuid primary key,
 object_path text not null unique,
 name text not null,
 type text not null default '',
 size bigint not null check(size>=0 and size<=52428800),
 last_modified bigint not null default 0,
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),
 period text not null default '' check(period='' or period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 summary jsonb,
 source_metadata text not null default '',
 created_at timestamptz not null default now(),
 saved_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id),
 unique(digest,period),
 check(object_path like 'files/' || id::text || '/%')
);
alter table public.fcr_imports enable row level security;
revoke all on public.fcr_imports from anon,authenticated;
grant select,insert,delete on public.fcr_imports to authenticated;
grant update(period,summary,source_metadata,saved_at) on public.fcr_imports to authenticated;
drop policy if exists fcr_imports_read on public.fcr_imports;
drop policy if exists fcr_imports_insert on public.fcr_imports;
drop policy if exists fcr_imports_update on public.fcr_imports;
drop policy if exists fcr_imports_delete on public.fcr_imports;
create policy fcr_imports_read on public.fcr_imports for select to authenticated using ((select public.is_fcr_supervisor()));
create policy fcr_imports_insert on public.fcr_imports for insert to authenticated with check ((select public.is_fcr_supervisor()) and created_by=(select auth.uid()));
create policy fcr_imports_update on public.fcr_imports for update to authenticated using ((select public.is_fcr_supervisor())) with check ((select public.is_fcr_supervisor()));
create policy fcr_imports_delete on public.fcr_imports for delete to authenticated using ((select public.is_fcr_supervisor()));

insert into storage.buckets (id,name,public,file_size_limit)
 values ('fcr-files','fcr-files',false,52428800)
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;
drop policy if exists fcr_files_read on storage.objects;
drop policy if exists fcr_files_insert on storage.objects;
drop policy if exists fcr_files_delete on storage.objects;
create policy fcr_files_read on storage.objects for select to authenticated using (bucket_id='fcr-files' and (select public.is_fcr_supervisor()));
create policy fcr_files_insert on storage.objects for insert to authenticated with check (bucket_id='fcr-files' and (select public.is_fcr_supervisor()) and (storage.foldername(name))[1]='files');
create policy fcr_files_delete on storage.objects for delete to authenticated using (bucket_id='fcr-files' and (select public.is_fcr_supervisor()));
-- No hay permiso UPDATE de objetos: los archivos se cargan sin sobrescribir.
commit;
