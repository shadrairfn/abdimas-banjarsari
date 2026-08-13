"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Download, ExternalLink, LocateFixed, LogOut, MapPinned, Pencil, Plus, Search, Store, Trash2, X } from "lucide-react";
import { setLocationStatusAction, signOutAction, upsertUmkmAction } from "@/app/admin/actions";
import { CATEGORY_CONFIG, CategoryIcon } from "@/features/umkm/categories";
import { BANJARSARI_CENTER, UMKM_SUB_CATEGORIES, type Umkm } from "@/features/umkm/types";

const initialActionState = { success: false, message: "" };
const CoordinatePicker = dynamic(() => import("@/features/umkm/components/coordinate-picker").then((module) => module.CoordinatePicker), { ssr: false, loading: () => <div className="coordinate-map map-loading">Memuat pemilih lokasi…</div> });

export function AdminDashboard({ items, configured, adminEmail }: { items: Umkm[]; configured: boolean; adminEmail?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Umkm | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Umkm | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [latitude, setLatitude] = useState(BANJARSARI_CENTER.latitude);
  const [longitude, setLongitude] = useState(BANJARSARI_CENTER.longitude);
  const [state, formAction, pending] = useActionState(upsertUmkmAction, initialActionState);

  const filteredItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase("id-ID").trim();
    return items.filter((item) => !normalized || `${item.brand} ${item.ownerName} ${item.products} ${item.address}`.toLocaleLowerCase("id-ID").includes(normalized));
  }, [items, query]);
  const verifiedCount = items.filter((item) => item.locationStatus === "verified").length;
  const outsideCount = items.filter((item) => item.locationStatus === "outside").length;

  function openForm(item?: Umkm) {
    setEditing(item ?? null);
    setLatitude(item?.latitude ?? BANJARSARI_CENTER.latitude);
    setLongitude(item?.longitude ?? BANJARSARI_CENTER.longitude);
  }

  function useDeviceLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setLatitude(Number(coords.latitude.toFixed(6)));
      setLongitude(Number(coords.longitude.toFixed(6)));
    });
  }

  function exportReview() {
    const rows = [["ID", "Merek", "Pemilik", "Kategori", "Alamat", "Produk", "Latitude", "Longitude", "Status"], ...items.map((item) => [item.id, item.brand, item.ownerName, item.subCategory, item.address, item.products, item.latitude, item.longitude, item.locationStatus])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "review-lokasi-umkm-banjarsari.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  async function deleteUmkm() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteMessage("");

    try {
      const response = await fetch(`/api/admin/umkm/${deleting.id}`, {
        method: "DELETE",
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "UMKM gagal dihapus.");

      setDeleting(null);
      router.refresh();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "UMKM gagal dihapus.");
    } finally {
      setDeletePending(false);
    }
  }

  return <main className="admin-shell">
    <header className="admin-topbar">
      <div className="admin-title-row"><Link href="/" className="back-link"><ArrowLeft size={18} /> Kembali ke peta</Link><div className="admin-header-actions"><button className="secondary-button" onClick={exportReview}><Download size={17} /> Ekspor</button>{configured && <form action={signOutAction}><button className="secondary-button"><LogOut size={16} /> Keluar</button></form>}<button className="primary-button" onClick={() => openForm()} disabled={!configured}><Plus size={17} /> Tambah UMKM</button></div></div>
      <div className="admin-heading"><div><span className="eyebrow">Ruang kerja pengelola</span><h1>Kelola data UMKM</h1><p>Tambah usaha, perbaiki koordinat, dan verifikasi lokasi pada satu tempat.</p></div><span className={configured ? "connected-mode" : "local-mode"}>{configured ? <><CheckCircle2 size={16} /> Terhubung · {adminEmail}</> : <><CircleAlert size={16} /> Mode pratinjau · Supabase belum dikonfigurasi</>}</span></div>
    </header>
    <section className="admin-content">
      {!configured && <div className="setup-notice"><CircleAlert size={20} /><div><strong>Penambahan data belum aktif</strong><p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, isi kredensial Supabase, jalankan migrasi dan seed, lalu masuk sebagai admin.</p></div></div>}
      <div className="stat-grid"><article className="stat-card"><span><Store size={19} /></span><div><strong>{items.length}</strong><small>Total UMKM</small></div></article><article className="stat-card amber"><span><MapPinned size={19} /></span><div><strong>{items.length - verifiedCount - outsideCount}</strong><small>Perlu verifikasi</small></div></article><article className="stat-card green"><span><CheckCircle2 size={19} /></span><div><strong>{verifiedCount}</strong><small>Terverifikasi</small></div></article><article className="stat-card red"><span><CircleAlert size={19} /></span><div><strong>{outsideCount}</strong><small>Di luar desa</small></div></article></div>
      <section className="review-panel"><div className="review-toolbar"><div><h2>Daftar UMKM</h2><p>{filteredItems.length} data ditampilkan</p></div><label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari merek, pemilik, produk…" /></label></div>
        <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Usaha</th><th>Produk</th><th>Koordinat</th><th>Status titik</th><th>Aksi</th></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.id}><td><div className="admin-store-cell"><span className="mini-category-icon" style={{ color: CATEGORY_CONFIG[item.subCategory].color, background: CATEGORY_CONFIG[item.subCategory].background }}><CategoryIcon category={item.subCategory} size={16} /></span><div><strong>{item.brand}</strong><span>{item.ownerName || "—"}</span></div></div></td><td><span className="table-product">{item.products || "—"}</span><small>{item.subCategory}</small></td><td><span>{item.latitude.toFixed(6)}</span><span>{item.longitude.toFixed(6)}</span></td><td><span className={`status-badge ${item.locationStatus}`}>{item.locationStatus === "verified" ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{item.locationStatus === "verified" ? "Terverifikasi" : item.locationStatus === "outside" ? "Di luar desa" : "Perkiraan"}</span></td><td><div className="table-actions"><Link href={`/?selected=${item.id}`} title="Lihat di peta"><ExternalLink size={16} /></Link><button onClick={() => openForm(item)} disabled={!configured}><Pencil size={14} /> Edit</button>{configured && item.locationStatus !== "verified" && <button onClick={() => setLocationStatusAction(item.id, "verified")}><CheckCircle2 size={14} /> Verifikasi</button>}{configured && <button className="delete-action" onClick={() => { setDeleting(item); setDeleteMessage(""); }}><Trash2 size={14} /> Hapus</button>}</div></td></tr>)}</tbody></table></div>
      </section>
    </section>
    {editing !== undefined && <div className="modal-backdrop" role="presentation"><section className="umkm-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><button className="modal-close" onClick={() => setEditing(undefined)} aria-label="Tutup"><X size={19} /></button><div className="modal-heading"><span className="eyebrow">{editing ? "Perbarui data" : "Data baru"}</span><h2 id="form-title">{editing ? `Edit ${editing.brand}` : "Tambah UMKM"}</h2><p>Klik peta atau tarik pin untuk menetapkan lokasi secara presisi.</p></div>
      <form action={formAction} className="umkm-form">{editing && <input type="hidden" name="id" value={editing.id} />}<div className="form-fields"><label>Nama usaha *<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.brand} /></label><label>Kategori *<select name="subCategory" defaultValue={editing?.subCategory ?? "Camilan"}>{UMKM_SUB_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Nama pemilik<input name="ownerName" maxLength={120} defaultValue={editing?.ownerName} /></label><label>Produk<textarea name="products" maxLength={500} defaultValue={editing?.products} /></label><label className="full-field">Alamat<textarea name="address" maxLength={500} defaultValue={editing?.address} /></label><label>Latitude *<input name="latitude" type="number" min="-90" max="90" step="0.000001" required value={latitude} onChange={(event) => setLatitude(Number(event.target.value))} /></label><label>Longitude *<input name="longitude" type="number" min="-180" max="180" step="0.000001" required value={longitude} onChange={(event) => setLongitude(Number(event.target.value))} /></label><label>Status lokasi<select name="locationStatus" defaultValue={editing?.locationStatus ?? "verified"}><option value="verified">Terverifikasi</option><option value="estimated">Perkiraan</option><option value="outside">Di luar desa</option></select></label><button type="button" className="secondary-button locate-form-button" onClick={useDeviceLocation}><LocateFixed size={16} /> Gunakan lokasi perangkat</button></div><CoordinatePicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(Number(lat.toFixed(6))); setLongitude(Number(lng.toFixed(6))); }} />{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(undefined)}>Batal</button><button className="primary-button" disabled={pending}>{pending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Tambah UMKM"}</button></div></form>
    </section></div>}
    {deleting && <div className="modal-backdrop" role="presentation"><section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><span className="delete-dialog-icon"><Trash2 size={22} /></span><h2 id="delete-title">Hapus {deleting.brand}?</h2><p id="delete-description">Data usaha dan penandanya akan dihapus permanen dari peta. Tindakan ini tidak dapat dibatalkan.</p>{deleteMessage && <p className="form-message error" aria-live="polite">{deleteMessage}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDeleting(null)} disabled={deletePending}>Batal</button><button type="button" className="danger-button" onClick={deleteUmkm} disabled={deletePending}>{deletePending ? "Menghapus…" : <><Trash2 size={15} /> Hapus permanen</>}</button></div></section></div>}
  </main>;
}
