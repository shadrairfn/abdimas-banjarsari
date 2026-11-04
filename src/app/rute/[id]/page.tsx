import { notFound } from "next/navigation";
import { getUmkm } from "@/data/umkm-repository";
import { RouteView } from "@/features/map/components/route-view";

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const item = await getUmkm((await params).id);
  if (!item) notFound();
  return <RouteView item={item} />;
}
