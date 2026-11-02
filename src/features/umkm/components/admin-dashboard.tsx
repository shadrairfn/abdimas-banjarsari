"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CircleCheck, Download, LayoutDashboard, Loader2, LogOut, Map as MapIcon, MapPin, Pencil, Plus, Power, Search, Store, Trash2, TriangleAlert, UserPlus, Users } from "lucide-react";
import { createAdminAction, signOutAction, toggleAdminStatusAction } from "@/app/admin/actions";
import { Dialog } from "@/components/dialog";
import { Rail } from "@/components/rail";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AdminUser } from "@/data/admin-repository";
import { StatusBadge } from "@/features/umkm/components/status-badge";
import { UmkmFormDialog } from "@/features/umkm/components/umkm-form-dialog";
import { displayText, formatCoordinates } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import type { ActionState } from "@/lib/http/run-action";

type View = "umkm" | "admin";
type StatusTab = "all" | "estimated" | "verified";

const PAGE_SIZE = 8;
const initialState: ActionState = { success: false, message: "" };
const ADMIN_DIALOG_CLOSE_DELAY_MS = 800;

interface AdminDashboardProps {
  items: Umkm[];
  adminList?: AdminUser[];
  configured: boolean;
  adminEmail?: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("id-ID"))
    .join("");
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Store }) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="mut" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        <Icon className="i" />
      </div>
      <div style={{ fontSize: 28, lineHeight: "32px", fontWeight: 600, marginTop: 8, letterSpacing: "-.02em" }}>{value}</div>
    </div>
  );
}

function AddAdminDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(onClose, ADMIN_DIALOG_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onClose, state]);

  return (
    <Dialog open onClose={onClose} labelledBy="add-admin-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="add-admin-title">Tambah admin</h2>
        <p>Akun baru dapat mengelola data UMKM.</p>
      </div>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="fl">
          <label className="lbl" htmlFor="admin-name">Nama</label>
          <label className="inp"><input id="admin-name" name="fullName" placeholder="Nama lengkap" required minLength={2} maxLength={120} autoComplete="off" /></label>
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="admin-email">Email</label>
          <label className="inp"><input id="admin-email" name="email" type="email" placeholder="nama@banjarsari.desa.id" required autoComplete="off" /></label>
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="admin-password">Kata sandi</label>
          <label className="inp"><input id="admin-password" name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        </div>
        {state.message && (
          <div className={`alert${state.success ? "" : " alert-err"}`} role={state.success ? "status" : "alert"}>
            <span style={{ color: state.success ? "var(--fg)" : "var(--des)" }}>{state.message}</span>
          </div>
        )}
        <div className="ft">
          <button type="button" className="btn o" onClick={onClose}>Batal</button>
          <button type="submit" className="btn" disabled={pending}>{pending && <Loader2 className="i spin" />}Simpan</button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ item, onClose }: { item: Umkm; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteUmkm() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/umkm/${item.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "UMKM gagal dihapus.");
      onClose();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UMKM gagal dihapus.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onClose={onClose} hideClose labelledBy="delete-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="delete-title">Hapus {displayText(item.brand)}?</h2>
        <p>Data dan penandanya akan dihapus permanen.</p>
      </div>
      {message && <div className="alert alert-err" role="alert"><span style={{ color: "var(--des)" }}>{message}</span></div>}
      <div className="ft">
        <button type="button" className="btn o" onClick={onClose} disabled={pending}>Batal</button>
        <button type="button" className="btn d" onClick={deleteUmkm} disabled={pending}>
          {pending && <Loader2 className="i spin" />}Hapus
        </button>
      </div>
    </Dialog>
  );
}

