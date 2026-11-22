// ============================================================================
// Piteket — Engine Kalender Bali (Pawukon, Wewaran, Saka & Pangalantaka)
// 100% Offline, Deterministik, Zero External CDN Dependency
// ============================================================================
// Kalibrasi Sistem Pangalantaka Eka Sungsang ke Paing (mulai berlaku 2000 M):
// - Pivot Pawukon : 2026-11-21 = Saniscara Paing Ukir (Pawukon idx 20, Ingkel Buku)
// - Pivot Saka    : 2026-11-09 = Tilem Sasih Kalima (Pangelong 15, Saka 1948)
//                   2026-11-21 = Penanggal 12 Sasih Kanem (Saka 1948)
//                   2026-03-19 = Nyepi / Penanggal 1 Sasih Kadasa (Saka 1948)
//                   2027-03-08 = Nyepi / Penanggal 1 Sasih Kadasa (Saka 1949)
// ============================================================================

export const SAPTA_WARA = [
  { name: "Redite", short: "Red", urip: 5 },
  { name: "Soma", short: "Som", urip: 4 },
  { name: "Anggara", short: "Ang", urip: 3 },
  { name: "Buda", short: "Bud", urip: 7 },
  { name: "Wraspati", short: "Wra", urip: 8 },
  { name: "Sukra", short: "Suk", urip: 6 },
  { name: "Saniscara", short: "San", urip: 9 }
];

export const PANCA_WARA = [
  { name: "Umanis", short: "Um", urip: 5 },
  { name: "Paing", short: "Pa", urip: 9 },
  { name: "Pon", short: "Po", urip: 7 },
  { name: "Wage", short: "Wa", urip: 4 },
  { name: "Kliwon", short: "Kl", urip: 8 }
];

export const TRI_WARA = ["Pasah", "Beteng", "Kajeng"];
export const SAD_WARA = ["Tungleh", "Aryang", "Urukung", "Paniron", "Was", "Maulu"];

export const WUKU = [
  "Sinta", "Landep", "Ukir", "Kulantir", "Tolu",
  "Gumbreg", "Wariga", "Warigadean", "Julungwangi", "Sungsang",
  "Dungulan", "Kuningan", "Langkir", "Medangsia", "Pujut",
  "Pahang", "Krulut", "Merakih", "Tambir", "Medangkungan",
  "Matal", "Uye", "Menail", "Prangbakat", "Bala",
  "Ugu", "Wayang", "Klawu", "Dukut", "Watugunung"
];

export const INGKEL = [
  { name: "Wong", catatan: "Kurang baik untuk upacara terkait manusia/pawiwahan bila berbenturan dengan ala dewasa tertentu." },
  { name: "Sato", catatan: "Kurang baik untuk memelihara/berburu hewan berkaki empat atau membuat kandang." },
  { name: "Mina", catatan: "Kurang baik untuk menangkap ikan atau memulai tambak/kolam." },
  { name: "Manuk", catatan: "Kurang baik untuk memelihara unggas atau membuat sangkar burung." },
  { name: "Taru", catatan: "Kurang baik untuk menebang kayu bangunan atau menanam pohon besar." },
  { name: "Buku", catatan: "Kurang baik untuk menebang bambu/tanaman beruas atau memulai rangka bambu." }
];

export const SASIH_NAMES = [
  "Kasa", "Karo", "Katiga", "Kapat", "Kalima", "Kanem",
  "Kapitu", "Kawolu", "Kasanga", "Kadasa", "Jyestha", "Sadha"
];

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const TUMPEK_NAMES = {
  Landep: "Tumpek Landep",
  Wariga: "Tumpek Wariga (Uduh / Bubuh)",
  Kuningan: "Hari Raya Kuningan",
  Krulut: "Tumpek Krulut",
  Uye: "Tumpek Uye (Kandang)",
  Wayang: "Tumpek Wayang"
};

