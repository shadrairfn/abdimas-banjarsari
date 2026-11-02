import { listUmkm } from "@/data/umkm-repository";
import { MapExplorerLoader } from "@/features/map/components/map-explorer-loader";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;
  const items = await listUmkm();
  return <MapExplorerLoader initialItems={items} initialSelectedId={selected} />;
}
