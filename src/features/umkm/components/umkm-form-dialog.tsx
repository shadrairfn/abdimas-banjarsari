"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useState } from "react";
import { Loader2, Locate, Upload, X } from "lucide-react";
import { upsertUmkmAction } from "@/app/admin/actions";
import { Dialog } from "@/components/dialog";
import { SelectMenu } from "@/components/select-menu";
import { displayText } from "@/features/umkm/format";
import { BANJARSARI_CENTER, UMKM_SUB_CATEGORIES, type LocationStatus, type Umkm, type UmkmSubCategory } from "@/features/umkm/types";
import { MAX_PHOTOS_PER_UMKM } from "@/features/umkm/validation";
import type { ActionState } from "@/lib/http/run-action";

const CoordinatePicker = dynamic(
  () => import("@/features/umkm/components/coordinate-picker").then((module) => module.CoordinatePicker),
  { ssr: false, loading: () => <div className="loc-map picker" /> },
);

const initialState: ActionState = { success: false, message: "" };
const CATEGORY_OPTIONS = UMKM_SUB_CATEGORIES.map((value) => ({ value, label: value }));
const STATUS_OPTIONS: { value: LocationStatus; label: string }[] = [
  { value: "verified", label: "Terverifikasi" },
  { value: "estimated", label: "Perkiraan" },
  { value: "outside", label: "Di luar desa" },
];
const CLOSE_DELAY_MS = 600;
const ALL_DAY = "00:00";

interface UmkmFormDialogProps {
  // null creates a new UMKM, an item edits it.
  item: Umkm | null;
  onClose: () => void;
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  maxLength,
  span,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  span?: boolean;
}) {
  const id = `field-${name}`;

  return (
    <div className={`fl${span ? " span-2" : ""}`}>
      <label className="lbl" htmlFor={id}>{label}</label>
      <label className="inp">
        <input id={id} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} maxLength={maxLength} />
      </label>
    </div>
  );
}

