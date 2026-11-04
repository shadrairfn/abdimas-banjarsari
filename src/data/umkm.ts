import type { Umkm } from "@/features/umkm/types";

import records from "./umkm-records.json";

// Observed businesses from the supplied Pendataan UMKM workbook.
export const umkmData = records as Umkm[];
/** Find a business in the bundled read-only data by its stable identifier. */
export function getUmkmById(id: string) {
  return umkmData.find((item) => item.id === id);
}
