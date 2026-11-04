"use client";

import {
  Ban,
  CircleCheck,
  Clock,
  KeyRound,
  Search,
  Settings2,
  TimerOff,
  TriangleAlert,
} from "lucide-react";
import { useMemo } from "react";

import { Pagination } from "@/components/pagination";
import { formatDate, formatDateTime } from "@/features/activity/format";
import {
  maskedKey,
  OWNER_KEY_STATUS_LABELS,
  type OwnerKeyStatus,
  type OwnerKeySummary,
} from "@/features/owner/types";
import { displayText } from "@/features/umkm/format";
import { usePersistentState } from "@/lib/ui/use-persistent-state";

type KeyTab = "all" | "active" | "pending" | "inactive";

const STATUS_STYLE: Record<OwnerKeyStatus, { className: string; icon: typeof CircleCheck }> = {
  active: { className: "bdg ok", icon: CircleCheck },
  pending: { className: "bdg sec", icon: Clock },
  revoked: { className: "bdg er", icon: Ban },
  expired: { className: "bdg sec", icon: TimerOff },
};

export function KeyStatusBadge({ status }: { status: OwnerKeyStatus }) {
  const { className, icon: Icon } = STATUS_STYLE[status];

  return (
    <span className={className}>
      <Icon className="i xs" />
      {OWNER_KEY_STATUS_LABELS[status]}
    </span>
  );
}

interface OwnerKeysPanelProps {
  keys: OwnerKeySummary[];
  error?: string;
  configured: boolean;
  storageKey?: string;
  onCreate: () => void;
  onManage: (key: OwnerKeySummary) => void;
}

