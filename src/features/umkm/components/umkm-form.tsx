"use client";

import { Loader2, Locate, Plus, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useActionState, useEffect, useRef, useState } from "react";

import { createCategoryAction } from "@/app/admin/category-actions";
import { SelectMenu } from "@/components/select-menu";
import { useCategories } from "@/features/categories/category-provider";
import { catalogOf } from "@/features/umkm/catalog";
import { displayText } from "@/features/umkm/format";
import { uploadPhotos } from "@/features/umkm/photo-upload";
import {
  BANJARSARI_CENTER,
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
  type Umkm,
  type UmkmSubCategory,
} from "@/features/umkm/types";
import { MAX_PHOTOS_PER_UMKM, MAX_SOCIALS_PER_UMKM } from "@/features/umkm/validation";
import type { ActionState } from "@/lib/http/run-action";

import { CatalogEditor } from "./catalog-editor";

const CoordinatePicker = dynamic(
  () =>
    import("@/features/umkm/components/coordinate-picker").then(
      (module) => module.CoordinatePicker,
    ),
  { ssr: false, loading: () => <div className="loc-map picker" /> },
);

const initialState: ActionState = { success: false, message: "" };
const PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((value) => ({ value, label: value }));
const ALL_DAY = "00:00";
const PLACEHOLDERS: Record<SocialPlatform, string> = {
  Instagram: "@akun_instagram",
  TikTok: "@akun_tiktok",
  Facebook: "nama.halaman",
  YouTube: "@nama_kanal",
  "Situs web": "www.contoh.id",
  Lainnya: "[akun media sosial]",
};

export interface UmkmFormProps {
  // null creates a new UMKM, an item edits it.
  item: Umkm | null;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  // Photo upload endpoint of the current user: admin or owner.
  uploadUrl: string;
  // The admin form names the UMKM it edits; the owner form never sends an id, the key decides.
  sendId?: boolean;
  submitLabel?: string;
  // Called right after the server saved the form.
  onSaved?: (message: string) => void;
  onCancel?: () => void;
  footerExtra?: ReactNode;
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = `field-${name}`;

  return (
    <div className="fl">
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <label className="inp">
        <input
          id={id}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
        />
      </label>
    </div>
  );
}

