# UMKM Banjarsari Banjarsari

Aplikasi peta interaktif untuk menemukan serta mengelola UMKM di Desa Banjarsari, Kecamatan Bayongbong, Kabupaten Garut.

## Fitur utama

- Peta interaktif MapLibre dengan peta vektor OpenFreeMap (data OpenStreetMap) yang diwarnai ulang mengikuti tema terang/gelap.
- Antarmuka mengikuti desain "UMKM Banjarsari — Opsi C" (gaya shadcn/ui, font Geist, warna utama lime).
- Marker berbeda untuk kategori Camilan, Makanan, Minuman, serta Kue & Roti.
- Pencarian berdasarkan nama usaha, pemilik, produk, kampung, dan kategori. Pencarian mengabaikan filter jarak, jadi UMKM di luar radius tetap ditemukan.
- Peta otomatis berpindah dan menyesuaikan zoom ke hasil pencarian; Enter memilih hasil teratas.
- Setelah membuka profil UMKM lalu kembali, peta tampil persis seperti sebelumnya (posisi, zoom, pencarian, filter, dan panel detail). Keadaan disimpan per tab di `sessionStorage`.
- Bandingkan dua UMKM berdampingan di `/bandingkan` (dari kartu, panel detail, atau halaman profil), dengan sorotan perbedaan data.
- Filter kategori dan radius 1–20 km.
- Radius mengikuti pusat viewport dan melakukan auto-zoom saat dipilih.
- Radius dapat dinonaktifkan; dalam mode ini hanya UMKM di viewport yang ditampilkan.
- Dukungan lokasi pengguna melalui Geolocation API.
- Halaman profil publik untuk setiap UMKM.
- Dashboard admin untuk menambah, mengedit, dan mengelola data UMKM.
- Endpoint admin untuk menghapus UMKM beserta dialog konfirmasi.
- Pemilih koordinat melalui klik peta, drag marker, input manual, atau lokasi perangkat.
- API publik `GET /api/umkm`.
- Fallback read-only berisi 15 data UMKM apabila Supabase belum dikonfigurasi.

## Teknologi

- Next.js 16 dan React 19
- TypeScript
- Tailwind CSS 4 (token dan komponen desain berada di `src/app/globals.css`)
- MapLibre GL
- Supabase PostgreSQL dan Supabase Auth
- Zod
- pnpm

## Persyaratan

Pastikan perangkat telah memiliki:

- Git
- Node.js 20.9 atau lebih baru
- pnpm 11
- Akun Supabase

Periksa instalasi:

```bash
git --version
node --version
pnpm --version
```

Jika pnpm belum tersedia, aktifkan melalui Corepack:

```bash
corepack enable
corepack prepare pnpm@11.16.0 --activate
```

## 1. Clone repository

```bash
git clone <URL_REPOSITORY>
cd PengMas
```

Ganti `<URL_REPOSITORY>` dengan URL Git repository project ini.

## 2. Instal dependency

```bash
pnpm install
```

## 3. Buat project Supabase

1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih **New project**.
3. Tentukan organisasi, nama project, password database, dan region.
4. Tunggu hingga project selesai dibuat.

## 4. Ambil URL dan API key

Di halaman project Supabase, buka tombol **Connect** atau menu **Settings → API Keys**.

Salin nilai berikut:

| Kebutuhan       | Nilai Supabase                        | Environment variable            |
| --------------- | ------------------------------------- | ------------------------------- |
| URL project     | Project URL                           | `NEXT_PUBLIC_SUPABASE_URL`      |
| Key browser     | Publishable key atau legacy `anon`    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Key seed server | Secret key atau legacy `service_role` | `SUPABASE_SERVICE_ROLE_KEY`     |

Publishable/anon key boleh digunakan oleh aplikasi browser karena akses data tetap dibatasi Row Level Security. Secret/service-role key dapat melewati RLS dan tidak boleh dipublikasikan.

## 5. Buat file environment

