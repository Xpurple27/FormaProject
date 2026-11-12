# FORMA · Audit dan laporan milestone

**12 November 2026 · v0.1.0**

## 0 · Audit prototype

Dua sumber tersedia, yaitu `FORMA-MVP.zip` dan `index.html`. HTML mandiri identik secara SHA-256 dengan HTML di dalam ZIP. Arsip berisi satu halaman HTML/CSS/JavaScript dan satu manifest. Workspace awal berisi handoff dan tidak memiliki checkout Git untuk FORMA.

| Bagian prototype | Hasil audit | Tindakan |
| --- | --- | --- |
| Desain | Palet gelap navy, aksen hijau, navigasi bawah | Pertahankan arah visual dan bangun ulang komponen responsif |
| Penyimpanan | `localStorage` per perangkat. Ada ekspor dan penggantian data dari JSON | Ganti penyimpanan aktif dengan PostgreSQL dan ekspor berbasis akun. Prototype dan data asal tetap terpisah |
| Pencatatan | Pilih dari 13 makanan, input gram, tambah dan hapus untuk hari ini. Nilai tidak memiliki rujukan per makanan | Katalog kecil dengan kode sumber, jurnal lintas tanggal, edit, makanan kustom, snapshot |
| Latihan dan progres | Latihan A/B mencentang gerakan, satu beban per sesi. Progres bermula dari contoh berat yang dibuat otomatis. | Pertahankan konsep program di backlog. Fitur sesi dan pengukuran dibangun dari data terkonfirmasi |
| Pengingat dan PWA | Interval hanya selama halaman aktif. Manifest tersedia di ZIP | Jadwalkan pengingat dan instalasi Android sebagai milestone tersendiri |
| Verifikasi | Tidak ada package manifest, migrasi, akun, atau suite tes dalam prototype | Gunakan paket Next.js, migrasi, pengujian otomatis, dan catatan rilis |

## 1 · Fondasi aplikasi

- Next.js App Router 16, TypeScript strict, Tailwind CSS 4, Inter dan UI Bahasa Indonesia.
- Daftar, konfirmasi email, masuk, keluar, halaman privat, sesi cookie, onboarding, dan ekspor JSON.
- Migrasi profil dan riwayat target, RPC onboarding atomik, dan RLS. Source utama ada di `src/app`, `src/lib/supabase`, dan `supabase/migrations`.
- Build produksi, lint, pemeriksaan tipe, dan pengujian autentikasi serta kepemilikan data dijalankan.

## 2 · Nutrition Tracker

- Cari nama makanan dan saring kategori. Katalog berisi delapan makanan dengan kode sumber TKPI/USDA dan label estimasi.
- Catat gram atau porsi, pilih kelompok makan, tanggal dan jam. Ubah atau hapus catatan, buat makanan pribadi dan gunakan daftar sering dicatat.
- Beranda dan jurnal merangkum kalori, protein, karbohidrat, dan lemak berdasarkan catatan tersimpan. Target 2.100 kkal, protein 120 g, dan lemak 70 g menghasilkan karbohidrat 247,5 g.
- PostgreSQL menyimpan snapshot nilai rujukan dan menghitung nilai gizi sesuai berat. Untuk referensi nasi matang 130 kkal per 100 g, jurnal menghasilkan 260 kkal pada 200 g dan 195 kkal pada 150 g.
- Source utama ada di `src/app/(private)/nutrisi`, `src/components/food-forms.tsx`, `src/lib/nutrition.ts`, dan dua migrasi nutrisi. Tes ada di `tests/`.

## Lingkungan verifikasi

Build dijalankan dengan Node 24 dan Next.js 16.4.6. Pengujian browser memakai Chromium headless, server build produksi Next.js, PostgreSQL 17.11, Supabase Auth v2.197.0, PostgREST v16.5, dan Mailpit dalam lingkungan lokal terisolasi. Database uji menggunakan migrasi yang sama dengan paket ini. Pengujian SQL tambahan memakai PGlite. Tiga migrasi yang sama telah diterapkan pada proyek Supabase hosted khusus FORMA.

## Hasil pengujian

