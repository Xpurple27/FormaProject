# FORMA · PRD dan SRS

**Versi 0.1.0 · 12 November 2026**

## PRD

FORMA membantu pemilik menghubungkan asupan makan, latihan, dan perubahan tubuh selama 12 minggu. Pengguna mencatat makanan Indonesia dari ponsel. Alur rilis mencakup profil dan target, jurnal makan, Workout A/B, serta catatan dan ringkasan progres 12 minggu.

| Kebutuhan pengguna | Pengalaman di versi 0.1.0 | Kriteria penerimaan |
| --- | --- | --- |
| Tahu asupan hari ini | Ringkasan kalori, protein, karbohidrat, lemak dari catatan pada tanggal profil | Nasi referensi 200 g menghasilkan 260 kkal dan tetap ada saat masuk ulang |
| Catat makanan sehari-hari | Cari makanan lokal, saring kategori, gunakan gram atau porsi, simpan makanan pribadi | Jumlah porsi dikonversi ke gram dan pengguna melihat estimasi sebelum menyimpan |
| Perbaiki catatan | Ubah jumlah, waktu, tanggal dan kelompok makan, atau hapus dengan konfirmasi | Total ikut berubah dan perubahan muncul setelah refresh |
| Sesuaikan target | Edit kalori, protein, dan lemak. Karbohidrat mengikuti energi tersisa | Target berlaku mulai tanggal lokal saat disimpan. Target hari sebelumnya dipertahankan |
| Pegang kendali atas data | Ekspor JSON dan sesi privat | Ekspor berisi data pemilik. Akun lain hanya bisa melihat katalog umum |

Target pengalaman dari handoff adalah pencatatan makanan yang sudah dikenal dalam kurang dari 30 detik dan layout yang nyaman pada Android. Pengujian waktu dengan pengguna dan pengujian Android fisik masuk daftar rilis.

## SRS

| ID handoff | Implementasi |
| --- | --- |
| FR-AUTH-001–003 | Supabase Auth email dan kata sandi, konfirmasi email, masuk, keluar, pemulihan sesi lewat cookie |
| FR-ONB-001–004 | Form data awal, IMT, estimasi BMR dan TDEE, serta target harian otomatis dengan pilihan isi manual |
| FR-ONB-005 | Pilihan peralatan tersedia pada pengaturan awal dan Profil. Variasi Workout A/B mengikuti peralatan yang dipilih. |
| FR-ONB-006 | Tanggal mulai, berat awal, dan target berat opsional tersimpan di profil. Tanggal mulai dapat diedit dan bisa mendatang. Seri pengukuran masuk fase Progres |
| FR-NUT-001–004 | Pencarian nama Indonesia, filter kategori, gram atau porsi jika tersedia, pratinjau energi dan makro, empat kelompok makan |
| FR-NUT-005–007 | Tanggal/jam manual, riwayat harian, edit, hapus, total dan selisih terhadap target efektif |
| FR-NUT-008–009 | Makanan kustom privat. Daftar cepat menampilkan hingga lima makanan paling sering dalam 100 catatan terakhir. Frekuensi seri diurutkan menurut pemakaian terbaru |
| FR-NUT-010–012 | Nama, pengolahan, referensi sumber dan nilai per 100 g disalin saat pencatatan. Varian pengolahan dipisahkan. UI menampilkan label estimasi |
| FR-WRK-001–013 | Jadwal fleksibel 12 minggu, panduan A/B dan alternatif pemula, ilustrasi asli, sesi persisten dengan jeda/lanjut, set aktual, timer, lewati/ganti gerakan dan riwayat. |
| FR-PRG-001–010 | Catat berat/pinggang bertanggal, grafik dari catatan, rerata mingguan, baseline dan target profil, perbandingan set, serta galeri foto privat. |
| FR-REM-001–008 | Jadwal makan, latihan, timbang berat, dan waktu tidur. Jam lokal WIB/WITA/WIT, hari pilihan, aktif/nonaktif, tunda 10 menit, tutup, dan hapus. Pengingat tampil saat aplikasi terbuka. Notifikasi perangkat bergantung pada izin dan dukungan browser. |
| PWA | Manifest, ikon standar dan maskable, tampilan mandiri, serta halaman offline tanpa data akun. |
| NFR | UI Bahasa Indonesia, navigasi bawah di ponsel, kontrol keyboard, status memuat/kosong/gagal, validasi Zod/SQL, kepemilikan RLS |
| Data pengguna | Ekspor profil, riwayat target, makanan pribadi, dan jurnal. Penghapusan akun mandiri direncanakan sebelum rilis umum |

### Perilaku yang perlu diketahui

- Saat memasukkan data awal, pengguna mengisi data tubuh sendiri. Pilihan lanjutan mencakup tujuan, peralatan, zona waktu, dan tanggal mulai. Target otomatis mengikuti data yang diisi. Data awal dan target bisa dikoreksi lewat Profil. Hasil timbangan terbaru masuk Progres.
- Untuk target 2.100 kkal, protein 120 g, dan lemak 70 g, karbohidrat yang membuat energi konsisten adalah 247,5 g. Profil menghitung angka ini dari tiga input.
- Hidangan campuran di katalog memakai resep acuan per piring, buah, atau gelas. Pengguna dapat menyesuaikan jumlah atau gram, mencatat bahan terpisah, atau membuat makanan pribadi berdasarkan label per 100 g. Resep tersimpan, perhitungan resep majemuk, dan resep berulang masuk fase berikutnya.
- Jurnal dan target pertama tersedia mulai hari ini ketika program dimulai di masa depan. Mengedit tanggal mulai di Profil mempertahankan tanggal efektif target yang sudah tersimpan.
- Tanggal jurnal mengikuti WIB, WITA, atau WIT yang dipilih saat onboarding. Pencatatan hari lampau didukung. Sebelum target pertama berlaku, jurnal menampilkan total asupan tanpa sisa target.
- Jurnal bersumber dari catatan yang tersimpan. Halaman Beranda dan Nutrisi menampilkan keadaan kosong bila tanggal belum memiliki catatan.

## Urutan pengembangan berikutnya

1. **Nutrisi dan evaluasi.** Resep tersimpan, riwayat lanjutan, evaluasi mingguan dan saran progres latihan.
2. **Rilis umum.** Pemulihan akun, penghapusan akun mandiri, SMTP dan uji perangkat fisik.
