import { CircleCheck, MapPinOff, TriangleAlert } from "lucide-react";
import type { LocationStatus } from "@/features/umkm/types";

/** Outlined badge for the state of a map point: verified, estimated or outside the village. */
export function StatusBadge({ status }: { status: LocationStatus }) {
  if (status === "verified") {
    return <span className="bdg out"><CircleCheck className="i xs ok-i" />Terverifikasi</span>;
  }

  if (status === "outside") {
    return <span className="bdg out"><MapPinOff className="i xs wn-i" />Di luar desa</span>;
  }

  return <span className="bdg out"><TriangleAlert className="i xs wn-i" />Perkiraan</span>;
}
