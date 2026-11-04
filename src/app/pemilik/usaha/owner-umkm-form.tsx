"use client";

import { CircleCheck, ExternalLink, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ownerSaveUmkmAction } from "@/app/pemilik/actions";
import { UmkmForm } from "@/features/umkm/components/umkm-form";
import type { Umkm } from "@/features/umkm/types";

/** The shop form of an owner, with the banner above it: how the key works, or "saved". */
export function OwnerUmkmForm({ item }: { item: Umkm | null }) {
  const router = useRouter();
  const [savedMessage, setSavedMessage] = useState("");

  function saved(message: string) {
    setSavedMessage(message);
    // The first save creates the UMKM and links the key to it, so the page reloads in "edit" mode.
    router.refresh();
  }

  return (
    <>
      {savedMessage ? (
        <div className="alert owner-saved" role="status">
          <CircleCheck className="i" style={{ color: "var(--okf)" }} />
          <div>
            <b>Perubahan tersimpan</b>
            <span>{savedMessage}</span>
          </div>
        </div>
      ) : (
        <div className="alert">
          <KeyRound className="i" />
          <div>
            <b>Anda masuk dengan kunci akses</b>
            <span>
              Kunci ini memberi izin untuk mengisi dan mengubah semua data usaha Anda. Titik lokasi
              akan diperiksa oleh admin desa.
            </span>
          </div>
        </div>
      )}
      <div className="card owner-card">
        <UmkmForm
          key={item?.id ?? "new"}
          item={item}
          action={ownerSaveUmkmAction}
          uploadUrl="/api/owner/upload"
          submitLabel={item ? "Simpan perubahan" : "Simpan data usaha"}
          onSaved={saved}
          footerExtra={
            item ? (
              <Link className="btn o" href={`/umkm/${item.id}`}>
                <ExternalLink className="i" />
                Lihat profil
              </Link>
            ) : undefined
          }
        />
      </div>
    </>
  );
}