| Pemeriksaan | Hasil | Cakupan |
| --- | --- | --- |
| `npm run lint`, `npm run typecheck`, `npm run build` | Lulus | Pemeriksaan statis dan build produksi |
| `npm test` | 10/10 lulus | Penskalaan pangan, porsi, total dan makro, Mifflin–St Jeor, batas tanggal, WIB, dan validasi input |
| `npm run test:db` | 6/6 lulus | Tiga migrasi, transaksi onboarding, deduplikasi, snapshot, isolasi akun, penolakan akses anonim |
| `npm run test:e2e` | 2/2 lulus | Konfirmasi email melalui Mailpit, onboarding, jurnal nasi 200 g dan 150 g, pindah tanggal dan kelompok makan, refresh, login pada sesi browser baru, ekspor, hapus, porsi makanan pribadi, filter kategori, dan isolasi akses lewat PostgREST |
| Pemeriksaan UI dalam Playwright | Lulus pada halaman Nutrisi yang diuji | Lebar 320, 390, dan 1.280 px tanpa overflow horizontal. axe tidak menemukan pelanggaran aturan WCAG A/AA yang dijalankan |
| `npm audit --omit=dev` | 0 advisory dilaporkan | Dependensi produksi saat pengujian |

## Daftar rilis

- [x] Audit sumber prototype dan dokumentasikan keputusan.
- [x] Implementasikan fondasi akun, database, dan jurnal nutrisi.
- [x] Validasi kalkulasi, autentikasi, operasi jurnal, dan isolasi dua akun dalam pengujian otomatis.
- [ ] Siapkan proyek Supabase khusus FORMA, SMTP dan origin HTTPS. Jalankan migrasi serta cek skema dan hak akses di staging.
- [ ] Uji konfirmasi email hosted, sesi setelah refresh, dan penyimpanan dari ponsel fisik. Ukur waktu pencatatan makanan yang sering dipakai.
- [x] Library gerakan, program Dumbbell A/B, dan penyimpanan set latihan.
- [x] Progres tubuh, kekuatan, dan galeri privat.
- [ ] Tambahkan pengingat dan PWA. Verifikasi instalasi dan perilaku tanpa koneksi.
- [ ] Selesaikan pemulihan akun dan penghapusan akun mandiri sebelum rilis umum.

## Batasan versi ini

Aplikasi membutuhkan koneksi. Baseline dan zona waktu disetel saat onboarding, sedangkan target nutrisi bisa diperbarui lewat Profil. Porsi hanya muncul pada makanan dengan definisi gram. Impor dari prototype, resep tersimpan, pengingat, dan PWA berada pada backlog.


## 3 · Workout A/B

- Jadwal 12 minggu mengikuti tanggal program dan hari yang dipilih pengguna. Satu sesi aktif per akun dengan jeda, lanjut, dan selesai. Sesi selesai masuk riwayat dan menetapkan rotasi berikutnya.
- Set aktual menyimpan repetisi, beban per alat atau durasi tahan. Timer istirahat tersedia selama sesi. Pengguna bisa memilih variasi atau melewati gerakan yang belum memiliki set.
- Delapan skema asli, petunjuk teknik, kesalahan umum, keamanan, dan alternatif pemula. Source utama `src/lib/workout.ts`, `src/components/workout-controls.tsx`, dan `public/exercises`.

## 4 · Progres tubuh

- Berat dan lingkar pinggang bisa disimpan, diedit, dan dihapus per tanggal. Grafik memakai tanggal aktual dan menampilkan hanya pengukuran yang tersedia. Ringkasan mengikuti periode 12 minggu.
- Berat awal dan target profil tampil terpisah dari berat terakhir yang diukur. Perbandingan kekuatan memakai set terbaik pada dua sesi terakhir yang memuat gerakan sejenis.
- Galeri privat memakai bucket Supabase dengan kebijakan folder pemilik. Unggahan gambar dinormalisasi ke JPEG. Ekspor akun menyertakan riwayat latihan, pengukuran, dan metadata galeri.
- Uji unit dan SQL menambah verifikasi jadwal, grafik, rata-rata tanpa nilai fiktif, transisi sesi, kepemilikan, dan kebijakan foto privat. Skenario Playwright mencakup Workout A dan B, jeda, refresh, pergantian gerakan, pengukuran dan alur foto. Pengujian aplikasi lokal memakai PostgreSQL, Supabase Auth, PostgREST dan layanan Storage uji. Konfigurasi proyek lokal dengan Supabase CLI bisa menggunakan Storage Supabase langsung.
