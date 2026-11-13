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
- [x] Tambahkan jadwal pengingat, PWA, dan halaman cadangan offline.
- [ ] Uji pemasangan dan notifikasi di HP Android fisik.
- [ ] Selesaikan pemulihan akun dan penghapusan akun mandiri sebelum rilis umum.

## Batasan versi ini

Aplikasi membutuhkan koneksi untuk data akun. Porsi cepat tersedia jika makanan memiliki takaran acuan. Entri sebelum pembaruan yang belum memiliki snapshot takaran dapat dikoreksi dalam gram. Impor dari prototype, resep tersimpan, pencatatan offline, dan push saat aplikasi tertutup berada pada backlog.


## 3 · Workout A/B

- Jadwal 12 minggu mengikuti tanggal program dan hari yang dipilih pengguna. Satu sesi aktif per akun dengan jeda, lanjut, dan selesai. Sesi selesai masuk riwayat dan menetapkan rotasi berikutnya.
- Set aktual menyimpan repetisi, beban per alat atau durasi tahan. Timer istirahat tersedia selama sesi. Pengguna bisa memilih variasi atau melewati gerakan yang belum memiliki set.
- Delapan skema asli, petunjuk teknik, kesalahan umum, keamanan, dan alternatif pemula. Source utama `src/lib/workout.ts`, `src/components/workout-controls.tsx`, dan `public/exercises`.

## 4 · Progres tubuh

- Berat dan lingkar pinggang bisa disimpan, diedit, dan dihapus per tanggal. Grafik memakai tanggal aktual dan menampilkan hanya pengukuran yang tersedia. Ringkasan mengikuti periode 12 minggu.
- Berat awal dan target profil tampil terpisah dari berat terakhir yang diukur. Perbandingan kekuatan memakai set terbaik pada dua sesi terakhir yang memuat gerakan sejenis.
- Galeri privat memakai bucket Supabase dengan kebijakan folder pemilik. Unggahan gambar dinormalisasi ke JPEG. Ekspor akun menyertakan riwayat latihan, pengukuran, dan metadata galeri.
- Uji unit dan SQL menambah verifikasi jadwal, grafik, rata-rata tanpa nilai fiktif, transisi sesi, kepemilikan, dan kebijakan foto privat. Skenario Playwright mencakup Workout A dan B, jeda, refresh, pergantian gerakan, pengukuran dan alur foto. Pengujian aplikasi lokal memakai PostgreSQL, Supabase Auth, PostgREST dan layanan Storage uji. Konfigurasi proyek lokal dengan Supabase CLI bisa menggunakan Storage Supabase langsung.


## 5 · Pengingat, PWA, dan perbaikan alur pengguna

- Buka **Profil → Atur pengingat dan pasang FORMA** untuk membuat jadwal makan, latihan, timbang berat, atau waktu tidur. Setiap jadwal menyimpan hari pilihan, jam lokal, dan status aktif di akun. Pengguna dapat menunda 10 menit, menutup kejadian yang tampil, menonaktifkan, atau menghapus jadwal.
- Pengingat aktif dapat muncul selama dua jam dari waktu yang dijadwalkan. Jam mengikuti zona profil. Saat FORMA terbuka dan online, perangkat yang memberi izin dapat menerima notifikasi browser. Server mencatat klaim setiap kejadian agar beberapa tab atau perangkat tidak mengirim ulang. Izin ditolak tetap memungkinkan pengingat di dalam aplikasi.
- Manifest dan ikon mendukung pemasangan dari browser. Service worker menyimpan halaman publik untuk koneksi terputus. Cache tersebut tidak menyimpan jurnal, foto, atau respons privat. Penyimpanan catatan memerlukan internet.
- Pengaturan awal meminta data tubuh pengguna, lalu menawarkan tindakan **Catat makanan pertama**. Profil mengizinkan koreksi data awal. Untuk makanan dengan acuan porsi, ½, 1, 1½ dan 2 porsi bisa dipilih saat mencatat dan mengoreksi entri baru. Riwayat latihan menampilkan set tercatat dari total rencana, membedakan sesi penuh dan sebagian, serta mendukung koreksi hasil set yang sudah ditutup.
- Untuk menguji pada HP fisik, pasang dari Chrome Android, buka dari ikon layar utama, buat jadwal dekat jam sekarang, uji izin ditolak dan diizinkan, tunda pengingat, lalu matikan dan sambungkan kembali jaringan. Push ketika aplikasi tertutup dan penyimpanan offline berada di luar cakupan rilis ini.

| Pemeriksaan Fase 5 | Hasil |
| --- | --- |
| Lint, TypeScript, dan build Next.js | Lulus |
| Vitest | 19/19 lulus |
| SQL dengan migrasi proyek | 11/11 lulus, termasuk isolasi akun dan klaim notifikasi tunggal |
| Playwright | 4/4 lulus. Profil Pixel 7 mencakup kelayakan pemasangan lewat Chrome, simulasi izin, dua tab, tunda, tutup, dan pemulihan koneksi |
| Aksesibilitas otomatis | Tidak ada temuan aturan axe yang dijalankan pada Nutrisi dan Pengingat |
| Supabase hosted | Migrasi diterapkan. RLS aktif, akses anonim ditolak, dan jumlah set terisi untuk semua sesi yang sudah ditutup |
| Android fisik | Belum diuji |

## Tampilan mobile

- Ringkasan kalori dan tiga makro disatukan dalam satu panel. Beranda memberi akses langsung ke pencatatan dan jurnal, dengan pintasan latihan dan progres.
- Navigasi bawah menempatkan **Catat** di tengah. Pengingat dan Profil dapat dibuka dari header HP.
- Jurnal menampilkan empat kelompok makan. Tombol tambah per kelompok membuka pencarian dengan tanggal dan waktu makan yang sudah dipilih. Informasi jumlah, makro, dan sumber tetap dapat dibaca pada entri.
- Layar latihan menampilkan jumlah set yang tersimpan terhadap rencana dan pintasan ke jadwal serta riwayat.

Referensi pola antarmuka mobile [Cronometer](https://support.cronometer.com/hc/en-us/articles/360018593112-Mobile-Diary-Overview), [MacroFactor](https://help.macrofactorapp.com/en/articles/218-how-to-configure-your-food-timeline), [Hevy](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2026-Features-Guide), dan PWA [Tally](https://github.com/GeneArnold/tally).

## Susun sekali makan

- Dari **Catat → Susun sekali makan**, pilih beberapa bahan, lauk, atau minuman, masukkan jumlah dalam gram atau takaran acuan, dan lihat estimasi total kalori dan makro. Nama menu bersifat opsional.
- Komponen dicatat sekaligus dan dikelompokkan di riwayat. Setiap komponen tetap dapat diedit atau dihapus, dan total mengikuti isi catatan. Penyimpanan memakai satu operasi basis data dengan pencegahan duplikasi.
- Tambah telur dadar polos, nugget ayam matang, dan kopi susu manis ke katalog. Takaran kopi susu memakai resep acuan yang ditampilkan di aplikasi. Formulir manual diberi nama **Tambah dari label kemasan**.
