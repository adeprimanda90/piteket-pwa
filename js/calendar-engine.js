// Wrapper Kalender Bali: menggunakan balinese-date-js-lib (unpkg) saat tersedia,
// dengan fallback Pawukon/Wewaran deterministik terkalibrasi (2026-11-21 = Saniscara Paing Ukir, Ingkel Buku)
// agar kalender tetap berjalan 100% offline.

const SAPTA_WARA = [
  { name: "Redite", urip: 5 },
  { name: "Soma", urip: 4 },
  { name: "Anggara", urip: 3 },
  { name: "Buda", urip: 7 },
  { name: "Wraspati", urip: 8 },
  { name: "Sukra", urip: 6 },
  { name: "Saniscara", urip: 9 }
];

const PANCA_WARA = [
  { name: "Umanis", urip: 5 },
  { name: "Paing", urip: 9 },
  { name: "Pon", urip: 7 },
  { name: "Wage", urip: 4 },
  { name: "Kliwon", urip: 8 }
];

const TRI_WARA = ["Pasah", "Beteng", "Kajeng"];

const WUKU = [
  "Sinta", "Landep", "Ukir", "Kulantir", "Tolu",
  "Gumbreg", "Wariga", "Warigadean", "Julungwangi", "Sungsang",
  "Dungulan", "Kuningan", "Langkir", "Medangsia", "Pujut",
  "Pahang", "Krulut", "Merakih", "Tambir", "Medangkungan",
  "Matal", "Uye", "Menail", "Prangbakat", "Bala",
  "Ugu", "Wayang", "Klawu", "Dukut", "Watugunung"
];

const INGKEL = ["Wong", "Sato", "Mina", "Manuk", "Taru", "Buku"];

// Anchor: 2026-11-21 is Pawukon day index 20 (Wuku Ukir [idx 2], Saniscara [idx 6]) -> 2*7 + 6 = 20
// Panca Wara on 2026-11-21 = Paing (idx 1)
// Tri Wara on 2026-11-21: (20 % 3) = 2 -> Kajeng? Wait: Pasah(0), Beteng(1), Kajeng(2) -> 20 % 3 = 2 (Kajeng)
const ANCHOR_UTC = Date.UTC(2026, 10, 21); // Nov 21, 2026
const ANCHOR_PAWUKON = 20; // 0..209 (0 = Redite Paing Sinta)

function mod(n, m) {
  return ((n % m) + m) % m;
}

function computeOfflineFallback(dateObj) {
  const targetUtc = Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const diffDays = Math.round((targetUtc - ANCHOR_UTC) / 86400000);
  const pawukon = mod(ANCHOR_PAWUKON + diffDays, 210);

  const saptaIdx = mod(dateObj.getDay(), 7);
  // On pawukon 0 (Redite Sinta), Panca Wara is Paing (idx 1)
  const pancaIdx = mod(1 + pawukon, 5);
  const triIdx = mod(pawukon, 3);
  const wukuIdx = Math.floor(pawukon / 7);
  const ingkelIdx = mod(wukuIdx, 6);

  const sapta = SAPTA_WARA[saptaIdx];
  const panca = PANCA_WARA[pancaIdx];
  const tri = TRI_WARA[triIdx];
  const wuku = WUKU[wukuIdx];
  const ingkel = INGKEL[ingkelIdx];

  const rahinan = [];
  if (tri === "Kajeng" && panca.name === "Kliwon") rahinan.push("Kajeng Kliwon");
  if (sapta.name === "Anggara" && panca.name === "Kliwon") rahinan.push("Anggara Kasih");
  if (sapta.name === "Buda" && panca.name === "Kliwon") rahinan.push("Buda Kliwon");
  if (sapta.name === "Buda" && panca.name === "Wage") rahinan.push("Buda Cemeng");
  if (sapta.name === "Saniscara" && panca.name === "Kliwon") rahinan.push("Tumpek (" + wuku + ")");
  if (wuku === "Dungulan" && sapta.name === "Buda" && panca.name === "Kliwon") rahinan.push("Hari Raya Galungan");
  if (wuku === "Kuningan" && sapta.name === "Saniscara" && panca.name === "Kliwon") rahinan.push("Hari Raya Kuningan");
  if (wuku === "Watugunung" && sapta.name === "Saniscara" && panca.name === "Umanis") rahinan.push("Hari Raya Saraswati");

  return {
    source: "Mode Offline (Pawukon Engine)",
    saptaWara: sapta.name,
    pancaWara: panca.name,
    triWara: tri,
    wuku,
    urip: sapta.urip + panca.urip,
    ingkel,
    sasih: "Buka online untuk Sasih & Saka otomatis",
    saka: "—",
    penanggal: "",
    rahinan,
    dewasa: []
  };
}

export function getBalineseCalendarInfo(dateObj = new Date()) {
  try {
    const BD = window.BalineseDate;
    if (BD && BD.BalineseDate) {
      const b = new BD.BalineseDate(dateObj);
      const rahinanList = BD.Rahinan && BD.Rahinan.getRahinan
        ? BD.Rahinan.getRahinan(b).map((r) => r.name || String(r))
        : [];
      const penanggalText = b.sasihDayInfo
        ? `${b.sasihDayInfo.name || ""} ${b.sasihDay || ""}`.trim()
        : "";
      return {
        source: "balinese-date-js-lib (Saka & Pawukon)",
        saptaWara: b.saptaWara ? b.saptaWara.name : "",
        pancaWara: b.pancaWara ? b.pancaWara.name : "",
        triWara: b.triWara ? b.triWara.name : "",
        wuku: b.wuku ? b.wuku.name : "",
        urip: (b.saptaWara?.urip || 0) + (b.pancaWara?.urip || 0),
        ingkel: b.ingkel ? b.ingkel.name : "",
        sasih: b.sasih ? `Sasih ${b.sasih.name}` : "",
        saka: b.saka ? `Saka ${b.saka}` : "",
        penanggal: penanggalText,
        rahinan: rahinanList,
        dewasa: Array.isArray(b.dewasa) ? b.dewasa.map((d) => d.name || String(d)) : []
      };
    }
  } catch (err) {
    console.warn("Fallback ke engine Pawukon offline:", err);
  }
  return computeOfflineFallback(dateObj);
}
