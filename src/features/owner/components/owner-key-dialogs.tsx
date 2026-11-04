"use client";

import {
  ArrowRight,
  Ban,
  CircleCheck,
  Copy,
  KeyRound,
  Loader2,
  MessageCircle,
  PencilLine,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import {
  createOwnerKeyAction,
  type IssuedKey,
  type IssueKeyState,
  regenerateOwnerKeyAction,
  revokeOwnerKeyAction,
} from "@/app/admin/key-actions";
import { Dialog } from "@/components/dialog";
import { SelectMenu } from "@/components/select-menu";
import { formatDate, formatDateTime } from "@/features/activity/format";
import { inviteMessage, suggestKey } from "@/features/owner/key-format";
import {
  maskedKey,
  OWNER_KEY_EXPIRY_OPTIONS,
  OWNER_KEY_STATUS_LABELS,
  type OwnerKeyExpiryValue,
  type OwnerKeySummary,
} from "@/features/owner/types";
import { displayText } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

const EXPIRY_SELECT_OPTIONS = OWNER_KEY_EXPIRY_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}));
const COPIED_RESET_MS = 1800;
const KEY_STATUS_CLASSES = { active: "ok", pending: "sec", revoked: "er", expired: "sec" };

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), COPIED_RESET_MS);
    } catch {
      setCopied(null);
    }
  }

  return { copied, copy };
}

/** First step of "Tambah UMKM": the admin fills the form, or gives the owner a key to do it. */
export function ChooseMethodDialog({
  onClose,
  onAdminForm,
  onKeyFlow,
}: {
  onClose: () => void;
  onAdminForm: () => void;
  onKeyFlow: () => void;
}) {
  return (
    <Dialog open onClose={onClose} width={580} labelledBy="choose-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="choose-title">Tambah UMKM</h2>
        <p>Pilih siapa yang akan mengisi data usaha ini.</p>
      </div>
      <div className="choice-grid">
        <button type="button" className="choice" onClick={onAdminForm}>
          <span className="sq">
            <PencilLine className="i lg" />
          </span>
          <span className="fw6">Isi sendiri sebagai admin</span>
          <span className="mut">Buka form lengkap dan isi semua data usaha sekarang.</span>
          <span className="btn o sm" aria-hidden>
            Buka form
            <ArrowRight className="i sm" />
          </span>
        </button>
        <button type="button" className="choice rec" onClick={onKeyFlow}>
          <span className="sq" style={{ background: "var(--pri)", color: "var(--prf)" }}>
            <KeyRound className="i lg" />
          </span>
          <span className="fw6">Buat kunci untuk pemilik</span>
          <span className="mut">
            Pemilik mengisi dan mengubah data tokonya sendiri memakai kunci akses.
          </span>
          <span className="btn sm" aria-hidden>
            Buat kunci
            <ArrowRight className="i sm" />
          </span>
        </button>
      </div>
      <div className="ft">
        <button type="button" className="btn o" onClick={onClose}>
          Batal
        </button>
      </div>
    </Dialog>
  );
}

interface CreateKeyDialogProps {
  items: Umkm[];
  // Opens with "UMKM yang sudah ada" and this UMKM selected.
  presetUmkmId?: string;
  onClose: () => void;
  onIssued: (issued: IssuedKey) => void;
}

