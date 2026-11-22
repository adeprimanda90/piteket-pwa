// ============================================================================
// Piteket — Engine Kalender Bali Lengkap (10 Wewaran, Wuku, Saka, Pangalantaka)
// 100% Offline, Deterministik, Zero External CDN Dependency
// Terverifikasi terhadap acuan Kalender Cetak I Ketut Bangbang Gde Rawi
// ============================================================================

export const SAPTA_WARA = [
  { name: "Redite", short: "Red", indo: "Min", urip: 5 },
  { name: "Soma", short: "Som", indo: "Sen", urip: 4 },
  { name: "Anggara", short: "Ang", indo: "Sel", urip: 3 },
  { name: "Buda", short: "Bud", indo: "Rab", urip: 7 },
  { name: "Wraspati", short: "Wra", indo: "Kam", urip: 8 },
  { name: "Sukra", short: "Suk", indo: "Jum", urip: 6 },
  { name: "Saniscara", short: "San", indo: "Sab", urip: 9 }
];

export const PANCA_WARA = [
  { name: "Umanis", short: "Um", urip: 5 },
  { name: "Paing", short: "Pa", urip: 9 },
  { name: "Pon", short: "Po", urip: 7 },
  { name: "Wage", short: "Wa", urip: 4 },
  { name: "Kliwon", short: "Kl", urip: 8 }
];

export const DWI_WARA = ["Menga", "Pepet"];
export const TRI_WARA = ["Pasah", "Beteng", "Kajeng"];
export const CATUR_WARA = ["Sri", "Laba", "Jaya", "Menala"];
export const SAD_WARA = ["Tungleh", "Aryang", "Urukung", "Paniron", "Was", "Maulu"];
export const ASTA_WARA = ["Sri", "Indra", "Guru", "Yama", "Ludra", "Brahma", "Kala", "Uma"];
export const SANGA_WARA = ["Dangu", "Jangur", "Gigis", "Nohan", "Ogan", "Erangan", "Urungan", "Tulus", "Dadi"];
export const DASA_WARA = ["Pandita", "Pati", "Suka", "Duka", "Sri", "Manuh", "Manusa", "Raja", "Dewa", "Raksasa"];
export const JEJEPAN = ["Mina", "Taru", "Sato", "Patra", "Wong", "Paksi"];

export const WUKU = [
  "Sinta", "Landep", "Ukir", "Kulantir", "Tolu",
  "Gumbreg", "Wariga", "Warigadean", "Julungwangi", "Sungsang",
  "Dungulan", "Kuningan", "Langkir", "Medangsia", "Pujut",
  "Pahang", "Krulut", "Merakih", "Tambir", "Medangkungan",
  "Matal", "Uye", "Menail", "Prangbakat", "Bala",
  "Ugu", "Wayang", "Klawu", "Dukut", "Watugunung"
];