Salin `.env.example` menjadi `.env.local`.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxx

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ganti-dengan-password-kuat
ADMIN_FULL_NAME=Administrator UMKM
```

Ketentuan:

- Gunakan password admin minimal 8 karakter.
- Jangan menambahkan awalan `NEXT_PUBLIC_` pada secret/service-role key atau password.
- `.env.local` telah diabaikan oleh Git dan tidak boleh di-commit.
- Script seed membaca `.env.local` terlebih dahulu dan menggunakan `.env` sebagai fallback.

## 6. Jalankan migration database

Migration harus dijalankan sebelum seed.

Di Supabase Dashboard:

1. Buka **SQL Editor**.
2. Pilih **New query**.
3. Salin seluruh isi file migration.
4. Tempel ke SQL Editor.
5. Klik **Run**.

Jalankan sesuai urutan berikut:

### Migration 1 — tabel kategori dan UMKM

```text
supabase/migrations/202608130001_create_umkm.sql
```

Migration ini membuat:

- tabel `public.categories`;
- tabel `public.umkm`;
- constraint latitude dan longitude;
- indeks lokasi dan kategori;
- empat kategori awal;
- trigger `updated_at`;
- Row Level Security dasar.

### Migration 2 — akun dan otorisasi admin

```text
supabase/migrations/202608140001_create_admins.sql
```

Migration ini membuat:

- tabel `public.admins`;
- relasi admin ke `auth.users`;
- fungsi `public.is_admin()`;
- RLS yang membatasi mutasi UMKM untuk admin aktif.

Setelah migration selesai, periksa **Table Editor**. Tabel berikut harus tersedia:

- `categories`
- `umkm`
- `admins`

## 7. Seed data UMKM

Impor 15 data awal:

```bash
pnpm seed:supabase
```

Output yang diharapkan:

```text
Seeded 15 UMKM records.
```

Seed ini bersifat idempoten dan dapat dijalankan ulang. Data dicocokkan menggunakan `source_no`.

## 8. Seed akun admin

Buat atau perbarui akun admin berdasarkan nilai `ADMIN_*` di `.env.local`:

```bash
pnpm seed:admin
```

Output yang diharapkan menyerupai:

```text
Admin account is ready: admin@example.com (user-uuid)
```

Script akan:

- membuat user Supabase Auth jika email belum terdaftar;
- mengonfirmasi email;
- menetapkan metadata role `admin`;
- membuat atau memperbarui profil pada `public.admins`;
- memperbarui password dan nama jika seed dijalankan ulang.

## 9. Jalankan development server

```bash
pnpm dev
```

Buka:

- Peta publik: [http://localhost:3000](http://localhost:3000)
- Login admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- API UMKM: [http://localhost:3000/api/umkm](http://localhost:3000/api/umkm)

Login menggunakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` yang digunakan saat seed.

## 10. Verifikasi instalasi

Pastikan hal berikut berhasil:

1. Halaman peta menampilkan data dan marker UMKM.
2. Pencarian nama atau produk memindahkan peta ke toko hasil terbaik.
3. Filter kategori berfungsi.
4. Memilih radius mengubah zoom dan jumlah hasil.
5. Mengklik radius aktif menonaktifkan filter radius.
6. Pan dan zoom memperbarui hasil di viewport.
7. Login admin berhasil.
8. Admin dapat menambah dan mengedit UMKM.
9. Perubahan admin muncul pada halaman publik.

Jalankan pemeriksaan kode:

```bash
pnpm lint
pnpm build
```

## Menjalankan build production secara lokal

```bash
pnpm build
pnpm start
```

Secara default aplikasi production tersedia di `http://localhost:3000`.

## Mode tanpa Supabase

Aplikasi masih dapat dijalankan tanpa `.env.local`:

```bash
pnpm dev
```

Dalam kondisi ini:

- 15 data fallback dari `src/data/umkm.ts` tetap ditampilkan;
- dashboard admin berada dalam mode pratinjau;
- tambah, edit, dan penyimpanan persisten dinonaktifkan.

