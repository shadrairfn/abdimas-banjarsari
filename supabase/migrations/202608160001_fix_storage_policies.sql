-- Migration: 202608160001_fix_storage_policies.sql
-- Description: Make the 'umkm-photos' storage policies use the same admin check as the umkm table
-- (public.is_admin(), which respects admins.is_active) and add the missing update policy.

drop policy if exists "Admins can upload photos" on storage.objects;
drop policy if exists "Admins can update and delete photos" on storage.objects;
drop policy if exists "Admins can update photos" on storage.objects;
drop policy if exists "Admins can delete photos" on storage.objects;

create policy "Admins can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'umkm-photos' and public.is_admin());

create policy "Admins can update photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'umkm-photos' and public.is_admin())
  with check (bucket_id = 'umkm-photos' and public.is_admin());

create policy "Admins can delete photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'umkm-photos' and public.is_admin());
