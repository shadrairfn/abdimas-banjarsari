import { revalidatePath } from "next/cache";

/** Refresh every page and API that shows UMKM data after a change. */
export function revalidateUmkmPages(umkmId?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/umkm");

  if (umkmId) {
    revalidatePath(`/umkm/${umkmId}`);
  }
}
