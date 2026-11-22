// ============================================================================
// Piteket — Template Ceklis Persiapan Hari Raya & Upacara Keluarga
// Disimpan privat di perangkat (localStorage), fleksibel sesuai Desa Kala Patra
// ============================================================================

export const DEFAULT_CHECKLISTS = [
  {
    id: "chk-galungan",
    title: "Persiapan Galungan & Kuningan",
    siklus: "Sthiti (Hidup)",
    aksara: "ᬕᬮᬸᬗᬦ᭄",
    summary: "Ceklis bertahap dari Penyekeban, Penampahan, Hari Raya Galungan, hingga Kuningan.",
    drestaNote: "Bentuk banten, aturan memasang penjor, dan tradisi ngejot berbeda tiap desa adat. Sesuaikan dengan dresta domisili dan kawitan keluarga.",
    items: [
      "Siapkan bambu penjor dan perlengkapannya (sampian penjor, pala bungkah, pala gantung, sanggah cucuk) sebelum Penampahan.",
      "Koordinasikan pesanan atau bahan banten Galungan (tumpeng, soda, canang, penapean) bersama keluarga.",
      "Bersihkan area Sanggah / Merajan dan pelangkiran rumah sebelum hari Penampahan.",
      "Pasang penjor pada hari Penampahan Galungan dan siapkan segehan/banten Penampahan.",
      "Jadwalkan sembahyang bersama di Merajan rumah dan Pura Kahyangan Tiga / Pura Kawitan.",
      "Siapkan tradisi ngejot atau silaturahmi (Umanis Galungan) ke orang tua dan semeton.",
      "Catat persiapan banten khusus Kuningan (tamiang, kolem, endongan, nasi kuning) sebelum hari H (10 hari setelah Galungan)."
    ]
  },
  {
    id: "chk-nyepi",
    title: "Persiapan Pengerupukan & Hari Raya Nyepi",
    siklus: "Sthiti (Hidup)",
    aksara: "ᬜᭂᬧᬶ",
    summary: "Persiapan praktis menjelang Melasti, Tawur Kesanga, hingga 24 jam Catur Brata Penyepian.",
    drestaNote: "Ikuti jadwal Melasti, arah pengarakan ogoh-ogoh, dan pengumuman Kelian Banjar Adat setempat.",
    items: [
      "Cek jadwal Melasti banjar/desa adat dan siapkan busana adat putih/rapi.",
      "Siapkan sarana Pengerupukan (segehan agung, obor/api takep, kentongan/kulkul, nasi tawur sesuai kebiasaan rumah).",
      "Siapkan stok makanan, air minum, obat-obatan pribadi, dan kebutuhan bayi/lansia untuk 24 jam penuh.",
      "Isi daya ponsel/powerbank dan siapkan lampu darurat redup (tetap jaga Amati Geni sesuai aturan lingkungan).",
      "Pastikan pintu gerbang, air, dan kompor aman sebelum pukul 06.00 WITA.",
      "Rencanakan kegiatan hening/refleksi keluarga selama Catur Brata Penyepian dan silaturahmi saat Ngembak Geni."
    ]
  },
  {
    id: "chk-saraswati",
    title: "Persiapan Saraswati & Pagerwesi",
    siklus: "Sthiti (Hidup)",
    aksara: "ᬲᬭᬲ᭄ᬯᬢᬶ",
    summary: "Ceklis menghormati ilmu pengetahuan pada Hari Raya Saraswati hingga penguatan diri saat Pagerwesi.",
    drestaNote: "Di Bali Utara (Buleleng) perayaan Pagerwesi biasanya sangat meriah menyerupai Galungan; sesuaikan dengan tradisi keluarga.",
    items: [
      "Kumpulkan dan rapikan buku, kitab suci, catatan belajar, serta perangkat kerja/laptop di tempat bersih.",
      "Siapkan banten Saraswati (canang, sesayut Saraswati/soda/pejati sesuai kemampuan) sebelum tengah hari.",
      "Hindari membaca/menulis untuk urusan duniawi saat buku sedang diupacarai hingga keesokan pagi (Banyu Pinaruh).",
      "Jadwalkan melukat atau pembersihan diri pagi hari saat Banyu Pinaruh (Redite Paing Sinta).",
      "Siapkan banten dan jadwal sembahyang Pagerwesi (4 hari setelah Saraswati, Buda Kliwon Sinta) di Merajan/Pura."
    ]
  },
  {
    id: "chk-otonan",
    title: "Persiapan Otonan Keluarga",
    siklus: "Utpatti (Lahir)",
    aksara: "ᬑᬢᭀᬦᬦ᭄",
    summary: "Langkah sederhana menyiapkan upacara hari lahir Pawukon setiap 210 hari.",
    drestaNote: "Jika yang berotonan lahir pada Wuku Wayang, tanyakan kepada orang tua atau Sulinggih soal tradisi Melukat Sapuh Leger.",
    items: [
      "Pastikan tanggal Otonan tepat melalui tab Kalender & Otonan di Piteket.",
      "Konfirmasikan ke orang tua apakah kali ini memakai banten Otonan alit (canang/soda/byakala) atau madya (sesayut, prayascita, dapetan).",
      "Pesan atau siapkan bahan banten minimal 2–3 hari sebelumnya.",
      "Nunas tirta pebersihan/penglukatan di Sanggah Kemulan atau Jero Mangku bila diperlukan.",
      "Mandi bersih dan kenakan busana adat rapi sebelum natab banten Otonan.",
      "Simpan jadwal Otonan 210 hari berikutnya ke Kalender HP lewat tombol Ekspor .ics."
    ]
  },
  {
    id: "chk-melayat",
    title: "Ceklis Etika Melayat (Madelokan)",
    siklus: "Pralina (Kembali)",
    aksara: "ᬧ᭄ᬭᬮᬶᬦ",
    summary: "Pengingat cepat sebelum berangkat melayat ke rumah duka kerabat, teman, atau tetangga.",
    drestaNote: "Pastikan menanyakan status hubungan dadia/kawitan untuk mengetahui apakah keluarga ikut terkena masa cuntaka.",
    items: [
      "Kenakan busana adat madya bernuansa tenang/gelap atau pakaian sopan rapi tanpa perhiasan mencolok.",
      "Siapkan amplop punia duka atau sarana (beras/kopi/gula/dupa) sesuai kebiasaan wilayah tujuan.",
      "Cek lokasi layon (rumah duka, rumah sakit, atau krematorium) serta waktu kunjungan yang pantas.",
      "Tanyakan ke orang tua apakah almarhum memiliki ikatan dadia/keluarga yang membuat kita terkena cuntaka.",
      "Jaga ketenangan ucapan, hindari menjatuhkan air mata ke jenazah, dan sampaikan belasungkawa dengan lembut."
    ]
  },
  {
    id: "chk-mlaspas",
    title: "Persiapan Pindah / Mlaspas Rumah Baru",
    siklus: "Sthiti (Hidup)",
    aksara: "ᬫᭂᬮᬲ᭄ᬧᬲ᭄",
    summary: "Panduan praktis sebelum menempati rumah baru, rumah perumahan, atau kontrakan.",
    drestaNote: "Skala upacara (Mlaspas alit/madya, Mecaru Rsi Gana, atau cukup mepiuning untuk kontrakan) wajib dikonsultasikan ke tetua/Jero Mangku.",
    items: [
      "Konsultasikan posisi Sanggah/Padmasana atau Pelangkiran dengan tetua/Undagi sebelum menata perabot.",
      "Tentukan Dewasa Ayu bersama Sulinggih/Pemangku (hindari hari pantangan seperti Geni Rawana atau Lebur Awu).",
      "Lapor dan perkenalkan diri ke Kelian Banjar Adat / kepala lingkungan setempat.",
      "Koordinasikan banten Mecaru dan Mlaspas (atau pejati mepiuning) dengan tukang banten & Jero Mangku.",
      "Jika membangun Sanggah baru di domisili, jadwalkan mepiuning ke Sanggah Gede / Kawitan di desa asal."
    ]
  }
];
