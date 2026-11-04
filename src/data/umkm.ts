import records from "./umkm-records.json";
import type { Umkm } from "@/features/umkm/types";

// Observed businesses from the supplied Pendataan UMKM workbook.
export const umkmData = records as Umkm[];
export function getUmkmById(id: string) { return umkmData.find(item => item.id === id); }
