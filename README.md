# FORMA

FORMA adalah jurnal nutrisi personal dengan antarmuka Bahasa Indonesia. Versi ini mencakup akun, jurnal nutrisi, Workout A/B dan progres 12 minggu. Status fitur, pengujian, dan pekerjaan berikutnya ada di [laporan milestone](docs/MILESTONES.md).

## Menjalankan secara lokal

Siapkan Node.js 22+, npm, Supabase CLI 2.108 atau lebih baru, dan Docker yang sedang berjalan.

```sh
npm ci
supabase start
supabase status
cp .env.example .env.local
npm run dev
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari keluaran `supabase status` sebelum menjalankan `npm run dev`. Gunakan publishable key atau anon key lokal. `FORMA_SITE_URL` harus sama dengan alamat aplikasi yang kamu buka, biasanya `http://localhost:3000`. Service-role key tidak diperlukan. Supabase menerapkan migrasi pada inisialisasi database baru. Untuk database lokal yang sudah ada, terapkan migrasi yang tertunda dengan `supabase migration up --local`.

1. Buka `http://localhost:3000`, daftar, lalu ambil tautan konfirmasi di Mailpit lokal, biasanya `http://127.0.0.1:54324`.
2. Masukkan data awal dan pilih tujuan. FORMA menghitung estimasi target yang dapat kamu edit atau ganti dengan isian manual. Tanggal mulai program boleh dipilih bebas. Penyimpanan terjadi saat kamu mengirim formulir.
3. Buka **Nutrisi** dan cari **Nasi putih matang**. Catat 200 g untuk hasil referensi 260 kkal. Dari **Kelola catatan**, ubah jumlah, tanggal, jam, atau waktu makan, atau hapus catatan.
4. Di **Latihan**, atur hari latihan, mulai Workout A/B, catat set, dan selesaikan sesi untuk memasukkannya ke riwayat.
5. Di **Progres**, catat berat atau lingkar pinggang. Grafik, perbandingan set, dan ringkasan mingguan terbentuk dari data yang tersimpan. Galeri foto bersifat privat.
6. Di **Profil**, ubah target atau tanggal program, unduh ekspor JSON, atau keluar.

Jika dependensi Supabase belum disetel, halaman masuk memberi petunjuk penyiapan. FORMA membutuhkan koneksi untuk membaca dan menulis jurnal.

## Pengujian

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

Tes SQL memakai PGlite dan mengeksekusi migrasi sungguhan dengan peran PostgreSQL uji. Untuk pengujian browser, gunakan proyek lokal terisolasi dengan migrasi dan konfirmasi email aktif. Ekspor URL dan publishable key lokal ke lingkungan shell agar Playwright bisa menguji PostgREST langsung.

```sh
npx playwright install chromium
npm run test:e2e
```

Suite membuat akun dan catatan uji pada database target. Variabel opsional `FORMA_TEST_APP_URL` menunjuk ke server Next.js yang sudah berjalan. `FORMA_TEST_MAIL_URL` mengganti alamat Mailpit dan `FORMA_TEST_CHROMIUM` memilih binary Chromium. Nilai bawaan Mailpit adalah `http://127.0.0.1:54324`. Gunakan alamat dan kredensial proyek uji lokal.

## Menyiapkan rilis di Vercel

1. Buat proyek Supabase khusus FORMA. Hubungkan CLI dengan `supabase link --project-ref <ref>`, periksa migrasi dengan `supabase db push --linked --dry-run`, lalu terapkan dengan `supabase db push --linked`.
2. Di Supabase Auth, aktifkan email dan konfirmasi pendaftaran. Atur Site URL ke origin HTTPS aplikasi dan tambahkan URL HTTPS aplikasi dengan path `/auth/confirm` ke Redirect URLs. Template bawaan Supabase memakai PKCE. Jika SMTP sendiri sudah tersedia, template `supabase/confirmation.html` mendukung verifikasi token langsung. Email bawaan Supabase terbatas pada anggota tim proyek.
3. Impor sumber ke proyek Next.js di Vercel. Isi tiga variabel dari `.env.example` sesuai environment Vercel dan deploy. Jalankan pengujian pada proyek Supabase uji atau staging yang berbeda dari produksi.
4. Selesaikan daftar rilis di [laporan milestone](docs/MILESTONES.md) dengan alamat deployment yang benar.

Rujukan [Supabase CLI](https://supabase.com/docs/reference/cli), [template email Supabase](https://supabase.com/docs/guides/auth/auth-email-templates), dan [variabel environment Vercel](https://vercel.com/docs/environment-variables).

## Dokumen proyek

- [PRD dan SRS](docs/PRODUCT.md)
- [Arsitektur, ERD, sistem desain, dan sumber pangan](docs/ARCHITECTURE.md)
- [Audit prototype, laporan pengujian, backlog, dan daftar rilis](docs/MILESTONES.md)
