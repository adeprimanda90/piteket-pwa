// ============================================================================
// Piteket — Mesin Pencarian Pintar Lintas Data (100% Offline Intent + Sinonim)
// Memahami maksud pertanyaan sehari-hari & mengarahkan ke Kalender, Ceklis,
// Panduan Tri Kona, Catatan Dresta, Dewasa Ayu, maupun Glosarium Aksara Bali.
// ============================================================================

import { getUpcomingRahinan, getBalineseCalendarInfo } from './calendar-engine.js';
import { findGoodDaysInMonth } from './dewasa-engine.js';

const STOP_WORDS = new Set([
  'apa', 'apakah', 'bagaimana', 'gimana', 'cara', 'kapan', 'dimana', 'di', 'ke',
  'dari', 'yang', 'dan', 'atau', 'untuk', 'buat', 'bisa', 'boleh', 'bolehkah',
  'harus', 'saya', 'aku', 'kami', 'kita', 'anda', 'kalau', 'jika', 'bila',
  'pada', 'saat', 'ketika', 'itu', 'ini', 'ada', 'tidak', 'nggak', 'gak',
  'dengan', 'tentang', 'soal', 'nya', 'dong', 'ya', 'saja', 'aja', 'mau', 'ingin',
  'berapa', 'lama', 'syarat', 'aturan', 'bagus', 'baik', 'sebaiknya', 'hari'
]);

// Peta sinonim & konsep budaya Bali <-> Bahasa Indonesia sehari-hari
const CONCEPT_GROUPS = [
  ['bayi', 'lahir', 'kelahiran', 'baru lahir', 'ari-ari', 'plasenta', 'kepus', 'pungsed', 'puser', 'pusar', 'utpatti', 'gedong', 'magedong', 'hamil', 'kehamilan', 'kandungan', 'ibu hamil'],
  ['3 bulan', 'tiga bulan', 'nelubulanin', 'nyambutin', 'telubulan', '105 hari', 'bayi'],
  ['otonan', 'oton', 'ulang tahun', 'wetu', 'kelahiran bali', '210 hari', 'pawukon', 'wuku', 'wewaran'],
  ['potong gigi', 'metatah', 'mepandes', 'mesangih', 'remaja', 'dewasa', 'sad ripu'],
  ['nikah', 'menikah', 'kawin', 'perkawinan', 'pernikahan', 'pawiwahan', 'nganten', 'nyentana', 'sentana', 'pada gelahang', 'padagelahang', 'memadik', 'ngrorod'],
  ['meninggal', 'mati', 'kematian', 'wafat', 'seda', 'ngaben', 'atiwa', 'pelebon', 'kremasi', 'pembakaran', 'pitra yadnya', 'pralina', 'nyekah', 'memukur', 'maligia', 'ngroras', 'nyegara gunung', 'kubur', 'makingsan'],
  ['melayat', 'nglayat', 'takziah', 'duka', 'cuntaka', 'sebel', 'kotor', 'haid', 'menstruasi', 'datang bulan', 'ke pura', 'sembahyang', 'pantangan'],
  ['banten', 'canang', 'pejati', 'prayascita', 'caru', 'mecaru', 'sesajen', 'upakara', 'sarana', 'janur', 'busung'],
  ['rumah', 'bangun rumah', 'membangun', 'pindah rumah', 'melaspas', 'ngenteg linggih', 'asta kosala', 'kosali', 'pekarangan', 'merajan', 'sanggah', 'palinggih'],
  ['usaha', 'dagang', 'bisnis', 'toko', 'warung', 'kerja', 'karier', 'mulai usaha', 'rejeki', 'sedana'],
  ['galungan', 'kuningan', 'penampahan', 'penyajaan', 'penjor', 'manis galungan', 'dungulan'],
  ['nyepi', 'pengerupukan', 'ogoh', 'melasti', 'tawur', 'catur brata', 'ngembak geni', 'tahun baru saka', 'saka'],
  ['saraswati', 'banyu pinaruh', 'ilmu', 'buku', 'lontar', 'pelajar'],
  ['pagerwesi', 'siwa', 'buleleng'],
  ['purnama', 'tilem', 'bulan purnama', 'bulan mati', 'sasih'],
  ['tumpek', 'landep', 'uduh', 'pengarah', 'krulut', 'kandang', 'wayang', 'besi', 'kendaraan', 'motor', 'mobil', 'tanaman', 'hewan'],
  ['dewasa ayu', 'hari baik', 'wariga', 'ala ayuning', 'piodalan', 'odalan', 'rahinan'],
  ['aksara', 'tulisan bali', 'glosarium', 'istilah', 'arti kata', 'bahasa bali', 'kosa kata'],
  ['dresta', 'desa kala patra', 'adat', 'awig', 'denpasar', 'badung', 'karangasem', 'gianyar', 'tabanan', 'klungkung', 'bangli', 'buleleng', 'jembrana', 'perantauan', 'luar bali']
];

