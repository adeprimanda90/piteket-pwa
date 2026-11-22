// ============================================================================
// Piteket — Data Hari Libur Nasional & Cuti Bersama Indonesia (100% Offline)
// Sumber resmi:
// - 2026: SKB 3 Menteri No. 1497/2025, No. 2/2025, No. 5/2025 (17 Libur + 8 Cuti)
// - 2027: SKB 3 Menteri No. 1205/2026, No. 3/2026, No. 2/2026 (18 Libur + 8 Cuti)
// ============================================================================

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const NATIONAL_HOLIDAYS_OFFICIAL = [
  // ======================== TAHUN 2026 (SKB 3 MENTERI) ========================
  // 17 Hari Libur Nasional 2026
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-21', name: 'Idulfitri 1447 Hijriah (Hari ke-1)', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-22', name: 'Idulfitri 1447 Hijriah (Hari ke-2)', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-04-05', name: 'Hari Kebangkitan Yesus Kristus (Paskah)', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-27', name: 'Iduladha 1447 Hijriah', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-06-16', name: '1 Muharam Tahun Baru Islam 1448 Hijriah', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-08-17', name: 'Proklamasi Kemerdekaan RI', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'nasional', source: 'SKB 3 Menteri 2026' },
  { date: '2026-12-25', name: 'Kelahiran Yesus Kristus (Natal)', type: 'nasional', source: 'SKB 3 Menteri 2026' },

  // 8 Hari Cuti Bersama 2026
  { date: '2026-02-16', name: 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-18', name: 'Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-20', name: 'Cuti Bersama Idulfitri 1447 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-23', name: 'Cuti Bersama Idulfitri 1447 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-03-24', name: 'Cuti Bersama Idulfitri 1447 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-15', name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-05-28', name: 'Cuti Bersama Iduladha 1447 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },
  { date: '2026-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus (Natal)', type: 'cuti_bersama', source: 'SKB 3 Menteri 2026' },

  // ======================== TAHUN 2027 (SKB 3 MENTERI) ========================
  // 18 Hari Libur Nasional 2027
  { date: '2027-01-01', name: 'Tahun Baru 2027 Masehi', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-01-05', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-08', name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-10', name: 'Idulfitri 1448 Hijriah (Hari ke-1)', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-11', name: 'Idulfitri 1448 Hijriah (Hari ke-2)', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-26', name: 'Wafat Yesus Kristus', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-28', name: 'Hari Kebangkitan Yesus Kristus (Paskah)', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-01', name: 'Hari Buruh Internasional', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-06', name: 'Kenaikan Yesus Kristus', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-17', name: 'Iduladha 1448 Hijriah', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-06-01', name: 'Hari Lahir Pancasila', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-06-06', name: '1 Muharam Tahun Baru Islam 1449 Hijriah', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-08-15', name: 'Maulid Nabi Muhammad SAW', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-08-17', name: 'Proklamasi Kemerdekaan RI', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-12-25', name: 'Kelahiran Yesus Kristus (Natal)', type: 'nasional', source: 'SKB 3 Menteri 2027' },
  { date: '2027-12-26', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'nasional', source: 'SKB 3 Menteri 2027' },

  // 8 Hari Cuti Bersama 2027
  { date: '2027-02-05', name: 'Cuti Bersama Tahun Baru Imlek 2578 Kongzili', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-09', name: 'Cuti Bersama Idulfitri 1448 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-12', name: 'Cuti Bersama Idulfitri 1448 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-15', name: 'Cuti Bersama Idulfitri 1448 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-03-25', name: 'Cuti Bersama Wafat Yesus Kristus', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-18', name: 'Cuti Bersama Iduladha 1448 Hijriah', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-05-19', name: 'Cuti Bersama Hari Raya Waisak 2571 BE', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' },
  { date: '2027-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus (Natal)', type: 'cuti_bersama', source: 'SKB 3 Menteri 2027' }
];

