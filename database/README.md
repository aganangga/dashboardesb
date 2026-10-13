# Database dashboardesb — Supabase dan Google Sheets

Sumber yang diminta: `1SoNn_O4JurYhG-GFIa7-5XtA-90TgDzqeLTPgehFHmI`, tab `gid=0`.

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
terjaga. Sinkronisasi ini menambahkan penyimpanan Supabase; pembacaan database dari UI
belum diaktifkan. Integrasi baca perlu autentikasi pengguna/backend sebelum dibuka.
Jangan membuka tabel atau service-role key ke publik.

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

Impor menggunakan satu transaksi PostgreSQL. Snapshot baru baru diaktifkan sesudah
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
```

Test importer menggunakan respons jaringan tiruan. Skema juga divalidasi menggunakan
PostgreSQL embedded (PGlite), termasuk snapshot, pengulangan, rollback dan hak akses.
Tes ini tidak menggantikan uji end-to-end pada proyek Supabase dan sheet sebenarnya.
