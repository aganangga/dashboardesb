# Database dashboardesb — Supabase dan Google Sheets

Sumber: spreadsheet `1SoNn_O4JurYhG-GFIa7-5XtA-90TgDzqeLTPgehFHmI`, empat worksheet:

| Pilihan dashboard | gid | source_key | Baris nonkosong saat diperiksa |
| --- | --- | --- | --- |
| RAW DATA VISIT | 0 | dashboardesb-main | 1568 |
| RAW DATA TIKET | 1220387159 | dashboardesb-ticket | 997 |
| TEAM MASTER | 2104832140 | dashboardesb-team | 43 |
| CSAT | 1457583822 | dashboardesb-csat | 1018 |

Data RAW DATA TIKET dimulai setelah empat baris judul/metadata; header ganda
seperti L2 dan Approach diberi akhiran `(2)` supaya nilainya tidak tertimpa.
TEAM MASTER memakai baris ketiga sebagai header; kolom yang sepenuhnya kosong diabaikan.

## Status dan batas integrasi

Proyek Supabase yang disediakan: `wddllwjygcrzohehupau`.
API proyek: `https://wddllwjygcrzohehupau.supabase.co`.
Sheet sumber telah berhasil dibaca: 1.568 baris dan 11 kolom:
`Ticket ID`, `Status`, `Visit Type`, `Supervisor`, `Jadwal Agenda`, `Date Visit`,
`Check In Time`, `Check Out Time`, `Nama Support`, `Nama Consultant`, `Nama Company`.
Jumlah ini adalah hasil pemeriksaan sumber, bukan bukti bahwa data sudah diimpor ke Supabase.

Importer menyimpan nama kolom dan semua nilai sebagai string di JSONB, sehingga
kolom baru dan nomor telepon dengan nol awal tetap utuh. Semua baris sumber disimpan;
`Ticket ID + Date Visit` dipakai dashboard untuk deduplikasi metrik, bukan kunci unik
di database.

Checkout telah diselaraskan dengan pembaruan remote `896d86b`. Dashboard sekarang
dibangun dari React (`src`) ke `dist`, dengan integrasi Omni yang sudah ada tetap
terjaga. Dropdown worksheet memuat data langsung dari sumber Google Sheets yang sudah
bisa dibaca publik, melalui fungsi Netlify `/api/worksheets?sheet=<id>`.
Workspace memiliki empat subdashboard. Data Visit mempertahankan analitik kunjungan.
Data Tiket memiliki KPI tiket/H+0/H+1, tren bulan, departemen, area, dan PIC. CSAT
memiliki KPI rating/kepuasan/feedback serta tren respons. Team Master memiliki
komposisi jabatan dan direktori karyawan. Setiap subdashboard memiliki filter sesuai
kolom sumber; tabel rincian berada dalam bagian yang dapat dibuka. Muat ulang membaca sumber
terbaru. Bila pembacaan gagal, data sebelumnya tetap tersedia untuk worksheet itu.
Ini bukan bukti bahwa Supabase telah disinkronkan: jadwal database tetap proses
terpisah. Pembacaan database dari UI belum diaktifkan; jangan membuka tabel atau
service-role key ke publik.

## Aktivasi

1. Proyek sudah dibuat. Terapkan migration
   `supabase/migrations/20261013000000_create_sheet_sync.sql` melalui alur migration
   Supabase/Git yang sudah dikonfigurasi, atau jalankan `database/schema.sql` di SQL
   Editor proyek. Hubungan Git saja tidak membuktikan migration sudah diterapkan ke
   database production. Jangan menganggap branch preview sama dengan production.
2. Sumber CSV harus dapat diakses oleh proses Netlify. Jika sheet sudah sengaja
   dibagikan untuk pembacaan publik, endpoint ekspor pada fungsi dapat digunakan.
   Jangan mengubah data privat menjadi publik hanya untuk sinkronisasi. Untuk sheet
   privat, diperlukan autentikasi Google dan akses baca yang sesuai; versi ini belum
   mengimplementasikan autentikasi Google. Alternatif sementara: kirim ekspor CSV
   untuk memverifikasi struktur tanpa mempublikasikan spreadsheet.
