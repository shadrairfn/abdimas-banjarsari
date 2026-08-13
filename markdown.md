# Instruksi Implementasi Koordinat Admin, Marker Ikon UMKM, dan Petunjuk Arah

## 1. Tujuan dokumen

Dokumen ini menjadi pedoman implementasi lanjutan untuk **Peta UMKM Banjarsari** agar:

1. Admin dapat memasukkan dan memperbarui koordinat setiap UMKM.
2. Admin dapat memilih titik langsung dari peta atau menggeser pin.
3. Setiap UMKM memiliki marker peta berupa ikon sesuai subkategori, sama seperti emotikon pada daftar hasil.
4. Pengunjung dapat menekan tombol **Petunjuk Arah** untuk menuju lokasi UMKM.
5. Koordinat perkiraan dapat dibedakan dari koordinat yang sudah diverifikasi.
6. Data sensitif tetap tidak dikirim ke browser atau respons API publik.

Dokumen ini disesuaikan dengan kondisi project saat ini:

- Next.js 16 App Router dan TypeScript.
- MapLibre GL JS 6.
- Tile OpenStreetMap.
- Data 68 UMKM masih berada di `src/data/umkm.ts`.
- Koordinat saat ini merupakan estimasi berdasarkan nama kampung.
- Dashboard admin masih menyimpan status verifikasi melalui `localStorage`.
- Marker pada peta saat ini menggunakan layer `circle`, bukan marker ikon.

---

## 2. Diagnosis kondisi saat ini

### 2.1 Mengapa ikon toko belum terlihat pada peta?

Emotikon baru digunakan di daftar hasil dalam `map-explorer.tsx`:

```tsx
item.subCategory === "Minuman"
  ? "🥤"
  : item.subCategory === "Kue & Roti"
    ? "🥐"
    : item.subCategory === "Makanan"
      ? "🍲"
      : "🥨"
```

Sementara itu, `umkm-map.tsx` menggambar UMKM sebagai lingkaran:

```ts
map.addLayer({
  id: "unclustered-point",
  type: "circle",
  source: "umkm",
});
```

Layer `circle` hanya dapat menampilkan bentuk lingkaran. Ia tidak membaca emotikon dari komponen daftar.

### 2.2 Mengapa admin belum bisa memperbaiki koordinat?

Koordinat dibuat saat build melalui fungsi `estimateCoordinates()` di `src/data/umkm.ts`. Data tersebut bersifat statis. Dashboard admin hanya menyimpan daftar ID terverifikasi, bukan nilai latitude dan longitude baru.

### 2.3 Keterbatasan penting

Fitur koordinat admin yang benar-benar dapat dipakai lintas perangkat memerlukan database persisten. `localStorage` hanya cocok sebagai prototype karena:

- Data hanya tersedia pada browser/perangkat yang sama.
- Data hilang bila penyimpanan browser dibersihkan.
- Perubahan admin tidak terlihat oleh pengunjung lain.
- Tidak ada audit siapa yang mengubah koordinat.

---

## 3. Target pengalaman pengguna

### 3.1 Pengunjung umum

1. Pengunjung membuka halaman peta.
2. Setiap lokasi UMKM menampilkan ikon sesuai kategori:

   | Subkategori | Ikon | Warna latar marker |
   |---|---:|---|
   | Minuman | 🥤 | Hijau muda `#dff5f1` |
   | Kue & Roti | 🥐 | Ungu muda `#f3e8ff` |
   | Makanan | 🍲 | Jingga muda `#fee8da` |
   | Camilan | 🥨 | Kuning muda `#fff3d7` |

3. Klik marker membuka kartu UMKM.
4. Kartu menampilkan nama usaha, produk, alamat, status verifikasi, dan tombol **Petunjuk Arah**.
5. Tombol **Petunjuk Arah** membuka Google Maps ke koordinat UMKM.
6. Marker terverifikasi tampil normal. Marker perkiraan memiliki indikator peringatan.
7. UMKM tanpa koordinat tidak ditampilkan sebagai titik valid dan masuk daftar “Belum memiliki koordinat”.