// Anchor Pawukon: 2026-11-21 = Saniscara (6) Paing (1) Ukir (wuku 2 -> pawukon 20)
const ANCHOR_PAWUKON_UTC = Date.UTC(2026, 10, 21);
const ANCHOR_PAWUKON_IDX = 20;

// Anchor Saka (Sistem Pangalantaka Eka Sungsang ke Paing — standar Bali modern):
// 2000-01-06 = Tilem Kapitu (Saka 1921), hari 1 dari siklus Ngunalatri 63 hari
// Untuk presisi tinggi lintas dekade (1950–2060), gunakan pivot 2026-11-09 = Tilem Kalima (Saka 1948)
// dengan siklus Pangalantaka 63 hari (1 bulan Saka = 30 tithi; tiap 63 hari maju 1 tithi / ngunalatri).
// Mari kita kalibrasi exact ngunalatri offset terhadap 2026-03-19 (Nyepi 1948) & 2027-03-08 (Nyepi 1949)!
const SAKA_ANCHOR_UTC = Date.UTC(2026, 10, 9); // 2026-11-09 = Tilem Kalima (akhir Sasih Kalima, Saka 1948)
const SAKA_ANCHOR_YEAR = 1948;
const SAKA_ANCHOR_SASIH_IDX = 4; // 0=Kasa .. 4=Kalima, 5=Kanem .. 9=Kadasa
// Total tithi sejak Tilem Kalima 1948 = 0 pada 2026-11-09.
// Pada 2026-11-10: tithi = 1 -> Penanggal 1 Sasih Kanem
// Pada 2026-11-21 (+12 hari): tithi = 12 -> Penanggal 12 Sasih Kanem
// Pada 2026-11-24 (+15 hari): tithi = 15 -> Purnama Sasih Kanem
// Pada 2027-03-08 (+119 hari dari 2026-11-09):
// 119 hari + floor((119 + offset) / 63) harus menghasilkan 121 tithi (= 4 sasih * 30 + 1 -> Penanggal 1 Sasih Kadasa Saka 1949!)
// Cek: 119 + 2 = 121 -> jika offset = 7, (119 + 7) = 126, floor(126 / 63) = 2!
// Cek mundur ke 2026-03-19 (-235 hari dari 2026-11-09):
// (-235 + 7) = -228 -> floor(-228 / 63) = -4 -> -235 + (-4) = -239 tithi!
// Dari akhir Sasih Kalima (tithi 0) mundur 239 tithi = -239 = -8*30 + 1 -> Penanggal 1 dari (4 - 7 = -3 -> 9 = Kadasa) Saka 1948!
// TEPAT 100% pada 2026-03-19 (Nyepi 1948), 2026-11-09 (Tilem Kalima), 2026-11-21 (Penanggal 12 Kanem), 2026-11-24 (Purnama Kanem), dan 2027-03-08 (Nyepi 1949)!
const NGUNALATRI_OFFSET = 7;

// Tahun Saka dengan Nampih Sasih (siklus 19 tahun Metonik Bali: sisa bagi 19 = 0, 3, 6, 8, 11, 14, 16)
// (Di Bali modern setelah 1993: Nampih Desta pada tahun-tahun tertentu; jika bukan tahun nampih = 12 sasih)
const NAMPIH_REMAINDERS = new Set([0, 3, 6, 8, 11, 14, 16]);

function mod(n, m) {
  return ((n % m) + m) % m;
}

function toUtcNoon(dateInput) {
  if (typeof dateInput === "number") return dateInput;
  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }
  return Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
}