// Tanggal libur nasional tetap (Masehi) sebagai cadangan untuk tahun di luar 2026-2027
const FIXED_ANNUAL_HOLIDAYS = [
  { mmdd: '01-01', name: 'Tahun Baru Masehi' },
  { mmdd: '05-01', name: 'Hari Buruh Internasional' },
  { mmdd: '06-01', name: 'Hari Lahir Pancasila' },
  { mmdd: '08-17', name: 'Proklamasi Kemerdekaan RI' },
  { mmdd: '12-25', name: 'Kelahiran Yesus Kristus (Natal)' }
];

const OFFICIAL_YEARS = new Set([2026, 2027]);

const HOLIDAY_BY_DATE = new Map();
NATIONAL_HOLIDAYS_OFFICIAL.forEach((h) => {
  if (!HOLIDAY_BY_DATE.has(h.date)) HOLIDAY_BY_DATE.set(h.date, []);
  HOLIDAY_BY_DATE.get(h.date).push(h);
});

function formatIndoDateFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${INDO_DAYS[dt.getUTCDay()]}, ${d} ${INDO_MONTHS[m - 1]} ${y}`;
}

function diffDaysIso(fromIso, toIso) {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

export function getNationalHolidaysForDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return [];
  const exact = HOLIDAY_BY_DATE.get(isoDate);
  if (exact && exact.length) return exact;

  const year = Number(isoDate.slice(0, 4));
  if (OFFICIAL_YEARS.has(year)) return [];

  const mmdd = isoDate.slice(5, 10);
  const fixed = FIXED_ANNUAL_HOLIDAYS.filter((f) => f.mmdd === mmdd);
  return fixed.map((f) => ({
    date: isoDate,
    name: f.name,
    type: 'nasional',
    source: 'Hari Libur Tetap Masehi'
  }));
}

export function getNationalHolidayStatus(isoDate) {
  const items = getNationalHolidaysForDate(isoDate);
  const isNasional = items.some((i) => i.type === 'nasional');
  const isCutiBersama = items.some((i) => i.type === 'cuti_bersama');
  return {
    hasAny: items.length > 0,
    isNasional,
    isCutiBersama,
    items
  };
}

export function getNationalHolidaysInMonth(year, monthIndex) {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const prefix = `${year}-${mm}-`;

  let list = [];
  if (OFFICIAL_YEARS.has(year)) {
    list = NATIONAL_HOLIDAYS_OFFICIAL.filter((h) => h.date.startsWith(prefix));
  } else {
    list = FIXED_ANNUAL_HOLIDAYS
      .filter((f) => f.mmdd.startsWith(`${mm}-`))
      .map((f) => ({
        date: `${year}-${f.mmdd}`,
        name: f.name,
        type: 'nasional',
        source: 'Hari Libur Tetap Masehi'
      }));
  }

  return list
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => ({
      ...h,
      isoDate: h.date,
      day: Number(h.date.slice(8, 10)),
      indoDate: formatIndoDateFromIso(h.date)
    }));
}

export function getUpcomingNationalHolidays(fromIso, daysAhead = 365, includeCuti = true) {
  const [startY] = fromIso.split('-').map(Number);
  const candidateYears = [startY, startY + 1];
  const pool = [];

  candidateYears.forEach((yr) => {
    if (OFFICIAL_YEARS.has(yr)) {
      NATIONAL_HOLIDAYS_OFFICIAL.forEach((h) => {
        if (Number(h.date.slice(0, 4)) === yr) pool.push(h);
      });
    } else {
      FIXED_ANNUAL_HOLIDAYS.forEach((f) => {
        pool.push({
          date: `${yr}-${f.mmdd}`,
          name: f.name,
          type: 'nasional',
          source: 'Hari Libur Tetap Masehi'
        });
      });
    }
  });

  return pool
    .filter((h) => includeCuti || h.type === 'nasional')
    .map((h) => ({
      ...h,
      isoDate: h.date,
      daysUntil: diffDaysIso(fromIso, h.date),
      indoDate: formatIndoDateFromIso(h.date)
    }))
    .filter((h) => h.daysUntil >= 0 && h.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.type.localeCompare(b.type));
}
