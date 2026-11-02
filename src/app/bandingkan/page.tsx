import { listUmkm } from "@/data/umkm-repository";
import { CompareView } from "@/features/umkm/components/compare-view";

export const metadata = { title: "Bandingkan UMKM" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const items = await listUmkm();

  return <CompareView items={items} firstId={a} secondId={b} />;
}