### 3.2 Admin

1. Admin membuka `/admin`.
2. Admin mencari UMKM.
3. Admin menekan **Atur lokasi**.
4. Form lokasi menampilkan:

   - Nama/merek usaha.
   - Alamat sumber.
   - Latitude.
   - Longitude.
   - Status koordinat.
   - Peta pemilih titik.
   - Tombol “Gunakan lokasi perangkat”.
   - Tombol “Buka titik di Google Maps”.

5. Admin dapat melakukan salah satu cara berikut:

   - Mengetik latitude dan longitude.
   - Klik peta untuk memindahkan marker.
   - Drag marker ke lokasi yang benar.
   - Memakai posisi perangkat ketika admin sedang berada di toko.

6. Admin menekan **Simpan dan verifikasi**.
7. Data disimpan dan marker publik langsung berpindah.

---

## 4. Strategi implementasi yang disarankan

Implementasi dibagi menjadi dua tahap.

### Tahap A — Prototype lokal

Tujuan: menguji seluruh alur tanpa database eksternal.

- Simpan override koordinat ke `localStorage`.
- Admin dapat klik/drag marker dan menyimpan koordinat.
- Halaman publik membaca override dari browser yang sama.
- Tombol arah membuka Google Maps.

Keterbatasan: perubahan tidak tersedia di perangkat lain.

### Tahap B — Produksi dengan Supabase/PostGIS

Tujuan: koordinat tersimpan terpusat, aman, dan dapat digunakan semua pengunjung.

- Simpan UMKM di PostgreSQL.
- Gunakan PostGIS untuk lokasi geografis dan pencarian radius.
- Gunakan Supabase Auth untuk admin.
- Terapkan Row Level Security.
- Catat waktu dan admin yang melakukan verifikasi.

Supabase menyediakan tipe `geography(Point)` serta spatial index untuk query geografis. Perhatikan bahwa urutan titik PostGIS adalah **longitude terlebih dahulu, lalu latitude**. Referensi: [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis).

**Rekomendasi:** kerjakan Tahap A agar UI dan alur dapat diuji, tetapi jangan menyebutnya penyimpanan final. Setelah akun Supabase tersedia, migrasikan ke Tahap B.

---

## 5. Perubahan struktur data

### 5.1 TypeScript model

Perbarui `src/features/umkm/types.ts`:

```ts
export type UmkmCategory = "Kuliner";

export type UmkmSubCategory =
  | "Camilan"
  | "Makanan"
  | "Minuman"
  | "Kue & Roti";

export type LocationStatus =
  | "missing"
  | "estimated"
  | "verified"
  | "outside";

export interface Umkm {
  id: string;
  sourceNo: number;
  ownerName: string;
  brand: string;
  products: string;
  address: string;
  category: UmkmCategory;
  subCategory: UmkmSubCategory;

  // Nullable karena UMKM baru mungkin belum memiliki titik.
  latitude: number | null;
  longitude: number | null;

  locationStatus: LocationStatus;
  locationAccuracyMeters: number | null;
  locationVerifiedAt: string | null;
  locationVerifiedBy: string | null;
}
```

### 5.2 Aturan validasi koordinat

Latitude dan longitude harus divalidasi sebelum disimpan:

```ts
export function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
```

Tambahkan validasi wilayah untuk mencegah salah input. Gunakan bounding box longgar sekitar Garut/Banjarsari, bukan koordinat global:

```ts
export function isNearBanjarsari(latitude: number, longitude: number) {
  return (
    latitude >= -7.35 &&
    latitude <= -7.10 &&
    longitude >= 107.70 &&
    longitude <= 108.00
  );
}
```

Jika titik berada di luar batas tersebut, jangan langsung menolak. Tampilkan dialog konfirmasi karena tiga data sumber saat ini memang beralamat di luar Banjarsari.

---

## 6. Model database produksi

### 6.1 Migration SQL

Buat migration, misalnya:

```text
supabase/migrations/202608130001_create_umkm_locations.sql
```

Isi yang disarankan:

```sql
create extension if not exists postgis with schema extensions;

create table if not exists public.umkm (
  id uuid primary key default gen_random_uuid(),
  source_no integer unique,
  owner_name text not null,
  brand text not null,
  products text not null default '',
  address text not null,
  category text not null default 'Kuliner',
  sub_category text not null,

  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  location_status text not null default 'missing'
    check (location_status in ('missing', 'estimated', 'verified', 'outside')),
  location_accuracy_meters double precision,
  location_verified_at timestamptz,
  location_verified_by uuid references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_latitude
    check (latitude is null or latitude between -90 and 90),
  constraint valid_longitude
    check (longitude is null or longitude between -180 and 180),
  constraint coordinate_pair
    check ((latitude is null) = (longitude is null))
);

create index if not exists umkm_location_gix
  on public.umkm using gist (location);

create or replace function public.sync_umkm_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.location := null;
  else
    new.location := extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_umkm_location_trigger on public.umkm;
create trigger sync_umkm_location_trigger
before insert or update of latitude, longitude
on public.umkm
for each row execute function public.sync_umkm_location();
```

### 6.2 RLS minimum

```sql
alter table public.umkm enable row level security;

create policy "Public can read safe UMKM fields"
on public.umkm
for select
using (true);

create policy "Authenticated admins can update UMKM"
on public.umkm
for update
to authenticated
using (true)
with check (true);
```

Kebijakan di atas masih minimum. Pada produksi, buat tabel `admin_users` atau custom claim agar tidak semua pengguna terautentikasi otomatis menjadi admin.

### 6.3 Larangan data publik

Respons publik tidak boleh menyertakan:

- NIK.
- Service-role key.
- Nomor kontak pribadi tanpa persetujuan.
- Email akun admin.
- Riwayat internal yang tidak dibutuhkan.

---

## 7. Marker ikon sesuai gambar referensi

### 7.1 Mapping ikon tunggal

Jangan mengulang ternary emotikon di banyak file. Buat satu sumber kebenaran:

```text
src/config/umkm-icons.ts
```

```ts
import type { UmkmSubCategory } from "@/features/umkm/types";

export const UMKM_ICON_CONFIG: Record<
  UmkmSubCategory,
  { emoji: string; slug: string; background: string; label: string }
> = {
  Minuman: {
    emoji: "🥤",
    slug: "minuman",
    background: "#dff5f1",
    label: "Minuman",
  },
  "Kue & Roti": {
    emoji: "🥐",
    slug: "kue-roti",
    background: "#f3e8ff",
    label: "Kue dan roti",
  },
  Makanan: {
    emoji: "🍲",
    slug: "makanan",
    background: "#fee8da",
    label: "Makanan",
  },
  Camilan: {
    emoji: "🥨",
    slug: "camilan",
    background: "#fff3d7",
    label: "Camilan",
  },
};
```

Komponen daftar, kartu detail, dashboard, dan marker peta harus membaca konfigurasi yang sama.

### 7.2 Pilihan teknik marker

Ada dua pilihan:

#### Pilihan 1 — PNG/WebP pada Symbol Layer, direkomendasikan

Gunakan empat aset lokal:

```text
public/markers/minuman.png
public/markers/kue-roti.png
public/markers/makanan.png
public/markers/camilan.png
```

Setiap aset sebaiknya:

- Berukuran 96×96 atau 128×128 px.
- Latar berbentuk rounded square seperti gambar referensi.
- Memiliki padding agar ikon tidak terpotong.
- Tidak mengambil aset dari emoji vendor tanpa memeriksa lisensi.
- Konsisten antara daftar dan peta.

Kelebihan:

- Tetap cepat saat jumlah titik bertambah.
- Dapat dipakai bersama GeoJSON clustering.
- Lebih konsisten lintas sistem operasi daripada teks emoji.

#### Pilihan 2 — HTML Marker

