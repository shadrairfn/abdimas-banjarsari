# Production compatibility hotfix

Base: ff2985a (feat: hide list umkm). Branch: codex/hotfix-production.

The deployed application selected and wrote public.umkm.location_status after the shared database removed it. This patch removes that dependency and its obsolete controls/badges/filters. It retains the old interface and MapLibre implementation. Google Maps, routes, catalogs, Google login, the new sidebar, and password recovery are not included.

The legacy account screen now respects current database roles and active/Google access checks; only Superadmin can create or change account status. Pending Google approvals are omitted from the legacy screen because it requires an Auth user ID. Unknown categories render with an existing pin style.

No database migration or data rollback is required. Existing catalog, price, notes, and other newer columns are preserved when editing from the legacy form.

Validation: production build and ESLint; browser/API checks for 15 real UMKM, map/profile/comparison/admin pages, and temporary UMKM create/edit/delete. Newer database columns remain intact after a legacy edit. Temporary test data is removed.

Publish this branch as a Vercel Preview first. Do not merge the development branch into it. Production promotion is a separate step. This worktree contains a local ignored .env for testing; never commit it.
