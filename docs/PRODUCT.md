# FORMA · PRD dan SRS

**Versi 0.1.0 · 12 November 2026**

## PRD

FORMA membantu pemilik menghubungkan asupan makan, latihan, dan perubahan tubuh selama 12 minggu. Pengguna mencatat makanan Indonesia dari ponsel. Alur rilis ini adalah daftar dan konfirmasi email → isi profil dan target → catat makanan → lihat sisa target dan jurnal harian → sesuaikan target melalui Profil.

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
| FR-ONB-005 | Tertunda hingga alur latihan memerlukan informasi ini |
| FR-ONB-006 | Tanggal mulai, berat awal, dan target berat opsional tersimpan di profil. Tanggal mulai dapat diedit dan bisa mendatang. Seri pengukuran masuk fase Progres |
| FR-NUT-001–004 | Pencarian nama Indonesia, filter kategori, gram atau porsi jika tersedia, pratinjau energi dan makro, empat kelompok makan |
| FR-NUT-005–007 | Tanggal/jam manual, riwayat harian, edit, hapus, total dan selisih terhadap target efektif |
| FR-NUT-008–009 | Makanan kustom privat. Daftar cepat menampilkan hingga lima makanan paling sering dalam 100 catatan terakhir. Frekuensi seri diurutkan menurut pemakaian terbaru |
| FR-NUT-010–012 | Nama, pengolahan, referensi sumber dan nilai per 100 g disalin saat pencatatan. Varian pengolahan dipisahkan. UI menampilkan label estimasi |
| NFR | UI Bahasa Indonesia, navigasi bawah di ponsel, kontrol keyboard, status memuat/kosong/gagal, validasi Zod/SQL, kepemilikan RLS |
| Data pengguna | Ekspor profil, riwayat target, makanan pribadi, dan jurnal. Penghapusan akun mandiri direncanakan sebelum rilis umum |

### Perilaku yang perlu diketahui

- Saat memasukkan data awal, tombol profil awal mengisi contoh usia 30 tahun, tinggi 170 cm, berat 75 kg, target berat 72 kg, dan aktivitas ringan. Target nutrisi dihitung dari isian saat ini, lalu dapat diubah lewat Profil. Baseline lain disimpan sebagai titik awal.
- Untuk target 2.100 kkal, protein 120 g, dan lemak 70 g, karbohidrat yang membuat energi konsisten adalah 247,5 g. Profil menghitung angka ini dari tiga input.
- Hidangan campuran di katalog memakai resep acuan per piring, buah, atau gelas. Pengguna dapat menyesuaikan jumlah atau gram, mencatat bahan terpisah, atau membuat makanan pribadi berdasarkan label per 100 g. Resep tersimpan, perhitungan resep majemuk, dan resep berulang masuk fase berikutnya.
- Jurnal dan target pertama tersedia mulai hari ini ketika program dimulai di masa depan. Mengedit tanggal mulai di Profil mempertahankan tanggal efektif target yang sudah tersimpan.
- Tanggal jurnal mengikuti WIB, WITA, atau WIT yang dipilih saat onboarding. Pencatatan hari lampau didukung. Sebelum target pertama berlaku, jurnal menampilkan total asupan tanpa sisa target.
- Jurnal bersumber dari catatan yang tersimpan. Halaman Beranda dan Nutrisi menampilkan keadaan kosong bila tanggal belum memiliki catatan.

## Urutan pengembangan setelah 0.1.0

1. **Latihan.** Library gerakan dan teknik, program A/B 12 minggu, media berlisensi, sesi dan set, riwayat.
2. **Progres.** Berat, lingkar pinggang, grafik kronologis, rerata mingguan, dan pencapaian berdasarkan pengukuran nyata.
3. **Pengingat dan PWA.** Jadwal lokal, izin, deduplikasi, instalasi Android dan pengujian perilaku tanpa koneksi.
4. **Rilis.** Pemulihan akses dan penghapusan akun mandiri, pengujian perangkat fisik, pengiriman email hosted, rilis Vercel dan uji pemakaian pribadi. Impor prototype dapat diprioritaskan apabila ada catatan lama yang ingin dipindahkan.