MapLibre mendukung `Marker`, `setLngLat()`, dan draggable marker. Dokumentasi resminya menyediakan pola `new Marker({ draggable: true })`. Referensi: [MapLibre Marker](https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/) dan [contoh draggable marker](https://maplibre.org/maplibre-gl-js/docs/examples/create-a-draggable-marker/).

HTML Marker lebih mudah untuk menampilkan emoji langsung, tetapi pengelolaan 68 marker, clustering, filter, dan sinkronisasi menjadi lebih rumit. Gunakan HTML Marker hanya pada **peta editor admin**. Untuk peta publik, gunakan Symbol Layer.

### 7.3 Menambahkan properti ikon ke GeoJSON

Ubah `toFeatureCollection()`:

```ts
import { UMKM_ICON_CONFIG } from "@/config/umkm-icons";

function toFeatureCollection(items: Umkm[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items
      .filter(
        (item) =>
          item.latitude !== null &&
          item.longitude !== null &&
          item.locationStatus !== "missing",
      )
      .map((item) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          // GeoJSON selalu longitude, latitude.
          coordinates: [item.longitude!, item.latitude!],
        },
        properties: {
          id: item.id,
          brand: item.brand,
          subCategory: item.subCategory,
          status: item.locationStatus,
          icon: UMKM_ICON_CONFIG[item.subCategory].slug,
        },
      })),
  };
}
```

### 7.4 Mendaftarkan gambar marker ke MapLibre

Pada event `map.on("load")`:

```ts
const markerImages = [
  ["minuman", "/markers/minuman.png"],
  ["kue-roti", "/markers/kue-roti.png"],
  ["makanan", "/markers/makanan.png"],
  ["camilan", "/markers/camilan.png"],
] as const;

await Promise.all(
  markerImages.map(async ([name, url]) => {
    const image = await map.loadImage(url);
    if (!map.hasImage(name)) map.addImage(name, image.data);
  }),
);
```

### 7.5 Mengganti layer lingkaran dengan Symbol Layer

Pertahankan `clusters` dan `cluster-count`, lalu ganti `unclustered-point`:

```ts
map.addLayer({
  id: "umkm-icons",
  type: "symbol",
  source: "umkm",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": ["get", "icon"],
    "icon-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      12, 0.34,
      16, 0.46,
      19, 0.58,
    ],
    "icon-anchor": "bottom",
    "icon-allow-overlap": false,
    "icon-ignore-placement": false,
  },
});
```

Tambahkan layer halo untuk status/seleksi di bawah ikon:

```ts
map.addLayer(
  {
    id: "umkm-status-halo",
    type: "circle",
    source: "umkm",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 17,
      "circle-color": [
        "match",
        ["get", "status"],
        "verified", "#0f766e",
        "outside", "#c2410c",
        "#f59e0b",
      ],
      "circle-opacity": 0.18,
      "circle-stroke-width": 2,
      "circle-stroke-color": [
        "match",
        ["get", "status"],
        "verified", "#0f766e",
        "outside", "#c2410c",
        "#f59e0b",
      ],
    },
  },
  "umkm-icons",
);
```

Ubah event klik dari `unclustered-point` menjadi `umkm-icons`:

```ts
map.on("click", "umkm-icons", handleUmkmClick);
map.on("mouseenter", "umkm-icons", showPointer);
map.on("mouseleave", "umkm-icons", hidePointer);
```

### 7.6 Perilaku marker terpilih

Ketika pengguna memilih UMKM:

- Gunakan filter `selectedId` untuk halo khusus.
- Jalankan `map.easeTo()` ke koordinat UMKM.
- Naikkan zoom minimum menjadi sekitar 16.
- Buka kartu detail.

```ts
if (selected) {
  map.easeTo({
    center: [selected.longitude, selected.latitude],
    zoom: Math.max(map.getZoom(), 16),
    duration: 650,
  });
}
```

---

## 8. Form koordinat admin

### 8.1 Route dan file

Tambahkan struktur:

```text
src/app/admin/umkm/[id]/location/page.tsx
src/features/umkm/components/location-editor.tsx
src/features/map/components/location-picker-map.tsx
src/features/umkm/actions/update-location.ts
src/features/umkm/schema/location-schema.ts
```

### 8.2 Isi form

Form wajib memiliki:

```text
Nama usaha          read-only
Alamat sumber       read-only
Latitude            editable, 6–7 digit desimal
Longitude           editable, 6–7 digit desimal
Status lokasi       estimated / verified / outside
Akurasi GPS         opsional, meter
Catatan verifikasi  opsional
```

Tombol:

- Gunakan lokasi perangkat.
- Pilih titik pada peta.
- Salin koordinat.
- Buka di Google Maps.
- Simpan sebagai draft/perkiraan.
- Simpan dan verifikasi.
- Batalkan.

### 8.3 Peta pemilih titik

Gunakan satu HTML Marker draggable pada peta editor:

```tsx
"use client";

import { Marker } from "maplibre-gl";

const marker = new Marker({ draggable: true })
  .setLngLat([longitude, latitude])
  .addTo(map);

marker.on("dragend", () => {
  const position = marker.getLngLat();
  onChange({
    latitude: Number(position.lat.toFixed(7)),
    longitude: Number(position.lng.toFixed(7)),
  });
});

map.on("click", (event) => {
  marker.setLngLat(event.lngLat);
  onChange({
    latitude: Number(event.lngLat.lat.toFixed(7)),
    longitude: Number(event.lngLat.lng.toFixed(7)),
  });
});
```

### 8.4 Gunakan lokasi perangkat

```ts
navigator.geolocation.getCurrentPosition(
  ({ coords }) => {
    setCoordinates({
      latitude: Number(coords.latitude.toFixed(7)),
      longitude: Number(coords.longitude.toFixed(7)),
      accuracy: Math.round(coords.accuracy),
    });
  },
  () => setError("Lokasi perangkat tidak dapat diakses."),
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  },
);
```

Catatan:

- Geolocation browser umumnya membutuhkan HTTPS pada deployment.
- Jangan otomatis menyimpan lokasi sebelum admin menekan tombol simpan.
- Tampilkan nilai akurasi. GPS dengan akurasi buruk, misalnya lebih dari 50–100 meter, harus diberi peringatan.

### 8.5 Server Action

```ts
"use server";

import { revalidatePath } from "next/cache";

export async function updateUmkmLocation(input: UpdateLocationInput) {
  const admin = await requireAdmin();
  const data = locationSchema.parse(input);

  await updateLocationInDatabase({
    ...data,
    locationVerifiedBy: admin.id,
    locationVerifiedAt:
      data.locationStatus === "verified" ? new Date().toISOString() : null,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/umkm/${data.id}`);

  return { success: true };
}
```

Jangan percaya pada status `verified` yang hanya dikirim browser. Server harus memeriksa bahwa pemanggil memiliki peran admin.

### 8.6 Tabel dashboard

Ganti tombol **Tandai selesai** menjadi:

- **Atur lokasi** jika belum ada koordinat.
- **Perbaiki titik** jika masih perkiraan.
- **Lihat/Edit lokasi** jika sudah terverifikasi.

Tambahkan filter:

- Semua.
- Belum ada koordinat.
- Titik perkiraan.
- Terverifikasi.
- Di luar desa.

---

## 9. Petunjuk arah

### 9.1 Rekomendasi MVP: buka Google Maps

Google Maps URLs dapat membuka directions lintas perangkat dan tidak memerlukan Google API key. Parameter `api=1` wajib. Referensi resmi: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

Tambahkan helper:

```text
src/features/directions/google-maps-url.ts
```

```ts
interface Destination {
  latitude: number;
  longitude: number;
}