/** "Kunci Akses" view of the admin dashboard: every key, its status and what it opens. */
export function OwnerKeysPanel({
  keys,
  error,
  configured,
  storageKey = "admin",
  onCreate,
  onManage,
}: OwnerKeysPanelProps) {
  const [tab, setTab] = usePersistentState<KeyTab>(`${storageKey}:keys:tab`, "all");
  const [query, setQuery] = usePersistentState(`${storageKey}:keys:query`, "");
  const [page, setPage] = usePersistentState(`${storageKey}:keys:page`, 0);
  const [pageSize, setPageSize] = usePersistentState(`${storageKey}:keys:size`, 10);

  const counts = {
    all: keys.length,
    active: keys.filter((key) => key.status === "active").length,
    pending: keys.filter((key) => key.status === "pending").length,
    inactive: keys.filter((key) => key.status === "revoked" || key.status === "expired").length,
  };
  const tabs: { key: KeyTab; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "active", label: "Aktif" },
    { key: "pending", label: "Belum dipakai" },
    { key: "inactive", label: "Nonaktif" },
  ];

  const visible = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();

    return keys.filter((key) => {
      const hasMatchingTab =
        tab === "all" ||
        (tab === "inactive"
          ? key.status === "revoked" || key.status === "expired"
          : key.status === tab);
      const hasMatchingQuery =
        !normalized ||
        `${key.hint} ${key.umkmName} ${key.ownerLabel}`
          .toLocaleLowerCase("id-ID")
          .includes(normalized);

      return hasMatchingTab && hasMatchingQuery;
    });
  }, [keys, query, tab]);

  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / pageSize) - 1));
  const pageItems = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="fw6" style={{ fontSize: 16 }}>
            Kunci akses pemilik usaha
          </div>
          <div className="mut" style={{ fontSize: 13, marginTop: 2 }}>
            Kunci memberi pemilik izin penuh untuk mengisi dan mengubah data tokonya.
          </div>
        </div>
        <button type="button" className="btn" disabled={!configured} onClick={onCreate}>
          <KeyRound className="i" />
          Buat kunci
        </button>
      </div>

      {error && (
        <div className="alert alert-err" role="alert">
          <TriangleAlert className="i" style={{ color: "var(--des)" }} />
          <div>
            <b>Kunci akses tidak dapat dimuat</b>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="admin-filters">
        <div className="tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "on" : ""}
              onClick={() => {
                setTab(item.key);
                setPage(0);
              }}
            >
              {item.label} {counts[item.key]}
            </button>
          ))}
        </div>
        <span className="filter-spacer" />
        <label className="inp" style={{ width: 260 }}>
          <Search className="i" />
          <input
            placeholder="Cari usaha, pemilik, atau kunci"
            aria-label="Cari kunci"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>

      <div className="card only-desktop" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Kunci</th>
                <th>Usaha</th>
                <th>Masa berlaku</th>
                <th>Terakhir dipakai</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((key) => (
                <tr key={key.id}>
                  <td>
                    <span className="key-chip mono">
                      <KeyRound className="i xs" />
                      {maskedKey(key.hint)}
                    </span>
                  </td>
                  <td>
                    <div
                      className={`fw5 ell${key.umkmName ? "" : " mut"}`}
                      style={{ maxWidth: 260 }}
                    >
                      {key.umkmName ? displayText(key.umkmName) : "UMKM baru"}
                    </div>
                    {key.ownerLabel && (
                      <div className="mut" style={{ fontSize: 13 }}>
                        {key.ownerLabel}
                        {key.umkmName ? "" : " · belum diisi"}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{getKeyExpiryLabel(key)}</td>
                  <td className={key.lastUsedAt ? "" : "mut"} style={{ whiteSpace: "nowrap" }}>
                    {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Belum pernah"}
                  </td>
                  <td>
                    <KeyStatusBadge status={key.status} />
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn ic sm g"
                        aria-label={`Kelola kunci ${maskedKey(key.hint)}`}
                        title="Kelola kunci"
                        disabled={!configured}
                        onClick={() => onManage(key)}
                      >
                        <Settings2 className="i sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="mut" style={{ textAlign: "center", padding: 32 }}>
                    {keys.length === 0
                      ? "Belum ada kunci akses. Buat kunci pertama untuk pemilik usaha."
                      : "Tidak ada kunci yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="only-mobile" style={{ flexDirection: "column", gap: 12 }}>
        {pageItems.map((key) => (
          <div key={key.id} className="card key-card">
            <div className="key-card-head">
              <span className="key-chip mono">
                <KeyRound className="i xs" />
                {maskedKey(key.hint)}
              </span>
              <KeyStatusBadge status={key.status} />
            </div>
            <div>
              <div className="fw5">{key.umkmName ? displayText(key.umkmName) : "UMKM baru"}</div>
              {key.ownerLabel && (
                <div className="mut">
                  {key.ownerLabel}
                  {key.umkmName ? "" : " · belum diisi"}
                </div>
              )}
            </div>
            <div className="key-card-meta">
              <div>
                <span className="mut">Masa berlaku</span>
                {key.expiresAt ? formatDate(key.expiresAt) : "Tanpa batas"}
              </div>
              <div>
                <span className="mut">Terakhir dipakai</span>
                {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Belum pernah"}
              </div>
            </div>
            <button
              type="button"
              className="btn o sm"
              disabled={!configured}
              onClick={() => onManage(key)}
              aria-label={`Kelola kunci ${maskedKey(key.hint)}`}
            >
              <Settings2 className="i sm" />
              Kelola kunci
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="card mut" style={{ padding: 24, textAlign: "center" }}>
            {keys.length === 0
              ? "Belum ada kunci akses. Buat kunci pertama untuk pemilik usaha."
              : "Tidak ada kunci yang cocok."}
          </div>
        )}
      </div>
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={visible.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />
    </>
  );
}

function getKeyExpiryLabel(key: OwnerKeySummary) {
  if (!key.expiresAt) {
    return "Tanpa batas";
  }

  const prefix = key.status === "expired" ? "Berakhir" : "Sampai";

  return prefix + " " + formatDate(key.expiresAt);
}