export const WUKU_SHORT = [
  "Sint", "Land", "Ukir", "Kula", "Tolu",
  "Gumb", "Wari", "Wgd", "Julu", "Sung",
  "Dung", "Kuni", "Lang", "Meda", "Puju",
  "Paha", "Krul", "Mrak", "Tamb", "Medk",
  "Mata", "Uye", "Mena", "Pran", "Bala",
  "Ugu", "Waya", "Klaw", "Duku", "Watu"
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

// Pivot Pawukon: 2026-11-21 = Saniscara (6) Paing (1) Ukir (wuku 2 -> pawukon 20)
const ANCHOR_PAWUKON_UTC = Date.UTC(2026, 10, 21);
const ANCHOR_PAWUKON_IDX = 20;

// Pivot Saka (Sistem Pangalantaka Eka Sungsang ke Paing — standar Bali modern):
const SAKA_ANCHOR_UTC = Date.UTC(2026, 10, 9); // 2026-11-09 = Tilem Kalima, Saka 1948
const SAKA_ANCHOR_YEAR = 1948;
const SAKA_ANCHOR_SASIH_IDX = 4; // Kalima
const NGUNALATRI_OFFSET = 7;

// Tahun Saka dengan Nampih Sasih (siklus 19 tahun Metonik Bali)
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

  const totalTithi = diffDays + ngunalatriCount;
  const monthOffset = Math.ceil(totalTithi / 30);
  const tithiInMonth = mod(totalTithi - 1, 30) + 1;

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

  // 10 WEWARAN LENGKAP (Standar Kalender Cetak Bangbang Gde Rawi)
  const saptaIdx = d.getUTCDay();
  const pancaIdx = mod(1 + pawukon, 5);
  const sapta = SAPTA_WARA[saptaIdx];
  const panca = PANCA_WARA[pancaIdx];
  const urip = sapta.urip + panca.urip;

  const ekaWara = urip % 2 === 1 ? "Luang" : "—";
  const dwiWara = DWI_WARA[urip % 2];
  const triWara = TRI_WARA[mod(pawukon, 3)];

  // Catur Wara (Jaya Tiga pada pawukon 70, 71, 72 = Redite-Anggara Dungulan)
  let caturIdx;
  if (pawukon < 71) caturIdx = mod(pawukon, 4);
  else if (pawukon === 71 || pawukon === 72) caturIdx = 2; // Jaya
  else caturIdx = mod(pawukon - 2, 4);
  const caturWara = CATUR_WARA[caturIdx];

  const sadWara = SAD_WARA[mod(pawukon, 6)];

  // Asta Wara (Kala Tiga pada pawukon 70, 71, 72 = Redite-Anggara Dungulan)
  let astaIdx;
  if (pawukon < 71) astaIdx = mod(pawukon, 8);
  else if (pawukon === 71 || pawukon === 72) astaIdx = 6; // Kala
  else astaIdx = mod(pawukon - 2, 8);
  const astaWara = ASTA_WARA[astaIdx];

  // Sanga Wara (Dangu Pat pada pawukon 0, 1, 2, 3 = Redite-Buda Sinta)
  const sangaIdx = pawukon <= 3 ? 0 : mod(pawukon - 3, 9);
  const sangaWara = SANGA_WARA[sangaIdx];

  const dasaWara = DASA_WARA[mod(urip, 10)];

  const wukuIdx = Math.floor(pawukon / 7);
  const wuku = WUKU[wukuIdx];
  const wukuShort = WUKU_SHORT[wukuIdx];
  const ingkelObj = INGKEL[mod(wukuIdx, 6)];
  const jejepan = JEJEPAN[mod(pawukon, 6)];

  const sakaInfo = computeSakaInfo(targetUtc);

  // Deteksi Rahinan & Hari Raya Lengkap
  const rahinan = [];
  const rahinanMajor = [];

  if (sakaInfo.isPurnama) rahinan.push(`Purnama ${sakaInfo.sasihName}`);
  if (sakaInfo.isTilem) rahinan.push(`Tilem ${sakaInfo.sasihName}`);
  if (triWara === "Kajeng" && panca.name === "Kliwon") rahinan.push("Kajeng Kliwon");
  if (sapta.name === "Anggara" && panca.name === "Kliwon") rahinan.push(`Anggara Kasih ${wuku}`);

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
  if (sapta.name === "Buda" && panca.name === "Wage") rahinan.push(`Buda Cemeng ${wuku}`);
  if (sapta.name === "Saniscara" && panca.name === "Kliwon") {
    const tumpekLabel = TUMPEK_NAMES[wuku] || `Tumpek ${wuku}`;
    rahinan.push(tumpekLabel);
    if (wuku === "Kuningan") rahinanMajor.push("Hari Raya Kuningan");
  }
  if (wuku === "Watugunung" && sapta.name === "Saniscara" && panca.name === "Umanis") {
    rahinan.push("Hari Raya Saraswati");
    rahinanMajor.push("Hari Raya Saraswati");
  }
  if (wuku === "Sinta" && sapta.name === "Redite" && panca.name === "Paing") rahinan.push("Banyu Pinaruh");
  if (wuku === "Sinta" && sapta.name === "Soma" && panca.name === "Pon") rahinan.push("Soma Ribek");
  if (wuku === "Sinta" && sapta.name === "Anggara" && panca.name === "Wage") rahinan.push("Sabuh Mas");
  if (wuku === "Dungulan" && sapta.name === "Anggara" && panca.name === "Wage") rahinan.push("Penampahan Galungan");
  if (wuku === "Dungulan" && sapta.name === "Wraspati" && panca.name === "Umanis") rahinan.push("Umanis Galungan");

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

  return {
    isoDate: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    indoDate: formatIndoDate(targetUtc),
    dayOfWeek: saptaIdx,
    source: "Engine Wariga & Saka Offline (10 Wewaran)",
    pawukon,
    ekaWara,
    dwiWara,
    triWara,
    caturWara,
    pancaWara: panca.name,
    pancaShort: panca.short,
    sadWara,
    saptaWara: sapta.name,
    saptaShort: sapta.short,
    astaWara,
    sangaWara,
    dasaWara,
    wuku,
    wukuShort,
    wukuIdx,
    urip,
    ingkel: ingkelObj.name,
    ingkelNote: ingkelObj.catatan,
    jejepan,
    sasih: `Sasih ${sakaInfo.sasihName}`,
    sasihRaw: sakaInfo.sasihName,
    sasihIdx: sakaInfo.sasihIdx,
    saka: `Saka ${sakaInfo.sakaYear}`,
    sakaYear: sakaInfo.sakaYear,
    phaseName: sakaInfo.phaseName,
    sasihDay: sakaInfo.sasihDay,
    penanggal: `${sakaInfo.phaseName} ${sakaInfo.sasihDay}`,
    isPurnama: sakaInfo.isPurnama,
    isTilem: sakaInfo.isTilem,
    rahinan,
    rahinanMajor
  };
}

export function getMonthCalendar(year, monthIndex) {
  const firstDayUtc = Date.UTC(year, monthIndex, 1);
  const firstDow = new Date(firstDayUtc).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const info = getBalineseCalendarInfo(new Date(Date.UTC(year, monthIndex, day)));
    days.push({ day, ...info });
  }

  // Susun kolom minggu (Wuku) untuk Mode Klasik Cetak Bali (vertikal: baris = Redite..Saniscara, kolom = Wuku)
  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  let weekWuku = "";
  let weekWukuShort = "";

  days.forEach((d) => {
    if (d.dayOfWeek === 0 && currentWeek.some((x) => x !== null)) {
      weeks.push({ wuku: weekWuku, wukuShort: weekWukuShort, days: currentWeek });
      currentWeek = new Array(7).fill(null);
      weekWuku = "";
      weekWukuShort = "";
    }
    currentWeek[d.dayOfWeek] = d;
    if (!weekWuku) {
      weekWuku = d.wuku;
      weekWukuShort = d.wukuShort;
    }
  });
  if (currentWeek.some((x) => x !== null)) {
    weeks.push({ wuku: weekWuku, wukuShort: weekWukuShort, days: currentWeek });
  }

  return {
    year,
    monthIndex,
    monthName: BULAN_ID[monthIndex],
    firstDow,
    daysInMonth,
    days,
    weeks
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