export function createGoogleMapsDirectionsUrl(
  destination: Destination,
  travelMode: "driving" | "walking" | "bicycling" | "two-wheeler" = "driving",
) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    `${destination.latitude},${destination.longitude}`,
  );
  url.searchParams.set("travelmode", travelMode);
  url.searchParams.set("dir_action", "navigate");
  return url.toString();
}
```

Origin sengaja tidak diisi agar Google Maps memakai lokasi perangkat pengguna bila tersedia.

Tambahkan tombol di kartu marker dan halaman detail:

```tsx
<a
  href={createGoogleMapsDirectionsUrl({
    latitude: item.latitude,
    longitude: item.longitude,
  })}
  target="_blank"
  rel="noopener noreferrer"
  className="directions-button"
>
  Petunjuk Arah
</a>
```

Jangan tampilkan tombol jika:

- Latitude atau longitude kosong.
- Status lokasi `missing`.
- Titik masih `estimated`, kecuali tombol diberi konfirmasi/peringatan yang sangat jelas.

Rekomendasi aturan:

```ts
const canNavigate =
  item.latitude !== null &&
  item.longitude !== null &&
  item.locationStatus === "verified";
```

Untuk titik perkiraan, tampilkan:

```text
Lokasi ini belum diverifikasi. Petunjuk arah mungkin tidak akurat.
```

### 9.2 Mode perjalanan

Gunakan tiga pilihan minimum:

- Motor: `two-wheeler`.
- Mobil: `driving`.
- Jalan kaki: `walking`.

Catatan: dukungan `two-wheeler` bergantung pada cakupan Google Maps di wilayah tersebut. Jika tidak tersedia, Google dapat mengabaikan mode tersebut.

### 9.3 Rute di dalam aplikasi — tahap lanjutan

Jika rute harus digambar langsung di MapLibre, diperlukan routing engine. Rekomendasi yang sesuai dengan stack saat ini adalah openrouteservice atau engine yang di-host sendiri.

Openrouteservice menyediakan endpoint `/v2/directions/{profile}/geojson` yang mengembalikan rute GeoJSON. Referensi: [openrouteservice Directions API](https://openrouteservice.org/dev/).

Arsitektur:

```text
Browser
  → POST /api/directions
    → server Next.js
      → openrouteservice
        → GeoJSON route
  → MapLibre menampilkan line layer
