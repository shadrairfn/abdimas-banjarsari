import { redirect } from "next/navigation";
import { listAdmins } from "@/data/admin-repository";
import { listUmkm } from "@/data/umkm-repository";
import { AdminDashboard } from "@/features/umkm/components/admin-dashboard";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const configured = isSupabaseConfigured();
  let adminEmail: string | undefined;
  if (configured) {
    const supabase = await createSupabaseServerClient();
    const user = await getActiveAdmin(supabase);
    if (!user) redirect("/admin/login");
    adminEmail = user.email;
  }
  const [items, adminList] = await Promise.all([listUmkm(), listAdmins()]);
  return <AdminDashboard items={items} adminList={adminList} configured={configured} adminEmail={adminEmail} />;
}