/** Several social accounts: a platform, an account and a remove button per row. */
function SocialLinksField({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const rows = links.length > 0 ? links : [{ platform: "Instagram" as SocialPlatform, handle: "" }];

  function update(index: number, patch: Partial<SocialLink>) {
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="fl span-2">
      <span className="lbl">Media sosial</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, index) => (
          <div key={index} className="social-row">
            <SelectMenu
              value={row.platform}
              options={PLATFORM_OPTIONS}
              onChange={(platform) => update(index, { platform })}
              ariaLabel={`Platform media sosial ${index + 1}`}
              width={150}
            />
            {row.platform === "Lainnya" && (
              <label className="inp">
                <input
                  aria-label={`Nama media sosial ${index + 1}`}
                  value={row.customName ?? ""}
                  placeholder="Nama media sosial"
                  maxLength={60}
                  required
                  onChange={(event) => update(index, { customName: event.target.value })}
                />
              </label>
            )}
            <label className="inp" style={{ flex: 1 }}>
              <input
                value={row.handle}
                placeholder={PLACEHOLDERS[row.platform]}
                maxLength={120}
                aria-label={`Akun media sosial ${index + 1}`}
                onChange={(event) => update(index, { handle: event.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn ic g"
              aria-label={`Hapus media sosial ${index + 1}`}
              disabled={rows.length === 1 && !row.handle}
              onClick={() => onChange(rows.filter((_, position) => position !== index))}
            >
              <X className="i" />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="btn o sm"
            disabled={rows.length >= MAX_SOCIALS_PER_UMKM}
            onClick={() => onChange([...rows, { platform: "Instagram", handle: "" }])}
          >
            <Plus className="i sm" />
            Tambah media sosial
          </button>
        </div>
        <span className="mut" style={{ fontSize: 12 }}>
          Bisa lebih dari satu: Instagram, TikTok, Facebook, YouTube, atau situs web.
        </span>
      </div>
    </div>
  );
}

/** The whole UMKM form of the design: fields on the left, the map point on the right. */
export function UmkmForm({
  item,
  action,
  uploadUrl,
  sendId = false,
  submitLabel = "Simpan",
  onSaved,
  onCancel,
  footerExtra,
}: UmkmFormProps) {
  const { categories, addCategory } = useCategories();
  const CATEGORY_OPTIONS = categories.map((category) => ({
    value: category.name,
    label: category.name,
  }));
  const [newCategory, setNewCategory] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [catalog, setCatalog] = useState(() => (item ? catalogOf(item) : []));
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [subCategory, setSubCategory] = useState<UmkmSubCategory>(item?.subCategory ?? "Camilan");
  const [socials, setSocials] = useState<SocialLink[]>(
    item?.socials ? item.socials.map((link) => ({ ...link })) : [],
  );
  // Kept as text so the user can type "-7." without the value being rewritten while typing.
  const [latitudeText, setLatitudeText] = useState(
    String(item?.latitude ?? BANJARSARI_CENTER.latitude),
  );
  const [longitudeText, setLongitudeText] = useState(
    String(item?.longitude ?? BANJARSARI_CENTER.longitude),
  );
  const latitude = Number(latitudeText) || 0;
  const longitude = Number(longitudeText) || 0;
  const [photos, setPhotos] = useState<string[]>(item?.photos ? [...item.photos] : []);
  const [isUploading, setIsUploading] = useState(false);
  const [isCatalogUploading, setIsCatalogUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const uploadingRef = useRef(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [is24Hours, setIs24Hours] = useState(
    Boolean(item?.openingHours && item.openingHours.trim() === item.closingHours?.trim()),
  );
  const [openingHours, setOpeningHours] = useState(item?.openingHours || "08:00");
  const [closingHours, setClosingHours] = useState(item?.closingHours || "17:00");

  // The latest callback, so the effect below runs once per server result and not on every render.
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.success) {
      onSavedRef.current?.(state.message);
    }
  }, [state]);

  async function uploadFiles(files: File[]) {
    if (uploadingRef.current) {
      return;
    }

    if (files.length === 0) {
      return;
    }

    if (photos.length + files.length > MAX_PHOTOS_PER_UMKM) {
      setUploadError(
        `Maksimal ${MAX_PHOTOS_PER_UMKM} foto. Anda sudah memiliki ${photos.length} foto.`,
      );

      return;
    }

    setUploadError(null);
    setIsUploading(true);
    uploadingRef.current = true;

    try {
      const uploadedUrls = await uploadPhotos({ endpoint: uploadUrl, files });

      setPhotos((previousPhotos) => [...previousPhotos, ...uploadedUrls]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      uploadingRef.current = false;
    }
  }

  async function addNewCategory() {
    setIsAddingCategory(true);
    setCategoryMessage("");

    try {
      const result = await createCategoryAction(newCategory);
      if (result.success && result.data) {
        addCategory(result.data);
        setSubCategory(result.data.name);
        setNewCategory("");
      } else {
        setCategoryMessage(result.message);
      }
    } finally {
      setIsAddingCategory(false);
    }
  }

  function toggle24Hours(isChecked: boolean) {
    setIs24Hours(isChecked);
    if (isChecked) {
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

  // Empty rows are only there to be typed in, they are not saved.
  const savedSocials = socials.filter((link) => link.handle.trim());

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sendId && <input type="hidden" name="id" value={item?.id ?? ""} />}
      <input type="hidden" name="subCategory" value={subCategory} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="socials" value={JSON.stringify(savedSocials)} />
      <input type="hidden" name="catalog" value={JSON.stringify(catalog)} />
      <input type="hidden" name="priceDescription" value={item?.priceDescription ?? ""} />
      <input type="hidden" name="openingHours" value={openingHours} />
      <input type="hidden" name="closingHours" value={closingHours} />

      <div className="form-grid">
        <div className="form-fields">
          <TextField
            label="Nama usaha"
            name="name"
            defaultValue={item ? displayText(item.brand) : ""}
            required
            maxLength={120}
          />
          <div className="fl">
            <label className="lbl">Kategori</label>
            <SelectMenu
              value={subCategory}
              options={CATEGORY_OPTIONS}
              onChange={setSubCategory}
              ariaLabel="Kategori"
            />
            {sendId && (
              <div className="category-inline">
                <label className="inp">
                  <input
                    aria-label="Kategori baru"
                    value={newCategory}
                    maxLength={60}
                    placeholder="Nama kategori baru"
                    onChange={(event) => setNewCategory(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn o sm"
                  disabled={isAddingCategory || newCategory.trim().length < 2}
                  onClick={addNewCategory}
                >
                  <Plus className="i sm" />
                  Tambah
                </button>
              </div>
            )}
            {categoryMessage && (
              <span className="field-err" role="alert">
                {categoryMessage}
              </span>
            )}
          </div>
          <TextField
            label="Pemilik"
            name="ownerName"
            defaultValue={item ? displayText(item.ownerName) : ""}
            maxLength={120}
          />
          <TextField
            label="Produk"
            name="products"
            defaultValue={item ? displayText(item.products, "sentence") : ""}
            maxLength={500}
          />
          <CatalogEditor
            products={catalog}
            photos={photos}
            uploadEndpoint={uploadUrl}
            onChange={setCatalog}
            onUploadingChange={setIsCatalogUploading}
          />
          <TextField
            label="Produk unggulan"
            name="featuredProduct"
            defaultValue={item?.featuredProduct}
            maxLength={500}
          />
          <TextField
            label="Catatan usaha"
            name="notes"
            defaultValue={item?.notes}
            maxLength={1000}
          />
          <TextField
            label="Tautan Google Maps"
            name="googleMapsUrl"
            defaultValue={item?.googleMapsUrl}
            maxLength={500}
          />
          <div className="fl span-2">
            <label className="lbl" htmlFor="field-address">
              Alamat
            </label>
            <label className="inp ta">
              <textarea
                id="field-address"
                name="address"
                defaultValue={item ? displayText(item.address) : ""}
                maxLength={500}
              />
            </label>
          </div>
          <div className="span-2">
            <TextField
              label="WhatsApp"
              name="contact"
              defaultValue={item?.contact}
              placeholder="[Nomor WhatsApp]"
              maxLength={50}
            />
          </div>
          <SocialLinksField links={socials} onChange={setSocials} />

          <label className="chk span-2">
            <input
              type="checkbox"
              checked={is24Hours}
              onChange={(event) => toggle24Hours(event.target.checked)}
            />
            <span className={`cb${is24Hours ? " on" : ""}`}>
              {is24Hours && (
                <svg className="i xs" viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            Buka 24 jam
          </label>
          <div className="fl">
            <label className="lbl" htmlFor="field-open">
              Jam buka
            </label>
            <label className="inp">
              <input
                id="field-open"
                value={openingHours}
                disabled={is24Hours}
                maxLength={10}
                onChange={(event) => setOpeningHours(event.target.value)}
              />
            </label>
          </div>
          <div className="fl">
            <label className="lbl" htmlFor="field-close">
              Jam tutup
            </label>
            <label className="inp">
              <input
                id="field-close"
                value={closingHours}
                disabled={is24Hours}
                maxLength={10}
                onChange={(event) => setClosingHours(event.target.value)}
              />
            </label>
          </div>

          <div className="fl span-2">
            <span className="lbl">Foto</span>
            <label
              className={`photo-drop${isDragging ? " dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current++;
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (!dragDepth.current) {
                  setIsDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setIsDragging(false);
                void uploadFiles(Array.from(event.dataTransfer.files));
              }}
            >
              {isUploading ? <Loader2 className="i lg spin" /> : <Upload className="i lg" />}
              <span>
                {isUploading
                  ? "Mengunggah…"
                  : `Seret foto ke sini atau klik untuk memilih · ${photos.length}/${MAX_PHOTOS_PER_UMKM}`}
              </span>
              <small className="mut">JPG, PNG, WEBP, GIF · maksimal 5MB per foto</small>
              <input
                type="file"
                aria-label="Pilih foto usaha"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                disabled={isUploading || photos.length >= MAX_PHOTOS_PER_UMKM}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  void uploadFiles(files);
                }}
              />
            </label>
            {uploadError && (
              <div className="field-err" role="alert">
                {uploadError}
              </div>
            )}
            {photos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {photos.map((photo, index) => (
                  <div key={photo} className="photo-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Foto ${index + 1}`} />
                    <button
                      type="button"
                      aria-label={`Hapus foto ${index + 1}`}
                      onClick={() =>
                        setPhotos((previous) =>
                          previous.filter((_, position) => position !== index),
                        )
                      }
                    >
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
              onChange={(nextLatitude, nextLongitude) => {
                setLatitudeText(nextLatitude.toFixed(6));
                setLongitudeText(nextLongitude.toFixed(6));
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="fl">
              <label className="lbl" htmlFor="field-latitude">
                Latitude
              </label>
              <label className="inp">
                <input
                  id="field-latitude"
                  name="latitude"
                  inputMode="decimal"
                  required
                  value={latitudeText}
                  onChange={(event) => setLatitudeText(event.target.value)}
                />
              </label>
            </div>
            <div className="fl">
              <label className="lbl" htmlFor="field-longitude">
                Longitude
              </label>
              <label className="inp">
                <input
                  id="field-longitude"
                  name="longitude"
                  inputMode="decimal"
                  required
                  value={longitudeText}
                  onChange={(event) => setLongitudeText(event.target.value)}
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn o"
            style={{ width: "100%" }}
            onClick={useDeviceLocation}
          >
            <Locate className="i" />
            Titik perangkat saya
          </button>
        </div>
      </div>

      {state.message && (
        <div
          className={`alert${state.success ? "" : " alert-err"}`}
          role={state.success ? "status" : "alert"}
        >
          <span style={{ color: state.success ? "var(--fg)" : "var(--des)" }}>{state.message}</span>
        </div>
      )}
      <div className="ft">
        {footerExtra && <div style={{ marginRight: "auto" }}>{footerExtra}</div>}
        {onCancel && (
          <button type="button" className="btn o" onClick={onCancel}>
            Batal
          </button>
        )}
        <button
          type="submit"
          className="btn"
          disabled={isPending || isUploading || isCatalogUploading}
        >
          {isPending && <Loader2 className="i spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