```

Jangan memanggil routing API langsung dari browser bila API key harus dirahasiakan.

Environment variable server:

```dotenv
OPENROUTESERVICE_API_KEY=
```

Route Handler:

```ts
// src/app/api/directions/route.ts
export async function POST(request: Request) {
  const input = await request.json();

  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: process.env.OPENROUTESERVICE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [input.origin.longitude, input.origin.latitude],
          [input.destination.longitude, input.destination.latitude],
        ],
        instructions: true,
        language: "id",
      }),
    },
  );

  if (!response.ok) {
    return Response.json(
      { error: "Rute tidak dapat dihitung." },
      { status: response.status },
    );
  }

  return Response.json(await response.json());
}
```

Tambahkan hasil sebagai source/layer:

```ts
map.addSource("route", {
  type: "geojson",
  data: routeGeoJson,
});

map.addLayer({
  id: "route-line-shadow",
  type: "line",
  source: "route",
  paint: {
    "line-color": "rgba(15, 118, 110, 0.24)",
    "line-width": 10,
  },
});

map.addLayer({
  id: "route-line",
  type: "line",
  source: "route",
  paint: {
    "line-color": "#0f766e",
    "line-width": 5,
  },
});
```

UI rute dalam aplikasi minimal harus menampilkan:

- Titik awal dan tujuan.
- Jarak total.
- Estimasi durasi.
- Pilihan kendaraan/jalan kaki.
- Tombol tutup rute.
- Daftar langkah perjalanan bila respons API menyediakannya.
- Fallback **Buka di Google Maps** jika routing internal gagal.

### 9.4 Batas istilah “seperti Google Maps”

MVP tidak boleh mengklaim memiliki navigasi penuh seperti Google Maps jika hanya menggambar polyline. Navigasi turn-by-turn aktif membutuhkan:

- Pembaruan GPS terus menerus.
- Re-routing ketika pengguna menyimpang.
- Instruksi suara.
- Snap-to-road/map matching.
- Penanganan kehilangan sinyal.
- Routing engine dengan cakupan jalan lokal yang baik.

Karena itu, implementasi awal yang paling andal adalah membuka Google Maps melalui URL. Routing di dalam aplikasi dapat ditambahkan sebagai preview rute.

---

## 10. API publik UMKM

Perbarui `/api/umkm` agar:

- Hanya mengembalikan UMKM dengan field publik.
- Mendukung `locationStatus`.
- Tidak menghitung jarak bila koordinat kosong.
- Mengutamakan data database, bukan data statis.

Contoh DTO:

```ts
export interface PublicUmkmDto {
  id: string;
  brand: string;
  products: string;
  address: string;
  category: string;
  subCategory: string;
  latitude: number | null;
  longitude: number | null;
  locationStatus: LocationStatus;
}
```

Jangan mengembalikan `locationVerifiedBy` ke endpoint publik.

---

## 11. State, cache, dan sinkronisasi

### Prototype lokal

Gunakan struktur override:

```ts
type LocationOverrides = Record<
  string,
  {
    latitude: number;
    longitude: number;
    locationStatus: "estimated" | "verified" | "outside";
    updatedAt: string;
  }
