"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, CirclePlus, Download, History, Pencil, Search, Trash2, TriangleAlert } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { Dialog } from "@/components/dialog";
import { SelectMenu } from "@/components/select-menu";
import { formatDate, formatDateTime, formatTime } from "@/features/activity/format";
import { ACTIVITY_ACTION_LABELS, ACTIVITY_ACTOR_LABELS, type ActivityAction, type ActivityActorType, type ActivityChange, type ActivityLog } from "@/features/activity/types";
import { usePersistentState } from "@/lib/ui/use-persistent-state";
import { trackActivity } from "@/features/activity/client";
import { maskedKey } from "@/features/owner/types";

type ActionTab = "all" | ActivityAction;
type ActorFilter = "all" | ActivityActorType;
type Period = "24h" | "7d" | "30d" | "all";


const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS: Record<Period, number> = { "24h": 1, "7d": 7, "30d": 30, all: Infinity };
const ACTOR_OPTIONS: { value: ActorFilter; label: string }[] = [
  { value: "all", label: "Semua pelaku" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "Pengunjung / percobaan masuk" },
  { value: "owner", label: "Pemilik (kunci)" },
];
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "24h", label: "24 jam terakhir" },
  { value: "7d", label: "7 hari terakhir" },
  { value: "30d", label: "30 hari terakhir" },
  { value: "all", label: "Semua waktu" },
];
const ACTION_STYLE: Record<ActivityAction, { className: string; icon: typeof Pencil }> = {
  create: { className: "bdg ok", icon: CirclePlus },
  update: { className: "bdg sec", icon: Pencil },
  delete: { className: "bdg er", icon: Trash2 },
  login: { className: "bdg ok", icon: History }, logout: { className: "bdg sec", icon: History }, login_failed: { className: "bdg er", icon: TriangleAlert }, upload: { className: "bdg sec", icon: CirclePlus }, export: { className: "bdg sec", icon: Download }, view: { className: "bdg sec", icon: History }, access_denied: { className: "bdg er", icon: TriangleAlert },
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toLocaleUpperCase("id-ID")).join("");
}

function ActionBadge({ action }: { action: ActivityAction }) {
  const { className, icon: Icon } = ACTION_STYLE[action];
  return <span className={className}><Icon className="i xs" />{ACTIVITY_ACTION_LABELS[action]}</span>;
}

function Actor({ log }: { log: ActivityLog }) {
  const isOwner = log.actorType === "owner";

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
      <span className="avatar" data-owner={isOwner}>{initials(log.actorName)}</span>
      <div style={{ minWidth: 0 }}>
        <div className="fw5 ell">{log.actorName}</div>
        <div className={`mut ell${isOwner ? " mono" : ""}`} style={{ fontSize: 12 }}>{isOwner ? `Pemilik · ${maskedKey(log.actorKeyHint)}` : ACTIVITY_ACTOR_LABELS[log.actorType]}</div>
      </div>
    </div>
  );
}

/** Before and after of every changed field: red for the old value, green for the new one. */
function ChangeTable({ changes }: { changes: ActivityChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="activity-diff">
      <span className="mut diff-h">Bidang</span>
      <span className="mut diff-h">Sebelum</span>
      <span className="mut diff-h">Sesudah</span>
      {changes.map((change) => (
        <div key={change.field} className="diff-row">
          <span className="fw5">{change.label}</span>
          <span className="diff-old">{change.before}</span>
          <span className="diff-new">{change.after}</span>
        </div>
      ))}
    </div>
  );
}

