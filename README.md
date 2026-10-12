# ESB Visit Intelligence

Dashboard untuk memantau kunjungan lapangan, ketepatan waktu, durasi, dan pola operasional tim.

## Fitur

- Ringkasan kunjungan dan deduplikasi berdasarkan tiket serta tanggal kunjungan.
- Filter tanggal, area, supervisor, konsultan, tipe, dan status.
- Grafik tren harian, planned vs actual, breakdown, tampilan bulanan, serta perbandingan check-in/out.
- Upload CSV, penyesuaian mapping kolom, ekspor CSV, dan unduhan HTML offline.
- AI Insight berbasis metrik dan breakdown yang sedang difilter. Insight mengirim angka agregat seperti total kunjungan, area, tipe, status, serta bulan. Nama outlet, alamat, nomor kontak, dan tiket tidak dikirim.

## Menjalankan lokal

Butuh Node.js yang mendukung `fetch` bawaan dan npm/Bun.

1. Salin `.env.example` menjadi `.env`.
2. Isi `OPENAI_API_KEY` di `.env` untuk mengaktifkan AI Insight.
3. Jalankan `npm install`.
4. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Dashboard tetap bisa dibuka tanpa API key; hanya fitur AI Insight yang memerlukan key.

## Build dan server

- `npm run build` membuat aplikasi di folder `dist`.
- `npm start` menjalankan server Express untuk aplikasi dan endpoint AI Insight.
- Atur `PORT` bila lingkungan hosting menggunakan port berbeda.
- Atur `OPENAI_MODEL` untuk memilih model API. Default saat ini: `gpt-5.4-mini`.

Simpan API key hanya di environment variable server. Jangan menaruhnya dalam kode frontend atau commit file `.env`.

## Struktur singkat

- `src/App.tsx`: state, filter, dan navigasi dashboard.
- `src/utils/dataProcessor.ts`: pembacaan dan pengolahan data kunjungan.
- `src/components/AIInsightPanel.tsx`: panel tanya-jawab insight.
- `server.ts`: server aplikasi dan koneksi ke OpenAI Responses API.