>;
```

Key `localStorage`:

```text
banjarsari-umkm-location-overrides-v1
```

Jangan menyimpan salinan penuh data UMKM. Simpan hanya override lokasi agar data sumber tetap mudah diperbarui.

### Produksi

Setelah perubahan:

- `revalidatePath("/")`.
- `revalidatePath("/admin")`.
- `revalidatePath(`/umkm/${id}`)`.
- Jika memakai client-side data fetching, mutasikan cache terkait.

---

## 12. Aksesibilitas dan UX

Marker peta bukan satu-satunya cara memilih UMKM. Daftar hasil harus tetap tersedia untuk keyboard dan screen reader.

Persyaratan:

- Tombol marker/kartu memiliki label nama usaha.
- Warna status tidak menjadi satu-satunya pembeda; selalu sertakan teks/icon status.
- Tombol petunjuk arah menyebut tujuan, misalnya `Petunjuk arah ke SAKOTENG SAWARGI`.
- Form koordinat memiliki label eksplisit.
- Error validasi muncul dekat input.
- Admin diminta mengonfirmasi sebelum mengganti koordinat terverifikasi.
- Tombol simpan memiliki state loading dan tidak dapat ditekan dua kali.
- Pada mobile, peta editor memiliki tinggi minimum sekitar 360 px.

---

## 13. Keamanan

1. Semua mutation koordinat harus diperiksa di server.
2. Jangan mengandalkan `proxy.ts` saja untuk otorisasi.
3. Jangan menaruh service-role key pada variable `NEXT_PUBLIC_*`.
4. Validasi payload dengan schema server.
5. Batasi ukuran catatan verifikasi.
6. Catat `updated_at`, `location_verified_at`, dan admin yang mengubah.
7. Jika memungkinkan, simpan audit log:

```sql
create table public.umkm_location_audit (
  id bigint generated always as identity primary key,
  umkm_id uuid not null references public.umkm(id),
  old_latitude double precision,
  old_longitude double precision,
  new_latitude double precision,
  new_longitude double precision,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
```

---

## 14. Pengujian

### 14.1 Unit test

Uji:

- Mapping subkategori ke ikon.
- Validasi latitude/longitude.
- Pembuatan Google Maps URL.
- Perhitungan radius ketika koordinat tersedia.
- Penanganan koordinat `null`.

Contoh Google Maps URL harus memuat:

```text
https://www.google.com/maps/dir/?api=1
destination=-7.238%2C107.8395
travelmode=driving
dir_action=navigate
```

### 14.2 Integration test

1. Admin membuka UMKM tanpa koordinat.
2. Admin klik peta.
3. Nilai input berubah.
4. Admin drag marker.
5. Nilai input berubah lagi.
6. Admin simpan sebagai terverifikasi.
7. Dashboard menampilkan status terverifikasi.
8. Halaman publik menampilkan marker ikon yang benar.
9. Tombol arah memakai koordinat terbaru.

### 14.3 Pengujian lapangan

Lakukan minimal pada beberapa UMKM di kampung berbeda:

- Ciloa.
- Cibodas.
- Sindanglaya.
- Palnunjuk.

Bandingkan posisi marker dengan share location pemilik atau pengukuran di lokasi. Jangan menyelesaikan verifikasi hanya berdasarkan alamat teks.

### 14.4 Build check

```bash
pnpm lint
pnpm build
```

---

## 15. Acceptance criteria

Implementasi dinyatakan selesai bila seluruh kondisi berikut terpenuhi:

- [ ] Admin dapat membuka editor lokasi dari dashboard.
- [ ] Admin dapat mengisi latitude dan longitude manual.
- [ ] Admin dapat klik peta untuk menentukan titik.
- [ ] Admin dapat drag marker.
- [ ] Admin dapat memakai geolocation perangkat.
- [ ] Koordinat divalidasi sebelum disimpan.
- [ ] Status lokasi dapat berupa missing, estimated, verified, atau outside.
- [ ] Marker publik memakai ikon sesuai subkategori.
- [ ] Ikon marker konsisten dengan ikon daftar hasil.
- [ ] Cluster masih berfungsi pada zoom rendah.
- [ ] Klik marker membuka detail UMKM yang tepat.
- [ ] UMKM tanpa koordinat tidak ditempatkan pada titik palsu.
- [ ] Petunjuk arah hanya aktif untuk koordinat yang valid.
- [ ] Tombol petunjuk arah membuka tujuan yang benar.
- [ ] Perubahan koordinat persisten lintas perangkat pada versi produksi.
- [ ] Hanya admin berwenang yang dapat mengubah koordinat.
- [ ] NIK dan kredensial rahasia tidak muncul di frontend/API publik.
- [ ] Tampilan berfungsi pada desktop dan mobile.
- [ ] Lint dan production build lulus.

---

## 16. Urutan pengerjaan yang direkomendasikan

1. Buat `UMKM_ICON_CONFIG` sebagai sumber ikon tunggal.
2. Buat empat aset marker lokal.
3. Ubah peta publik dari `circle` marker menjadi Symbol Layer.
4. Tambahkan status `missing` dan nullable coordinates.
5. Buat editor koordinat admin.
6. Implementasikan klik peta, drag marker, dan geolocation.
7. Implementasikan penyimpanan override lokal untuk validasi UX.
8. Tambahkan tombol Google Maps Directions.
9. Uji alur pada beberapa UMKM.
10. Siapkan Supabase/PostGIS.
11. Migrasikan data statis ke database.
12. Tambahkan autentikasi dan RLS admin.
13. Migrasikan penyimpanan koordinat dari lokal ke database.
14. Lakukan verifikasi lapangan untuk seluruh UMKM.
15. Opsional: tambahkan preview rute internal menggunakan routing API.

---

## 17. Keputusan implementasi final yang disarankan

Untuk MVP berikutnya, gunakan keputusan berikut:

- **Peta publik:** MapLibre Symbol Layer dengan empat marker PNG/WebP.
- **Peta admin:** MapLibre HTML Marker yang draggable.
- **Penyimpanan sementara:** coordinate override di `localStorage`.
- **Penyimpanan produksi:** Supabase PostgreSQL + PostGIS.
- **Navigasi awal:** Google Maps URL dengan `dir_action=navigate`.
- **Rute internal:** openrouteservice sebagai tahap opsional setelah API key tersedia.
- **Aturan publik:** navigasi hanya direkomendasikan untuk titik berstatus `verified`.
- **Aturan data:** UMKM tanpa koordinat tidak diberi titik buatan.

Pendekatan tersebut memberikan hasil yang cepat untuk prototype, tetapi tetap menyediakan jalur migrasi yang aman menuju MVP produksi.
