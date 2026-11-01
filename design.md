# Design Reference — Peta UMKM Banjarsari

Dokumen ini menerjemahkan pola desain [Starbucks Store Locator](https://www.starbucks.com/store-locator) menjadi acuan implementasi untuk Peta UMKM Banjarsari. Tujuannya bukan membuat salinan visual Starbucks, melainkan mengambil struktur, hierarki informasi, dan pola interaksi yang sudah terbukti efektif untuk pencarian lokasi.

Referensi diperiksa pada 7 September 2026 menggunakan viewport desktop 1280 × 720 px. Tampilan referensi dapat berubah sewaktu-waktu.

## 1. Arah desain

Pengalaman utama harus terasa:

- cepat: pencarian, filter, daftar, dan peta tersedia dalam satu layar;
- lokal: identitas Banjarsari lebih menonjol daripada nuansa aplikasi peta generik;
- terpercaya: status koordinat terlihat jelas tanpa mengganggu eksplorasi;
- sederhana: pengguna tidak harus memahami istilah teknis peta;
- responsif: daftar dan peta tetap nyaman digunakan pada desktop maupun ponsel.

Prinsip utama yang diambil dari Starbucks Store Locator adalah **split view**: panel pencarian dan hasil berada di kiri, sedangkan peta menjadi kanvas utama di kanan. Pada referensi desktop 1280 px, panel kiri berukuran sekitar 512 px atau 40% viewport dan peta sekitar 768 px atau 60% viewport.

## 2. Struktur halaman

```text
Desktop ≥ 1024 px

┌──────────────────────────────────────────────────────────────────┐
│ Logo + Identitas      Navigasi                     Admin / Masuk │
├──────────────────────────┬───────────────────────────────────────┤
│ Pencarian dan filter     │                                       │
│                          │                                       │
│ Ringkasan hasil          │                                       │
│                          │                PETA                   │
│ Daftar kartu UMKM        │                                       │
│                          │        marker + kartu pilihan         │
│ scroll independen        │                                       │
│                          │                                       │
└──────────────────────────┴───────────────────────────────────────┘
       40% / 400–520 px                     60% / fleksibel
```

```text
Mobile < 768 px

┌──────────────────────────────┐
│ Identitas       Menu / Admin │
├──────────────────────────────┤
│ [ Cari usaha atau produk ]   │
│ [Kategori] [Radius] [Filter] │
├──────────────────────────────┤
│                              │
│             PETA             │
│                              │
│       [ Gunakan lokasi ]     │
├──────────────────────────────┤
│ Bottom sheet: 24 UMKM        │
│ ┌──────────────────────────┐ │
│ │ kartu UMKM terpilih      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## 3. Layout desktop

### Header

- Tinggi acuan: `88–100px`; gunakan `88px` agar lebih hemat ruang.
- Posisi: tetap di atas (`sticky` atau bagian dari shell setinggi viewport).
- Latar: putih.
- Garis bawah atau bayangan: sangat tipis, cukup untuk memisahkan header dari peta.
- Bagian kiri berisi logo/ikon dan tulisan `Peta UMKM` serta subteks `Banjarsari · Bayongbong`.
- Navigasi sekunder tidak boleh bersaing dengan pencarian. Tautan publik seperti `Tentang` dapat dibuat sederhana.
- Tombol `Dashboard admin` berbentuk pill berbingkai; tidak perlu menjadi tombol hitam seperti `Join now` pada referensi.

### Workspace

- Tinggi: `calc(100dvh - var(--header-height))`.
- Gunakan grid dua kolom: `minmax(360px, 40%) 1fr`.
- Panel kiri memiliki lebar ideal `420–512px`, minimum `360px`, maksimum `540px`.
- Peta selalu mengambil ruang tersisa dan tidak ikut bergulir bersama daftar.
- Panel kiri dan peta memiliki scroll/context masing-masing.

### Panel kiri

Panel dibagi menjadi tiga zona:

1. **Kontrol tetap** — pencarian dan filter selalu terlihat.
2. **Ringkasan hasil** — jumlah hasil dan cakupan pencarian.
3. **Daftar bergulir** — kartu UMKM yang sinkron dengan marker.

Bagian kontrol menggunakan padding horizontal `32–40px` pada desktop. Pada referensi Starbucks, area kontrol di panel kiri tersusun longgar dan menggunakan ruang putih yang cukup; pendekatan yang sama dipertahankan agar filter tidak terasa padat.

### Peta

- Peta dimulai tepat di bawah header dan mengisi seluruh tinggi workspace.
- Kontrol zoom diletakkan di kanan bawah atau kanan tengah.
- Tombol lokasi pengguna berbentuk lingkaran/pill putih dengan bayangan ringan.
- Atribusi penyedia peta tetap terlihat.
- Kartu detail muncul dekat bagian bawah peta, tetapi tidak menutupi kontrol penting.
- Saat sebuah UMKM dipilih, marker aktif harus memiliki perubahan ukuran, ring, atau elevasi—bukan hanya perubahan warna.

## 4. Layout mobile

Pada layar kecil, pola dua kolom berubah menjadi **map-first dengan bottom sheet**.

- Header: `64px`.
- Search bar: menempel di bawah header, satu baris penuh.
- Filter: chip horizontal yang dapat digeser.
- Peta: minimum `52–60dvh` ketika bottom sheet tertutup.
- Hasil: bottom sheet dengan tiga keadaan—`collapsed`, `half`, dan `expanded`.
- Keadaan collapsed menampilkan jumlah hasil dan satu kartu UMKM terpilih.
- Keadaan expanded menampilkan daftar lengkap dan dapat menutupi sebagian besar peta.
- Tombol lokasi pengguna tetap dapat dijangkau ibu jari dan bergeser naik mengikuti tinggi bottom sheet.
- Memilih kartu memusatkan peta dan menutup bottom sheet ke keadaan collapsed.

Hindari menyembunyikan peta sepenuhnya di balik daftar permanen. Pengguna harus selalu dapat kembali ke konteks geografis dengan satu gestur atau satu tombol.

## 5. Hierarki komponen

```text
AppShell
├── GlobalHeader
│   ├── BrandLockup
│   ├── PublicNavigation
│   └── AdminLink
└── MapWorkspace
    ├── SearchPanel
    │   ├── SearchField
    │   ├── FilterBar
    │   │   ├── CategoryChips
    │   │   ├── RadiusSelector
    │   │   └── MoreFiltersButton
    │   ├── ResultSummary
    │   └── ResultList
    │       └── UmkmResultCard[]
    └── MapCanvas
        ├── CategoryMarker[]
        ├── UserLocationMarker
        ├── MapControls
        ├── SearchThisAreaButton
        ├── AccuracyNotice
        └── SelectedUmkmCard
```

## 6. Komponen utama

### Search field

- Tinggi: `48px`.
- Bentuk visual: garis bawah seperti referensi boleh digunakan pada desktop, tetapi field dengan latar abu sangat muda lebih mudah dikenali pengguna umum.
- Placeholder: `Cari nama usaha, produk, atau alamat`.
- Ikon pencarian di kiri; tombol hapus di kanan ketika berisi teks.
- Hasil tidak berubah pada setiap karakter secara agresif; gunakan debounce `250–350ms`.
- Jika ada kecocokan kuat, peta memusatkan lokasi tanpa membuka halaman baru.

### Filter bar

- Kategori utama ditampilkan sebagai chip: `Semua`, `Camilan`, `Makanan`, `Minuman`, `Kue & Roti`.
- Chip aktif memakai warna utama dan teks putih.
- Radius dan status lokasi dapat masuk ke tombol `Filter` untuk mencegah kepadatan.
- Tombol Filter menampilkan badge jumlah filter aktif.
- Selalu sediakan `Reset filter` ketika ada filter aktif.

### Result summary

Contoh:

```text
24 UMKM ditemukan
Dalam radius 5 km dari lokasi Anda
```

- Baris pertama lebih tebal.
- Baris kedua berwarna teks sekunder.
- Ketika peta bergerak, tampilkan status `Memperbarui area…` tanpa layout shift.
- Setelah pengguna memindahkan peta, tampilkan tombol `Cari di area ini` daripada terus menerus memperbarui daftar.

### UMKM result card

Informasi minimum:

- nama usaha;
- produk utama;
- kategori;
- jarak;
- nama kampung/alamat singkat;
- status lokasi.

Susunan yang disarankan:

```text
┌────────────────────────────────────┐
│ [ikon/foto]  Nama Usaha      1,2 km│
│              Cireng isi, basreng   │
│              Camilan · Kp. Cikondang│
│              ● Titik terverifikasi │
└────────────────────────────────────┘
```

- Tinggi minimum: `112px` tanpa foto atau `132px` dengan foto.
- Padding: `16px 20px`.
- Divider tipis antar kartu lebih baik daripada membuat setiap kartu memiliki bayangan.
- Hover: latar hijau sangat muda.
- Selected: border kiri `4px` dan latar lembut.
- Seluruh kartu dapat diklik, tetapi tombol seperti `Lihat profil` tetap memiliki label yang jelas.

### Marker

- Diameter default: `32–36px`.
- Marker terpilih: `42–46px` dengan ring putih dan shadow.
- Gunakan ikon kategori di dalam marker.
- Warna kategori boleh berbeda, tetapi tetap gunakan satu bentuk marker konsisten.
- Status `estimated` ditandai dengan ring kuning putus-putus.
- Status `outside` menggunakan opasitas lebih rendah dan ikon peringatan.
- Pada zoom rendah, marker harus dikelompokkan menjadi cluster bernomor.

### Selected UMKM card

- Desktop: kartu melayang di kiri bawah atau tengah bawah peta; maksimum `380px`.
- Mobile: menjadi kartu utama di bottom sheet.
- Memuat nama usaha, kategori, produk, alamat ringkas, status, dan jarak.
- Aksi primer: `Lihat profil`.
- Aksi sekunder: `Petunjuk arah` hanya untuk lokasi terverifikasi.
- Untuk titik perkiraan, ganti tombol arah dengan teks `Lokasi masih perlu diverifikasi`.

### Empty state

Mengikuti kekuatan halaman referensi yang memberi konteks langsung seperti “Zoomed out too far”. Gunakan pesan yang menjelaskan tindakan selanjutnya:

- `Belum ada UMKM di area ini`;
- `Perbesar radius atau geser peta ke area lain`;
- `Hapus beberapa filter`.

Jangan hanya menampilkan `0 hasil`.

## 7. Sistem visual

Starbucks menggunakan hijau merek, putih, teks hitam beropasitas, dan bentuk pill. Untuk Peta UMKM, gunakan bahasa visual tersebut sebagai inspirasi tetapi dengan identitas sendiri.

### Warna

```css
:root {
  --color-primary-700: #176B45;
  --color-primary-600: #1F7A50;
  --color-primary-100: #E7F3EC;
  --color-accent-500:  #D99A24;

  --color-neutral-950: #17211B;
  --color-neutral-700: #4D5A52;
  --color-neutral-500: #748078;
  --color-neutral-200: #DDE3DF;
  --color-neutral-100: #F4F7F5;
  --color-white:       #FFFFFF;

  --color-success:     #177245;
  --color-warning:     #B7791F;
  --color-danger:      #B64040;
}
```

Aturan penggunaan:

- Hijau utama digunakan untuk aksi, status aktif, dan marker terpilih.
- Kuning hanya untuk lokasi perkiraan/peringatan.
- Jangan menggunakan terlalu banyak warna jenuh pada panel; biarkan marker menjadi fokus visual.
- Teks utama menggunakan warna hampir hitam, bukan hitam absolut.

### Tipografi

Referensi menggunakan `SoDoSans, Helvetica Neue, Helvetica, Arial, sans-serif`. Karena SoDoSans adalah font merek Starbucks, implementasi Peta UMKM sebaiknya memakai font bebas:

```css
font-family: Inter, "Segoe UI", Arial, sans-serif;
```

Skala:

| Token | Ukuran / line-height | Penggunaan |
|---|---:|---|
| Display | `28/36`, 700 | Judul area/empty state |
| H1 | `24/32`, 700 | Judul panel atau profil |
| H2 | `20/28`, 650 | Nama usaha terpilih |
| Body | `16/24`, 400 | Teks umum |
| Body small | `14/20`, 400 | Produk, alamat, metadata |
| Label | `13/18`, 600 | Chip dan status |
| Eyebrow | `12/16`, 700 | Konteks bagian |

Referensi memakai heading sekitar `28px/38.8px` dengan bobot 600 untuk empty state. Skala di atas mempertahankan proporsinya sambil disesuaikan dengan konten berbahasa Indonesia.

### Spacing

Gunakan kelipatan 4 px:

```text
4  / 8  / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
```

- Padding panel desktop: `32–40px`.
- Padding panel mobile: `16px`.
- Jarak antar kelompok kontrol: `24px`.
- Jarak antar label dan input: `8px`.
- Target sentuh minimum: `44 × 44px`.

### Radius dan bayangan

- Input: `12px`.
- Chip dan tombol: `999px`.
- Kartu: `12–16px`.
- Bottom sheet: `24px 24px 0 0`.
- Bayangan kartu: `0 6px 24px rgba(23, 33, 27, 0.14)`.
- Bayangan header: `0 1px 3px rgba(0, 0, 0, 0.12)`.

Gunakan bayangan hanya untuk elemen yang benar-benar berada di atas peta.

## 8. Perilaku interaksi

### Sinkronisasi daftar dan peta

- Hover kartu → marker terkait membesar ringan.
- Klik kartu → marker aktif, peta memusatkan titik, kartu detail terbuka.
- Klik marker → kartu terkait dipilih dan digulir masuk ke viewport daftar.
- Menutup detail tidak menghapus filter atau mengubah posisi peta.
- URL menyimpan pilihan, misalnya `?selected=<id>`, agar dapat dibagikan.

### Pencarian area

- Peta tidak langsung menjalankan pencarian berat selama pengguna melakukan drag.
- Setelah interaksi selesai, tampilkan tombol `Cari di area ini`.
- Jika pengguna mengaktifkan mode realtime/lokasi saya, pusat pencarian mengikuti lokasi sampai mode dihentikan.
- Perubahan radius menjalankan fit bounds agar cakupan radius terlihat.

### Loading

- Peta menggunakan skeleton netral dengan teks `Memuat peta…`.
- Daftar menggunakan 3–4 skeleton card.
- Ketika filter berubah, daftar lama boleh tetap terlihat dengan opasitas lebih rendah untuk mencegah kedipan.
- Jangan menggunakan spinner penuh yang menutup seluruh halaman.

### Error

- Izin lokasi ditolak: `Izin lokasi tidak diberikan. Anda tetap dapat mencari melalui nama kampung atau menggeser peta.`
- Data gagal dimuat: sediakan tombol `Coba lagi`.
- Peta gagal dimuat: daftar UMKM tetap dapat digunakan.

## 9. Status lokasi dan kepercayaan data

Status lokasi merupakan kebutuhan khusus Peta UMKM yang tidak ada pada referensi Starbucks.

| Status | Label publik | Perlakuan visual | Aksi arah |
|---|---|---|---|
| `verified` | Terverifikasi | hijau + ikon centang | aktif |
| `estimated` | Titik perkiraan | kuning + ikon peringatan | nonaktif |
| `outside` | Di luar desa | merah kusam/abu | sesuai kebijakan |

- Status selalu terlihat pada kartu detail dan halaman profil.
- Pada daftar ringkas, gunakan ikon + label pendek; jangan mengandalkan warna saja.
- Tampilkan pemberitahuan global yang singkat: `Marker berbingkai kuning masih berupa perkiraan.`
- Jangan memberi CTA `Petunjuk arah` pada titik yang belum diverifikasi.

## 10. Responsive breakpoints

| Breakpoint | Layout |
|---|---|
| `< 480px` | header ringkas, filter scroll horizontal, bottom sheet |
| `480–767px` | map-first, bottom sheet lebih lebar, kartu horizontal |
| `768–1023px` | panel overlay atau toggle Daftar/Peta |
| `≥ 1024px` | split view 40/60 |
| `≥ 1440px` | panel dibatasi `520px`, peta mengambil sisa ruang |

Pada ketinggian layar di bawah `700px`, kurangi padding vertikal header dan kontrol agar daftar tetap memiliki ruang bergulir yang memadai.

## 11. Aksesibilitas

- Semua kontrol peta mempunyai `aria-label` yang deskriptif.
- Filter menggunakan `aria-pressed` atau checkbox yang sesuai.
- Fokus keyboard terlihat dengan outline minimal `2px`.
- Urutan fokus: header → pencarian → filter → daftar → kontrol peta → kartu detail.
- Setiap marker harus dapat dijangkau keyboard atau mempunyai representasi setara di daftar.
- Perubahan jumlah hasil diumumkan melalui `aria-live="polite"`.
- Kontras teks minimal WCAG AA.
- Status lokasi memakai ikon dan teks, bukan warna saja.
- Animasi menghormati `prefers-reduced-motion`.

## 12. Konten dan microcopy

Gunakan kalimat pendek dan berorientasi tindakan.

| Konteks | Teks yang disarankan |
|---|---|
| Judul panel | `Temukan UMKM di sekitar Anda` |
| Search placeholder | `Cari usaha, produk, atau alamat` |
| Lokasi pengguna | `Gunakan lokasi saya` |
| Pencarian area | `Cari di area ini` |
| Ringkasan | `24 UMKM ditemukan` |
| Empty state | `Belum ada UMKM di area ini` |
| Reset | `Hapus filter` |
| Profil | `Lihat profil usaha` |
| Warning | `Lokasi ini masih berupa perkiraan` |

Hindari istilah seperti `viewport`, `geolocation`, atau `fit bounds` di antarmuka pengguna.

## 13. Adaptasi dashboard admin

Dashboard tidak perlu meniru split view publik secara penuh, tetapi dapat mempertahankan bahasa visual yang sama:

- header dan warna identitas konsisten;
- kartu statistik ringkas di atas;
- tabel data menjadi area utama;
- edit lokasi membuka drawer/modal lebar dengan peta dan form berdampingan;
- status verifikasi memakai komponen badge yang sama dengan halaman publik;
- tindakan berbahaya seperti Hapus tidak menggunakan warna utama.

## 14. Prioritas implementasi

### P0 — fondasi

- Shell setinggi viewport dengan header dan split view.
- Pencarian dan filter tetap terlihat.
- Daftar dan marker tersinkronisasi.
- Selected state yang jelas.
- Layout mobile map-first + bottom sheet.

### P1 — kualitas pengalaman

- Tombol `Cari di area ini`.
- Marker clustering.
- Loading, empty, dan error state lengkap.
- Status verifikasi konsisten.
- Keyboard navigation dan screen-reader announcement.

### P2 — pengayaan

- Foto produk/usaha.
- Petunjuk arah untuk lokasi terverifikasi.
- Filter lanjutan.
- Berbagi tautan UMKM terpilih.
- Analitik pencarian tanpa hasil untuk perbaikan data.

## 15. Acceptance criteria

- Pada desktop 1280 px, panel berada di kiri dengan lebar sekitar 40% dan peta mengisi sisa layar.
- Header serta kontrol pencarian tidak ikut hilang ketika daftar digulir.
- Memilih kartu selalu menyorot marker yang sama, dan sebaliknya.
- Peta dan daftar tetap dapat dipakai secara mandiri ketika salah satunya gagal dimuat.
- Pada mobile, daftar tersedia melalui bottom sheet tanpa menghilangkan akses mudah ke peta.
- Semua fungsi inti dapat dijalankan dengan keyboard.
- Pengguna dapat membedakan lokasi terverifikasi dan perkiraan tanpa hanya mengandalkan warna.
- Tidak ada tombol petunjuk arah yang menyesatkan untuk titik perkiraan.
- Identitas akhir menggunakan merek Peta UMKM Banjarsari dan tidak memakai logo, font proprietary, atau aset Starbucks.

## 16. Hal yang tidak perlu ditiru

- Logo, nama, aset, dan font proprietary Starbucks.
- Warna Starbucks secara identik.
- Navigasi pemasaran seperti Rewards dan Gift Cards.
- Pilihan Pickup/Delivery jika data UMKM belum mendukung layanan tersebut.
- Banner akun atau CTA komersial yang tidak membantu pencarian UMKM.
- Ketergantungan penuh pada lokasi perangkat; pencarian manual harus tetap menjadi jalur utama.

Dokumen ini menjadi acuan desain, bukan batasan teknis mutlak. Setiap perubahan perlu diuji dengan pengguna lokal, terutama pada ponsel kelas menengah, koneksi lambat, dan kondisi koordinat yang belum seluruhnya terverifikasi.
