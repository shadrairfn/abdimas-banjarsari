import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { message: "Supabase belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return Response.json({ message: "ID UMKM tidak valid." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = await getActiveAdmin(supabase);
  if (!admin) {
    return Response.json({ message: "Akses admin diperlukan." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("umkm")
    .delete()
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return Response.json(
      { message: `UMKM gagal dihapus: ${error.message}` },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json({ message: "UMKM tidak ditemukan." }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/umkm");
  revalidatePath(`/umkm/${parsedId.data}`);

  return Response.json({
    success: true,
    message: "UMKM berhasil dihapus.",
    id: parsedId.data,
  });
}