export function CreateKeyDialog({ items, presetUmkmId, onClose, onIssued }: CreateKeyDialogProps) {
  const { copied, copy } = useCopy();
  const [mode, setMode] = useState<"new" | "existing">(presetUmkmId ? "existing" : "new");
  const [umkmId, setUmkmId] = useState(presetUmkmId ?? "");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [key, setKey] = useState(suggestKey);
  const [expiry, setExpiry] = useState<OwnerKeyExpiryValue>("30");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const days = OWNER_KEY_EXPIRY_OPTIONS.find((option) => option.value === expiry)?.days ?? null;
    const result = await createOwnerKeyAction({
      mode,
      umkmId: mode === "existing" ? umkmId : "",
      ownerLabel,
      customKey: key,
      expiresInDays: days,
    });

    setIsPending(false);
    if (result.success && result.data) {
      onIssued(result.data);
    } else {
      setMessage(result.message);
    }
  }

  const options: ["new" | "existing", string, string][] = [
    ["new", "UMKM baru", "Pemilik yang akan mengisi data toko dari awal."],
    [
      "existing",
      "UMKM yang sudah ada",
      "Beri pemilik akses untuk mengubah data usaha yang sudah terdaftar.",
    ],
  ];

  return (
    <Dialog open onClose={onClose} width={540} labelledBy="create-key-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="create-key-title">Buat kunci akses</h2>
        <p>Kunci ini memberi pemilik izin untuk mengisi dan mengubah semua data tokonya.</p>
      </div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="fl">
          <span className="lbl">Untuk UMKM</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {options.map(([value, title, description]) => (
              <label key={value} className={`chk opt${mode === value ? " on" : ""}`}>
                <input
                  type="radio"
                  name="key-mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span className={`rd${mode === value ? " on" : ""}`} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="fw5">{title}</span>
                  <span className="mut" style={{ fontWeight: 400, fontSize: 13 }}>
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {mode === "existing" && (
          <div className="fl">
            <label className="lbl" htmlFor="key-umkm">
              UMKM
            </label>
            <label className="inp">
              <select
                id="key-umkm"
                value={umkmId}
                required
                onChange={(event) => setUmkmId(event.target.value)}
              >
                <option value="">Pilih UMKM</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {displayText(item.brand)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="fl">
          <label className="lbl" htmlFor="key-label">
            Nama pemilik / catatan
          </label>
          <label className="inp">
            <input
              id="key-label"
              value={ownerLabel}
              maxLength={120}
              placeholder="Mis. Mang Oyo"
              onChange={(event) => setOwnerLabel(event.target.value)}
            />
          </label>
        </div>

        <div className="fl">
          <label className="lbl" htmlFor="key-value">
            Kunci akses
          </label>
          <div className="key-controls">
            <label className="inp key-input" style={{ flex: 1 }}>
              <KeyRound className="i" />
              <input
                id="key-value"
                className="mono"
                value={key}
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setKey(event.target.value.toUpperCase())}
              />
            </label>
            <button type="button" className="btn o" onClick={() => setKey(suggestKey())}>
              <RefreshCw className="i" />
              Acak ulang
            </button>
            <button
              type="button"
              className="btn ic o"
              aria-label="Salin kunci"
              title="Salin kunci"
              disabled={!key}
              onClick={() => copy("field", key)}
            >
              {copied === "field" ? <CircleCheck className="i" /> : <Copy className="i" />}
            </button>
          </div>
          <span className="mut" style={{ fontSize: 12, marginTop: 6 }}>
            Ketik kunci sendiri (huruf dan angka, 8–16 karakter) atau biarkan sistem membuatnya.
          </span>
        </div>

        <div className="fl">
          <span className="lbl">Masa berlaku</span>
          <SelectMenu
            value={expiry}
            options={EXPIRY_SELECT_OPTIONS}
            onChange={setExpiry}
            ariaLabel="Masa berlaku"
          />
        </div>

        <div className="alert">
          <KeyRound className="i" />
          <div>
            <b>Yang bisa dilakukan pemilik</b>
            <span>
              Mengisi dan mengubah semua data toko, foto, jam buka, dan titik lokasi. Titik lokasi
              tetap diperiksa admin. Pemilik tidak bisa menghapus UMKM.
            </span>
          </div>
        </div>

        {message && (
          <div className="alert alert-err" role="alert">
            <span style={{ color: "var(--des)" }}>{message}</span>
          </div>
        )}

        <div className="ft">
          <button type="button" className="btn o" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn" disabled={isPending}>
            {isPending ? <Loader2 className="i spin" /> : <KeyRound className="i" />}Buat kunci
          </button>
        </div>
      </form>
    </Dialog>
  );
}

interface KeyIssuedDialogProps {
  issued: IssuedKey;
  title?: string;
  onClose: () => void;
  // Shown only after "Buat kunci", to hand out another key straight away.
  onAnother?: () => void;
}

/** The only moment the full key is shown: it is stored as a hash and cannot be read again. */
export function KeyIssuedDialog({
  issued,
  title = "Kunci akses siap dibagikan",
  onClose,
  onAnother,
}: KeyIssuedDialogProps) {
  const { copied, copy } = useCopy();
  const target = issued.ownerLabel || issued.umkmName || "pemilik";
  const whatsappText = () => inviteMessage(issued.ownerLabel, issued.key, window.location.origin);

  return (
    <Dialog open onClose={onClose} width={480} labelledBy="issued-title">
      <span className="sq" style={{ borderRadius: "50%", color: "var(--okf)" }}>
        <CircleCheck className="i lg" />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="issued-title">{title}</h2>
        <p>Kirim kunci ini ke {target}. Setelah dipakai, form data toko akan terbuka otomatis.</p>
      </div>
      <div className="key-big">
        <span className="mono" data-testid="issued-key">
          {issued.key}
        </span>
        <button type="button" className="btn o sm" onClick={() => copy("key", issued.key)}>
          {copied === "key" ? <CircleCheck className="i sm" /> : <Copy className="i sm" />}
          {copied === "key" ? "Tersalin" : "Salin"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn o"
          style={{ flex: 1 }}
          onClick={() =>
            window.open(
              `https://wa.me/?text=${encodeURIComponent(whatsappText())}`,
              "_blank",
              "noopener",
            )
          }
        >
          <MessageCircle className="i" />
          Kirim via WhatsApp
        </button>
        <button
          type="button"
          className="btn o"
          style={{ flex: 1 }}
          onClick={() => copy("message", whatsappText())}
        >
          {copied === "message" ? <CircleCheck className="i" /> : <Copy className="i" />}
          {copied === "message" ? "Tersalin" : "Salin pesan undangan"}
        </button>
      </div>
      <div className="alert alert-warn">
        <TriangleAlert className="i" style={{ color: "var(--wnf)" }} />
        <div>
          <b>Simpan dan bagikan dengan hati-hati</b>
          <span>
            Siapa pun yang memiliki kunci ini dapat mengubah data toko. Kunci lengkap hanya tampil
            sekarang; jika hilang, ganti dengan kunci baru.
            {issued.expiresAt ? ` Berlaku sampai ${formatDate(issued.expiresAt)}.` : ""}
          </span>
        </div>
      </div>
      <div className="ft">
        {onAnother && (
          <button type="button" className="btn o" onClick={onAnother}>
            Buat kunci lain
          </button>
        )}
        <button type="button" className="btn" onClick={onClose}>
          Selesai
        </button>
      </div>
    </Dialog>
  );
}

interface ManageKeyDialogProps {
  keyInfo: OwnerKeySummary;
  onClose: () => void;
  onIssued: (issued: IssuedKey) => void;
  onChanged: () => void;
}

/** Details of one key, with "Ganti kunci" and "Cabut kunci". */
export function ManageKeyDialog({ keyInfo, onClose, onIssued, onChanged }: ManageKeyDialogProps) {
  const [pending, setPending] = useState<"regenerate" | "revoke" | null>(null);
  const [message, setMessage] = useState("");
  const [shouldConfirmRevoke, setShouldConfirmRevoke] = useState(false);
  const isRevoked = keyInfo.status === "revoked";

  async function run(kind: "regenerate" | "revoke") {
    setPending(kind);
    setMessage("");
    let result: { success: boolean; message: string };
    let issued: IssuedKey | undefined;

    if (kind === "regenerate") {
      const regenerated: IssueKeyState = await regenerateOwnerKeyAction(keyInfo.id);
      result = regenerated;
      issued = regenerated.data;
    } else {
      result = await revokeOwnerKeyAction(keyInfo.id);
    }

    setPending(null);

    if (!result.success) {
      setMessage(result.message);

      return;
    }

    if (issued) {
      onIssued(issued);
    } else {
      onChanged();
    }
  }

  const rows: [string, string][] = [
    ["Usaha", keyInfo.umkmName ? displayText(keyInfo.umkmName) : "UMKM baru (belum diisi)"],
    ["Masa berlaku", keyInfo.expiresAt ? `Sampai ${formatDate(keyInfo.expiresAt)}` : "Tanpa batas"],
    ["Dibuat", formatDateTime(keyInfo.createdAt)],
    ["Terakhir dipakai", keyInfo.lastUsedAt ? formatDateTime(keyInfo.lastUsedAt) : "Belum pernah"],
  ];

  return (
    <Dialog open onClose={onClose} width={480} labelledBy="manage-key-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="manage-key-title">
          Kunci akses{keyInfo.ownerLabel ? ` · ${keyInfo.ownerLabel}` : ""}
        </h2>
        <p>Pemilik memakai kunci ini untuk mengisi dan mengubah data tokonya.</p>
      </div>
      <div className="inp mono key-masked">
        <KeyRound className="i" />
        {maskedKey(keyInfo.hint)}
      </div>
      <div>
        <div className="irow" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="mut">Status</span>
          <span className={`bdg ${KEY_STATUS_CLASSES[keyInfo.status]}`}>
            {OWNER_KEY_STATUS_LABELS[keyInfo.status]}
          </span>
        </div>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="irow"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <span className="mut">{label}</span>
            <span className="fw5" style={{ textAlign: "right" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13 }}>
        Kunci lengkap hanya ditampilkan saat dibuat. Gunakan &ldquo;Ganti kunci&rdquo; untuk membuat
        kunci baru; kunci lama langsung tidak berlaku.
      </p>
      {message && (
        <div className="alert alert-err" role="alert">
          <span style={{ color: "var(--des)" }}>{message}</span>
        </div>
      )}
      <div className="ft" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn o"
          disabled={isRevoked || pending !== null}
          onClick={() => run("regenerate")}
        >
          {pending === "regenerate" ? <Loader2 className="i spin" /> : <RefreshCw className="i" />}
          Ganti kunci
        </button>
        {shouldConfirmRevoke ? (
          <>
            <button
              type="button"
              className="btn d"
              disabled={pending !== null}
              onClick={() => run("revoke")}
            >
              {pending === "revoke" ? <Loader2 className="i spin" /> : <Ban className="i" />}Ya,
              cabut
            </button>
            <button type="button" className="btn g" onClick={() => setShouldConfirmRevoke(false)}>
              Batal
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn o danger-o"
            disabled={isRevoked || pending !== null}
            onClick={() => setShouldConfirmRevoke(true)}
          >
            <Ban className="i" />
            Cabut kunci
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Dialog>
  );
}
