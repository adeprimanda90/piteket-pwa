// ============================================================================
// Piteket — Mesin Aturan Ala Ayuning Dewasa (Wariga Rule Engine) 100% Offline
// Sumber rumusan: Wewaran Penyusun Ala-Ayuning Dewasa (kalenderbali.org)
// ============================================================================

function isP(c, day) {
  return c.phaseName === "Penanggal" && c.sasihDay === day;
}

function isPg(c, day) {
  return c.phaseName === "Pangelong" && c.sasihDay === day;
}

function isDay(c, day) {
  return c.sasihDay === day;
}

const RULES = [
  // ================= DEWASA AYU (ANJURAN / HARI BAIK) =================
  {
    name: "Amerta Akasa",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk memuja leluhur (Pitra Yadnya) dan Dewa Yadnya.",
    match: (c) => c.saptaWara === "Anggara" && c.isPurnama
  },
  {
    name: "Amerta Bumi",
    sifat: "Ayu",
    tags: ["pawiwahan"],
    desc: "Baik untuk upacara perkawinan (Pawiwahan).",
    match: (c) => (c.saptaWara === "Soma" && c.pancaWara === "Wage" && isP(c, 1)) ||
                  (c.saptaWara === "Buda" && c.pancaWara === "Pon" && isP(c, 10))
  },
  {
    name: "Amerta Buwana",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk upacara Dewa Yadnya dan Pitra Yadnya.",
    match: (c) => c.isPurnama && ["Redite", "Soma", "Anggara"].includes(c.saptaWara)
  },
  {
    name: "Amerta Dadi",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk upacara Dewa Yadnya dan pemujaan leluhur.",
    match: (c) => (c.saptaWara === "Soma" && c.triWara === "Beteng") || (c.isPurnama && c.triWara === "Kajeng")
  },
  {
    name: "Amerta Danta",
    sifat: "Ayu",
    tags: ["melukat", "yadnya"],
    desc: "Baik untuk tapa, brata, yoga, semadi, penyucian diri, dan segala pekerjaan.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 6)) ||
      (c.saptaWara === "Soma" && (isP(c, 5) || c.isPurnama)) ||
      (c.saptaWara === "Anggara" && isP(c, 4)) ||
      (c.saptaWara === "Buda" && (isP(c, 3) || isP(c, 10))) ||
      (c.saptaWara === "Wraspati" && isP(c, 2)) ||
      (c.saptaWara === "Sukra" && isP(c, 1)) ||
      (c.saptaWara === "Saniscara" && isP(c, 7))
  },
  {
    name: "Amerta Dewa",
    sifat: "Ayu",
    tags: ["yadnya", "bangunan"],
    desc: "Baik untuk Panca Yadnya khususnya Dewa Yadnya, membangun tempat suci, lumbung, dan dapur.",
    match: (c) =>
      (c.saptaWara === "Redite" && isDay(c, 6)) ||
      (c.saptaWara === "Soma" && isDay(c, 7)) ||
      (c.saptaWara === "Anggara" && isDay(c, 3)) ||
      (c.saptaWara === "Buda" && isDay(c, 2)) ||
      (c.saptaWara === "Wraspati" && isDay(c, 5)) ||
      (c.saptaWara === "Sukra" && isDay(c, 1)) ||
      (c.saptaWara === "Saniscara" && isDay(c, 4))
  },
  {
    name: "Amerta Gati",
    sifat: "Ayu",
    tags: ["usaha", "belanja"],
    desc: "Baik untuk memulai suatu usaha dan bercocok tanam.",
    match: (c) =>
      (c.saptaWara === "Redite" && (isP(c, 3) || isP(c, 6))) ||
      (c.saptaWara === "Soma" && isP(c, 7)) ||
      (c.saptaWara === "Anggara" && isP(c, 3)) ||
      (c.saptaWara === "Buda" && (isP(c, 2) || isP(c, 3))) ||
      (c.saptaWara === "Wraspati" && isP(c, 5)) ||
      (c.saptaWara === "Sukra" && (isP(c, 1) || isP(c, 12))) ||
      (c.saptaWara === "Saniscara" && (isP(c, 4) || isP(c, 7)))
  },
  {
    name: "Amerta Masa",
    sifat: "Ayu",
    tags: ["yadnya", "bangunan"],
    desc: "Baik untuk upacara Dewa Yadnya, membangun, dan bercocok tanam.",
    match: (c) => c.saptaWara === "Sukra" && c.isPurnama
  },
  {
    name: "Amerta Sari",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk upacara Dewa Yadnya di sanggah/merajan dan menanam bunga.",
    match: (c) => c.saptaWara === "Buda" && c.isPurnama
  },
  {
    name: "Amertayoga",
    sifat: "Ayu",
    tags: ["usaha", "belanja", "bangunan"],
    desc: "Baik untuk membangun, mencari nafkah (pengupa jiwa), dan memulai usaha/perusahaan.",
    match: (c) =>
      (c.saptaWara === "Soma" && ["Landep", "Krulut", "Ugu", "Dukut", "Tolu", "Medangsia", "Medangkungan", "Menail"].includes(c.wuku)) ||
      (c.saptaWara === "Wraspati" && isP(c, 4)) ||
      (c.saptaWara === "Saniscara" && isP(c, 5))
  },
  {
    name: "Ayu Badra",
    sifat: "Ayu",
    tags: ["usaha", "belanja", "bangunan"],
    desc: "Baik untuk memulai usaha, bercocok tanam, dan membangun.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 3)) ||
      (c.saptaWara === "Soma" && (isP(c, 7) || isP(c, 10))) ||
      (c.saptaWara === "Anggara" && isP(c, 3)) ||
      (c.saptaWara === "Buda" && isP(c, 12)) ||
      (c.saptaWara === "Wraspati" && isP(c, 10)) ||
      (c.saptaWara === "Saniscara" && isP(c, 11))
  },
  {
    name: "Ayu Dana",
    sifat: "Ayu",
    tags: ["yadnya", "usaha"],
    desc: "Hari baik melaksanakan Panca Yadnya, segala pekerjaan, berdana punia, dan mengajukan permohonan.",
    match: (c) => c.saptaWara === "Sukra" && c.isPurnama
  },
  {
    name: "Ayu Nulus",
    sifat: "Ayu",
    tags: ["usaha", "belanja"],
    desc: "Baik untuk segala usaha.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 6)) ||
      (c.saptaWara === "Soma" && isP(c, 3)) ||
      (c.saptaWara === "Anggara" && isP(c, 7)) ||
      (c.saptaWara === "Buda" && (isP(c, 12) || isP(c, 13))) ||
      (c.saptaWara === "Wraspati" && isP(c, 5)) ||
      (c.saptaWara === "Sukra" && isP(c, 1)) ||
      (c.saptaWara === "Saniscara" && isP(c, 5))
  },
  {
    name: "Catur Laba",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk bepergian ke utara, upacara Manusa Yadnya, dan Pitra Yadnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && c.pancaWara === "Umanis") ||
      (c.saptaWara === "Soma" && c.pancaWara === "Wage") ||
      (c.saptaWara === "Buda" && c.pancaWara === "Pon") ||
      (c.saptaWara === "Saniscara" && c.pancaWara === "Paing")
  },
  {
    name: "Derman Bagia",
    sifat: "Ayu",
    tags: ["pawiwahan", "bangunan", "melukat"],
    desc: "Baik untuk pernikahan (nikah), membangun, serta mulai belajar/berlatih.",
    match: (c) => c.saptaWara === "Soma" && [2, 3, 5, 12].some((d) => isP(c, d))
  },
  {
    name: "Dewa Ngelayang",
    sifat: "Ayu",
    tags: ["bangunan", "yadnya"],
    desc: "Baik untuk membuat bangunan suci (sanggah), Dewa Yadnya, dan Pitra Yadnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 6)) ||
      (c.saptaWara === "Soma" && isP(c, 3)) ||
      (c.saptaWara === "Anggara" && (isP(c, 3) || isP(c, 7))) ||
      (c.saptaWara === "Buda" && (isP(c, 3) || isP(c, 13) || c.isPurnama)) ||
      (c.saptaWara === "Wraspati" && isP(c, 5)) ||
      (c.saptaWara === "Sukra" && isP(c, 1)) ||
      (c.saptaWara === "Saniscara" && isP(c, 4))
  },
  {
    name: "Dewa Stata",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk melakukan Panca Yadnya, khususnya Dewa Yadnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 10)) ||
      (c.saptaWara === "Soma" && isP(c, 9)) ||
      (c.saptaWara === "Anggara" && isP(c, 6)) ||
      (c.saptaWara === "Buda" && isP(c, 8)) ||
      (c.saptaWara === "Wraspati" && isP(c, 7)) ||
      (c.saptaWara === "Sukra" && isP(c, 9)) ||
      (c.saptaWara === "Saniscara" && isP(c, 10))
  },
  {
    name: "Dewasa Mentas",
    sifat: "Ayu",
    tags: ["yadnya", "bangunan", "melukat"],
    desc: "Baik untuk segala macam yadnya, penyucian diri, memberi petuah, dan membangun.",
    match: (c) => c.saptaWara === "Wraspati" && (isP(c, 5) || c.isPurnama)
  },
  {
    name: "Dewasa Ngelayang",
    sifat: "Ayu",
    tags: ["bangunan"],
    desc: "Baik untuk membangun rumah, membuat jukung, dan sejenisnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && (isP(c, 1) || isP(c, 8))) ||
      (c.saptaWara === "Anggara" && isP(c, 7)) ||
      (c.saptaWara === "Buda" && (isP(c, 2) || isP(c, 3))) ||
      (c.saptaWara === "Wraspati" && isP(c, 4)) ||
      (c.saptaWara === "Sukra" && isP(c, 6)) ||
      (c.saptaWara === "Saniscara" && isP(c, 5))
  },
  {
    name: "Guntur Umah / Graha",
    sifat: "Ayu",
    tags: ["bangunan"],
    desc: "Baik untuk membangun atau memindahkan rumah.",
    match: (c) =>
      (c.saptaWara === "Wraspati" && ["Medangsia", "Merakih"].includes(c.wuku)) ||
      (c.saptaWara === "Saniscara" && ["Medangkungan", "Ugu"].includes(c.wuku)) ||
      (c.saptaWara === "Buda" && ["Landep", "Tolu"].includes(c.wuku))
  },
  {
    name: "Istri Payasan",
    sifat: "Ayu",
    tags: ["bangunan"],
    desc: "Mengandung unsur keindahan; baik untuk Mlaspas dan bercocok tanam.",
    match: (c) => c.saptaWara === "Soma" && isP(c, 8)
  },
  {
    name: "Kamajaya",
    sifat: "Ayu",
    tags: ["pawiwahan", "bangunan", "melukat"],
    desc: "Baik untuk dewasa pernikahan, membangun, dan mulai belajar/berlatih.",
    match: (c) => c.saptaWara === "Buda" && [2, 3, 7].some((d) => isP(c, d))
  },
  {
    name: "Purnama Danta",
    sifat: "Ayu",
    tags: ["yadnya", "melukat"],
    desc: "Baik untuk dewasa ayu dan penyucian.",
    match: (c) => c.saptaWara === "Buda" && c.pancaWara === "Kliwon" && c.isPurnama
  },
  {
    name: "Sedana Yoga",
    sifat: "Ayu",
    tags: ["usaha", "belanja"],
    desc: "Baik untuk membuat alat berdagang, tempat usaha, dan mulai berjualan agar murah rezeki.",
    match: (c) =>
      (c.saptaWara === "Redite" && (isDay(c, 8) || c.isPurnama || c.isTilem)) ||
      (c.saptaWara === "Soma" && isDay(c, 3)) ||
      (c.saptaWara === "Anggara" && isDay(c, 7)) ||
      (c.saptaWara === "Buda" && (isDay(c, 2) || isDay(c, 3))) ||
      (c.saptaWara === "Wraspati" && (isDay(c, 4) || isDay(c, 5) || c.isPurnama || c.isTilem)) ||
      (c.saptaWara === "Sukra" && (isDay(c, 1) || isDay(c, 6))) ||
      (c.saptaWara === "Saniscara" && (isDay(c, 5) || c.isPurnama || c.isTilem))
  },
  {
    name: "Semut Sedulur",
    sifat: "Ayu",
    tags: ["usaha", "belanja"],
    desc: "Baik untuk gotong royang, kerja bakti, dan membentuk perkumpulan. Tidak baik mengubur/membakar mayat.",
    match: (c) =>
      (c.saptaWara === "Sukra" && c.pancaWara === "Pon") ||
      (c.saptaWara === "Saniscara" && c.pancaWara === "Wage") ||
      (c.saptaWara === "Redite" && c.pancaWara === "Kliwon")
  },
  {
    name: "Siwa Sampurna",
    sifat: "Ayu",
    tags: ["yadnya", "bangunan", "melukat"],
    desc: "Baik untuk segala jenis upacara, mulai belajar/berlatih, dan membangun bangunan.",
    match: (c) => c.saptaWara === "Wraspati" && [4, 5, 10].some((d) => isP(c, d))
  },
  {
    name: "Sri Murti",
    sifat: "Ayu",
    tags: ["yadnya"],
    desc: "Baik untuk mempersembahkan yadnya kepada Dewi Sri di lumbung.",
    match: (c) => c.sadWara === "Was" && c.astaWara === "Sri"
  },
  {
    name: "Subacara",
    sifat: "Ayu",
    tags: ["yadnya", "usaha", "melukat"],
    desc: "Baik untuk melangsungkan segala jenis upacara, membuat rencana/peraturan, dan mulai belajar.",
    match: (c) =>
      (c.saptaWara === "Redite" && (isP(c, 3) || c.isPurnama)) ||
      (c.saptaWara === "Soma" && isP(c, 3)) ||
      (c.saptaWara === "Anggara" && (isP(c, 2) || isP(c, 7) || isP(c, 8))) ||
      (c.saptaWara === "Buda" && (isP(c, 2) || isP(c, 3) || isP(c, 6))) ||
      (c.saptaWara === "Wraspati" && (isP(c, 5) || isP(c, 6))) ||
      (c.saptaWara === "Sukra" && (isP(c, 1) || isP(c, 2) || isP(c, 3))) ||
      (c.saptaWara === "Saniscara" && (isP(c, 4) || isP(c, 5)))
  },
  {
    name: "Tutur Mandi",
    sifat: "Ayu",
    tags: ["melukat"],
    desc: "Baik untuk hal-hal spiritual (kedyatmikan) dan memberikan petuah/nasihat.",
    match: (c) =>
      (c.saptaWara === "Redite" && c.wuku === "Ugu") ||
      (c.saptaWara === "Wraspati" && ["Ukir", "Julungwangi", "Pujut", "Medangkungan", "Matal", "Prangbakat"].includes(c.wuku)) ||
      (c.saptaWara === "Sukra" && c.wuku === "Landep") ||
      (c.saptaWara === "Saniscara" && c.wuku === "Uye")
  },
  {
    name: "Upadana Amerta",
    sifat: "Ayu",
    tags: ["usaha", "belanja"],
    desc: "Baik untuk menanam tanaman, membuat alat berdagang, atau mulai berjualan.",
    match: (c) => c.saptaWara === "Redite" && [1, 6, 8, 10].some((d) => isP(c, d))
  },

  // ================= ALA DEWASA (PERINGATAN / PANTANGAN) =================
  {
    name: "Agni Agung Doyan Basmi",
    sifat: "Ala",
    tags: ["bangunan"],
    desc: "Bersifat panas; tidak baik membangun atau mengatapi rumah (mudah terbakar). Baik untuk membakar bata/genteng/keramik.",
    match: (c) => c.saptaWara === "Anggara" && (c.isPurnama || c.astaWara === "Brahma")
  },
  {
    name: "Carik Walangati",
    sifat: "Ala",
    tags: ["pawiwahan", "bangunan", "yadnya"],
    desc: "Tidak baik untuk melakukan pernikahan (Pawiwahan), Ngaben (atiwa-tiwa), dan membangun rumah.",
    match: (c) => ["Sinta", "Gumbreg", "Wariga", "Sungsang", "Kuningan", "Prangbakat", "Bala", "Wayang", "Klawu", "Watugunung"].includes(c.wuku) &&
                  c.sangaWara === "Dangu"
  },
  {
    name: "Dina Carik",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya", "bangunan"],
    desc: "Tidak baik dipakai sebagai dewasa ayu.",
    match: (c) =>
      (c.saptaWara === "Redite" && isP(c, 12)) ||
      (c.saptaWara === "Soma" && isP(c, 11)) ||
      (c.saptaWara === "Anggara" && isP(c, 10)) ||
      (c.saptaWara === "Buda" && isP(c, 9)) ||
      (c.saptaWara === "Wraspati" && isP(c, 8)) ||
      (c.saptaWara === "Sukra" && isP(c, 7)) ||
      (c.saptaWara === "Saniscara" && isP(c, 6))
  },
  {
    name: "Gagak Anungsang Pati",
    sifat: "Ala",
    tags: ["yadnya"],
    desc: "Tidak baik melakukan upacara membakar mayat / atiwa-tiwa (Ngaben).",
    match: (c) => isP(c, 9) || isPg(c, 1) || isPg(c, 6) || isPg(c, 14)
  },
  {
    name: "Geni Rawana",
    sifat: "Ala",
    tags: ["bangunan"],
    desc: "Baik untuk pekerjaan memakai api; tidak baik untuk mengatapi rumah, Mlaspas, dan bercocok tanam.",
    match: (c) =>
      (c.phaseName === "Penanggal" && [2, 4, 8, 11].includes(c.sasihDay)) ||
      (c.phaseName === "Pangelong" && [3, 4, 9, 13].includes(c.sasihDay))
  },
  {
    name: "Kala Gotongan",
    sifat: "Ala",
    tags: ["yadnya"],
    desc: "Baik untuk memulai usaha, namun tidak baik untuk mengubur atau membakar mayat.",
    match: (c) =>
      (c.saptaWara === "Sukra" && c.pancaWara === "Kliwon") ||
      (c.saptaWara === "Saniscara" && c.pancaWara === "Umanis") ||
      (c.saptaWara === "Redite" && c.pancaWara === "Paing")
  },
  {
    name: "Kala Mangap",
    sifat: "Ala",
    tags: ["usaha", "belanja"],
    desc: "Tidak baik untuk berbelanja karena mengandung sifat boros.",
    match: (c) => c.saptaWara === "Redite" && c.pancaWara === "Umanis"
  },
  {
    name: "Kala Pati",
    sifat: "Ala",
    tags: ["yadnya", "pawiwahan", "bangunan"],
    desc: "Tidak baik untuk semua upacara dan pekerjaan penting lainnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && ["Landep", "Sungsang"].includes(c.wuku)) ||
      (c.saptaWara === "Anggara" && ["Gumbreg", "Medangsia", "Wayang"].includes(c.wuku)) ||
      (c.saptaWara === "Buda" && ["Landep", "Sungsang", "Ugu"].includes(c.wuku)) ||
      (c.saptaWara === "Wraspati" && c.wuku === "Gumbreg") ||
      (c.saptaWara === "Saniscara" && c.wuku === "Krulut")
  },
  {
    name: "Kala Rau",
    sifat: "Ala",
    tags: ["bangunan", "pawiwahan"],
    desc: "Tidak baik membangun/mengatapi rumah dan mengawinkan orang; baik untuk meramu obat.",
    match: (c) =>
      (c.saptaWara === "Redite" && c.wuku === "Sinta") ||
      (c.saptaWara === "Sukra" && c.wuku === "Gumbreg") ||
      (c.saptaWara === "Saniscara" && ["Ukir", "Kulantir", "Merakih"].includes(c.wuku))
  },
  {
    name: "Kala Sungsang",
    sifat: "Ala",
    tags: ["yadnya", "pawiwahan"],
    desc: "Mengandung unsur terbalik/bertentangan; tidak baik untuk karya ayu atau yadnya.",
    match: (c) => c.wuku === "Wayang"
  },
  {
    name: "Lebur Awu",
    sifat: "Ala",
    tags: ["pawiwahan", "bangunan"],
    desc: "Tidak baik untuk upacara pernikahan (Pawiwahan), pertemuan, membangun, dan mengatapi rumah.",
    match: (c) =>
      (c.saptaWara === "Redite" && c.astaWara === "Indra") ||
      (c.saptaWara === "Soma" && c.astaWara === "Uma") ||
      (c.saptaWara === "Anggara" && c.astaWara === "Ludra") ||
      (c.saptaWara === "Buda" && c.astaWara === "Brahma") ||
      (c.saptaWara === "Wraspati" && c.astaWara === "Guru") ||
      (c.saptaWara === "Sukra" && c.astaWara === "Sri") ||
      (c.saptaWara === "Saniscara" && c.astaWara === "Yama")
  },
  {
    name: "Panca Prawani",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya"],
    desc: "Tidak baik dipakai sebagai dewasa ayu.",
    match: (c) => [4, 8, 14].includes(c.sasihDay)
  },
  {
    name: "Purwani",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya"],
    desc: "Tidak baik dipakai dewasa ayu (menjelang Purnama/Tilem).",
    match: (c) => c.sasihDay === 14
  },
  {
    name: "Purwanin Dina",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya"],
    desc: "Tidak baik sebagai dewasa ayu utama.",
    match: (c) =>
      (c.saptaWara === "Soma" && c.pancaWara === "Wage") ||
      (c.saptaWara === "Anggara" && c.pancaWara === "Kliwon") ||
      (c.saptaWara === "Buda" && c.pancaWara === "Kliwon") ||
      (c.saptaWara === "Sukra" && c.pancaWara === "Wage") ||
      (c.saptaWara === "Saniscara" && c.pancaWara === "Kliwon")
  },
  {
    name: "Rangda Tiga",
    sifat: "Ala",
    tags: ["pawiwahan"],
    desc: "Wuku/masa yang tidak baik untuk melangsungkan upacara Pawiwahan (pernikahan).",
    match: (c) => ["Wariga", "Warigadean", "Pujut", "Pahang", "Menail", "Prangbakat"].includes(c.wuku)
  },
  {
    name: "Salah Wadi",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya"],
    desc: "Tidak baik untuk Manusa Yadnya (wiwaha, mepandes, potong rambut) dan Pitra Yadnya (Ngaben, Nyekah).",
    match: (c) =>
      ["Sinta", "Landep", "Gumbreg", "Sungsang", "Dungulan", "Pahang", "Tambir", "Medangkungan", "Prangbakat", "Bala", "Wayang", "Watugunung"].includes(c.wuku) &&
      c.sangaWara === "Urungan"
  },
  {
    name: "Uncal Balung",
    sifat: "Ala",
    tags: ["pawiwahan", "yadnya", "bangunan", "usaha", "belanja", "perjalanan"],
    desc: "Masa 35 hari (Buda Kliwon Dungulan s.d. Buda Kliwon Pahang); tidak baik melakukan pekerjaan/karya penting.",
    match: (c) => c.pawukon >= 73 && c.pawukon <= 108
  },
  {
    name: "Asuasa",
    sifat: "Ala",
    tags: ["belanja", "usaha", "pawiwahan", "yadnya"],
    desc: "Mengandung sifat boros; tidak baik untuk berbelanja, membeli barang/aset, maupun dewasa ayu utama.",
    match: (c) =>
      (c.saptaWara === "Redite" && ["Ukir", "Pujut"].includes(c.wuku)) ||
      (c.saptaWara === "Soma" && c.wuku === "Medangsia") ||
      (c.saptaWara === "Anggara" && c.wuku === "Wariga") ||
      (c.saptaWara === "Buda" && c.wuku === "Prangbakat") ||
      (c.saptaWara === "Wraspati" && c.wuku === "Dungulan") ||
      (c.saptaWara === "Sukra" && c.wuku === "Kulawu")
  },
  {
    name: "Catur Laba",
    sifat: "Ayu",
    tags: ["belanja", "usaha", "perjalanan", "yadnya"],
    desc: "Baik untuk bepergian (khususnya ke arah utara), transaksi/membeli barang, Manusa Yadnya, dan Pitra Yadnya.",
    match: (c) =>
      (c.saptaWara === "Redite" && c.pancaWara === "Umanis") ||
      (c.saptaWara === "Soma" && c.pancaWara === "Wage") ||
      (c.saptaWara === "Buda" && c.pancaWara === "Pon") ||
      (c.saptaWara === "Saniscara" && c.pancaWara === "Paing")
  },
  {
    name: "Amerta Dadi",
    sifat: "Ayu",
    tags: ["yadnya", "usaha", "belanja"],
    desc: "Baik untuk upacara Dewa Yadnya, pemujaan leluhur, dan mengawali kegiatan atau pembelian yang bermanfaat.",
    match: (c) => (c.saptaWara === "Soma" && c.triWara === "Beteng") || (c.isPurnama && c.triWara === "Kajeng")
  },
  {
    name: "Amerta Danta",
    sifat: "Ayu",
    tags: ["belanja", "usaha", "yadnya", "perjalanan"],
    desc: "Baik untuk penyucian diri, memulai pekerjaan penting, perjalanan, dan transaksi barang.",
    match: (c) =>
      c.phaseName === "Penanggal" && (
        (c.saptaWara === "Redite" && c.sasihDay === 6) ||
        (c.saptaWara === "Soma" && c.sasihDay === 5) ||
        (c.saptaWara === "Anggara" && c.sasihDay === 4) ||
        (c.saptaWara === "Buda" && c.sasihDay === 3) ||
        (c.saptaWara === "Wraspati" && c.sasihDay === 2) ||
        (c.saptaWara === "Sukra" && c.sasihDay === 1) ||
        (c.saptaWara === "Saniscara" && c.sasihDay === 7)
      )
  },
  {
    name: "Jiwa Menganti",
    sifat: "Ayu",
    tags: ["belanja", "usaha", "pertanian"],
    desc: "Baik untuk memulai usaha, membeli peralatan kerja/barang berguna, dan bercocok tanam.",
    match: (c) =>
      (c.saptaWara === "Soma" && c.wuku === "Tambir") ||
      (c.saptaWara === "Wraspati" && ["Landep", "Medangkungan"].includes(c.wuku)) ||
      (c.saptaWara === "Sukra" && ["Wariga", "Bala"].includes(c.wuku)) ||
      (c.saptaWara === "Saniscara" && c.wuku === "Watugunung")
  },
  {
    name: "Derman Bagia",
    sifat: "Ayu",
    tags: ["pawiwahan", "bangunan", "perjalanan", "melukat"],
    desc: "Baik untuk Pawiwahan, membangun, mulai belajar/berlatih, dan perjalanan.",
    match: (c) => c.saptaWara === "Soma" && c.phaseName === "Penanggal" && [2, 3, 5, 12].includes(c.sasihDay)
  },
  {
    name: "Buda Suka",
    sifat: "Ayu",
    tags: ["belanja", "usaha", "perjalanan"],
    desc: "Baik untuk segala pekerjaan, transaksi, dan memulai aktivitas baru.",
    match: (c) => c.saptaWara === "Buda" && c.pancaWara === "Kliwon" && c.isTilem
  },
  {
    name: "Sanga Wara Tulus / Dadi",
    sifat: "Ayu",
    tags: ["belanja", "perjalanan"],
    desc: "Dalam prinsip Wariga Bali (Sanga Wara Tulus/Dadi), baik dipakai untuk membeli barang/elektronik/kendaraan atau memulai kegiatan selama tidak terhalang hari Ala (seperti Asuasa/Uncal Balung).",
    match: (c) => (c.sangaWara === "Tulus" || c.sangaWara === "Dadi") && ["Soma", "Buda", "Wraspati", "Sukra", "Saniscara"].includes(c.saptaWara)
  }
];

export function evaluateAlaAyuningDewasa(calInfo) {
  const matched = RULES.filter((r) => r.match(calInfo)).map((r) => ({
    name: r.name,
    sifat: r.sifat,
    tags: r.tags,
    desc: r.desc
  }));
  const ayu = matched.filter((m) => m.sifat === "Ayu");
  const ala = matched.filter((m) => m.sifat === "Ala");
  return { ayu, ala, all: matched };
}

export function findGoodDaysInMonth(monthDays, categoryTag) {
  return monthDays
    .map((d) => {
      const res = evaluateAlaAyuningDewasa(d);
      const matchingAyu = res.ayu.filter((a) => a.tags.includes(categoryTag));
      const blockingAla = res.ala.filter((a) => a.tags.includes(categoryTag));
      return {
        dayInfo: d,
        matchingAyu,
        blockingAla,
        score: matchingAyu.length - blockingAla.length * 2
      };
    })
    .filter((x) => x.matchingAyu.length > 0 && x.blockingAla.length === 0)
    .sort((a, b) => b.matchingAyu.length - a.matchingAyu.length);
}