export function UmkmFormDialog({ item, onClose }: UmkmFormDialogProps) {
  const [state, formAction, pending] = useActionState(upsertUmkmAction, initialState);
  const [subCategory, setSubCategory] = useState<UmkmSubCategory>(item?.subCategory ?? "Camilan");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(item?.locationStatus ?? "verified");
  // Kept as text so the admin can type "-7." without the value being rewritten while typing.
  const [latitudeText, setLatitudeText] = useState(String(item?.latitude ?? BANJARSARI_CENTER.latitude));
  const [longitudeText, setLongitudeText] = useState(String(item?.longitude ?? BANJARSARI_CENTER.longitude));
  const latitude = Number(latitudeText) || 0;
  const longitude = Number(longitudeText) || 0;
  const [photos, setPhotos] = useState<string[]>(item?.photos ? [...item.photos] : []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [is24Hours, setIs24Hours] = useState(Boolean(item?.openingHours && item.openingHours.trim() === item.closingHours?.trim()));
  const [openingHours, setOpeningHours] = useState(item?.openingHours || "08:00");
  const [closingHours, setClosingHours] = useState(item?.closingHours || "17:00");

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(onClose, CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onClose, state]);

  async function uploadSelectedFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (photos.length + files.length > MAX_PHOTOS_PER_UMKM) {
      setUploadError(`Maksimal ${MAX_PHOTOS_PER_UMKM} foto. Anda sudah memiliki ${photos.length} foto.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal mengunggah foto.");
      setPhotos((previous) => [...previous, ...result.data.urls].slice(0, MAX_PHOTOS_PER_UMKM));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  }

  function toggle24Hours(checked: boolean) {
    setIs24Hours(checked);
    if (checked) {
      setOpeningHours(ALL_DAY);
      setClosingHours(ALL_DAY);
    } else {
      setOpeningHours("08:00");
      setClosingHours("17:00");
    }
  }

  function useDeviceLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setLatitudeText(coords.latitude.toFixed(6));
      setLongitudeText(coords.longitude.toFixed(6));
    });
  }

  return (
    <Dialog open onClose={onClose} width={1060} labelledBy="umkm-form-title">
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 id="umkm-form-title">{item ? "Edit UMKM" : "Tambah UMKM"}</h2>
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <input type="hidden" name="subCategory" value={subCategory} />
        <input type="hidden" name="locationStatus" value={locationStatus} />
        <input type="hidden" name="photos" value={JSON.stringify(photos)} />
        <input type="hidden" name="openingHours" value={openingHours} />
        <input type="hidden" name="closingHours" value={closingHours} />

        <div className="form-grid">
          <div className="form-fields">
            <TextField label="Nama usaha" name="name" defaultValue={item ? displayText(item.brand) : ""} required maxLength={120} />
            <div className="fl">
              <label className="lbl">Kategori</label>
              <SelectMenu value={subCategory} options={CATEGORY_OPTIONS} onChange={setSubCategory} ariaLabel="Kategori" />
            </div>
            <TextField label="Pemilik" name="ownerName" defaultValue={item ? displayText(item.ownerName) : ""} maxLength={120} />
            <TextField label="Produk" name="products" defaultValue={item ? displayText(item.products, "sentence") : ""} maxLength={500} />
            <div className="fl span-2">
              <label className="lbl" htmlFor="field-address">Alamat</label>
              <label className="inp ta">
                <textarea id="field-address" name="address" defaultValue={item ? displayText(item.address) : ""} maxLength={500} />
              </label>
            </div>
            <TextField label="WhatsApp" name="contact" defaultValue={item?.contact} placeholder="[Nomor WhatsApp]" maxLength={50} />
            <TextField label="Media sosial" name="website" defaultValue={item?.website} placeholder="[akun media sosial]" maxLength={255} />

            <div className="fl span-2">
              <span className="lbl">Status titik</span>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className="chk">
                    <input type="radio" name="status-choice" checked={locationStatus === option.value} onChange={() => setLocationStatus(option.value)} />
                    <span className={`rd${locationStatus === option.value ? " on" : ""}`} />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="chk span-2">
              <input type="checkbox" checked={is24Hours} onChange={(event) => toggle24Hours(event.target.checked)} />
              <span className={`cb${is24Hours ? " on" : ""}`}>{is24Hours && <svg className="i xs" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>}</span>
              Buka 24 jam
            </label>
            <div className="fl">
              <label className="lbl" htmlFor="field-open">Jam buka</label>
              <label className="inp">
                <input id="field-open" value={openingHours} disabled={is24Hours} maxLength={10} onChange={(event) => setOpeningHours(event.target.value)} />
              </label>
            </div>
            <div className="fl">
              <label className="lbl" htmlFor="field-close">Jam tutup</label>
              <label className="inp">
                <input id="field-close" value={closingHours} disabled={is24Hours} maxLength={10} onChange={(event) => setClosingHours(event.target.value)} />
              </label>
            </div>

            <div className="fl span-2">
              <span className="lbl">Foto</span>
              <label className="photo-drop">
                {isUploading ? <Loader2 className="i lg spin" /> : <Upload className="i lg" />}
                <span>{isUploading ? "Mengunggah…" : `Pilih foto · ${photos.length}/${MAX_PHOTOS_PER_UMKM}`}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" disabled={isUploading || photos.length >= MAX_PHOTOS_PER_UMKM} onChange={uploadSelectedFiles} />
              </label>
              {uploadError && <div className="field-err" role="alert">{uploadError}</div>}
              {photos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {photos.map((photo, index) => (
                    <div key={photo} className="photo-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Foto ${index + 1}`} />
                      <button type="button" aria-label={`Hapus foto ${index + 1}`} onClick={() => setPhotos((previous) => previous.filter((_, position) => position !== index))}>
                        <X className="i xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="fl">
              <span className="lbl">Titik lokasi</span>
              <CoordinatePicker
                latitude={latitude}
                longitude={longitude}
                subCategory={subCategory}
                locationStatus={locationStatus}
                onChange={(nextLatitude, nextLongitude) => {
                  setLatitudeText(nextLatitude.toFixed(6));
                  setLongitudeText(nextLongitude.toFixed(6));
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="fl">
                <label className="lbl" htmlFor="field-latitude">Latitude</label>
                <label className="inp">
                  <input id="field-latitude" name="latitude" inputMode="decimal" required value={latitudeText} onChange={(event) => setLatitudeText(event.target.value)} />
                </label>
              </div>
              <div className="fl">
                <label className="lbl" htmlFor="field-longitude">Longitude</label>
                <label className="inp">
                  <input id="field-longitude" name="longitude" inputMode="decimal" required value={longitudeText} onChange={(event) => setLongitudeText(event.target.value)} />
                </label>
              </div>
            </div>
            <button type="button" className="btn o" style={{ width: "100%" }} onClick={useDeviceLocation}>
              <Locate className="i" />Titik perangkat saya
            </button>
          </div>
        </div>

        {state.message && (
          <div className={`alert${state.success ? "" : " alert-err"}`} role={state.success ? "status" : "alert"}>
            <span style={{ color: state.success ? "var(--fg)" : "var(--des)" }}>{state.message}</span>
          </div>
        )}
        <div className="ft">
          <button type="button" className="btn o" onClick={onClose}>Batal</button>
          <button type="submit" className="btn" disabled={pending || isUploading}>
            {pending && <Loader2 className="i spin" />}Simpan
          </button>
        </div>
      </form>
    </Dialog>
  );
}