const RAHINAN_KEYWORDS = [
  { key: 'Galungan', patterns: ['galungan', 'penampahan', 'penyajaan'] },
  { key: 'Kuningan', patterns: ['kuningan'] },
  { key: 'Nyepi', patterns: ['nyepi', 'pengerupukan', 'tawur', 'tahun baru saka'] },
  { key: 'Saraswati', patterns: ['saraswati', 'banyu pinaruh'] },
  { key: 'Pagerwesi', patterns: ['pagerwesi'] },
  { key: 'Purnama', patterns: ['purnama'] },
  { key: 'Tilem', patterns: ['tilem'] },
  { key: 'Tumpek', patterns: ['tumpek', 'landep', 'uduh', 'krulut', 'kandang', 'wayang'] },
  { key: 'Siwaratri', patterns: ['siwaratri'] },
  { key: 'Kajeng Kliwon', patterns: ['kajeng kliwon'] }
];

const GOOD_DAY_CATEGORIES = [
  { cat: 'usaha', label: 'Usaha, Dagang & Memulai Kerja', patterns: ['usaha', 'dagang', 'bisnis', 'toko', 'warung', 'kerja', 'buka'] },
  { cat: 'bangunan', label: 'Membangun / Pindah Rumah & Melaspas', patterns: ['rumah', 'bangun', 'membangun', 'pindah', 'melaspas', 'tanah', 'pekarangan'] },
  { cat: 'upacara', label: 'Upacara / Dewa & Manusa Yadnya', patterns: ['upacara', 'yadnya', 'nikah', 'pawiwahan', 'menikah', 'potong gigi', 'metatah', 'otonan', 'nelubulanin', 'sembahyang'] },
  { cat: 'pertanian', label: 'Menanam & Pertanian', patterns: ['tanam', 'menanam', 'kebun', 'sawah', 'tani', 'pertanian', 'pohon'] }
];

export function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandQueryTokens(rawQuery) {
  const norm = normalizeText(rawQuery);
  const words = norm.split(' ').filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const expanded = new Set(words);
  const matchedConcepts = [];

  CONCEPT_GROUPS.forEach((group, idx) => {
    const hit = group.some((term) => norm.includes(term) || words.some((w) => term.includes(w) && w.length >= 4));
    if (hit) {
      matchedConcepts.push(idx);
      group.forEach((term) => expanded.add(term));
    }
  });

  return { norm, words, expanded: Array.from(expanded), matchedConcepts };
}

function scoreText(haystack, title, queryInfo, bonus = 0) {
  const hay = normalizeText(haystack);
  const ttl = normalizeText(title);
  let score = bonus;

  if (queryInfo.norm.length >= 3 && ttl.includes(queryInfo.norm)) score += 45;
  if (queryInfo.norm.length >= 3 && hay.includes(queryInfo.norm)) score += 22;

  queryInfo.words.forEach((w) => {
    if (ttl.includes(w)) score += 16;
    else if (hay.includes(w)) score += 8;
  });

  queryInfo.expanded.forEach((term) => {
    if (queryInfo.words.includes(term)) return;
    if (ttl.includes(term)) score += 10;
    else if (hay.includes(term)) score += 4;
  });

  return score;
}

