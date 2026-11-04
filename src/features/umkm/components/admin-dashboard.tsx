"use client";

import {
  Check,
  Download,
  KeyRound,
  LayoutDashboard,
  Map as MapIcon,
  Pencil,
  Plus,
  Power,
  ScrollText,
  Search,
  Store,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  setAdminGoogleLoginAction,
  setAdminRoleAction,
  toggleAdminStatusAction,
} from "@/app/admin/actions";
import type { IssuedKey } from "@/app/admin/key-actions";
import { Pagination } from "@/components/pagination";
import { Rail } from "@/components/rail";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AdminUser } from "@/data/admin-repository";
import { ActivityLogPanel } from "@/features/activity/components/activity-log-panel";
import type { ActivityLog } from "@/features/activity/types";
import { AccountMenu } from "@/features/admin/components/account-menu";
import { AddAdminDialog } from "@/features/admin/components/add-admin-dialog";
import { StatTile } from "@/features/admin/components/admin-stat-tile";
import type { AdminProfile } from "@/features/admin/types";
import { CategoriesPanel } from "@/features/categories/components/categories-panel";
import {
  ChooseMethodDialog,
  CreateKeyDialog,
  KeyIssuedDialog,
  ManageKeyDialog,
} from "@/features/owner/components/owner-key-dialogs";
import { OwnerKeysPanel } from "@/features/owner/components/owner-keys-panel";
import type { OwnerKeySummary } from "@/features/owner/types";
import { catalogOf, catalogText } from "@/features/umkm/catalog";
import { DeleteDialog } from "@/features/umkm/components/delete-umkm-dialog";
import { UmkmFormDialog } from "@/features/umkm/components/umkm-form-dialog";
import { displayText, formatCoordinates } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import { getInitials } from "@/lib/ui/initials";
import { usePersistentState } from "@/lib/ui/use-persistent-state";

type View = "umkm" | "admin" | "keys" | "log" | "categories";

function getEditingItem(editingId: string | null, items: Umkm[]) {
  if (editingId === null) {
    return undefined;
  }

  if (editingId === "new") {
    return null;
  }

  return items.find((item) => item.id === editingId);
}

const VIEW_TITLES: Record<View, string> = {
  umkm: "Data UMKM",
  admin: "Admin",
  keys: "Kunci Akses",
  log: "Log Aktivitas",
  categories: "Kategori UMKM",
};

// Which key dialog is open: choosing how to add, creating, showing the new key, or managing one.
type KeyDialog =
  | { kind: "choose" }
  | { kind: "create"; presetUmkmId?: string }
  | { kind: "issued"; issued: IssuedKey; title?: string; another: boolean }
  | { kind: "manage"; key: OwnerKeySummary };

interface AdminDashboardProps {
  items: Umkm[];
  adminList?: AdminUser[];
  ownerKeys?: OwnerKeySummary[];
  ownerKeysError?: string;
  logs?: ActivityLog[];
  logsError?: string;
  configured: boolean;
  adminEmail?: string;
  adminRole?: "superadmin" | "admin";
  profile?: AdminProfile;
}

