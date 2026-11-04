"use client";

import { ChevronDown, Loader2, LogOut, Upload, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/admin/actions";
import { saveProfileAction } from "@/app/admin/profile-actions";
import { Dialog } from "@/components/dialog";
import type { AdminProfile } from "@/features/admin/types";
import { uploadPhotos } from "@/features/umkm/photo-upload";
import { getInitials } from "@/lib/ui/initials";

function Avatar({ profile, large = false }: { profile: AdminProfile; large?: boolean }) {
  return (
    <span className={`account-avatar${large ? " large" : ""}`}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={`Foto ${profile.fullName}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        getInitials(profile.fullName)
      )}
    </span>
  );
}

function ProfileDialog({ profile, onClose }: { profile: AdminProfile; onClose: () => void }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(saveProfileAction, {
    success: false,
    message: "",
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const canEditProfile = profile.authMethod === "password";
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state, router]);

  async function uploadAvatar(file?: File) {
    if (!file || !canEditProfile || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const [uploadedAvatarUrl] = await uploadPhotos({
        endpoint: "/api/admin/upload",
        files: [file],
        purpose: "avatar",
      });

      setAvatarUrl(uploadedAvatarUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Foto gagal diunggah.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} width={520} labelledBy="account-profile-title">
      <h2 id="account-profile-title">Profil saya</h2>
      <div className="profile-identity">
        <Avatar profile={{ ...profile, avatarUrl }} large />
        <div>
          <strong>{profile.fullName}</strong>
          <p className="mut">{profile.role === "superadmin" ? "Superadmin" : "Admin"}</p>
        </div>
      </div>
      {!canEditProfile && (
        <p className="alert">
          Nama, foto, dan email otomatis mengikuti akun Google yang digunakan untuk masuk.
        </p>
      )}
      <form action={action} className="profile-form">
        <input type="hidden" name="avatarUrl" value={avatarUrl} />
        {canEditProfile && (
          <label
            className="photo-drop profile-photo-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void uploadAvatar(event.dataTransfer.files[0]);
            }}
          >
            <Upload className="i" />
            <span>
              {isUploading ? "Mengunggah foto…" : "Seret foto profil atau klik untuk memilih"}
            </span>
            <input
              className="sr-only"
              aria-label="Pilih foto profil"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isUploading}
              onChange={(event) => {
                void uploadAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {uploadError && (
          <p className="field-err" role="alert">
            {uploadError}
          </p>
        )}
        <label className="fl">
          <span className="lbl">Nama lengkap</span>
          <span className="inp">
            <input
              name="fullName"
              aria-label="Nama profil"
              defaultValue={profile.fullName}
              readOnly={!canEditProfile}
              minLength={2}
              maxLength={120}
              required
            />
          </span>
        </label>
        <label className="fl">
          <span className="lbl">Email</span>
          <span className="inp">
            <input
              name="email"
              aria-label="Email profil"
              type="email"
              defaultValue={profile.pendingEmail || profile.email}
              readOnly={!canEditProfile}
              required
            />
          </span>
        </label>
        {canEditProfile && (
          <small className="mut">
            Perubahan email memerlukan konfirmasi. Izin Google untuk email baru perlu disetujui
            kembali oleh Superadmin.
          </small>
        )}
        <label className="fl">
          <span className="lbl">Telepon</span>
          <span className="inp">
            <input
              name="phone"
              aria-label="Telepon profil"
              defaultValue={profile.phone}
              readOnly={!canEditProfile}
              maxLength={50}
            />
          </span>
        </label>
        <label className="fl">
          <span className="lbl">Bio</span>
          <span className="inp ta">
            <textarea
              name="bio"
              aria-label="Bio profil"
              defaultValue={profile.bio}
              readOnly={!canEditProfile}
              maxLength={500}
            />
          </span>
        </label>
        {state.message && (
          <p
            className={`alert${state.success ? "" : " alert-err"}`}
            role={state.success ? "status" : "alert"}
          >
            {state.message}
          </p>
        )}
        <div className="ft">
          <button type="button" className="btn o" onClick={onClose}>
            Tutup
          </button>
          {canEditProfile && (
            <button type="submit" className="btn" disabled={isPending || isUploading}>
              {isPending && <Loader2 className="i spin" />}Simpan profil
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

export function AccountMenu({ profile }: { profile: AdminProfile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function closeMenuOnOutsidePointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenuOnOutsidePointer);
    document.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePointer);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  return (
    <>
      <div className="account-menu" ref={menuRef}>
        <button
          type="button"
          className="account-trigger"
          aria-label="Menu profil akun"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Avatar profile={profile} />
          <span className="account-trigger-text">
            <b>{profile.fullName}</b>
            <small>{profile.role === "superadmin" ? "Superadmin" : "Admin"}</small>
          </span>
          <ChevronDown className="i sm" />
        </button>
        {isMenuOpen && (
          <div className="account-dropdown" role="menu">
            <div className="account-dropdown-identity">
              <strong>{profile.fullName}</strong>
              <span className="mut">{profile.email}</span>
              <span className="bdg sec">
                {profile.authMethod === "google" ? "Login Google" : "Email dan kata sandi"}
              </span>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setIsProfileOpen(true);
              }}
            >
              <UserRound className="i" />
              Profil saya
            </button>
            <form action={signOutAction}>
              <button type="submit" role="menuitem">
                <LogOut className="i" />
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
      {isProfileOpen && <ProfileDialog profile={profile} onClose={() => setIsProfileOpen(false)} />}
    </>
  );
}
