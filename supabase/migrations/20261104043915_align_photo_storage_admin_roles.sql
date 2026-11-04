-- Use current database access, including Superadmin and revoked Google approval.
alter policy "Admins can upload photos" on storage.objects
  with check (bucket_id = 'umkm-photos' and (select public.is_admin()));
alter policy "Admins can update and delete photos" on storage.objects
  using (bucket_id = 'umkm-photos' and (select public.is_admin()));
notify pgrst, 'reload schema';