export function AdminDashboard({ items, adminList = [], configured, adminEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>("umkm");
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  // undefined: closed, null: new UMKM, item: editing that UMKM.
  const [editing, setEditing] = useState<Umkm | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Umkm | null>(null);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  const verifiedCount = items.filter((item) => item.locationStatus === "verified").length;
  const estimatedCount = items.filter((item) => item.locationStatus === "estimated").length;
  const outsideCount = items.filter((item) => item.locationStatus === "outside").length;

  const filteredItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();
    return items.filter((item) => {
      const matchesQuery = !normalized || `${item.brand} ${item.ownerName} ${item.products} ${item.address}`.toLocaleLowerCase("id-ID").includes(normalized);
      const matchesTab = tab === "all" || item.locationStatus === tab;
      return matchesQuery && matchesTab;
    });
  }, [items, query, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filteredItems.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const rangeStart = filteredItems.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = currentPage * PAGE_SIZE + pageItems.length;

  function changeTab(nextTab: StatusTab) {
    setTab(nextTab);
    setPage(0);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  function exportReview() {
    const rows = [
      ["ID", "Merek", "Pemilik", "Kategori", "Alamat", "Produk", "Latitude", "Longitude", "Status"],
      ...items.map((item) => [item.id, item.brand, item.ownerName, item.subCategory, item.address, item.products, item.latitude, item.longitude, item.locationStatus]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "review-lokasi-umkm-banjarsari.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function toggleAdmin(admin: AdminUser) {
    const result = await toggleAdminStatusAction(admin.userId, !admin.isActive);
    setAdminMessage(result.message);
    if (result.success) router.refresh();
  }

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: items.length },
    { key: "estimated", label: "Perlu verifikasi", count: estimatedCount },
    { key: "verified", label: "Terverifikasi", count: verifiedCount },
  ];
  const railItems = [
    { label: "Data UMKM", icon: "dashboard", active: view === "umkm", onClick: () => setView("umkm") },
    { label: "Admin", icon: "users", active: view === "admin", onClick: () => setView("admin") },
    { label: "Peta publik", icon: "map", href: "/" },
  ] as const;
  const logoutItem = { label: "Keluar", icon: "logout", onClick: () => startTransition(() => { signOutAction(); }) } as const;

  return (
    <div className="app page-min-h" style={{ position: "relative" }}>
      <Rail items={[...railItems]} footerItems={[logoutItem]} />

      <div className="app-body page-min-h" style={{ marginLeft: 56 }}>
        <div className="top">
          <span className="fw5">{view === "umkm" ? "Data UMKM" : "Admin"}</span>
          <span style={{ flex: 1 }} />
          <span className="mut ell">{adminEmail ?? "Mode baca saja"}</span>
          <span className="only-mobile"><ThemeToggle /></span>
        </div>

        <div className="admin-content">
          {!configured && (
            <div className="alert">
              <TriangleAlert className="i" style={{ color: "var(--wnf)" }} />
              <div>
                <b>Supabase belum dikonfigurasi</b>
                <span>Data yang tampil adalah contoh bawaan dan tidak dapat diubah.</span>
              </div>
            </div>
          )}

          {view === "umkm" ? (
            <>
              <div className="admin-stats">
                <StatTile label="Total" value={items.length} icon={Store} />
                <StatTile label="Perlu verifikasi" value={estimatedCount} icon={TriangleAlert} />
                <StatTile label="Terverifikasi" value={verifiedCount} icon={CircleCheck} />
                <StatTile label="Di luar desa" value={outsideCount} icon={MapPin} />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div className="tabs" role="tablist">
                  {tabs.map((item) => (
                    <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? "on" : ""} onClick={() => changeTab(item.key)}>
                      {item.label} {item.count}
                    </button>
                  ))}
                </div>
                <span style={{ flex: 1 }} />
                <label className="inp" style={{ width: 260 }}>
                  <Search className="i" />
                  <input placeholder="Cari usaha atau pemilik" aria-label="Cari usaha atau pemilik" value={query} onChange={(event) => changeQuery(event.target.value)} />
                </label>
                <button type="button" className="btn o" onClick={exportReview}><Download className="i" />Ekspor</button>
                <button type="button" className="btn" disabled={!configured} onClick={() => setEditing(null)}><Plus className="i" />Tambah UMKM</button>
              </div>

              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Usaha</th>
                        <th>Kategori</th>
                        <th>Produk</th>
                        <th>Koordinat</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw5 ell" style={{ maxWidth: 240 }}>{displayText(item.brand)}</div>
                            <div className="mut" style={{ fontSize: 13 }}>{displayText(item.ownerName)}</div>
                          </td>
                          <td><span className="bdg sec">{item.subCategory}</span></td>
                          <td className="mut ell" style={{ maxWidth: 220 }}>{displayText(item.products, "sentence")}</td>
                          <td className="mono mut" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{formatCoordinates(item.latitude, item.longitude)}</td>
                          <td><StatusBadge status={item.locationStatus} /></td>
                          <td>
                            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                              <button type="button" className="btn ic sm g" aria-label={`Ubah ${displayText(item.brand)}`} title="Ubah" disabled={!configured} onClick={() => setEditing(item)}>
                                <Pencil className="i sm" />
                              </button>
                              <button type="button" className="btn ic sm g" aria-label={`Hapus ${displayText(item.brand)}`} title="Hapus" disabled={!configured} onClick={() => setDeleting(item)}>
                                <Trash2 className="i sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pageItems.length === 0 && (
                        <tr><td colSpan={6} className="mut" style={{ textAlign: "center", padding: 32 }}>Tidak ada UMKM yang cocok.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="mut">{rangeStart}–{rangeEnd} dari {filteredItems.length}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn o sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button>
                  <button type="button" className="btn o sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Berikutnya</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                {adminMessage && <span className="mut" role="status">{adminMessage}</span>}
                <button type="button" className="btn" disabled={!configured} onClick={() => setAddAdminOpen(true)}>
                  <UserPlus className="i" />Tambah admin
                </button>
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Peran</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {adminList.map((admin) => {
                        const isSelf = admin.email === adminEmail;
                        return (
                          <tr key={admin.userId}>
                            <td>
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", background: "var(--mut)", fontSize: 12, fontWeight: 500 }}>{initials(admin.fullName)}</span>
                                <span className="fw5">{admin.fullName}</span>
                              </div>
                            </td>
                            <td className="mut">{admin.email}</td>
                            <td><span className={`bdg ${admin.isActive ? "out" : "sec"}`}>{admin.isActive ? "Admin" : "Nonaktif"}</span></td>
                            <td>
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                {!isSelf && (
                                  <button type="button" className="btn ic sm g" aria-label={admin.isActive ? `Nonaktifkan ${admin.fullName}` : `Aktifkan ${admin.fullName}`} title={admin.isActive ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleAdmin(admin)}>
                                    <Power className="i sm" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {adminList.length === 0 && (
                        <tr><td colSpan={4} className="mut" style={{ textAlign: "center", padding: 32 }}>Belum ada data admin.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <nav className="only-mobile mobile-nav fixed" aria-label="Navigasi">
        <button type="button" className={view === "umkm" ? "on" : ""} onClick={() => setView("umkm")}><LayoutDashboard className="i" />Data</button>
        <button type="button" className={view === "admin" ? "on" : ""} onClick={() => setView("admin")}><Users className="i" />Admin</button>
        <Link href="/"><MapIcon className="i" />Peta</Link>
        <button type="button" onClick={() => startTransition(() => { signOutAction(); })}><LogOut className="i" />Keluar</button>
      </nav>

      {editing !== undefined && (
        <UmkmFormDialog key={editing?.id ?? "new"} item={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && <DeleteDialog item={deleting} onClose={() => setDeleting(null)} />}
      {addAdminOpen && <AddAdminDialog onClose={() => setAddAdminOpen(false)} />}
    </div>
  );
}