3. Di pengaturan environment variables **Netlify**, isi `SUPABASE_URL` dengan URL
   proyek `https://wddllwjygcrzohehupau.supabase.co` dan `SUPABASE_SERVICE_ROLE_KEY` dengan
   legacy service-role JWT dari Supabase. Simpan key sebagai secret untuk Functions,
   jangan pakai prefiks `VITE_`, jangan masukkan ke HTML/Git/chat. Key ini harus nilai
   asli di Netlify; binding proxy Codex tidak otomatis tersedia di Functions Netlify.
4. Deploy ke Netlify. Fungsi terjadwal `sync-google-sheet` berjalan dengan cron
   `0 */6 * * *`: setiap 6 jam (02.00, 08.00, 14.00, 20.00 WITA). Scheduled function
   hanya bekerja pada published production deploy, bukan browser atau dev server.
5. Gunakan fitur **Run now** pada Scheduled Functions Netlify untuk validasi awal.
   Periksa log `sheet_sync_completed` dan `row_count`, kemudian query SQL di bawah.
   Status konfigurasi dan jadwal saja tidak membuktikan impor berhasil.

## Perilaku pembaruan

Keempat worksheet diimpor paralel ke source_key masing-masing. Kegagalan satu tab
tidak menghalangi tab lainnya. Setiap impor menggunakan satu transaksi PostgreSQL. Snapshot baru baru diaktifkan sesudah
semua baris masuk; kegagalan atau CSV kosong mempertahankan snapshot terakhir.
Respons login HTML, CSV rusak, header ganda/kosong, dan jumlah kolom tak cocok ditolak.
Checksum mencegah snapshot baru jika data tidak berubah. Snapshot historis dipertahankan
untuk audit; rencanakan retensi setelah volume data diketahui. Pergeseran urutan baris
membuat snapshot baru. Nomor baris adalah posisi dalam CSV setelah baris kosong diabaikan,
bukan ID permanen untuk pengeditan per record. Pada snapshot terbaru, baris yang dihapus
di Sheets tidak muncul lagi, tetapi tetap ada dalam histori.

RLS aktif tanpa kebijakan akses browser. RPC hanya dapat dijalankan service role.
View `current_sheet_records` menampilkan snapshot aktif; baca dari backend terautentikasi.

```sql
select source_key, spreadsheet_url, current_snapshot_id, last_checked_at
from public.sheet_sources;
select source_key, headers, row_count, imported_at
from public.sheet_snapshots order by imported_at desc;
select source_key, row_number, fields
from public.current_sheet_records order by row_number limit 10;
```

## Pemeriksaan lokal

```sh
cd /workspace/dashboardesb
node --test test/sheet-sync-function.test.mjs
npm run lint
# Pada lingkungan Codex Node 24, gunakan proxy yang sudah disediakan:
NODE_USE_ENV_PROXY=1 npm run dev
```

Scheduled sync tetap memerlukan key Supabase server. Selector worksheet tidak
memerlukan key Supabase karena membaca sumber Sheets yang sudah bisa diakses.
Versi file:// memakai data visit tersimpan; worksheet online memerlukan koneksi.


Test importer menggunakan respons jaringan tiruan. Skema juga divalidasi menggunakan
PostgreSQL embedded (PGlite), termasuk snapshot, pengulangan, rollback dan hak akses.
Tes ini tidak menggantikan uji end-to-end pada proyek Supabase dan sheet sebenarnya.

## Definisi metrik subdashboard

- Tiket: hanya baris dengan bulan bernomor dan PIC yang dihitung. Baris formula
  tanpa identitas PIC-periode diabaikan. Total tiket menjumlahkan `Total Ticket`;
  proporsi H+0 adalah jumlah `Total H+0` dibagi jumlah `Total H+0 + Total H+1`,
  bukan rata-rata persentase antar-PIC. `Visit Qty` adalah angka pada sheet tiket,
  terpisah dari deduplikasi kunjungan dashboard Visit.
