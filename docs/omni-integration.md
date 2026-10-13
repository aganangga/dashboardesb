# Integrasi Omni Internal → ESB Consultant Dashboard

Status: **adapter siap dikonfigurasi; belum tersambung ke Omni live**. Tidak ada token Omni dalam repository dan deployment baru tidak mengubah dataset baseline sampai data API tervalidasi dan operator menekan **Terapkan**.

## Arsitektur & akses

```
Pengguna dashboard (browser)                 Netlify Function (server)             Omni Internal API
[Sync Omni] -- POST /api/omni/visits ------> validasi kunci akses --------GET /api/v1/visits-->
                                  x-dashboard-access-key              Authorization: Bearer [OMNI_API_TOKEN]
  <------------------- JSON / CSV via server proxy --------------------->
[validasi Ticket ID + Date Visit → preview → Terapkan]
                       ↓
React processRawData → master team → KPI/check-in → CSAT/filter/pagination
```

- **Omni API Token**: token yang **harus diterbitkan admin Omni**. Tidak mungkin dibuat oleh dashboard tanpa otorisasi Omni.
- **Dashboard Access Key**: rahasia terpisah untuk operator yang diperbolehkan menarik data. Harus minimal 24 karakter; generate dengan:
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
- Jangan simpan kedua rahasia di GitHub, `VITE_*`, URL browser, chat publik, atau source HTML. Masukkan di pengaturan environment Netlify untuk **Functions**.
- Saat sinkronisasi manual, access key dikirim lewat header POST HTTPS lalu dihapus dari state React setelah respons; tidak disimpan di localStorage/cookie.
- Data yang diambil tetap terlihat oleh operator browser yang berhasil sinkronisasi. Karena dashboard utama mungkin masih dapat diakses publik, **aktifkan akses terbatas/SSO di Netlify** sebelum mengoperasikan data internal berisi nama klien/PIC. Kunci akses endpoint *bukan* pengganti login/situs privat.

## Environment (Netlify > Site configuration > Environment variables)

| Key | Contoh / sumber | Scope |
|---|---|---|
| `OMNI_API_BASE_URL` | `https://api.omni.perusahaan.example` | Functions |
| `OMNI_VISITS_PATH` | `/api/v1/visits` | Functions |
| `OMNI_API_TOKEN` | Secret Bearer token dari administrator Omni | Functions |
| `OMNI_DASHBOARD_ACCESS_KEY` | Secret acak 32 byte (64 digit heksadesimal) | Functions |

**Jangan gunakan nilai contoh sebagai URL asli.** Verifikasi path, metode GET, format JSON/CSV, cakupan izin/token, batas waktu, dan pagination dari dokumentasi Omni sebelum konfigurasi. Endpoint diproksi oleh Netlify pada **`POST https://dashboardesb.netlify.app/api/omni/visits`** (browser hanya mengirim `x-dashboard-access-key`). Fungsi Netlify membaca rahasia dari environment dan memanggil upstream dengan header `Authorization: Bearer ...`.

> **Jika Omni hanya tersedia di intranet/VPN/private IP:** Netlify cloud belum tentu dapat menjangkaunya. Perlu API gateway HTTPS yang dapat diakses secara terautentikasi, allowlist IP/jaringan yang sesuai, atau server proxy di jaringan perusahaan. Jangan membuka Omni ke internet tanpa review tim security.

## Format respons yang didukung

**JSON array**:
```json
[
  {"ticket_id":"ESB-001","date_visit":"2026-10-13","nama_support":"Tegar Rangga",
   "nama_consultant":"Dika Anugerah Pratama","status":"COMPLETED"}
]
```

**JSON berbungkus**:
```json
{"data":{"records":[{"Ticket ID":"ESB-001","Date Visit":"13/10/2026","Nama Support":"Tegar Rangga"}]}}
```

**CSV**: berisi sekurang-kurangnya kolom `Ticket ID,Date Visit`. Nama berformat `snake_case` umum dinormalisasi otomatis; tanggal `yyyy-mm-dd` dinormalisasi ke `dd/mm/yyyy`. Kolom master ESB lain tetap bisa disesuaikan lewat **Sesuaikan Kolom Data**.

Endpoint wajib menyediakan **seluruh data visit yang diminta** dalam satu respons yang tidak melebihi 10 MB/20.000 baris. Jika Omni menggunakan pagination atau nested object field, adapter perlu disesuaikan berdasarkan kontrak API yang sebenarnya; sistem tidak menebak halaman lanjutan atau mengimpor data parsial.

## Operasional

1. Admin Omni memberi dokumentasi endpoint + scope minimal **read-only visits**; terbitkan token dengan TTL/rotasi sesuai kebijakan internal.
2. Admin dashboard mengisi environment Netlify. Jangan gunakan token produksi di deploy preview yang tidak dipercaya.
3. Deploy branch terbaru yang memuat fungsi `netlify/functions/omni-visits.mjs`.
4. Operator buka dashboard, klik **Sync Omni**, masukkan **Dashboard Access Key** (bukan token Omni), klik **Ambil Data**.
5. Cek jumlah baris/kolom yang terdeteksi. Jika valid, klik **Terapkan Data**. Dashboard lalu menggunakan filter, grouping Master Data Team, pengecualian visit Jane, rumus Check-In Rate, dan tampilan sebelumnya.
6. Untuk kembali ke data CSV bawaan, gunakan tombol reset dashboard; untuk CSV manual gunakan Upload CSV.
7. Sinkronisasi ini **manual**, bukan auto-polling atau server-side schedule. Integrasi otomatis terjadwal memerlukan spesifikasi pagination/delta cursor, cara menyimpan data aman, serta kebijakan refresh dari Omni.

## Troubleshooting

- **HTTP 503**: salah satu env belum diisi atau endpoint belum aktif.
- **HTTP 401**: Dashboard Access Key salah.
- **HTTP 502**: token Omni ditolak, upstream bermasalah, akses jaringan tertutup, atau respons bukan JSON/CSV valid.
- **Data ditolak / kolom kurang**: sediakan sample JSON respons yang sudah disamarkan, termasuk nama field, tipe data dan pagination. **Jangan sertakan token**.
- **Data terlalu besar**: butuh API bulk export/pagination aman dan mekanisme sinkronisasi bertahap; dashboard mempertahankan data lama saat error.

## Quality gate

`npm run ci` memvalidasi TypeScript, tes parsing Omni, tes keamanan server function, semua regresi KPI/master, dan build Vite. Tidak ada perubahan terhadap `src/data/rawCsv.ts` maupun perhitungan KPI.
