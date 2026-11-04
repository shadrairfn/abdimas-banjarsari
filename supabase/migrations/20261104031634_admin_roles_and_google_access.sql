alter table public.admins
  add column role text not null default 'admin' check (role in ('superadmin', 'admin')),
  add column google_login_allowed boolean not null default false;

-- Bootstrap the existing owner account identified by the user; no generated IDs.
update public.admins set role = 'superadmin', google_login_allowed = true
where lower(email) = 'superadmin@gmail.com';

-- Management writes use server-only credentials after requireSuperadmin().
-- Clients cannot edit their own role, activation state, or Google permission.
revoke all on public.admins from anon;
revoke insert, update, delete, truncate, references, trigger on public.admins from authenticated;
grant select on public.admins to authenticated;

-- Re-evaluate Google permission against the database on every protected query,
-- including requests made with an already-issued OAuth access token.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = check_user_id and is_active = true
      and (google_login_allowed or not coalesce(auth.jwt()->'amr' @> '[{"method":"oauth"}]'::jsonb, false))
  );
$$;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
