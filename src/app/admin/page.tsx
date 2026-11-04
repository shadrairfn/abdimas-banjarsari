import { redirect } from "next/navigation";
import { listActivityLogs } from "@/data/activity-log-repository";
import { listAdmins } from "@/data/admin-repository";
import { listOwnerKeys } from "@/data/owner-key-repository";
import { listUmkm } from "@/data/umkm-repository";
import { AdminDashboard } from "@/features/umkm/components/admin-dashboard";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/features/admin/types";

export default async function AdminPage() {
  const configured = isSupabaseConfigured();
  let adminEmail: string | undefined;
  let adminRole: "superadmin" | "admin" = "admin";
  let profile: AdminProfile | undefined;
  if (configured) {
    const supabase = await createSupabaseServerClient();
    const user = await getActiveAdmin(supabase);
    if (!user) redirect("/admin/login");
    adminEmail = user.email;
    adminRole = user.adminRole;
    profile = user.profile;
  }
  const [items, adminList, ownerKeys, activity] = await Promise.all([listUmkm(), listAdmins(), listOwnerKeys(), listActivityLogs()]);

  return (
    <AdminDashboard
      items={items}
      adminList={adminList}
      ownerKeys={ownerKeys.items}
      ownerKeysError={ownerKeys.error}
      logs={activity.items}
      logsError={activity.error}
      configured={configured}
      adminEmail={adminEmail}
      adminRole={adminRole}
      profile={profile}
    />
  );
}