export function AdminDashboard({
  items,
  adminList = [],
  ownerKeys = [],
  ownerKeysError,
  logs = [],
  logsError,
  configured,
  adminEmail,
  adminRole = "admin",
  profile,
}: AdminDashboardProps) {
  const isSuperadmin = adminRole === "superadmin";
  const router = useRouter();
  const storageKey = `admin:${profile?.userId ?? adminEmail ?? "readonly"}`;
  const [savedView, setView] = usePersistentState<View>(`${storageKey}:view`, "umkm");
  const view = savedView in VIEW_TITLES ? savedView : "umkm";
  useEffect(() => {
    if (view === "log") {
      router.refresh();
    }
  }, [view, router]);
  const [pageSize, setPageSize] = usePersistentState(`${storageKey}:page-size`, 10);
  const [adminPage, setAdminPage] = usePersistentState(`${storageKey}:admin-page`, 0);
  const [adminPageSize, setAdminPageSize] = usePersistentState(`${storageKey}:admin-page-size`, 10);
  const [query, setQuery] = usePersistentState(`${storageKey}:query`, "");
  const [page, setPage] = usePersistentState(`${storageKey}:page`, 0);
  // undefined: closed, null: new UMKM, item: editing that UMKM.
  const [editingId, setEditingId] = usePersistentState<string | null>(
    `${storageKey}:editing`,
    null,
  );
  const editing = getEditingItem(editingId, items);

  function setEditing(item: Umkm | null | undefined) {
    if (item === undefined) {
      setEditingId(null);

      return;
    }

    if (item === null) {
      setEditingId("new");

      return;
    }

    setEditingId(item.id);
  }
  const [deleting, setDeleting] = useState<Umkm | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [managingAdmin, setManagingAdmin] = useState<string | null>(null);
  const [keyDialog, setKeyDialog] = useState<KeyDialog | null>(null);
  const notice = "";

  const filteredItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();

    return items.filter((item) => {
      const hasMatchingQuery =
        !normalized ||
        `${item.brand} ${item.ownerName} ${item.products} ${item.address}`
          .toLocaleLowerCase("id-ID")
          .includes(normalized);

      return hasMatchingQuery;
    });
  }, [items, query]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const currentAdminPage = Math.min(
    adminPage,
    Math.max(0, Math.ceil(adminList.length / adminPageSize) - 1),
  );
  const pageItems = filteredItems.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function changeQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  function exportReview() {
    const rows = [
      [
        "ID",
        "Merek",
        "Pemilik",
        "Kategori",
        "Alamat",
        "Produk",
        "Katalog produk",
        "Latitude",
        "Longitude",
      ],
      ...items.map((item) => [
        item.id,
        item.brand,
        item.ownerName,
        item.subCategory,
        item.address,
        item.products,
        catalogText(catalogOf(item)),
        item.latitude,
        item.longitude,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "review-lokasi-umkm-banjarsari.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function toggleAdmin(admin: AdminUser) {
    if (managingAdmin) {
      return;
    }

    setManagingAdmin(admin.id);

    try {
      const result = await toggleAdminStatusAction(admin.id, !admin.isActive);
      setAdminMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setManagingAdmin(null);
    }
  }

  async function toggleGoogleLogin(admin: AdminUser) {
    if (managingAdmin) {
      return;
    }

    setManagingAdmin(admin.id);

    try {
      const result = await setAdminGoogleLoginAction(admin.id, !admin.googleLoginAllowed);
      setAdminMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setManagingAdmin(null);
    }
  }

  async function changeAdminRole(admin: AdminUser, role: "superadmin" | "admin") {
    if (managingAdmin) {
      return;
    }

    setManagingAdmin(admin.id);

    try {
      const result = await setAdminRoleAction(admin.id, role);
      setAdminMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setManagingAdmin(null);
    }
  }

  function closeKeyDialog() {
    setKeyDialog(null);
  }

  function keyChanged() {
    setKeyDialog(null);
    router.refresh();
  }

  function keyIssued(issued: IssuedKey, title?: string, isAnother = false) {
    setKeyDialog({ kind: "issued", issued, title, another: isAnother });
    router.refresh();
  }

  // The key button of a row: manage the key of that UMKM when it has one, otherwise start a new key for it.
  function openKeyFor(item: Umkm) {
    const existing = ownerKeys.find((key) => key.umkmId === item.id && key.status !== "revoked");
    setKeyDialog(
      existing ? { kind: "manage", key: existing } : { kind: "create", presetUmkmId: item.id },
    );
  }

  const railItems = [
    {
      label: "Data UMKM",
      icon: "dashboard",
      active: view === "umkm",
      onClick: () => setView("umkm"),
    },
    { label: "Admin", icon: "users", active: view === "admin", onClick: () => setView("admin") },
    {
      label: "Kategori",
      icon: "list",
      active: view === "categories",
      onClick: () => setView("categories"),
    },
    { label: "Kunci Akses", icon: "key", active: view === "keys", onClick: () => setView("keys") },
    { label: "Log Aktivitas", icon: "log", active: view === "log", onClick: () => setView("log") },
    { label: "Peta publik", icon: "map", href: "/" },
  ] as const;

  return (
    <div className="app page-min-h" style={{ position: "relative" }}>
      <Rail items={[...railItems]} />

      <div className="app-body page-min-h" style={{ marginLeft: 56 }}>
        <div className="top">
          <span className="fw5">{VIEW_TITLES[view]}</span>
          <span style={{ flex: 1 }} />
          {profile ? (
            <AccountMenu profile={profile} />
          ) : (
            <span className="mut">Mode baca saja</span>
          )}
          <span className="only-mobile">
            <ThemeToggle />
          </span>
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

          {view === "keys" && (
            <OwnerKeysPanel
              keys={ownerKeys}
              error={ownerKeysError}
              configured={configured}
              storageKey={storageKey}
              onCreate={() => setKeyDialog({ kind: "create" })}
              onManage={(key) => setKeyDialog({ kind: "manage", key })}
            />
          )}
          {view === "log" && (
            <ActivityLogPanel logs={logs} error={logsError} storageKey={storageKey} />
          )}
          {view === "categories" && <CategoriesPanel items={items} />}

          {view === "umkm" && (
            <>
              <div className="admin-stats">
                <StatTile label="Total" value={items.length} icon={Store} />
                {["Camilan", "Makanan", "Minuman"].map((category) => (
                  <StatTile
                    key={category}
                    label={category}
                    value={items.filter((item) => item.subCategory === category).length}
                    icon={Store}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: 1 }} />
                <label className="inp" style={{ width: 260 }}>
                  <Search className="i" />
                  <input
                    placeholder="Cari usaha atau pemilik"
                    aria-label="Cari usaha atau pemilik"
                    value={query}
                    onChange={(event) => changeQuery(event.target.value)}
                  />
                </label>
                <button type="button" className="btn o" onClick={exportReview}>
                  <Download className="i" />
                  Ekspor
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!configured}
                  onClick={() => setKeyDialog({ kind: "choose" })}
                >
                  <Plus className="i" />
                  Tambah UMKM
                </button>
              </div>
              {notice && (
                <div className="alert" role="status">
                  <span style={{ color: "var(--fg)" }}>{notice}</span>
                </div>
              )}

              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Usaha</th>
                        <th>Kategori</th>
                        <th>Produk</th>
                        <th>Koordinat</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw5 ell" style={{ maxWidth: 240 }}>
                              {displayText(item.brand)}
                            </div>
                            <div className="mut" style={{ fontSize: 13 }}>
                              {displayText(item.ownerName)}
                            </div>
                          </td>
                          <td>
                            <span className="bdg sec">{item.subCategory}</span>
                          </td>
                          <td className="mut ell" style={{ maxWidth: 220 }}>
                            {displayText(item.products, "sentence")}
                          </td>
                          <td className="mono mut" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                            {formatCoordinates(item.latitude, item.longitude)}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="btn ic sm g"
                                aria-label={`Kunci akses ${displayText(item.brand)}`}
                                title="Kunci akses"
                                disabled={!configured}
                                onClick={() => openKeyFor(item)}
                              >
                                <KeyRound className="i sm" />
                              </button>
                              <button
                                type="button"
                                className="btn ic sm g"
                                aria-label={`Ubah ${displayText(item.brand)}`}
                                title="Ubah"
                                disabled={!configured}
                                onClick={() => setEditing(item)}
                              >
                                <Pencil className="i sm" />
                              </button>
                              <button
                                type="button"
                                className="btn ic sm g"
                                aria-label={`Hapus ${displayText(item.brand)}`}
                                title="Hapus"
                                disabled={!configured}
                                onClick={() => setDeleting(item)}
                              >
                                <Trash2 className="i sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pageItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="mut"
                            style={{ textAlign: "center", padding: 32 }}
                          >
                            Tidak ada UMKM yang cocok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                page={currentPage}
                pageSize={pageSize}
                total={filteredItems.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
              />
            </>
          )}

          {view === "admin" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {adminMessage && (
                  <span className="mut" role="status">
                    {adminMessage}
                  </span>
                )}
                {isSuperadmin && (
                  <button
                    type="button"
                    className="btn"
                    disabled={!configured}
                    onClick={() => setIsAddAdminOpen(true)}
                  >
                    <UserPlus className="i" />
                    Tambah admin
                  </button>
                )}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Peran</th>
                        <th>Status</th>
                        <th>Login Google</th>
                        {isSuperadmin && <th>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {adminList
                        .slice(
                          currentAdminPage * adminPageSize,
                          (currentAdminPage + 1) * adminPageSize,
                        )
                        .map((admin) => {
                          const isSelf = admin.userId === profile?.userId;

                          return (
                            <tr key={admin.id}>
                              <td>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <span
                                    style={{
                                      display: "grid",
                                      placeItems: "center",
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      background: "var(--mut)",
                                      fontSize: 12,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {getInitials(admin.fullName)}
                                  </span>
                                  <span className="fw5">{admin.fullName}</span>
                                </div>
                              </td>
                              <td className="mut">{admin.email}</td>
                              <td>
                                {isSuperadmin && !isSelf ? (
                                  <label className="inp role-select">
                                    <select
                                      aria-label={`Peran ${admin.email}`}
                                      value={admin.role}
                                      disabled={managingAdmin !== null}
                                      onChange={(event) =>
                                        changeAdminRole(
                                          admin,
                                          event.target.value as "superadmin" | "admin",
                                        )
                                      }
                                    >
                                      <option value="admin">Admin</option>
                                      <option value="superadmin">Superadmin</option>
                                    </select>
                                  </label>
                                ) : (
                                  <span className="bdg out">
                                    {admin.role === "superadmin" ? "Superadmin" : "Admin"}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`bdg ${admin.isActive ? "ok" : "sec"}`}>
                                  {admin.isActive ? "Aktif" : "Nonaktif"}
                                </span>
                              </td>
                              <td>
                                {isSuperadmin ? (
                                  <label className="chk">
                                    <input
                                      type="checkbox"
                                      aria-label={`Izinkan login Google ${admin.email}`}
                                      checked={admin.googleLoginAllowed}
                                      disabled={managingAdmin !== null}
                                      onChange={() => toggleGoogleLogin(admin)}
                                    />
                                    <span className={`cb${admin.googleLoginAllowed ? " on" : ""}`}>
                                      {admin.googleLoginAllowed && <Check className="i xs" />}
                                    </span>
                                    <span>
                                      {admin.googleLoginAllowed ? "Diizinkan" : "Belum diizinkan"}
                                    </span>
                                  </label>
                                ) : (
                                  <span className="mut">
                                    {admin.googleLoginAllowed ? "Diizinkan" : "Belum diizinkan"}
                                  </span>
                                )}
                              </td>
                              {isSuperadmin && (
                                <td>
                                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    {!isSelf ? (
                                      <button
                                        type="button"
                                        className="btn ic sm g"
                                        disabled={managingAdmin !== null}
                                        aria-label={
                                          admin.isActive
                                            ? `Nonaktifkan ${admin.fullName}`
                                            : `Aktifkan ${admin.fullName}`
                                        }
                                        title={admin.isActive ? "Nonaktifkan" : "Aktifkan"}
                                        onClick={() => toggleAdmin(admin)}
                                      >
                                        <Power className="i sm" />
                                      </button>
                                    ) : (
                                      <span className="mut">Dilindungi</span>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      {adminList.length === 0 && (
                        <tr>
                          <td
                            colSpan={isSuperadmin ? 6 : 5}
                            className="mut"
                            style={{ textAlign: "center", padding: 32 }}
                          >
                            Belum ada data admin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                page={currentAdminPage}
                pageSize={adminPageSize}
                total={adminList.length}
                onPageChange={setAdminPage}
                onPageSizeChange={(size) => {
                  setAdminPageSize(size);
                  setAdminPage(0);
                }}
              />
            </>
          )}
        </div>
      </div>

      <nav className="only-mobile mobile-nav fixed" aria-label="Navigasi">
        <button
          type="button"
          className={view === "umkm" ? "on" : ""}
          onClick={() => setView("umkm")}
        >
          <LayoutDashboard className="i" />
          Data
        </button>
        <button
          type="button"
          className={view === "admin" ? "on" : ""}
          onClick={() => setView("admin")}
        >
          <Users className="i" />
          Admin
        </button>
        <button
          type="button"
          className={view === "categories" ? "on" : ""}
          onClick={() => setView("categories")}
        >
          <Store className="i" />
          Kategori
        </button>
        <button
          type="button"
          className={view === "keys" ? "on" : ""}
          onClick={() => setView("keys")}
        >
          <KeyRound className="i" />
          Kunci
        </button>
        <button type="button" className={view === "log" ? "on" : ""} onClick={() => setView("log")}>
          <ScrollText className="i" />
          Log
        </button>
        <Link href="/">
          <MapIcon className="i" />
          Peta
        </Link>
      </nav>

      {editing !== undefined && (
        <UmkmFormDialog
          key={editing?.id ?? "new"}
          item={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && <DeleteDialog item={deleting} onClose={() => setDeleting(null)} />}
      {isAddAdminOpen && <AddAdminDialog onClose={() => setIsAddAdminOpen(false)} />}
      {keyDialog?.kind === "choose" && (
        <ChooseMethodDialog
          onClose={closeKeyDialog}
          onAdminForm={() => {
            setKeyDialog(null);
            setEditing(null);
          }}
          onKeyFlow={() => setKeyDialog({ kind: "create" })}
        />
      )}
      {keyDialog?.kind === "create" && (
        <CreateKeyDialog
          items={items}
          presetUmkmId={keyDialog.presetUmkmId}
          onClose={closeKeyDialog}
          onIssued={(issued) => keyIssued(issued, undefined, true)}
        />
      )}
      {keyDialog?.kind === "issued" && (
        <KeyIssuedDialog
          issued={keyDialog.issued}
          title={keyDialog.title}
          onClose={closeKeyDialog}
          onAnother={keyDialog.another ? () => setKeyDialog({ kind: "create" }) : undefined}
        />
      )}
      {keyDialog?.kind === "manage" && (
        <ManageKeyDialog
          keyInfo={keyDialog.key}
          onClose={closeKeyDialog}
          onChanged={keyChanged}
          onIssued={(issued) => keyIssued(issued, "Kunci baru siap dibagikan")}
        />
      )}
    </div>
  );
}