## Penggunaan dashboard admin

1. Buka `/admin/login`.
2. Masuk menggunakan akun hasil `pnpm seed:admin`.
3. Pilih **Tambah UMKM** untuk membuat usaha baru.
4. Pilih **Edit** untuk memperbaiki data atau koordinat.
5. Pilih **Hapus** lalu konfirmasi untuk menghapus UMKM secara permanen.
6. Tentukan lokasi melalui input latitude/longitude, klik peta, drag pin, atau lokasi perangkat.
7. Pilih status `estimated`, `verified`, atau `outside`.
8. Simpan perubahan.

MapLibre menerima koordinat dalam urutan `[longitude, latitude]`, sedangkan formulir menampilkan latitude terlebih dahulu.

## API publik

Endpoint:

```text
GET /api/umkm
```

Query parameter yang tersedia:

| Parameter     | Contoh                 | Keterangan             |
| ------------- | ---------------------- | ---------------------- |
| `q`           | `?q=cireng`            | Pencarian teks         |
| `subcategory` | `?subcategory=Minuman` | Filter subkategori     |
| `lat`         | `?lat=-7.238`          | Latitude pusat radius  |
| `lng`         | `&lng=107.8395`        | Longitude pusat radius |
| `radius`      | `&radius=5`            | Radius dalam kilometer |

Contoh:

```text
http://localhost:3000/api/umkm?q=cireng&lat=-7.238&lng=107.8395&radius=5
```

Semua respons API memakai bentuk yang sama. Respons berhasil:

```json
{
  "statusCode": 200,
  "message": "Data UMKM berhasil dimuat.",
  "data": { "items": [], "total": 0, "locationAccuracy": "verified" },
  "success": true
}
```

Respons gagal:

```json
{ "success": false, "message": "Akses admin diperlukan.", "errors": [], "data": null }
```

## API admin

Endpoint unggah foto (maksimal 10 file JPG/PNG/WEBP/GIF, 5 MB per file; field form `files`):

```text
POST /api/admin/upload
```

Respons berhasil menggunakan status `201` dengan `data.urls` berisi URL publik foto.

Endpoint penghapusan UMKM:

```text
DELETE /api/admin/umkm/:id
```

Endpoint ini hanya menerima request dari sesi admin aktif. `:id` harus berupa UUID UMKM. Respons berhasil menggunakan status `200`; ID tidak valid menggunakan `400`, sesi tanpa akses menggunakan `401`, data yang tidak ditemukan menggunakan `404`, dan konfigurasi Supabase yang belum lengkap menggunakan `503`.

## Troubleshooting

### `.env.local: not found`

Pastikan menggunakan script package terbaru:

```bash
pnpm seed:supabase
pnpm seed:admin
```

Script otomatis membaca `.env.local` atau `.env`; jangan menambahkan `--env-file` secara manual.

### `Could not find the table 'public.admins'`

Migration admin belum dijalankan. Jalankan:

```text
supabase/migrations/202608140001_create_admins.sql
```

melalui Supabase SQL Editor, kemudian ulangi:

```bash
pnpm seed:admin
```

### Data atau marker UMKM tidak muncul

Periksa:

1. Migration pertama sudah berhasil.
2. `pnpm seed:supabase` menghasilkan 15 record.
3. URL dan API key berasal dari project Supabase yang sama.
4. Tidak ada spasi atau tanda kutip tambahan pada `.env.local`.
5. Development server sudah direstart setelah environment berubah.

### Login admin ditolak

Periksa tabel `public.admins` dan pastikan:

- email sesuai;
- `is_active` bernilai `true`;
- akun dengan email tersebut tersedia pada **Authentication → Users**.

Jalankan ulang untuk memperbarui akun dan password:

```bash
pnpm seed:admin
```

### Perubahan environment tidak terbaca

Hentikan server dengan `Ctrl+C`, kemudian jalankan ulang:

```bash
pnpm dev
```

### Port 3000 sedang digunakan

Jalankan pada port lain:

```bash
pnpm dev -- --port 3001
```

Kemudian buka `http://localhost:3001`.

### Lokasi perangkat tidak tersedia

Geolocation membutuhkan izin browser dan secure context. Gunakan `localhost` saat development atau HTTPS saat deployment.

## Struktur project

```text
src/
├── app/
│   ├── admin/                 # Login, dashboard, dan Server Actions
│   ├── api/umkm/              # API publik UMKM
│   └── umkm/[id]/             # Halaman profil UMKM
├── data/
│   ├── umkm.ts                # Data fallback read-only
│   └── umkm-repository.ts     # Data-access layer Supabase
├── features/
│   ├── map/                   # Peta, marker, filter, dan viewport
│   └── umkm/                  # Model, validasi, ikon, dan dashboard
└── lib/
    ├── auth/                  # Pemeriksaan admin aktif
    └── supabase/              # Client dan konfigurasi Supabase

scripts/
├── seed-supabase.mjs          # Seed 15 UMKM
└── seed-admin.mjs             # Seed akun admin

supabase/migrations/           # Migration database dan RLS
```

## Keamanan

- Jangan commit `.env`, `.env.local`, secret key, atau password admin.
- Jangan menggunakan `SUPABASE_SERVICE_ROLE_KEY` di Client Component.
- Semua mutasi admin diperiksa pada server dan kembali dibatasi RLS.
- Data sensitif seperti NIK dan nomor kontak tidak dimasukkan ke source atau API publik.

## Akurasi lokasi

Koordinat 15 UMKM mengikuti workbook sumber. Status verifikasi lokasi telah dihapus dari model, database, dan antarmuka. Lokasi perangkat diperoleh melalui izin Geolocation browser; akurasinya mengikuti perangkat dan kondisi sinyal.

## Sumber data

```text
Pendataan_UMKM_Desa_Banjarsari_Garut.xlsx
```

Data sensitif seperti NIK dan nomor kontak tidak diekspos oleh aplikasi.

## Standar penulisan kode

Branch pengembangan mengikuti [CleanCode.md](CleanCode.md). Format menggunakan dua spasi, semicolon, LF, dan lebar baris sekitar 100 karakter. ESLint mewajibkan kurung blok, satu statement per baris, pemisahan langkah logika, import terurut, dan melarang ternary bertingkat.

- `src/app` berisi halaman, route handler, dan Server Actions yang tipis.
- `src/features/admin/*-service.ts` menangani akun, profil, login, callback, dan pemulihan kata sandi.
- `src/features/categories/category-service.ts` dan `src/features/owner/owner-key-service.ts` menangani masing-masing resource.
- `src/data` memetakan hasil query database ke model aplikasi.
- `src/lib/http` menyediakan satu bentuk error/success, wrapper HTTP/action, dan parser input.
- `src/lib/auth` memverifikasi akun/sesi. Supabase SDK mengelola penerbitan dan refresh token melalui factory client bersama; aplikasi tidak membuat JWT login sendiri.
- `src/features/umkm/photo-rules.ts` dipakai untuk validasi foto di browser dan server.
- `CatalogEditor`, `ProductFields`, dan `ProductPhotoInput` memisahkan daftar produk, isian, dan unggah foto. Foto produk dapat diunggah langsung tanpa menambah foto usaha.

Gunakan perintah berikut sebelum mengirim perubahan:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Server Actions memakai `runAction`/`runActionWithData` dan HTTP JSON memakai `asyncHandler`. Error dilempar sebagai `ApiResponse` dan hasil JSON memakai `SuccessResponse`. Redirect autentikasi tetap memakai respons redirect Next.js; kontrol alur `redirect()` dijalankan di luar wrapper action. Nama kolom snake_case dipakai hanya pada batas database; model dan variabel aplikasi memakai camelCase.