export function runSmartSearch(rawQuery, dataset) {
  const query = String(rawQuery || '').trim();
  const queryInfo = expandQueryTokens(query);
  if (!queryInfo.norm) return null;

  const {
    todayIso,
    calYear,
    calMonth,
    domisili = '',
    kawitan = '',
    guides = [],
    dresta = [],
    dewasa = [],
    glosarium = [],
    checklists = []
  } = dataset;

  const instantCards = [];

  // 1. Intent: Pertanyaan Kalender / Kapan Rahinan / Hari Ini
  const asksTime = /\b(kapan|tanggal|berapa hari|terdekat|berikutnya|bulan ini|tahun ini|tahun depan|hari ini)\b/.test(queryInfo.norm);
  const matchedRahinan = RAHINAN_KEYWORDS.filter((r) => r.patterns.some((p) => queryInfo.norm.includes(p)));

  if (matchedRahinan.length > 0 || (asksTime && /\b(rahinan|hari raya|kalender|wewaran|wuku)\b/.test(queryInfo.norm))) {
    const upcoming = getUpcomingRahinan(todayIso, 380);
    if (matchedRahinan.length > 0) {
      matchedRahinan.slice(0, 2).forEach((rk) => {
        const hits = upcoming.filter((u) => u.name.toLowerCase().includes(rk.key.toLowerCase())).slice(0, 2);
        if (hits.length) {
          instantCards.push({
            kind: 'calendar',
            badge: '📅 Jadwal Kalender Bali',
            title: `${rk.key} Terdekat`,
            summary: hits.map((h) => `${h.indoDate} (${h.wewaran} ${h.wuku} · ${h.daysUntil === 0 ? 'HARI INI' : `${h.daysUntil} hari lagi`})`).join(' • '),
            actionType: 'open-date',
            targetIso: hits[0].iso,
            actionLabel: 'Lihat di Kalender Bali'
          });
        }
      });
    } else if (queryInfo.norm.includes('hari ini')) {
      const todayInfo = getBalineseCalendarInfo(todayIso);
      instantCards.push({
        kind: 'calendar',
        badge: '📅 Kalender Bali Hari Ini',
        title: `${todayInfo.saptaWara.name} ${todayInfo.pancaWara.name} · Wuku ${todayInfo.wuku.name}`,
        summary: `Sasih ${todayInfo.sasih.name} (${todayInfo.penanggalPangelongLabel}) · Tahun Saka ${todayInfo.sakaYear} · Urip ${todayInfo.urip}`,
        actionType: 'open-date',
        targetIso: todayIso,
        actionLabel: 'Buka Detail 10 Wewaran'
      });
    }
  }

  // 2. Intent: Pencari Hari Baik (Dewasa Ayu)
  const asksGoodDay = /\b(hari baik|dewasa ayu|dewasa|cari hari|tanggal baik|baik untuk)\b/.test(queryInfo.norm);
  if (asksGoodDay) {
    const matchedCat = GOOD_DAY_CATEGORIES.find((c) => c.patterns.some((p) => queryInfo.norm.includes(p))) || GOOD_DAY_CATEGORIES[0];
    const goodDays = findGoodDaysInMonth(calYear, calMonth, matchedCat.cat).slice(0, 3);
    if (goodDays.length) {
      instantCards.push({
        kind: 'dewasa-finder',
        badge: '✨ Pencari Hari Baik Bulan Ini',
        title: `Rekomendasi Dewasa Ayu: ${matchedCat.label}`,
        summary: goodDays.map((d) => `${d.indoDate} (${d.saptaWara} ${d.pancaWara}: ${d.matches.slice(0, 2).join(', ')})`).join(' • '),
        actionType: 'open-finder',
        finderCat: matchedCat.cat,
        actionLabel: 'Buka Pencari Hari Baik'
      });
    }
  }

  // 3. Intent: Kalkulator & Pengingat Otonan
  if (/\b(otonan|oton|hitung otonan|pengingat otonan|ulang tahun bali)\b/.test(queryInfo.norm)) {
    instantCards.push({
      kind: 'otonan',
      badge: '🔔 Fitur Otonan',
      title: 'Kalkulator & Pengingat Otonan Keluarga',
      summary: 'Hitung jadwal Otonan 210 hari ke depan dan simpan pengingat otomatis (H-3, H-1, Hari H) lintas perangkat saat login.',
      actionType: 'open-otonan',
      actionLabel: 'Buka Kalkulator Otonan'
    });
  }

  // 4. Ranked Cross-Domain Results
  const results = [];

  // 4a. Panduan Tri Kona (Utpatti, Sthiti, Pralina)
  guides.forEach((g) => {
    const title = g.judul || g.judul_topik || '';
    const hay = [
      title, g.siklus_tri_kona, g.panca_yadnya, g.ringkasan,
      g.tattwa_filosofi, g.susila_etika_praktis, g.upakara_banten,
      g.dresta_denpasar_badung, g.dresta_karangasem
    ].join(' ');
    const sc = scoreText(hay, title, queryInfo);
    if (sc >= 12) {
      results.push({
        type: 'guide',
        badge: `📖 ${g.siklus_tri_kona || 'Tri Kona'}`,
        title,
        snippet: g.ringkasan || g.tattwa_filosofi || '',
        score: sc,
        id: g.id,
        item: g
      });
    }
  });

  // 4b. Ceklis Persiapan
  checklists.forEach((c) => {
    const title = c.title || '';
    const itemTexts = (c.items || []).map((it) => (typeof it === 'string' ? it : (it.text || it.label || '')));
    const hay = [title, c.category, c.subtitle, ...itemTexts].join(' ');
    const bonus = (queryInfo.norm.includes('ceklis') || queryInfo.norm.includes('persiapan') || queryInfo.norm.includes('siap') || queryInfo.norm.includes('banten')) ? 10 : 0;
    const sc = scoreText(hay, title, queryInfo, bonus);
    if (sc >= 12) {
      results.push({
        type: 'checklist',
        badge: '✅ Ceklis Persiapan',
        title,
        snippet: `${c.subtitle || ''} (${itemTexts.length} butir persiapan)`,
        score: sc,
        id: c.id,
        item: c
      });
    }
  });

  // 4c. Catatan Dresta (beri bonus jika cocok Domisili / Kawitan user!)
  dresta.forEach((dr) => {
    const region = dr.wilayah || '';
    const title = `${region} — ${dr.soroh_atau_desa_khusus || dr.siklus || ''}`.trim();
    const hay = [region, dr.soroh_atau_desa_khusus, dr.catatan_dresta, dr.siklus, dr.peran_konteks].join(' ');
    const isUserRegion = (domisili && region.toLowerCase().includes(domisili.toLowerCase())) ||
      (kawitan && region.toLowerCase().includes(kawitan.toLowerCase()));
    const sc = scoreText(hay, title, queryInfo, isUserRegion ? 6 : 0);
    if (sc >= 12) {
      results.push({
        type: 'dresta',
        badge: `🗺️ Dresta ${region}`,
        title,
        snippet: dr.catatan_dresta || '',
        score: sc,
        id: dr.id_catatan || dr.id,
        filterTerm: region,
        item: dr
      });
    }
  });

  // 4d. Dewasa Ayu & Wariga
  dewasa.forEach((dw) => {
    const title = dw.nama_dewasa || '';
    const hay = [dw.nama_dewasa, dw.sifat, dw.kategori, dw.arti_ringkas, dw.cocok_untuk, dw.hindari_untuk, dw.catatan_wariga].join(' ');
    const sc = scoreText(hay, title, queryInfo);
    if (sc >= 12) {
      results.push({
        type: 'dewasa',
        badge: `☀️ Dewasa ${dw.sifat || 'Ayu'}`,
        title,
        snippet: `${dw.arti_ringkas || ''} ${dw.cocok_untuk ? '· Cocok: ' + dw.cocok_untuk : ''}`.trim(),
        score: sc,
        id: dw.id,
        filterTerm: dw.nama_dewasa,
        item: dw
      });
    }
  });

  // 4e. Glosarium Aksara Bali
  glosarium.forEach((gl) => {
    const title = `${gl.istilah_bali || ''} ${gl.aksara_bali_unicode ? `(${gl.aksara_bali_unicode})` : ''}`.trim();
    const hay = [gl.istilah_bali, gl.pelafalan, gl.arti_indonesia, gl.contoh_penggunaan, gl.kategori].join(' ');
    const sc = scoreText(hay, title, queryInfo);
    if (sc >= 12) {
      results.push({
        type: 'glosarium',
        badge: 'ᬅ Glosarium Aksara',
        title,
        snippet: gl.arti_indonesia || gl.contoh_penggunaan || '',
        score: sc,
        id: gl.id,
        filterTerm: gl.istilah_bali,
        item: gl
      });
    }
  });

  results.sort((a, b) => b.score - a.score);

  return {
    query,
    instantCards,
    results,
    totalMatches: results.length + instantCards.length
  };
}

