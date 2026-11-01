"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  Download,
  ExternalLink,
  Globe,
  ImageIcon,
  KeyRound,
  Loader2,
  LocateFixed,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { createAdminAction, setLocationStatusAction, signOutAction, toggleAdminStatusAction, upsertUmkmAction } from "@/app/admin/actions";
import { type AdminUser } from "@/data/admin-repository";
import { CATEGORY_CONFIG, CategoryIcon } from "@/features/umkm/categories";
import { BANJARSARI_CENTER, UMKM_SUB_CATEGORIES, type Umkm } from "@/features/umkm/types";

const initialActionState = { success: false, message: "" };
const CoordinatePicker = dynamic(
  () => import("@/features/umkm/components/coordinate-picker").then((module) => module.CoordinatePicker),
  { ssr: false, loading: () => <div className="coordinate-map map-loading">Memuat pemilih lokasi…</div> },
);

type StatusFilter = "all" | "estimated" | "verified" | "outside" | "admins";

function StatusIndicator({ status }: { status: Umkm["locationStatus"] }) {
  if (status === "verified") {
    return (<>
        <span className="status-dot" aria-hidden="true" />
        <span>Terverifikasi</span>
          </>
      );
    }
  return (
    <span className="status-dot-cell estimated">
      <span className="status-dot" aria-hidden="true" />
      <span>Perlu verifikasi</span>
    </span>
  );
}