export function formatIsoDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatIndoDate(dateInput) {
  const utc = toUtcNoon(dateInput);
  const d = new Date(utc);
  return `${HARI_ID[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function isNampihYear(sakaYear) {
  return NAMPIH_REMAINDERS.has(mod(sakaYear, 19));
}

function getSakaMonthSequence(sakaYear) {
  // Urutan sasih dalam 1 tahun Saka dimulai dari Kadasa (idx 9) -> Jyestha (10) -> Sadha (11) -> Kasa (0) .. Kasanga (8)
  // Jika tahun Nampih, disisipkan Nampih Desta setelah Jyestha (sesuai ketetapan PHDI/Eka Sungsang ke Paing)
  const seq = [
    { idx: 9, name: "Kadasa", isNampih: false },
    { idx: 10, name: "Jyestha", isNampih: false }
  ];
  if (isNampihYear(sakaYear)) {
    seq.push({ idx: 10, name: "Nampih Jyestha", isNampih: true });
  }
  seq.push(
    { idx: 11, name: "Sadha", isNampih: false },
    { idx: 0, name: "Kasa", isNampih: false },
    { idx: 1, name: "Karo", isNampih: false },
    { idx: 2, name: "Katiga", isNampih: false },
    { idx: 3, name: "Kapat", isNampih: false },
    { idx: 4, name: "Kalima", isNampih: false },
    { idx: 5, name: "Kanem", isNampih: false },
    { idx: 6, name: "Kapitu", isNampih: false },
    { idx: 7, name: "Kawolu", isNampih: false },
    { idx: 8, name: "Kasanga", isNampih: false }
  );
  return seq;
}

function computeSakaInfo(targetUtc) {
  const diffDays = Math.round((targetUtc - SAKA_ANCHOR_UTC) / 86400000);
  const ngunalatriCount = Math.floor((diffDays + NGUNALATRI_OFFSET) / 63);
  const prevNgunalatriCount = Math.floor((diffDays - 1 + NGUNALATRI_OFFSET) / 63);
  const nextNgunalatriCount = Math.floor((diffDays + 1 + NGUNALATRI_OFFSET) / 63);
  const isNgunalatri = ngunalatriCount > prevNgunalatriCount;
  const nextIsNgunalatri = nextNgunalatriCount > ngunalatriCount;

  // Total tithi relatif terhadap akhir Sasih Kalima 1948 (tithi = 0 -> Tilem Kalima 1948)
  const totalTithi = diffDays + ngunalatriCount;

  // Bulan keberapa relatif terhadap Sasih Kalima 1948 (monthOffset = 0 berarti Sasih Kalima, 1 = Kanem, dst.)
  // Karena tithi 0 = hari ke-30 Sasih Kalima, tithi 1..30 = Sasih Kanem (+1), tithi -29..0 = Sasih Kalima (0)
  const monthOffset = Math.ceil(totalTithi / 30);
  const tithiInMonth = mod(totalTithi - 1, 30) + 1; // 1..30 (1..15 = Penanggal, 16..30 = Pangelong)

  // Cari tahun Saka dan nama Sasih dari monthOffset relatif terhadap posisi Kalima di Saka 1948
  let sakaYear = SAKA_ANCHOR_YEAR;
  let seq = getSakaMonthSequence(sakaYear);
  let pos = seq.findIndex((m) => m.idx === SAKA_ANCHOR_SASIH_IDX && !m.isNampih);

  let steps = monthOffset;
  if (steps > 0) {
    while (steps > 0) {
      pos += 1;
      if (pos >= seq.length) {
        sakaYear += 1;
        seq = getSakaMonthSequence(sakaYear);
        pos = 0;
      }
      steps -= 1;
    }
  } else if (steps < 0) {
    while (steps < 0) {
      pos -= 1;
      if (pos < 0) {
        sakaYear -= 1;
        seq = getSakaMonthSequence(sakaYear);
        pos = seq.length - 1;
      }
      steps += 1;
    }
  }

  const sasihObj = seq[pos];
  const isPenanggal = tithiInMonth <= 15;
  const sasihDay = isPenanggal ? tithiInMonth : tithiInMonth - 15;
  const phaseName = isPenanggal ? "Penanggal" : "Pangelong";

  // Cek Purnama (tithi 15) & Tilem (tithi 30)
  // Bila besok Ngunalatri melompati tithi 15 atau 30, Purnama/Tilem jatuh pada hari ini (tithi 14/29) sesuai dresta Pangalantaka
  const isPurnama = tithiInMonth === 15 || (tithiInMonth === 14 && nextIsNgunalatri);
  const isTilem = tithiInMonth === 30 || (tithiInMonth === 29 && nextIsNgunalatri);

  return {
    sakaYear,
    sasihName: sasihObj.name,
    sasihIdx: sasihObj.idx,
    isNampih: sasihObj.isNampih,
    phaseName,
    sasihDay,
    tithiInMonth,
    isPurnama,
    isTilem,
    isNgunalatri
  };
}

export function getBalineseCalendarInfo(dateInput = new Date()) {
  const targetUtc = toUtcNoon(dateInput);
  const d = new Date(targetUtc);

  const diffPawukon = Math.round((targetUtc - ANCHOR_PAWUKON_UTC) / 86400000);
  const pawukon = mod(ANCHOR_PAWUKON_IDX + diffPawukon, 210);

  const saptaIdx = d.getUTCDay(); // 0=Redite..6=Saniscara
  const pancaIdx = mod(1 + pawukon, 5); // pawukon 0 (Redite Sinta) = Paing (1)
  const triIdx = mod(pawukon, 3);
  const sadIdx = mod(pawukon, 6);
  const wukuIdx = Math.floor(pawukon / 7);
  const ingkelObj = INGKEL[mod(wukuIdx, 6)];

  const sapta = SAPTA_WARA[saptaIdx];
  const panca = PANCA_WARA[pancaIdx];
  const tri = TRI_WARA[triIdx];
  const sad = SAD_WARA[sadIdx];
  const wuku = WUKU[wukuIdx];
  const urip = sapta.urip + panca.urip;

  const sakaInfo = computeSakaInfo(targetUtc);

  // Deteksi Rahinan & Hari Raya Lengkap
  const rahinan = [];
  const rahinanMajor = [];

  if (sakaInfo.isPurnama) {
    rahinan.push(`Purnama ${sakaInfo.sasihName}`);
  }
  if (sakaInfo.isTilem) {
    rahinan.push(`Tilem ${sakaInfo.sasihName}`);
  }
  if (tri === "Kajeng" && panca.name === "Kliwon") {
    rahinan.push("Kajeng Kliwon");
  }
  if (sapta.name === "Anggara" && panca.name === "Kliwon") {
    rahinan.push(`Anggara Kasih ${wuku}`);
  }
  if (sapta.name === "Buda" && panca.name === "Kliwon") {
    if (wuku === "Sinta") {
      rahinan.push("Hari Raya Pagerwesi");
      rahinanMajor.push("Hari Raya Pagerwesi");
    } else if (wuku === "Dungulan") {
      rahinan.push("Hari Raya Galungan");
      rahinanMajor.push("Hari Raya Galungan");
    } else {
      rahinan.push(`Buda Kliwon ${wuku}`);
    }
  }
  if (sapta.name === "Buda" && panca.name === "Wage") {
    rahinan.push(`Buda Cemeng ${wuku}`);
  }
  if (sapta.name === "Saniscara" && panca.name === "Kliwon") {
    const tumpekLabel = TUMPEK_NAMES[wuku] || `Tumpek ${wuku}`;
    rahinan.push(tumpekLabel);
    if (wuku === "Kuningan") rahinanMajor.push("Hari Raya Kuningan");
  }
  if (wuku === "Watugunung" && sapta.name === "Saniscara" && panca.name === "Umanis") {
    rahinan.push("Hari Raya Saraswati");
    rahinanMajor.push("Hari Raya Saraswati");
  }
  if (wuku === "Sinta" && sapta.name === "Redite" && panca.name === "Paing") {
    rahinan.push("Banyu Pinaruh");
  }
  if (wuku === "Sinta" && sapta.name === "Soma" && panca.name === "Pon") {
    rahinan.push("Soma Ribek");
  }
  if (wuku === "Sinta" && sapta.name === "Anggara" && panca.name === "Wage") {
    rahinan.push("Sabuh Mas");
  }
  if (wuku === "Dungulan" && sapta.name === "Anggara" && panca.name === "Wage") {
    rahinan.push("Penampahan Galungan");
  }
  if (wuku === "Dungulan" && sapta.name === "Wraspati" && panca.name === "Umanis") {
    rahinan.push("Umanis Galungan");
  }

  // Hari Suci Berbasis Sasih (Saka)
  if (!sakaInfo.isNampih && sakaInfo.sasihIdx === 6 && sakaInfo.phaseName === "Pangelong" && sakaInfo.sasihDay === 14) {
    rahinan.push("Hari Suci Siwaratri");
    rahinanMajor.push("Hari Suci Siwaratri");
  }
  if (!sakaInfo.isNampih && sakaInfo.sasihIdx === 8 && sakaInfo.isTilem) {
    rahinan.push("Pengerupukan (Tawur Kesanga)");
    rahinanMajor.push("Pengerupukan");
  }
  if (!sakaInfo.isNampih && sakaInfo.sasihIdx === 9 && sakaInfo.phaseName === "Penanggal" && sakaInfo.sasihDay === 1) {
    rahinan.push(`Hari Raya Nyepi (Saka ${sakaInfo.sakaYear})`);
    rahinanMajor.push("Hari Raya Nyepi");
  }
  if (!sakaInfo.isNampih && sakaInfo.sasihIdx === 9 && sakaInfo.phaseName === "Penanggal" && sakaInfo.sasihDay === 2) {
    rahinan.push("Ngembak Geni");
  }

  // Pratinjau Wariga / Indikator Awal Dewasa Ayu (edukatif, bukan pengganti Sulinggih)
  const dewasaHints = [];
  if (sakaInfo.isPurnama) {
    dewasaHints.push({ sifat: "Ayu", label: "Purnama — Baik untuk Dewa Yadnya, persembahyangan, & penyucian diri." });
  }
  if (sakaInfo.isTilem) {
    dewasaHints.push({ sifat: "Peringatan", label: "Tilem — Baik untuk pembersihan/pebersihan & kontemplasi; hindari memulai upacara sukacita tanpa arahan Wariga." });
  }
  if (tri === "Kajeng" && panca.name === "Kliwon") {
    dewasaHints.push({ sifat: "Peringatan", label: "Kajeng Kliwon — Utamakan menghaturkan segehan & penyelarasan Bhuta Yadnya." });
  }
  if (sapta.name === "Wraspati" && panca.name === "Umanis") {
    dewasaHints.push({ sifat: "Ayu", label: "Wraspati Umanis — Umumnya dipandang baik untuk belajar, memulai usaha, atau pertemuan keluarga." });
  }
  if (wuku === "Wayang") {
    dewasaHints.push({ sifat: "Peringatan", label: "Wuku Wayang — Kelahiran pada Wuku ini biasanya perlu konsultasi tetua soal melukat Sapuh Leger." });
  }
  dewasaHints.push({ sifat: "Info", label: `Ingkel ${ingkelObj.name}: ${ingkelObj.catatan}` });

  return {
    isoDate: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    indoDate: formatIndoDate(targetUtc),
    source: "Engine Saka & Pawukon Offline (100% Lokal)",
    pawukon,
    saptaWara: sapta.name,
    saptaShort: sapta.short,
    pancaWara: panca.name,
    pancaShort: panca.short,
    triWara: tri,
    sadWara: sad,
    wuku,
    wukuIdx,
    urip,
    ingkel: ingkelObj.name,
    ingkelNote: ingkelObj.catatan,
    sasih: `Sasih ${sakaInfo.sasihName}`,
    sasihRaw: sakaInfo.sasihName,
    saka: `Saka ${sakaInfo.sakaYear}`,
    sakaYear: sakaInfo.sakaYear,
    penanggal: `${sakaInfo.phaseName} ${sakaInfo.sasihDay}`,
    isPurnama: sakaInfo.isPurnama,
    isTilem: sakaInfo.isTilem,
    rahinan,
    rahinanMajor,
    dewasaHints
  };
}

export function getMonthCalendar(year, monthIndex) {
  // monthIndex: 0..11
  const firstDayUtc = Date.UTC(year, monthIndex, 1);
  const firstDow = new Date(firstDayUtc).getUTCDay(); // 0=Minggu/Redite
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const info = getBalineseCalendarInfo(new Date(Date.UTC(year, monthIndex, day)));
    days.push({ day, ...info });
  }

  return {
    year,
    monthIndex,
    monthName: BULAN_ID[monthIndex],
    firstDow,
    daysInMonth,
    days
  };
}

export function getUpcomingRahinan(fromDateInput = new Date(), daysAhead = 180, filterType = "ALL") {
  const startUtc = toUtcNoon(fromDateInput);
  const results = [];

  for (let offset = 0; offset <= daysAhead; offset++) {
    const utc = startUtc + offset * 86400000;
    const info = getBalineseCalendarInfo(new Date(utc));
    if (!info.rahinan.length) continue;

    for (const rName of info.rahinan) {
      const isMajor =
        rName.includes("Galungan") ||
        rName.includes("Kuningan") ||
        rName.includes("Nyepi") ||
        rName.includes("Saraswati") ||
        rName.includes("Pagerwesi") ||
        rName.includes("Siwaratri") ||
        rName.includes("Tumpek");
      const isLunar = rName.startsWith("Purnama") || rName.startsWith("Tilem");

      if (filterType === "MAJOR" && !isMajor) continue;
      if (filterType === "LUNAR" && !isLunar) continue;

      results.push({
        name: rName,
        isMajor,
        isLunar,
        daysUntil: offset,
        isoDate: info.isoDate,
        indoDate: info.indoDate,
        wewaran: `${info.saptaWara} ${info.pancaWara} ${info.wuku}`
      });
    }
  }
  return results;
}

export function calculateOtonan(birthDateStr, fromDateInput = new Date(), count = 3) {
  const birthUtc = toUtcNoon(birthDateStr);
  const birthInfo = getBalineseCalendarInfo(new Date(birthUtc));
  const todayUtc = toUtcNoon(fromDateInput);

  const diffFromBirth = Math.round((todayUtc - birthUtc) / 86400000);
  const nextCycleIdx = diffFromBirth <= 0 ? 1 : Math.ceil(diffFromBirth / 210);

  const upcoming = [];
  for (let i = 0; i < count; i++) {
    const cycleNum = nextCycleIdx + i;
    const otonUtc = birthUtc + cycleNum * 210 * 86400000;
    const daysUntil = Math.round((otonUtc - todayUtc) / 86400000);
    const otonInfo = getBalineseCalendarInfo(new Date(otonUtc));
    upcoming.push({
      otonKe: cycleNum,
      isoDate: otonInfo.isoDate,
      indoDate: otonInfo.indoDate,
      daysUntil,
      sasih: otonInfo.sasih,
      penanggal: otonInfo.penanggal
    });
  }

  return {
    birthIso: birthInfo.isoDate,
    birthIndo: birthInfo.indoDate,
    wewaran: `${birthInfo.saptaWara} ${birthInfo.pancaWara}`,
    triWara: birthInfo.triWara,
    wuku: birthInfo.wuku,
    urip: birthInfo.urip,
    ingkel: birthInfo.ingkel,
    isWukuWayang: birthInfo.wuku === "Wayang",
    upcoming
  };
}
