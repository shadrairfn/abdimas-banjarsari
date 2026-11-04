alter table public.admins
  add column avatar_url text not null default '',
  add column phone text not null default '',
  add column bio text not null default '',
  add column profile_source text not null default 'manual' check (profile_source in ('manual','google'));
alter table public.admins drop constraint admins_linked_superadmin_check;

-- A Google Superadmin invitation is approved by an existing Superadmin, then linked on sign-in.
-- Keep at least one active, already-linked Superadmin even under concurrent requests.
create or replace function public.protect_last_superadmin() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.role = 'superadmin' and old.is_active and old.user_id is not null then
    if tg_op = 'DELETE' or not new.is_active or new.role <> 'superadmin' or new.user_id is null then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('public.admins.active-superadmin', 0));
      if not exists(select 1 from public.admins where role='superadmin' and is_active and user_id is not null and id<>old.id) then
        raise exception 'Superadmin aktif terakhir tidak dapat dinonaktifkan atau dihapus.';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger admins_protect_last_superadmin before update or delete on public.admins
for each row execute function public.protect_last_superadmin();

alter table public.umkm add column catalog jsonb not null default '[]'::jsonb
  check (jsonb_typeof(catalog)='array' and jsonb_array_length(catalog)<=50);
-- Preserve imported descriptions and ranges verbatim; never invent numeric prices.
update public.umkm set catalog=jsonb_build_array(jsonb_build_object(
  'id',gen_random_uuid()::text,'name',left(coalesce(nullif(products,''),name),120),
  'price',null,'priceLabel',coalesce(price_description,''),'unit','',
  'description',case when char_length(coalesce(products,''))>120 then products else '' end,
  'photoUrl',coalesce(photos[1],''))) where catalog='[]'::jsonb and coalesce(price_description,'')<>'';

create unique index categories_name_normalized_key on public.categories(lower(btrim(name)));

alter table public.activity_logs drop constraint activity_logs_action_check;
alter table public.activity_logs add constraint activity_logs_action_check
  check(action in ('create','update','delete','login','logout','login_failed','upload','export','view','access_denied'));
alter table public.activity_logs drop constraint activity_logs_entity_type_check;
alter table public.activity_logs add constraint activity_logs_entity_type_check
  check(entity_type in ('umkm','owner_key','admin','category','profile','session','photo'));
alter table public.activity_logs drop constraint activity_logs_actor_type_check;
alter table public.activity_logs add constraint activity_logs_actor_type_check
  check(actor_type in ('superadmin','admin','owner','system'));
notify pgrst, 'reload schema';