function DetailDialog({ log, onClose }: { log: ActivityLog; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Waktu", `${formatDateTime(log.createdAt)} WIB`],
    ["Pelaku", log.actorType === "owner" ? `${log.actorName} · Pemilik (kunci ${maskedKey(log.actorKeyHint)})` : `${log.actorName} · ${ACTIVITY_ACTOR_LABELS[log.actorType]}`],
    ["Sumber", log.source || "—"],
    ["Alamat IP", log.ipMasked || "—"],
    ["Perangkat", log.userAgent || "—"],
    ["ID log", log.id],
  ];

  return (
    <Dialog open onClose={onClose} width={640} labelledBy="log-detail-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h2 id="log-detail-title">Detail aktivitas</h2>
          <ActionBadge action={log.action} />
        </div>
        <p>{log.entityLabel} · {log.entitySub || (log.entityType === "umkm" ? "UMKM" : "Kunci akses")}</p>
      </div>
      <div className="card" style={{ boxShadow: "none" }}>
        {rows.map(([label, value]) => (
          <div key={label} className="irow" style={{ padding: "10px 14px", alignItems: "center" }}>
            <span className="mut" style={{ width: 110, flex: "none" }}>{label}</span>
            <span className={label === "ID log" || label === "Alamat IP" ? "mono" : "fw5"} style={{ fontSize: label === "Perangkat" ? 12 : 13, overflowWrap: "anywhere" }}>{value}</span>
          </div>
        ))}
      </div>
      {log.changes.length > 0 ? (
        <>
          <div className="fw6">Perubahan data</div>
          <ChangeTable changes={log.changes} />
        </>
      ) : (
        <p>{log.summary || "Tidak ada rincian perubahan."}</p>
      )}
      <div className="ft">
        {log.entityType === "umkm" && log.entityId && log.action !== "delete" && <Link className="btn o" href={`/umkm/${log.entityId}`}>Buka UMKM</Link>}
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
    </Dialog>
  );
}

