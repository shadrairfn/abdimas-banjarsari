-- Migration: 202609010001_owner_keys_and_activity_log.sql
-- Description: multiple social links per UMKM, owner access keys, and an append-only activity log.

-- 1. Several social links per UMKM. The old single `website` column is kept in sync with the first link.
alter table public.umkm
  add column if not exists socials jsonb not null default '[]'::jsonb;

update public.umkm
set socials = jsonb_build_array(jsonb_build_object('platform', 'Lainnya', 'handle', btrim(website)))
where socials = '[]'::jsonb
  and website is not null
  and btrim(website) <> '';

-- 2. Owner access keys. Only the keyed hash is stored; the full key is shown once when it is created.
create table if not exists public.owner_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  key_hint text not null check (char_length(key_hint) between 1 and 16),
  -- null: the key opens an empty form and is linked to the UMKM the owner creates.
  umkm_id uuid references public.umkm(id) on delete cascade,
  owner_label text check (owner_label is null or char_length(owner_label) <= 120),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_keys_umkm_id_idx on public.owner_keys(umkm_id);

-- Failed key attempts per IP address, used to slow down guessing.
create table if not exists public.owner_key_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists owner_key_attempts_ip_idx on public.owner_key_attempts(ip, created_at desc);

alter table public.owner_keys enable row level security;
alter table public.owner_key_attempts enable row level security;

-- Writes always go through the service-role key on the server, so admins only need to read.
drop policy if exists "admins can read owner keys" on public.owner_keys;
create policy "admins can read owner keys"
on public.owner_keys
for select
to authenticated
using (public.is_admin());

drop trigger if exists owner_keys_set_updated_at on public.owner_keys;
create trigger owner_keys_set_updated_at
before update on public.owner_keys
for each row execute function public.set_updated_at();

-- 3. Activity log of every create, update and delete made by an admin or by an owner key.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null check (entity_type in ('umkm', 'owner_key')),
  entity_id uuid,
  entity_label text not null,
  entity_sub text,
  actor_type text not null check (actor_type in ('admin', 'owner')),
  actor_id uuid,
  actor_name text not null,
  actor_key_hint text,
  summary text not null default '',
  changes jsonb not null default '[]'::jsonb,
  source text,
  ip_masked text,
  user_agent text
);

create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);

alter table public.activity_logs enable row level security;

drop policy if exists "admins can read activity logs" on public.activity_logs;
create policy "admins can read activity logs"
on public.activity_logs
for select
to authenticated
using (public.is_admin());

-- The log is append-only: nobody, not even the service role, can edit or remove entries.
create or replace function public.prevent_activity_log_change() returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_logs is append-only';
end;
$$;

drop trigger if exists activity_logs_append_only on public.activity_logs;
create trigger activity_logs_append_only
before update or delete on public.activity_logs
for each row execute function public.prevent_activity_log_change();
