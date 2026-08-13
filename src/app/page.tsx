import { listUmkm } from "@/data/umkm-repository";
import { MapExplorer } from "@/features/map/components/map-explorer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;
  const items = await listUmkm();
  return <MapExplorer initialItems={items} initialSelectedId={selected} />;
}