- CSAT: rata-rata dan tingkat kepuasan memakai rating valid 1–5; Puas/Sangat Puas
  masuk respons puas. Respons dengan rating tidak dikenal tidak masuk pembagi.
  Bulan menggunakan `Created At (Date Created)` tanpa menggeser tanggal sumber.
- Team Master: jumlah karyawan unik berdasarkan email (fallback nama), dengan
  klasifikasi supervisor/consultant/implementor dari kolom `Job Tittle`.
  Tidak diasumsikan ada relasi manajer yang tidak tercantum pada worksheet ini.

## Omni dan penggabungan CSAT

Omni dihitung dari seluruh baris RAW DATA VISIT, termasuk baris yang tidak masuk
aturan khusus dashboard Visit, dengan status Cancel/Canceled/Cancelled dikecualikan.
Pencocokan memakai kata pertama PIC (kata utuh, tanpa membedakan huruf besar/kecil)
dan nomor bulan Date Visit. Bulan rekap tiket tidak mengandung tahun, sehingga
pencocokan mengikuti bulan seperti COUNTIFS yang diberikan pengguna.

H+0 berarti tanggal check-out sama dengan check-in; H+1 berarti tanggal check-out
lebih besar. Ini perbandingan hari kalender, bukan batas durasi 24 jam. Check-in dan
check-out kosong dihitung secara independen, sehingga keduanya dapat mencakup baris
yang sama. Rata-rata durasi H+0 memakai selisih menit yang valid, disimpan pada
kolom `Durasi H+0 OmnI` sebagai pecahan hari (menit / 1440), ditampilkan dalam jam
serta menit. Durasi negatif/format waktu tidak valid tidak masuk rata-rata.

Nilai Omni dihitung per PIC-bulan untuk rincian. KPI keseluruhan menghitung setiap
baris report sekali pada gabungan PIC-bulan yang terpilih, agar pencocokan kata
pertama yang tumpang tindih tidak mendobelkan report yang sama. Baris duplikat nyata
dari report tetap merupakan baris terpisah sesuai logika COUNTIFS.

CSAT: Sangat Puas=5, Puas=4, Cukup=3, Tidak Puas=2, Sangat Tidak Puas=1.
Kunci penggabungan adalah Agenda ID/ID Agenda bila tersedia, atau Ticket ID bersama
Jadwal Agenda. Jadwal kosong hanya dikaitkan bila report visit menunjukkan satu
agenda yang jelas. Tanggal submit CSAT tidak dipakai untuk menebak jadwal agenda.
Respons ambigu tetap menjadi unit penilaian terpisah. Respons dengan rating tidak
dikenal tidak menjadi nol; hanya rating valid yang dirata-ratakan.

Contoh: satu agenda mendapat nilai 4 dan 5, sehingga nilainya 4,5. Bila agenda lain
mendapat 3, rata-rata dua agenda adalah (4,5 + 3) / 2 = 3,75. Filter diterapkan dahulu
sebelum penggabungan respons. Distribusi nilai memakai rentang 4–<5 untuk nilai 4,5;
tingkat kepuasan memakai rata-rata nilai minimal 4.

Saat diperiksa, 1.018 respons CSAT memiliki Jadwal Agenda kosong dan Ticket ID tidak
beririsan dengan report visit. Data itu masih dinilai sebagai respons individual.
Isi Agenda ID atau Jadwal Agenda yang benar (dengan Ticket ID yang konsisten) agar
penggabungan data nyata dapat diverifikasi. Penanda agenda terhubung menampilkan
ketidaktersediaan kaitan dengan `—`, bukan menyatakan jumlah agenda nol.

Team Master dimuat otomatis untuk menampilkan nama lengkap pada filter Visit,
Tiket dan CSAT. Identitas filter Visit yang sudah ada tetap digunakan di balik label.
Nama yang ambigu atau belum terdaftar tidak dipaksakan menjadi orang lain; relasi
SPV/L2 mengikuti mapping yang sudah diverifikasi, bukan ditebak dari job title.
