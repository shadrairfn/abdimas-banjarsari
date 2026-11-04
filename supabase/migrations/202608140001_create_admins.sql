-- Admin identities are created in Supabase Auth by scripts/seed-admin.mjs.
-- This migration stores the application-facing profile and centralizes RLS checks.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admins_active_idx on public.admins(is_active);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = check_user_id
      and is_active = true
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.admins enable row level security;

drop policy if exists "admins can read their own profile" on public.admins;
create policy "admins can read their own profile"
on public.admins
for select
to authenticated
using (user_id = auth.uid() and is_active = true);

-- Replace the original metadata-only policies with the central admin registry.
drop policy if exists "admins can insert umkm" on public.umkm;
drop policy if exists "admins can update umkm" on public.umkm;
drop policy if exists "admins can delete umkm" on public.umkm;

create policy "admins can insert umkm"
on public.umkm
for insert
to authenticated
with check (public.is_admin());

create policy "admins can update umkm"
on public.umkm
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can delete umkm"
on public.umkm
for delete
to authenticated
using (public.is_admin());

drop trigger if exists admins_set_updated_at on public.admins;
create trigger admins_set_updated_at
before update on public.admins
for each row execute function public.set_updated_at();
