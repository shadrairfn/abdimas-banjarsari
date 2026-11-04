create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(name) between 2 and 60),
  icon_key text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.umkm (
  id uuid primary key default gen_random_uuid(),
  source_no integer unique,
  name text not null check (char_length(name) between 2 and 120),
  owner_name text check (owner_name is null or char_length(owner_name) <= 120),
  products text check (products is null or char_length(products) <= 500),
  address text check (address is null or char_length(address) <= 500),
  category_id uuid not null references public.categories(id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_status text not null default 'estimated' check (location_status in ('estimated', 'verified', 'outside')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists umkm_category_id_idx on public.umkm(category_id);
create index if not exists umkm_location_idx on public.umkm(latitude, longitude);

insert into public.categories (slug, name, icon_key, color) values
  ('camilan', 'Camilan', 'cookie', '#9a5d08'),
  ('makanan', 'Makanan', 'cooking-pot', '#b45309'),
  ('minuman', 'Minuman', 'cup-soda', '#0f766e'),
  ('kue-dan-roti', 'Kue & Roti', 'cake-slice', '#7e22ce')
on conflict (slug) do update set name = excluded.name, icon_key = excluded.icon_key, color = excluded.color;

alter table public.categories enable row level security;
alter table public.umkm enable row level security;

create policy "categories are publicly readable" on public.categories for select using (is_active);
create policy "active umkm are publicly readable" on public.umkm for select using (is_active);
create policy "admins can insert umkm" on public.umkm for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can update umkm" on public.umkm for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can delete umkm" on public.umkm for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists umkm_set_updated_at on public.umkm;
create trigger umkm_set_updated_at before update on public.umkm for each row execute function public.set_updated_at();