export function AdminDashboard({
  items,
  adminList = [],
  configured,
  adminEmail,
}: {
  items: Umkm[];
  adminList?: AdminUser[];
  configured: boolean;
  adminEmail?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Umkm | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Umkm | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [latitude, setLatitude] = useState(BANJARSARI_CENTER.latitude);
  const [longitude, setLongitude] = useState(BANJARSARI_CENTER.longitude);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openingHours, setOpeningHours] = useState("08:00");
  const [closingHours, setClosingHours] = useState("21:00");
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [state, formAction, pending] = useActionState(upsertUmkmAction, initialActionState);
  const [adminState, createAdminFormAction, adminPending] = useActionState(createAdminAction, initialActionState);

  // Close mobile menu on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen]);

  // Auto-close UMKM modal on successful submit
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setEditing(undefined);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Auto-close Admin modal on successful submit
  useEffect(() => {
    if (adminState.success) {
      const timer = setTimeout(() => {
        setAddAdminOpen(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [adminState]);

  const totalCount = items.length;
  const verifiedCount = items.filter((item) => item.locationStatus === "verified").length;
  const estimatedCount = items.filter((item) => item.locationStatus === "estimated").length;
  const outsideCount = items.filter((item) => item.locationStatus === "outside").length;

  const filteredItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.brand} ${item.ownerName} ${item.products} ${item.address}`
          .toLocaleLowerCase("id-ID")
          .includes(normalized);
      const matchesStatus = statusFilter === "all" || item.locationStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const filteredAdmins = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();
    return adminList.filter((admin) => {
      if (!normalized) return true;
      return `${admin.fullName} ${admin.email}`.toLocaleLowerCase("id-ID").includes(normalized);
    });
  }, [adminList, query]);

  function openForm(item?: Umkm) {
    setEditing(item ?? null);
    setLatitude(item?.latitude ?? BANJARSARI_CENTER.latitude);
    setLongitude(item?.longitude ?? BANJARSARI_CENTER.longitude);
    setFormPhotos(item?.photos ? [...item.photos] : []);
    const is24h = Boolean(
      item?.openingHours &&
      item?.closingHours &&
      item.openingHours.trim() === item.closingHours.trim()
    );
    setIs24Hours(is24h);
    setOpeningHours(item?.openingHours || (is24h ? "00:00" : "08:00"));
    setClosingHours(item?.closingHours || (is24h ? "00:00" : "21:00"));
    setUploadError(null);
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (formPhotos.length + files.length > 10) {
      setUploadError(`Maksimal 10 foto. Anda sudah memiliki ${formPhotos.length} foto.`);
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal mengunggah foto.");
      if (Array.isArray(result.data?.urls)) {
        setFormPhotos((prev) => [...prev, ...result.data.urls].slice(0, 10));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removePhoto(indexToRemove: number) {
    setFormPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  function useDeviceLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setLatitude(Number(coords.latitude.toFixed(6)));
      setLongitude(Number(coords.longitude.toFixed(6)));
    });
  }

  function exportReview() {
    const rows = [
      ["ID", "Merek", "Pemilik", "Kategori", "Alamat", "Produk", "Latitude", "Longitude", "Status"],
      ...items.map((item) => [
        item.id,
        item.brand,
        item.ownerName,
        item.subCategory,
        item.address,
        item.products,
        item.latitude,
        item.longitude,
        item.locationStatus,
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

  async function deleteUmkm() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteMessage("");

    try {
      const response = await fetch(`/api/admin/umkm/${deleting.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "UMKM gagal dihapus.");

      setDeleting(null);
      router.refresh();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "UMKM gagal dihapus.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <nav className="admin-breadcrumbs" aria-label="Navigasi halaman">
            <Link href="/" className="admin-breadcrumb-link" title="Kembali ke peta publik">
              <Store size={15} />
              <span>Peta UMKM Banjarsari</span>
            </Link>
            <span className="admin-breadcrumb-sep">/</span>
            <span className="admin-breadcrumb-current">Kelola Data</span>
          </nav>

          <div className="admin-user-nav desktop-only-admin">
            <Link
              href="/"
              className="admin-back-map-btn"
              title="Kembali ke halaman peta publik tanpa perlu logout"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Peta</span>
            </Link>

            {configured ? (
              <div className="admin-user-profile">
                <span className="admin-user-avatar" title={adminEmail}>
                  <User size={13} />
                </span>
                <span className="admin-user-email">{adminEmail}</span>
                <form action={signOutAction} className="admin-logout-form">
                  <button type="submit" className="admin-logout-btn" title="Keluar dari akun admin">
                    <LogOut size={13} />
                    <span>Keluar</span>
                  </button>
                </form>
              </div>
            ) : (
              <span className="admin-preview-pill">
                <CircleAlert size={13} /> Mode Pratinjau
              </span>
            )}
          </div>

          {/* Mobile Burger Menu Button */}
          <button
            type="button"
            className="admin-mobile-burger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi admin"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation for Admin */}
      {mobileMenuOpen && (
        <div
          className="admin-drawer-backdrop"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="admin-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Admin"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer-header">
              <div className="admin-drawer-title">
                <ShieldCheck size={18} className="admin-drawer-shield-icon" />
                <span>Menu Administrator</span>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Account Profile Section */}
              <div className="admin-drawer-profile-card">
                <span className="admin-drawer-avatar">
                  <User size={20} />
                </span>
                <div className="admin-drawer-profile-info">
                  <strong className="admin-drawer-email" title={adminEmail || "Administrator"}>
                    {adminEmail || "Superadmin"}
                  </strong>
                  <span className="admin-drawer-role-badge">
                    <span className="status-dot" aria-hidden="true" />
                    <span>Administrator Desa</span>
                  </span>
                </div>
              </div>

              {/* Drawer Menu Action Links */}
              <div className="admin-drawer-actions">
                <Link
                  href="/"
                  className="admin-drawer-action-btn back-map"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ArrowLeft size={16} />
                  <span>Kembali ke Peta</span>
                </Link>

                {configured ? (
                  <form action={signOutAction} className="admin-drawer-logout-form">
                    <button type="submit" className="admin-drawer-action-btn logout">
                      <LogOut size={16} />
                      <span>Keluar dari Akun</span>
                    </button>
                  </form>
                ) : (
                  <div className="admin-drawer-preview-notice">
                    <CircleAlert size={15} />
                    <span>Mode Pratinjau (Tanpa Supabase)</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <section className="admin-content">
        {!configured && (
          <div className="setup-notice">
            <CircleAlert size={18} />
            <div>
              <strong>Penambahan data belum aktif</strong>
              <p>
                Salin <code>.env.example</code> menjadi <code>.env.local</code>, isi kredensial Supabase, jalankan
                migrasi dan seed, lalu masuk sebagai admin.
              </p>
            </div>
          </div>
        )}

        <div className="admin-page-header">
          <div>
            <h1>Data UMKM</h1>
            <p>Validasi koordinat dan kelola informasi pelaku usaha Desa Banjarsari.</p>
          </div>
          <div className="admin-primary-actions">
            <button type="button" className="secondary-button" onClick={exportReview}>
              <Download size={14} />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setAddAdminOpen(true)}
              disabled={!configured}
              title={!configured ? "Supabase belum terhubung" : "Tambah administrator baru"}
            >
              <UserPlus size={14} />
              <span>Tambah Admin</span>
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => openForm()}
              disabled={!configured}
              title={!configured ? "Supabase belum terhubung" : undefined}
            >
              <Plus size={15} />
              <span>Tambah UMKM</span>
            </button>
          </div>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Saring berdasarkan status koordinat">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "all"}
            className={`admin-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Semua
            <span className="tab-count">{totalCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "estimated"}
            className={`admin-tab ${statusFilter === "estimated" ? "active" : ""}`}
            onClick={() => setStatusFilter("estimated")}
          >
            Perlu Verifikasi
            <span className="tab-count amber">{estimatedCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "verified"}
            className={`admin-tab ${statusFilter === "verified" ? "active" : ""}`}
            onClick={() => setStatusFilter("verified")}
          >
            Terverifikasi
            <span className="tab-count green">{verifiedCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "admins"}
            className={`admin-tab ${statusFilter === "admins" ? "active" : ""}`}
            onClick={() => setStatusFilter("admins")}
          >
            <ShieldCheck size={14} />
            <span>Kelola Admin</span>
            <span className="tab-count teal">{adminList.length}</span>
          </button>
        </div>

        <section className="review-panel">
          <div className="review-toolbar">
            <div className="admin-search-wrap">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  statusFilter === "admins"
                    ? "Cari nama administrator atau email…"
                    : "Cari nama usaha, pemilik, produk, atau alamat…"
                }
                aria-label={statusFilter === "admins" ? "Cari data administrator" : "Cari data UMKM"}
              />
              {query && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setQuery("")}
                  aria-label="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="table-count-label">
              {statusFilter === "admins" ? (
                <>Menampilkan <strong>{filteredAdmins.length}</strong> dari {adminList.length} Administrator</>
              ) : (
                <>Menampilkan <strong>{filteredItems.length}</strong> dari {items.length} UMKM</>
              )}
            </span>
          </div>

          <div className="review-table-wrap">
            {statusFilter === "admins" ? (
              <table className="review-table">
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>Administrator</th>
                    <th style={{ width: "22%" }}>Hak Akses</th>
                    <th style={{ width: "18%" }}>Status Akun</th>
                    <th style={{ width: "18%" }}>Waktu Didaftarkan</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => {
                      const isSelf = admin.email.toLowerCase() === (adminEmail || "").toLowerCase();
                      return (
                        <tr key={admin.userId}>
                          <td>
                            <div className="admin-store-cell">
                              <span className="admin-avatar-badge">
                                {admin.fullName.charAt(0).toUpperCase()}
                              </span>
                              <div className="store-info">
                                <div className="admin-name-row">
                                  <strong className="store-name">{admin.fullName}</strong>
                                  {isSelf && <span className="self-account-badge">Akun Anda</span>}
                                </div>
                                <span className="store-owner">{admin.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="admin-role-pill">
                              <ShieldCheck size={12} />
                              <span>Administrator Desa</span>
                            </span>
                          </td>
                          <td>
                            {admin.isActive ? (
                              <>
                                <span className="status-dot" aria-hidden="true" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <span className="status-dot" aria-hidden="true" />
                                <span>Nonaktif</span>
                              </>
                            )}
                          </td>
                          <td>
                            <span className="table-product">
                              {admin.createdAt
                                ? new Date(admin.createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {isSelf ? (
                                <span className="active-session-label">Sesi Anda</span>
                              ) : (
                                <button
                                  type="button"
                                  className={`action-icon-link ${admin.isActive ? "delete" : "verify"}`}
                                  onClick={async () => {
                                    await toggleAdminStatusAction(admin.userId, !admin.isActive);
                                    router.refresh();
                                  }}
                                  title={admin.isActive ? "Nonaktifkan akun admin ini" : "Aktifkan kembali akun admin ini"}
                                  aria-label={`${admin.isActive ? "Nonaktifkan" : "Aktifkan"} ${admin.fullName}`}
                                >
                                  <Power size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-table-state">
                          <User size={32} strokeWidth={1.5} />
                          <strong>Tidak ada administrator ditemukan</strong>
                          <p>
                            {query
                              ? "Coba gunakan kata kunci pencarian nama atau email lain."
                              : "Belum ada administrator tambahan."}
                          </p>
                          <button
                            type="button"
                            className="primary-button mini-action"
                            onClick={() => setAddAdminOpen(true)}
                            style={{ marginTop: 12 }}
                          >
                            <UserPlus size={13} />
                            <span>Tambah Admin Baru</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="review-table">
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>Usaha & Pemilik</th>
                    <th style={{ width: "15%" }}>Kategori</th>
                    <th style={{ width: "25%" }}>Produk & Alamat</th>
                    <th style={{ width: "16%" }}>Koordinat</th>
                    <th style={{ width: "14%" }}>Status Titik</th>
                    <th style={{ width: "6%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-store-cell">
                            <span
                              className="mini-category-icon"
                              style={{
                                color: CATEGORY_CONFIG[item.subCategory].color,
                                background: CATEGORY_CONFIG[item.subCategory].background,
                              }}
                            >
                              <CategoryIcon category={item.subCategory} size={15} />
                            </span>
                            <div className="store-info">
                              <strong className="store-name">{item.brand}</strong>
                              <span className="store-owner">{item.ownerName || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill-subtle">{item.subCategory}</span>
                        </td>
                        <td>
                          <span className="table-product" title={item.products || undefined}>
                            {item.products || "—"}
                          </span>
                          {item.address && (
                            <span className="table-address" title={item.address}>
                              {item.address}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="coord-cell">
                            <code>{item.latitude.toFixed(6)}</code>
                            <code>{item.longitude.toFixed(6)}</code>
                          </div>
                        </td>
                        <td>
                          <StatusIndicator status={item.locationStatus} />
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link
                              href={`/?selected=${item.id}`}
                              className="action-icon-link"
                              title="Buka di peta publik"
                              aria-label={`Buka ${item.brand} di peta`}
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              type="button"
                              className="action-icon-link"
                              onClick={() => openForm(item)}
                              disabled={!configured}
                              title="Edit data"
                              aria-label={`Edit ${item.brand}`}
                            >
                              <Pencil size={13} />
                            </button>
                            {configured && item.locationStatus !== "verified" && (
                              <button
                                type="button"
                                className="action-icon-link verify"
                                onClick={() => setLocationStatusAction(item.id, "verified")}
                                title="Verifikasi titik"
                                aria-label={`Verifikasi titik ${item.brand}`}
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            {configured && (
                              <button
                                type="button"
                                className="action-icon-link delete"
                                onClick={() => {
                                  setDeleting(item);
                                  setDeleteMessage("");
                                }}
                                title="Hapus data"
                                aria-label={`Hapus ${item.brand}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-table-state">
                          <Store size={32} strokeWidth={1.5} />
                          <strong>Tidak ada UMKM ditemukan</strong>
                          <p>
                            {query || statusFilter !== "all"
                              ? "Coba ubah kata kunci pencarian atau pilih tab status lain."
                              : "Belum ada data UMKM yang tersimpan."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </section>

      {editing !== undefined && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(undefined);
          }}
        >
          <section className="umkm-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <button className="modal-close" onClick={() => setEditing(undefined)} aria-label="Tutup form">
              <X size={18} />
            </button>
            <div className="modal-heading">
              <span className="eyebrow">{editing ? "Perbarui data" : "Data baru"}</span>
              <h2 id="form-title">{editing ? `Edit ${editing.brand}` : "Tambah UMKM"}</h2>
              <p>Klik peta atau tarik pin untuk menetapkan lokasi secara presisi.</p>
            </div>
            <form action={formAction} className="umkm-form">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="form-sections-wrap">
                {/* Informasi Pokok */}
                <div className="form-section-card">
                  <span className="section-card-title">Informasi Pokok</span>
                  <div className="form-fields-grid">
                    <label>
                      <span>Nama usaha <em className="required">*</em></span>
                      <input name="name" required minLength={2} maxLength={120} defaultValue={editing?.brand} placeholder="Contoh: Koat Coffee" />
                    </label>
                    <label>
                      <span>Kategori <em className="required">*</em></span>
                      <select name="subCategory" defaultValue={editing?.subCategory ?? "Camilan"}>
                        {UMKM_SUB_CATEGORIES.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Nama pemilik</span>
                      <input name="ownerName" maxLength={120} defaultValue={editing?.ownerName} placeholder="Contoh: Bpk. Ahmad" />
                    </label>
                    <label>
                      <span>Status titik lokasi</span>
                      <select name="locationStatus" defaultValue={editing?.locationStatus ?? "verified"}>
                        <option value="verified">Terverifikasi (Akurat Lapangan)</option>
                        <option value="estimated">Perkiraan Awal</option>
                      </select>
                    </label>
                    <label className="full-col">
                      <span>Produk yang ditawarkan</span>
                      <textarea name="products" maxLength={500} defaultValue={editing?.products} placeholder="Daftar produk unggulan..." />
                    </label>
                    <label className="full-col">
                      <span>Alamat lengkap</span>
                      <textarea name="address" maxLength={500} defaultValue={editing?.address} placeholder="Nama jalan, RT/RW, Dusun..." />
                    </label>
                  </div>
                </div>

                {/* Kontak & Jam Operasional */}
                <div className="form-section-card">
                  <span className="section-card-title">Kontak & Jam Operasional</span>
                  <div className="form-fields-grid">
                    <label>
                      <span>Nomor Kontak / WhatsApp</span>
                      <input name="contact" maxLength={50} defaultValue={editing?.contact} placeholder="Contoh: 081234567890" />
                    </label>
                    <label>
                      <span>Website / Tautan Media Sosial</span>
                      <input name="website" maxLength={255} defaultValue={editing?.website} placeholder="Contoh: instagram.com/koatcoffee" />
                    </label>
                    <div className="checkbox-24h-wrapper full-col">
                      <label className="checkbox-custom-label">
                        <input
                          type="checkbox"
                          checked={is24Hours}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIs24Hours(checked);
                            if (checked) {
                              setOpeningHours("00:00");
                              setClosingHours("00:00");
                            } else {
                              setOpeningHours(editing?.openingHours || "08:00");
                              setClosingHours(editing?.closingHours || "21:00");
                            }
                          }}
                        />
                        <span className="checkbox-custom-box">
                          <CheckCircle2 size={13} className="checked-indicator" />
                        </span>
                        <span className="checkbox-custom-text">
                          <strong>Buka 24 Jam Penuh</strong>
                        </span>
                      </label>
                    </div>
                    <label>
                      <span>Jam Buka</span>
                      <input
                        name="openingHours"
                        type="time"
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        readOnly={is24Hours}
                        className={is24Hours ? "input-locked" : ""}
                      />
                    </label>
                    <label>
                      <span>Jam Tutup</span>
                      <input
                        name="closingHours"
                        type="time"
                        value={closingHours}
                        onChange={(e) => setClosingHours(e.target.value)}
                        readOnly={is24Hours}
                        className={is24Hours ? "input-locked" : ""}
                      />
                    </label>
                    <p className="form-help-hint full-col">
                      <em>Catatan: Jika jam buka dan jam tutup bernilai sama (00:00 - 00:00), sistem otomatis menampilkannya sebagai <strong>Buka 24 Jam</strong> di katalog dan peta.</em>
                    </p>
                  </div>
                </div>

                {/* Foto Usaha (Maks 10) */}
                <div className="form-section-card">
                  <div className="section-card-header">
                    <span className="section-card-title">Foto Usaha ({formPhotos.length}/10)</span>
                    <label className="upload-trigger-btn">
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={handleFilesSelected}
                        disabled={isUploading || formPhotos.length >= 10}
                      />
                      {isUploading ? (
                        <>
                          <Loader2 size={13} className="spin-icon" />
                          <span>Mengunggah…</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          <span>Pilih Foto</span>
                        </>
                      )}
                    </label>
                  </div>

                  {uploadError && <p className="form-message error">{uploadError}</p>}

                  {formPhotos.length > 0 ? (
                    <div className="photo-preview-grid">
                      {formPhotos.map((photo, idx) => (
                        <div key={idx} className="photo-preview-card">
                          <img src={photo} alt={`Foto ${idx + 1}`} />
                          <button
                            type="button"
                            className="photo-remove-btn"
                            onClick={() => removePhoto(idx)}
                            aria-label={`Hapus foto ${idx + 1}`}
                            title="Hapus foto ini"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label className="photo-empty-dropzone clickable-dropzone">
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={handleFilesSelected}
                        disabled={isUploading}
                      />
                      <ImageIcon size={28} />
                      <strong>Klik untuk Memilih Foto</strong>
                      <span>Format PNG, JPG, atau WEBP (Maksimal 10 foto, maks 5MB/file).</span>
                    </label>
                  )}
                  <input type="hidden" name="photos" value={JSON.stringify(formPhotos)} />
                </div>

                {/* Penetapan Koordinat GPS */}
                <div className="form-section-card">
                  <div className="section-card-header">
                    <span className="section-card-title">Titik Koordinat Lokasi GPS</span>
                    <button type="button" className="secondary-button mini-action" onClick={useDeviceLocation}>
                      <LocateFixed size={13} /> Titik Perangkat Saya
                    </button>
                  </div>
                  <div className="form-fields-grid coords-grid">
                    <label>
                      <span>Latitude *</span>
                      <input
                        name="latitude"
                        type="number"
                        min="-90"
                        max="90"
                        step="0.000001"
                        required
                        value={latitude}
                        onChange={(event) => setLatitude(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>Longitude *</span>
                      <input
                        name="longitude"
                        type="number"
                        min="-180"
                        max="180"
                        step="0.000001"
                        required
                        value={longitude}
                        onChange={(event) => setLongitude(Number(event.target.value))}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <CoordinatePicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(Number(lat.toFixed(6)));
                  setLongitude(Number(lng.toFixed(6)));
                }}
              />
              {state.message && (
                <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setEditing(undefined)}>
                  Batal
                </button>
                <button className="primary-button" disabled={pending}>
                  {pending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Tambah UMKM"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleting && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletePending) setDeleting(null);
          }}
        >
          <section
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <span className="delete-dialog-icon">
              <Trash2 size={20} />
            </span>
            <h2 id="delete-title">Hapus {deleting.brand}?</h2>
            <p id="delete-description">
              Data usaha dan penandanya akan dihapus permanen dari peta. Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteMessage && (
              <p className="form-message error" aria-live="polite">
                {deleteMessage}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeleting(null)}
                disabled={deletePending}
              >
                Batal
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={deleteUmkm}
                disabled={deletePending}
              >
                {deletePending ? "Menghapus…" : <><Trash2 size={14} /> Hapus permanen</>}
              </button>
            </div>
          </section>
        </div>
      )}

      {addAdminOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !adminPending) setAddAdminOpen(false);
          }}
        >
          <section className="admin-creation-modal" role="dialog" aria-modal="true" aria-labelledby="add-admin-title">
            <button
              className="modal-close"
              onClick={() => setAddAdminOpen(false)}
              aria-label="Tutup form admin"
              disabled={adminPending}
            >
              <X size={18} />
            </button>
            <div className="modal-heading">
              <span className="eyebrow">Akses Superadmin</span>
              <h2 id="add-admin-title">Tambah Administrator Baru</h2>
              <p>Daftarkan akun administrator baru untuk membantu mengelola data UMKM desa.</p>
            </div>
            <form action={createAdminFormAction} className="admin-creation-form">
              <div className="form-field-group">
                <label>
                  <span>Nama Lengkap <em className="required">*</em></span>
                  <div className="input-with-icon">
                    <User size={15} />
                    <input
                      name="fullName"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                </label>
                <label>
                  <span>Alamat Email <em className="required">*</em></span>
                  <div className="input-with-icon">
                    <Mail size={15} />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="admin@banjarsari.desa.id"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <label>
                  <span>Kata Sandi Baru <em className="required">*</em></span>
                  <div className="input-with-icon">
                    <KeyRound size={15} />
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                    />
                  </div>
                </label>
              </div>

              {adminState.message && (
                <p className={`form-message ${adminState.success ? "success" : "error"}`}>
                  {adminState.message}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAddAdminOpen(false)}
                  disabled={adminPending}
                >
                  Batal
                </button>
                <button type="submit" className="primary-button" disabled={adminPending}>
                  {adminPending ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      <span>Mendaftarkan…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Daftarkan Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
