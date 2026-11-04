"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut, Upload, UserRound } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { signOutAction } from "@/app/admin/actions";
import { saveProfileAction } from "@/app/admin/profile-actions";
import { trackActivity } from "@/features/activity/client";
import type { AdminProfile } from "@/features/admin/types";

function Avatar({ profile, large = false }: { profile: AdminProfile; large?: boolean }) {
  return <span className={`account-avatar${large ? " large" : ""}`}>{profile.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatarUrl} alt={`Foto ${profile.fullName}`} referrerPolicy="no-referrer" />
  ) : profile.fullName.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span>;
}

function ProfileDialog({ profile, onClose }: { profile: AdminProfile; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProfileAction, { success: false, message: "" });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const editable = profile.authMethod === "password";
  useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
  async function upload(file?: File) {
    if (!file || !editable || uploading) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) { setUploadError("Gunakan gambar JPG, PNG, WEBP, atau GIF maksimal 5MB."); return; }
    setUploading(true); setUploadError("");
    try {
      const body = new FormData(); body.append("files", file); body.append("purpose", "avatar");
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Foto gagal diunggah.");
      setAvatarUrl(result.data.urls[0]);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Foto gagal diunggah."); }
    finally { setUploading(false); }
  }
  return <Dialog open onClose={onClose} width={520} labelledBy="account-profile-title">
    <h2 id="account-profile-title">Profil saya</h2>
    <div className="profile-identity"><Avatar profile={{ ...profile, avatarUrl }} large /><div><strong>{profile.fullName}</strong><p className="mut">{profile.role === "superadmin" ? "Superadmin" : "Admin"}</p></div></div>
    {!editable && <p className="alert">Nama, foto, dan email otomatis mengikuti akun Google yang digunakan untuk masuk.</p>}
    <form action={action} className="profile-form">
      <input type="hidden" name="avatarUrl" value={avatarUrl} />
      {editable && <label className="photo-drop profile-photo-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}><Upload className="i" /><span>{uploading ? "Mengunggah foto…" : "Seret foto profil atau klik untuk memilih"}</span><input className="sr-only" aria-label="Pilih foto profil" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>}
      {uploadError && <p className="field-err" role="alert">{uploadError}</p>}
      <label className="fl"><span className="lbl">Nama lengkap</span><span className="inp"><input name="fullName" aria-label="Nama profil" defaultValue={profile.fullName} readOnly={!editable} minLength={2} maxLength={120} required /></span></label>
      <label className="fl"><span className="lbl">Email</span><span className="inp"><input name="email" aria-label="Email profil" type="email" defaultValue={profile.pendingEmail || profile.email} readOnly={!editable} required /></span></label>
      {editable && <small className="mut">Perubahan email memerlukan konfirmasi. Izin Google untuk email baru perlu disetujui kembali oleh Superadmin.</small>}
      <label className="fl"><span className="lbl">Telepon</span><span className="inp"><input name="phone" aria-label="Telepon profil" defaultValue={profile.phone} readOnly={!editable} maxLength={50} /></span></label>
      <label className="fl"><span className="lbl">Bio</span><span className="inp ta"><textarea name="bio" aria-label="Bio profil" defaultValue={profile.bio} readOnly={!editable} maxLength={500} /></span></label>
      {state.message && <p className={`alert${state.success ? "" : " alert-err"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
      <div className="ft"><button type="button" className="btn o" onClick={onClose}>Tutup</button>{editable && <button type="submit" className="btn" disabled={pending || uploading}>{pending && <Loader2 className="i spin" />}Simpan profil</button>}</div>
    </form>
  </Dialog>;
}

export function AccountMenu({ profile }: { profile: AdminProfile }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!ref.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <><div className="account-menu" ref={ref}>
    <button type="button" className="account-trigger" aria-label="Menu profil akun" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Avatar profile={profile} /><span className="account-trigger-text"><b>{profile.fullName}</b><small>{profile.role === "superadmin" ? "Superadmin" : "Admin"}</small></span><ChevronDown className="i sm" /></button>
    {open && <div className="account-dropdown" role="menu"><div className="account-dropdown-identity"><strong>{profile.fullName}</strong><span className="mut">{profile.email}</span><span className="bdg sec">{profile.authMethod === "google" ? "Login Google" : "Email dan kata sandi"}</span></div>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); setEditing(true); trackActivity("view", "profile", "Profil saya"); }}><UserRound className="i" />Profil saya</button>
      <form action={signOutAction}><button type="submit" role="menuitem"><LogOut className="i" />Keluar</button></form>
    </div>}
  </div>{editing && <ProfileDialog profile={profile} onClose={() => setEditing(false)} />}</>;
}