// Susun konteks ringkas & terfokus (max ~3500 karakter) untuk dikirim ke Gemini AI via Apps Script
export function buildAiContextPayload(searchOut, dataset) {
  const lines = [];
  lines.push(`Profil pengguna: Domisili ${dataset.domisili}, Asal Kawitan ${dataset.kawitan}. Tanggal hari ini: ${dataset.todayIso}.`);

  if (searchOut && searchOut.instantCards.length) {
    lines.push('\n[DATA KALENDER / HITUNGAN LANGSUNG]');
    searchOut.instantCards.forEach((c) => lines.push(`- ${c.title}: ${c.summary}`));
  }

  const topItems = (searchOut ? searchOut.results : []).slice(0, 7);
  if (topItems.length) {
    lines.push('\n[MATERI PITEKET PALING RELEVAN]');
    topItems.forEach((r) => {
      const cleanSnippet = String(r.snippet || '').replace(/\s+/g, ' ').slice(0, 260);
      lines.push(`- [${r.badge}] ${r.title}: ${cleanSnippet}`);
    });
  } else {
    lines.push('\n[DAFTAR TOPIK UMUM PITEKET]');
    (dataset.guides || []).slice(0, 10).forEach((g) => {
      lines.push(`- [${g.siklus}] ${g.judul_topik}: ${String(g.ringkasan_cepat || '').slice(0, 120)}`);
    });
  }

  return lines.join('\n').slice(0, 3800);
}
