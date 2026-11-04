-- Migration: 202608150001_add_umkm_extended_fields.sql
-- Description: Tambahkan kolom kontak, website, waktu buka & tutup, array foto, dan bucket storage

-- 1. Tambahkan kolom baru pada tabel umkm
alter table public.umkm
  add column if not exists contact text check (contact is null or char_length(contact) <= 50),
  add column if not exists website text check (website is null or char_length(website) <= 255),
  add column if not exists opening_hours text check (opening_hours is null or char_length(opening_hours) <= 10),
  add column if not exists closing_hours text check (closing_hours is null or char_length(closing_hours) <= 10),
  add column if not exists photos text[] not null default '{}';

-- 2. Inisialisasi Supabase Storage bucket 'umkm-photos' jika belum ada
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'umkm-photos',
  'umkm-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Kebijakan RLS Storage untuk 'umkm-photos'
create policy "Photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'umkm-photos');

create policy "Admins can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'umkm-photos' and
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can update and delete photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'umkm-photos' and
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
