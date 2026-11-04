export type ActivityAction = "create" | "update" | "delete" | "login" | "logout" | "login_failed" | "upload" | "export" | "view" | "access_denied";
export type ActivityEntityType = "umkm" | "owner_key" | "admin" | "category" | "profile" | "session" | "photo";
export type ActivityActorType = "superadmin" | "admin" | "owner" | "system";

/** One changed field of an update: both values are already formatted for reading. */
export interface ActivityChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ActivityLog {
  id: string;
  createdAt: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string | null;
  entityLabel: string;
  entitySub: string;
  actorType: ActivityActorType;
  actorName: string;
  // Hint of the owner key that was used, for example "BNJ-7K2F".
  actorKeyHint: string;
  summary: string;
  changes: ActivityChange[];
  source: string;
  ipMasked: string;
  userAgent: string;
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  create: "Dibuat",
  update: "Diubah",
  delete: "Dihapus",
  login: "Masuk", logout: "Keluar", login_failed: "Gagal masuk", upload: "Unggah foto", export: "Ekspor", view: "Dilihat", access_denied: "Ditolak",
};

export const ACTIVITY_ACTOR_LABELS: Record<ActivityActorType, string> = {
  superadmin: "Superadmin", admin: "Admin", owner: "Pemilik (kunci)", system: "Pengunjung",
};
