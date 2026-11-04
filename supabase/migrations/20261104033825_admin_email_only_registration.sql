-- A stable account ID lets approved Google emails exist before their first sign-in.
-- Existing Auth links, account roles, permissions and sessions are preserved.
alter table public.admins add column id uuid not null default gen_random_uuid();
alter table public.admins drop constraint admins_pkey;
alter table public.admins add constraint admins_pkey primary key (id);
alter table public.admins alter column user_id drop not null;
alter table public.admins add constraint admins_user_id_key unique (user_id);
alter table public.admins add constraint admins_linked_superadmin_check
  check (user_id is not null or role = 'admin');

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = check_user_id and is_active = true
      and (
        not coalesce(auth.jwt()->'amr' @> '[{"method":"oauth"}]'::jsonb, false)
        or (google_login_allowed and lower(email) = lower(auth.jwt()->>'email'))
      )
  );
$$;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