function exportCsv(logs: ActivityLog[]) {
  trackActivity("export", "session", "Log aktivitas", `${logs.length} aktivitas diekspor`);
  const rows = [
    ["Waktu", "Aktivitas", "Objek", "Keterangan objek", "Pelaku", "Peran", "Kunci", "Ringkasan", "Sumber"],
    ...logs.map((log) => [
      log.createdAt,
      ACTIVITY_ACTION_LABELS[log.action],
      log.entityLabel,
      log.entitySub,
      log.actorName,
      ACTIVITY_ACTOR_LABELS[log.actorType],
      log.actorKeyHint ? maskedKey(log.actorKeyHint) : "",
      log.summary,
      log.source,
    ]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "log-aktivitas-umkm-banjarsari.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  error?: string;
  storageKey?: string;
}

/** "Log Aktivitas" view of the admin dashboard: who created, changed or deleted what. */
export function ActivityLogPanel({ logs, error, storageKey = "admin" }: ActivityLogPanelProps) {
  const [tab, setTab] = usePersistentState<ActionTab>(`${storageKey}:logs:tab`, "all");
  const [actor, setActor] = usePersistentState<ActorFilter>(`${storageKey}:logs:actor`, "all");
  const [period, setPeriod] = usePersistentState<Period>(`${storageKey}:logs:period`, "7d");
  const [query, setQuery] = usePersistentState(`${storageKey}:logs:query`, "");
  const [page, setPage] = usePersistentState(`${storageKey}:logs:page`, 0);
  const [pageSize, setPageSize] = usePersistentState(`${storageKey}:logs:size`, 10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<ActivityLog | null>(null);

  // One snapshot of "now" per render of the data, so the filters do not shift while the page is open.
  const [now] = useState(() => Date.now());

  const inPeriod = useMemo(
    () => logs.filter((log) => now - new Date(log.createdAt).getTime() <= PERIOD_DAYS[period] * DAY_MS),
    [logs, now, period],
  );
  const counts = {
    all: inPeriod.length,
    create: inPeriod.filter((log) => log.action === "create").length,
    update: inPeriod.filter((log) => log.action === "update").length,
    delete: inPeriod.filter((log) => log.action === "delete").length,
  };

  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();
    return inPeriod.filter((log) => {
      if (tab !== "all" && log.action !== tab) return false;
      if (actor !== "all" && log.actorType !== actor) return false;
      return !normalized || `${log.entityLabel} ${log.entitySub} ${log.actorName} ${log.summary}`.toLocaleLowerCase("id-ID").includes(normalized);
    });
  }, [actor, inPeriod, query, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
      setExpanded(null);
    };
  }

  const actionOptions: { value: ActionTab; label: string }[] = [{ value: "all", label: "Semua aktivitas" }, ...Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => ({ value: value as ActivityAction, label }))];
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "";
  const tiles = [
    { label: periodLabel, value: counts.all, icon: History },
    { label: "Dibuat", value: counts.create, icon: CirclePlus },
    { label: "Diubah", value: counts.update, icon: Pencil },
    { label: "Dihapus", value: counts.delete, icon: Trash2 },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="fw6" style={{ fontSize: 16 }}>Riwayat aktivitas</div>
          <div className="mut" style={{ fontSize: 13, marginTop: 2 }}>Aktivitas Superadmin, Admin, dan pemilik usaha: masuk, keluar, perubahan data, izin akun, unggah, kunjungan, dan ekspor. Log tidak dapat diubah atau dihapus.</div>
        </div>
        <button type="button" className="btn o" disabled={filtered.length === 0} onClick={() => exportCsv(filtered)}><Download className="i" />Ekspor CSV</button>
      </div>

      {error && (
        <div className="alert alert-err" role="alert">
          <TriangleAlert className="i" style={{ color: "var(--des)" }} />
          <div><b>Log aktivitas tidak dapat dimuat</b><span>{error}</span></div>
        </div>
      )}

      <div className="admin-stats">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: "16px 20px" }}>
            <div className="mut" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{label}</span>
              <Icon className="i" />
            </div>
            <div style={{ fontSize: 28, lineHeight: "32px", fontWeight: 600, marginTop: 8, letterSpacing: "-.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="admin-filters">
        <SelectMenu value={tab} options={actionOptions} onChange={reset(setTab)} ariaLabel="Jenis aktivitas" width={180} />
        <span className="filter-spacer" />
        <SelectMenu value={actor} options={ACTOR_OPTIONS} onChange={reset(setActor)} ariaLabel="Pelaku" width={170} />
        <SelectMenu value={period} options={PERIOD_OPTIONS} onChange={reset(setPeriod)} ariaLabel="Periode" width={170} />
        <label className="inp" style={{ width: 240 }}>
          <Search className="i" />
          <input placeholder="Cari usaha atau pelaku" aria-label="Cari usaha atau pelaku" value={query} onChange={(event) => reset(setQuery)(event.target.value)} />
        </label>
      </div>

      <div className="card only-desktop" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktivitas</th>
                <th>Objek</th>
                <th>Pelaku</th>
                <th>Perubahan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((log) => {
                const isOpen = expanded === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr className={isOpen ? "open" : ""}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="fw5">{formatDate(log.createdAt)}</div>
                        <div className="mut" style={{ fontSize: 12 }}>{formatTime(log.createdAt)}</div>
                      </td>
                      <td><ActionBadge action={log.action} /></td>
                      <td>
                        <div className="fw5 ell" style={{ maxWidth: 240 }}>{log.entityLabel}</div>
                        <div className="mut ell" style={{ fontSize: 12, maxWidth: 240 }}>{log.entitySub}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}><Actor log={log} /></td>
                      <td style={{ maxWidth: 320 }}>{log.summary}</td>
                      <td>
                        <button type="button" className="btn ic sm g" aria-label={isOpen ? "Tutup rincian" : "Buka rincian"} aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : log.id)}>
                          {isOpen ? <ChevronUp className="i sm" /> : <ChevronDown className="i sm" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="expand">
                        <td colSpan={6}>
                          <ChangeTable changes={log.changes} />
                          {log.changes.length === 0 && <span className="mut">{log.summary || "Tidak ada rincian perubahan."}</span>}
                          <div style={{ marginTop: 12 }}>
                            <button type="button" className="btn o sm" onClick={() => setDetail(log)}>Lihat detail lengkap</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {pageItems.length === 0 && (
                <tr><td colSpan={6} className="mut" style={{ textAlign: "center", padding: 32 }}>{logs.length === 0 ? "Belum ada aktivitas tercatat." : "Tidak ada aktivitas untuk filter ini."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="only-mobile" style={{ flexDirection: "column", gap: 12 }}>
        {pageItems.map((log) => (
          <button key={log.id} type="button" className="card log-card" onClick={() => setDetail(log)}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <ActionBadge action={log.action} />
              <span className="mono mut" style={{ fontSize: 12 }}>{formatDateTime(log.createdAt)}</span>
            </span>
            <span style={{ textAlign: "left" }}>
              <span className="fw5" style={{ display: "block" }}>{log.entityLabel}</span>
              <span className="mut" style={{ display: "block", fontSize: 12 }}>{log.entitySub}</span>
            </span>
            <span style={{ textAlign: "left" }}>{log.summary}</span>
            <span className="log-card-actor"><Actor log={log} /></span>
          </button>
        ))}
        {pageItems.length === 0 && <div className="card mut" style={{ textAlign: "center", padding: 24 }}>{logs.length === 0 ? "Belum ada aktivitas tercatat." : "Tidak ada aktivitas untuk filter ini."}</div>}
      </div>

      <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(0); setExpanded(null); }} />

      {detail && <DetailDialog log={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

