import { PITEKET_CONFIG } from './config.js';
import {
  getBalineseCalendarInfo,
  getMonthCalendar,
  getUpcomingRahinan,
  calculateOtonan,
  formatIsoDate
} from './calendar-engine.js';
import { buildIcsContent, downloadIcsFile } from './ics-export.js';
import { DEFAULT_CHECKLISTS } from './checklists.js';

const REGIONS = [
  'Denpasar',
  'Badung',
  'Karangasem',
  'Gianyar',
  'Tabanan',
  'Klungkung',
  'Bangli',
  'Buleleng',
  'Jembrana',
  'Perantauan / Luar Bali'
];

const nowDate = new Date();
const todayIso = formatIsoDate(nowDate);

function loadJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const state = {
  tab: 'panduan',
  cycleFilter: 'ALL',
  search: '',
  domisili: localStorage.getItem('piteket_domisili') || 'Denpasar',
  kawitan: localStorage.getItem('piteket_kawitan') || 'Karangasem',
  guides: [],
  dresta: [],
  dewasa: [],
  glosarium: [],
  activeFeedbackTopic: null,
  // Fase 2: Kalender, Rahinan & Otonan
  calYear: nowDate.getFullYear(),
  calMonth: nowDate.getMonth(),
  selectedIso: todayIso,
  rahinanFilter: 'ALL',
  otonanBirthDate: localStorage.getItem('piteket_last_otonan_birth') || '',
  otonanName: '',
  familyOtonan: loadJsonStorage('piteket_family_otonan', []),
  // Fase 3: Ceklis Persiapan
  checklistChecked: loadJsonStorage('piteket_checklist_checked', {}),
  checklistCustom: loadJsonStorage('piteket_checklist_custom', {})
};

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function updateRegionBadge() {
  document.getElementById('region-label').textContent = `Domisili: ${state.domisili} · Kawitan: ${state.kawitan}`;
}

async function loadData() {
  const [u, s, p, dr, d, g] = await Promise.all([
    fetch('./data/utpatti.json').then((r) => r.json()).catch(() => []),
    fetch('./data/sthiti.json').then((r) => r.json()).catch(() => []),
    fetch('./data/pralina.json').then((r) => r.json()).catch(() => []),
    fetch('./data/catatan-dresta.json').then((r) => r.json()).catch(() => []),
    fetch('./data/dewasa-ayu.json').then((r) => r.json()).catch(() => []),
    fetch('./data/glosarium-aksara.json').then((r) => r.json()).catch(() => [])
  ]);
  state.guides = [...u, ...s, ...p];
  state.dresta = dr;
  state.dewasa = d;
  state.glosarium = g;
  renderContent();
}

function renderCalendar(dateStr) {
  const iso = dateStr || todayIso;
  const info = getBalineseCalendarInfo(iso);
  document.getElementById('cal-wewaran').textContent = `${info.saptaWara} ${info.pancaWara}`;
  document.getElementById('cal-triwara').textContent = `${info.triWara} · Urip ${info.urip}`;
  document.getElementById('cal-wuku').textContent = `${info.wuku} (Ingkel ${info.ingkel})`;
  document.getElementById('cal-sasih').textContent = `${info.sasih} · ${info.penanggal}`;
  document.getElementById('cal-saka').textContent = info.saka;

  const tagsEl = document.getElementById('cal-tags');
  tagsEl.innerHTML = '';

  if (info.rahinan.length) {
    info.rahinan.forEach((r) => {
      const span = document.createElement('span');
      span.className = 'tag tag-rahinan';
      span.textContent = `Rahinan: ${r}`;
      tagsEl.appendChild(span);
    });
  } else {
    const nextList = getUpcomingRahinan(iso, 45, 'ALL');
    if (nextList.length) {
      const nxt = nextList[0];
      const span = document.createElement('span');
      span.className = 'tag pill-warn';
      span.textContent = `Rahinan terdekat: ${nxt.name} (H-${nxt.daysUntil})`;
      tagsEl.appendChild(span);
    }
  }

  const src = document.createElement('span');
  src.className = 'tag tag-source';
  src.textContent = info.source;
  tagsEl.appendChild(src);
}

function cycleClass(c) {
  if ((c || '').startsWith('Utpatti')) return 'pill-utpatti';
  if ((c || '').startsWith('Sthiti')) return 'pill-sthiti';
  return 'pill-pralina';
}

function statusClass(s) {
  return (s || '').toLowerCase().includes('terverifikasi') ? 'pill-ok' : 'pill-warn';
}

function exportRahinanIcs() {
  const list = getUpcomingRahinan(todayIso, 180, state.rahinanFilter);
  if (!list.length) {
    showToast('Tidak ada Rahinan pada filter ini.');
    return;
  }
  const events = list.map((r) => ({
    isoDate: r.isoDate,
    summary: `Rahinan: ${r.name}`,
    description: `${r.name} (${r.wewaran}) — Diekspor dari Piteket PWA (Domisili: ${state.domisili}, Kawitan: ${state.kawitan}).`,
    alarmDaysBefore: [1]
  }));
  const labelMap = { ALL: 'Semua Rahinan', MAJOR: 'Hari Raya & Tumpek', LUNAR: 'Purnama & Tilem' };
  const ics = buildIcsContent(`Piteket — ${labelMap[state.rahinanFilter] || 'Rahinan'}`, events);
  downloadIcsFile(`piteket-rahinan-${state.rahinanFilter.toLowerCase()}.ics`, ics);
  showToast(`File .ics berisi ${events.length} jadwal Rahinan (6 bulan) diunduh!`);
}

function exportSingleOtonanIcs(name, birthDate) {
  const calc = calculateOtonan(birthDate, todayIso, 3);
  const label = name || 'Keluarga';
  const events = calc.upcoming.map((u) => ({
    isoDate: u.isoDate,
    summary: `Otonan ${label} (ke-${u.otonKe}) — ${calc.wewaran} ${calc.wuku}`,
    description: `Otonan ke-${u.otonKe} untuk ${label} (${calc.wewaran} Wuku ${calc.wuku}, Urip ${calc.urip}, ${u.sasih} ${u.penanggal}). Pengingat H-3 & H-1 dari Piteket PWA.`,
    alarmDaysBefore: [3, 1]
  }));
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ics = buildIcsContent(`Piteket — Otonan ${label}`, events);
  downloadIcsFile(`piteket-otonan-${slug}.ics`, ics);
  showToast(`3 jadwal Otonan ${label} (dengan pengingat H-3 & H-1) diunduh!`);
}

function exportAllFamilyOtonanIcs() {
  if (!state.familyOtonan.length) {
    showToast('Belum ada daftar Otonan keluarga yang disimpan.');
    return;
  }
  const events = [];
  state.familyOtonan.forEach((f) => {
    const calc = calculateOtonan(f.birthDate, todayIso, 2);
    calc.upcoming.forEach((u) => {
      events.push({
        isoDate: u.isoDate,
        summary: `Otonan ${f.name} (ke-${u.otonKe}) — ${calc.wewaran} ${calc.wuku}`,
        description: `Otonan ke-${u.otonKe} untuk ${f.name} (${calc.wewaran} Wuku ${calc.wuku}, Urip ${calc.urip}, ${u.sasih} ${u.penanggal}).`,
        alarmDaysBefore: [3, 1]
      });
    });
  });
  const ics = buildIcsContent('Piteket — Otonan Keluarga', events);
  downloadIcsFile('piteket-otonan-keluarga.ics', ics);
  showToast(`File .ics gabungan (${events.length} jadwal Otonan keluarga) diunduh!`);
}

function renderFase2CalendarTab(container) {
  const monthData = getMonthCalendar(state.calYear, state.calMonth);
  const selectedInfo = getBalineseCalendarInfo(state.selectedIso);
  const upcomingRahinan = getUpcomingRahinan(todayIso, 180, state.rahinanFilter).slice(0, 8);

  const leadingBlanks = Array.from({ length: monthData.firstDow }, () => '<div class="mcal-cell mcal-blank"></div>').join('');

  const dayCells = monthData.days.map((d) => {
    const isToday = d.isoDate === todayIso;
    const isSelected = d.isoDate === state.selectedIso;
    const hasMajor = d.rahinanMajor.length > 0 || d.rahinan.some((r) => r.startsWith('Tumpek'));
    const hasKajengKliwon = d.rahinan.includes('Kajeng Kliwon');

    const dots = [];
    if (d.isPurnama) dots.push('<span class="mcal-dot dot-purnama" title="Purnama"></span>');
    if (d.isTilem) dots.push('<span class="mcal-dot dot-tilem" title="Tilem"></span>');
    if (hasMajor) dots.push('<span class="mcal-dot dot-major" title="Hari Raya / Tumpek"></span>');
    if (hasKajengKliwon) dots.push('<span class="mcal-dot dot-kk" title="Kajeng Kliwon"></span>');

    return `
      <button type="button" class="mcal-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-select-iso="${d.isoDate}">
        <div class="mcal-top">
          <span class="mcal-num">${d.day}</span>
          <span class="mcal-panca">${d.pancaShort}</span>
        </div>
        <div class="mcal-wuku">${d.wuku}</div>
        <div class="mcal-dots">${dots.join('')}</div>
      </button>
    `;
  }).join('');

  const otonanResult = state.otonanBirthDate ? calculateOtonan(state.otonanBirthDate, todayIso, 3) : null;

  const savedOtonanSorted = state.familyOtonan
    .map((entry) => ({
      ...entry,
      calc: calculateOtonan(entry.birthDate, todayIso, 1)
    }))
    .sort((a, b) => a.calc.upcoming[0].daysUntil - b.calc.upcoming[0].daysUntil);

  container.innerHTML = `
    <div class="fase2-layout">
      <section class="f2-panel">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Kalender Bali Bulanan</h3>
            <p class="f2-sub">Klik tanggal mana pun untuk melihat Wewaran, Sasih, Rahinan & pratinjau Wariga.</p>
          </div>
          <div class="mcal-nav">
            <button type="button" class="btn btn-outline btn-sm" id="mcal-prev">&larr; Sebelumnya</button>
            <strong class="mcal-month-label">${monthData.monthName} ${monthData.year}</strong>
            <button type="button" class="btn btn-outline btn-sm" id="mcal-next">Berikutnya &rarr;</button>
            <button type="button" class="btn btn-primary btn-sm" id="mcal-today">Hari Ini</button>
          </div>
        </div>

        <div class="mcal-legend">
          <span><i class="mcal-dot dot-purnama"></i> Purnama</span>
          <span><i class="mcal-dot dot-tilem"></i> Tilem</span>
          <span><i class="mcal-dot dot-major"></i> Hari Raya / Tumpek</span>
          <span><i class="mcal-dot dot-kk"></i> Kajeng Kliwon</span>
        </div>

        <div class="mcal-weekdays">
          <div>Redite<br/><small>Min</small></div>
          <div>Soma<br/><small>Sen</small></div>
          <div>Anggara<br/><small>Sel</small></div>
          <div>Buda<br/><small>Rab</small></div>
          <div>Wraspati<br/><small>Kam</small></div>
          <div>Sukra<br/><small>Jum</small></div>
          <div>Saniscara<br/><small>Sab</small></div>
        </div>
        <div class="mcal-grid">
          ${leadingBlanks}${dayCells}
        </div>

        <div class="day-detail-box">
          <div class="day-detail-head">
            <div>
              <div class="day-detail-date">${selectedInfo.indoDate}</div>
              <div class="day-detail-bali">${selectedInfo.saptaWara} ${selectedInfo.pancaWara} · Wuku ${selectedInfo.wuku} · ${selectedInfo.sasih} (${selectedInfo.penanggal}) · ${selectedInfo.saka}</div>
            </div>
            <span class="tag pill-yadnya">Urip ${selectedInfo.urip} · ${selectedInfo.triWara} · ${selectedInfo.sadWara}</span>
          </div>

          ${selectedInfo.rahinan.length ? `
            <div class="cal-tags" style="margin-top:10px;">
              ${selectedInfo.rahinan.map((r) => `<span class="tag tag-rahinan">Rahinan: ${r}</span>`).join('')}
            </div>
          ` : ''}

          <div class="wariga-preview">
            <strong>Pratinjau Wariga / Dewasa Ayu (Indikator Awal):</strong>
            <ul>
              ${selectedInfo.dewasaHints.map((h) => `
                <li>
                  <span class="tag ${h.sifat === 'Ayu' ? 'pill-ok' : h.sifat === 'Peringatan' ? 'pill-warn' : 'pill-yadnya'}">${h.sifat}</span>
                  ${h.label}
                </li>
              `).join('')}
            </ul>
            <p class="wariga-note">Catatan kerendahan hati: Pratinjau ini adalah rujukan belajar awal berbasis Ingkel & Rahinan. Untuk menentukan <em>Dewasa Ayu</em> upacara besar (Pawiwahan, Ngaben, Mlaspas), tetap konsultasikan dengan Sulinggih atau ahli Wariga setempat.</p>
          </div>
        </div>
      </section>

      <section class="f2-panel">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Hitung Mundur Rahinan Terdekat</h3>
            <p class="f2-sub">Dihitung otomatis 100% offline. Bisa diekspor ke Google Calendar / Apple Calendar (.ics).</p>
          </div>
          <div class="rahinan-filters">
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" data-rfilter="ALL">Semua</button>
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'MAJOR' ? 'btn-primary' : 'btn-outline'}" data-rfilter="MAJOR">Hari Raya & Tumpek</button>
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'LUNAR' ? 'btn-primary' : 'btn-outline'}" data-rfilter="LUNAR">Purnama & Tilem</button>
            <button type="button" class="btn btn-sm btn-ics" id="export-rahinan-ics">📅 Ekspor .ics (6 Bulan)</button>
          </div>
        </div>
        <div class="rahinan-list">
          ${upcomingRahinan.map((r) => `
            <div class="rahinan-item" data-select-iso="${r.isoDate}">
              <div class="rahinan-badge ${r.daysUntil === 0 ? 'is-now' : ''}">
                ${r.daysUntil === 0 ? 'HARI INI' : `H-${r.daysUntil}`}
              </div>
              <div class="rahinan-info">
                <strong>${r.name}</strong>
                <span>${r.indoDate} · ${r.wewaran}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="f2-panel">
        <h3 class="f2-title">Kalkulator Otonan & Pengingat Keluarga</h3>
        <p class="f2-sub">Hitung hari lahir Pawukon (tiap 210 hari), simpan privat di perangkat Anda, dan ekspor pengingat H-3 & H-1 ke Kalender HP.</p>

        <form id="otonan-form" class="otonan-form">
          <div class="form-group" style="margin:0;">
            <label for="otonan-name">Nama (opsional untuk disimpan)</label>
            <input type="text" id="otonan-name" placeholder="Contoh: Ajik / Ibu / Gek Ayu" value="${state.otonanName}" />
          </div>
          <div class="form-group" style="margin:0;">
            <label for="otonan-birth">Tanggal Lahir Masehi</label>
            <input type="date" id="otonan-birth" value="${state.otonanBirthDate}" required />
          </div>
          <div class="otonan-actions">
            <button type="submit" class="btn btn-primary">Hitung Otonan</button>
            <button type="button" class="btn btn-outline" id="save-otonan-btn">Simpan ke Keluarga</button>
          </div>
        </form>

        ${otonanResult ? `
          <div class="otonan-result">
            <div class="otonan-summary">
              <div>
                <div class="cal-label">Weton / Hari Lahir Bali</div>
                <div class="otonan-main-val">${otonanResult.wewaran} · Wuku ${otonanResult.wuku}</div>
                <div class="f2-sub">Lahir: ${otonanResult.birthIndo} · Tri Wara ${otonanResult.triWara} · Urip ${otonanResult.urip} · Ingkel ${otonanResult.ingkel}</div>
              </div>
              <button type="button" class="btn btn-sm btn-ics" id="export-single-otonan-ics">📅 Ekspor 3 Otonan (.ics)</button>
            </div>
            ${otonanResult.isWukuWayang ? `
              <div class="elder-box" style="margin-top:10px;">
                <strong>Catatan Khusus Wuku Wayang:</strong> Dalam dresta umum di Bali, kelahiran pada Wuku Wayang sering dianjurkan untuk berkonsultasi dengan orang tua atau Sulinggih terkait upacara penyucian <em>Melukat Sapuh Leger</em>.
              </div>
            ` : ''}
            <div class="otonan-next-grid">
              ${otonanResult.upcoming.map((u) => `
                <div class="otonan-next-card">
                  <span class="tag pill-utpatti">Oton ke-${u.otonKe}</span>
                  <strong>${u.indoDate}</strong>
                  <span>${u.daysUntil === 0 ? 'Jatuh HARI INI!' : `${u.daysUntil} hari lagi`}</span>
                  <small>${u.sasih} · ${u.penanggal}</small>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="family-otonan-wrap">
          <div class="mcal-header" style="margin-bottom:10px;">
            <h4 style="margin:0;">Daftar Otonan Keluarga Tersimpan (${savedOtonanSorted.length})</h4>
            ${savedOtonanSorted.length ? `<button type="button" class="btn btn-sm btn-ics" id="export-all-otonan-ics">📅 Ekspor Semua Otonan Keluarga (.ics)</button>` : ''}
          </div>
          ${savedOtonanSorted.length ? `
            <div class="family-otonan-list">
              ${savedOtonanSorted.map((f) => `
                <div class="family-otonan-item">
                  <div>
                    <strong>${f.name}</strong>
                    <div class="f2-sub">${f.calc.wewaran} ${f.calc.wuku} · Oton berikutnya: <strong>${f.calc.upcoming[0].indoDate}</strong> (${f.calc.upcoming[0].daysUntil === 0 ? 'HARI INI' : `H-${f.calc.upcoming[0].daysUntil}`})</div>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button type="button" class="btn btn-outline btn-sm" data-ics-member="${f.id}">.ics</button>
                    <button type="button" class="btn btn-outline btn-sm" data-del-otonan="${f.id}">Hapus</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<p class="f2-sub">Belum ada anggota keluarga yang disimpan. Masukkan nama dan tanggal lahir di atas lalu klik <strong>Simpan ke Keluarga</strong>.</p>`}
        </div>
      </section>
    </div>
  `;

  document.getElementById('mcal-prev').onclick = () => {
    state.calMonth -= 1;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear -= 1; }
    renderContent();
  };
  document.getElementById('mcal-next').onclick = () => {
    state.calMonth += 1;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear += 1; }
    renderContent();
  };
  document.getElementById('mcal-today').onclick = () => {
    state.calYear = nowDate.getFullYear();
    state.calMonth = nowDate.getMonth();
    state.selectedIso = todayIso;
    document.getElementById('date-picker').value = todayIso;
    renderCalendar(todayIso);
    renderContent();
  };

  container.querySelectorAll('[data-select-iso]').forEach((el) => {
    el.addEventListener('click', () => {
      const iso = el.dataset.selectIso;
      const parts = iso.split('-').map(Number);
      state.selectedIso = iso;
      state.calYear = parts[0];
      state.calMonth = parts[1] - 1;
      document.getElementById('date-picker').value = iso;
      renderCalendar(iso);
      renderContent();
    });
  });

  container.querySelectorAll('[data-rfilter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.rahinanFilter = btn.dataset.rfilter;
      renderContent();
    });
  });

  document.getElementById('export-rahinan-ics').onclick = exportRahinanIcs;

  const singleIcsBtn = document.getElementById('export-single-otonan-ics');
  if (singleIcsBtn) {
    singleIcsBtn.onclick = () => {
      const nm = document.getElementById('otonan-name').value.trim() || state.otonanName || 'Saya';
      exportSingleOtonanIcs(nm, state.otonanBirthDate);
    };
  }

  const allIcsBtn = document.getElementById('export-all-otonan-ics');
  if (allIcsBtn) {
    allIcsBtn.onclick = exportAllFamilyOtonanIcs;
  }

  container.querySelectorAll('[data-ics-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const member = state.familyOtonan.find((x) => x.id === btn.dataset.icsMember);
      if (member) exportSingleOtonanIcs(member.name, member.birthDate);
    });
  });

  document.getElementById('otonan-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.otonanName = document.getElementById('otonan-name').value.trim();
    state.otonanBirthDate = document.getElementById('otonan-birth').value;
    if (state.otonanBirthDate) {
      localStorage.setItem('piteket_last_otonan_birth', state.otonanBirthDate);
      renderContent();
    }
  });

  document.getElementById('save-otonan-btn').onclick = () => {
    const name = document.getElementById('otonan-name').value.trim();
    const birthDate = document.getElementById('otonan-birth').value;
    if (!name || !birthDate) {
      showToast('Isi nama dan tanggal lahir dulu sebelum menyimpan.');
      return;
    }
    state.otonanName = '';
    state.otonanBirthDate = birthDate;
    localStorage.setItem('piteket_last_otonan_birth', birthDate);
    state.familyOtonan.push({ id: String(Date.now()), name, birthDate });
    localStorage.setItem('piteket_family_otonan', JSON.stringify(state.familyOtonan));
    showToast(`Otonan ${name} disimpan di perangkat Anda.`);
    renderContent();
  };

  container.querySelectorAll('[data-del-otonan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.familyOtonan = state.familyOtonan.filter((x) => x.id !== btn.dataset.delOtonan);
      localStorage.setItem('piteket_family_otonan', JSON.stringify(state.familyOtonan));
      showToast('Data Otonan dihapus.');
      renderContent();
    });
  });
}

function renderChecklistsTab(container) {
  container.innerHTML = `
    <div class="checklist-grid">
      ${DEFAULT_CHECKLISTS.map((chk) => {
        const customItems = state.checklistCustom[chk.id] || [];
        const allItems = [
          ...chk.items.map((text, idx) => ({ key: `${chk.id}-d-${idx}`, text, isCustom: false })),
          ...customItems.map((text, idx) => ({ key: `${chk.id}-c-${idx}`, text, isCustom: true, customIdx: idx }))
        ];
        const doneCount = allItems.filter((it) => state.checklistChecked[it.key]).length;
        const pct = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;

        return `
          <article class="f2-panel chk-card">
            <div class="card-meta">
              <span class="tag ${cycleClass(chk.siklus)}">${chk.siklus}</span>
              <span class="tag pill-ok">${doneCount}/${allItems.length} selesai (${pct}%)</span>
            </div>
            <div class="card-aksara aksara">${chk.aksara}</div>
            <h3 class="f2-title" style="margin-top:2px;">${chk.title}</h3>
            <p class="f2-sub">${chk.summary}</p>
            <div class="chk-progress"><div class="chk-progress-bar" style="width:${pct}%"></div></div>
            <div class="chk-dresta"><em>Desa Kala Patra:</em> ${chk.drestaNote}</div>

            <ul class="chk-list">
              ${allItems.map((it) => `
                <li class="chk-row ${state.checklistChecked[it.key] ? 'is-done' : ''}">
                  <label>
                    <input type="checkbox" data-chk-toggle="${it.key}" ${state.checklistChecked[it.key] ? 'checked' : ''} />
                    <span>${it.text}</span>
                  </label>
                  ${it.isCustom ? `<button type="button" class="chk-del-btn" data-chk-del="${chk.id}" data-chk-idx="${it.customIdx}" title="Hapus catatan">&times;</button>` : ''}
                </li>
              `).join('')}
            </ul>

            <form class="chk-add-form" data-chk-add="${chk.id}">
              <input type="text" placeholder="Tambah catatan khusus keluarga (mis. banten kawitan)..." required />
              <button type="submit" class="btn btn-outline btn-sm">+ Tambah</button>
            </form>

            <div class="card-actions" style="margin-top:10px;">
              <button type="button" class="btn btn-outline btn-sm" data-chk-reset="${chk.id}">Reset Centang</button>
              <button type="button" class="btn btn-outline btn-sm" data-feedback-id="${chk.id}" data-feedback-tab="Ceklis_Persiapan" data-feedback-title="${chk.title}">Koreksi / Beri Piteket</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-chk-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const k = cb.dataset.chkToggle;
      if (cb.checked) state.checklistChecked[k] = true;
      else delete state.checklistChecked[k];
      localStorage.setItem('piteket_checklist_checked', JSON.stringify(state.checklistChecked));
      renderContent();
    });
  });

  container.querySelectorAll('[data-chk-add]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = form.dataset.chkAdd;
      const input = form.querySelector('input');
      const val = input.value.trim();
      if (!val) return;
      if (!state.checklistCustom[id]) state.checklistCustom[id] = [];
      state.checklistCustom[id].push(val);
      localStorage.setItem('piteket_checklist_custom', JSON.stringify(state.checklistCustom));
      showToast('Catatan pribadi ditambahkan ke ceklis.');
      renderContent();
    });
  });

  container.querySelectorAll('[data-chk-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.chkDel;
      const idx = Number(btn.dataset.chkIdx);
      if (state.checklistCustom[id]) {
        state.checklistCustom[id].splice(idx, 1);
        localStorage.setItem('piteket_checklist_custom', JSON.stringify(state.checklistCustom));
        renderContent();
      }
    });
  });

  container.querySelectorAll('[data-chk-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.chkReset;
      Object.keys(state.checklistChecked).forEach((k) => {
        if (k.startsWith(id + '-')) delete state.checklistChecked[k];
      });
      localStorage.setItem('piteket_checklist_checked', JSON.stringify(state.checklistChecked));
      showToast('Centang ceklis di-reset.');
      renderContent();
    });
  });
}

function renderContent() {
  const container = document.getElementById('content-area');
  const controlsBar = document.getElementById('controls-bar');
  controlsBar.style.display = (state.tab === 'kalender' || state.tab === 'ceklis') ? 'none' : 'flex';

  if (state.tab === 'kalender') {
    renderFase2CalendarTab(container);
    return;
  }
  if (state.tab === 'ceklis') {
    renderChecklistsTab(container);
    return;
  }

  const q = state.search.trim().toLowerCase();

  if (state.tab === 'panduan') {
    const items = state.guides.filter((item) => {
      const matchCycle = state.cycleFilter === 'ALL' || item.siklus_tri_kona.startsWith(state.cycleFilter);
      const hay = `${item.judul} ${item.ringkasan} ${item.panca_yadnya} ${item.tattwa_filosofi} ${item.susila_etika_praktis}`.toLowerCase();
      return matchCycle && (!q || hay.includes(q));
    });

    if (!items.length) {
      container.innerHTML = '<p>Belum ada panduan yang cocok dengan pencarian Anda.</p>';
      return;
    }

    container.innerHTML = `<div class="cards-grid">${items.map((item) => `
      <article class="card">
        <div class="card-meta">
          <span class="tag ${cycleClass(item.siklus_tri_kona)}">${item.siklus_tri_kona}</span>
          <span class="tag pill-yadnya">${item.panca_yadnya}</span>
          <span class="tag ${statusClass(item.status_verifikasi)}">${item.status_verifikasi}</span>
        </div>
        <div class="card-aksara aksara">${item.aksara_bali || ''}</div>
        <h3>${item.judul}</h3>
        <p>${item.ringkasan}</p>
        <div class="card-actions">
          <button class="btn btn-primary" data-open-guide="${item.id}">Baca Panduan</button>
          <button class="btn btn-outline" data-feedback-id="${item.id}" data-feedback-tab="${item.siklus_tri_kona}" data-feedback-title="${item.judul}">Beri Piteket</button>
        </div>
      </article>
    `).join('')}</div>`;
  } else if (state.tab === 'dresta') {
    const items = state.dresta.filter((d) =>
      !q || `${d.wilayah} ${d.soroh_atau_desa_khusus} ${d.catatan_dresta} ${d.siklus} ${d.peran_konteks}`.toLowerCase().includes(q)
    );
    const prioritized = [...items].sort((a, b) => {
      const score = (x) => (x.wilayah === state.domisili || x.wilayah === state.kawitan ? 0 : 1);
      return score(a) - score(b);
    });
    container.innerHTML = `<div class="cards-grid">${prioritized.map((d) => {
      const firstUrl = (d.sumber_referensi || '').split('|')[0].trim();
      return `
      <article class="card">
        <div class="card-meta">
          <span class="tag ${cycleClass(d.siklus)}">${d.wilayah}</span>
          <span class="tag pill-yadnya">${d.peran_konteks} · ${d.siklus}</span>
          <span class="tag ${statusClass(d.status_verifikasi)}">${d.status_verifikasi}</span>
        </div>
        <h3>${d.wilayah} — ${d.soroh_atau_desa_khusus}</h3>
        <p>${d.catatan_dresta}</p>
        ${firstUrl ? `<a class="dresta-source-link" href="${firstUrl}" target="_blank" rel="noopener">Lihat Sumber Jurnal / Literatur</a>` : ''}
        <div class="card-actions">
          <button class="btn btn-outline" data-feedback-id="${d.id_catatan}" data-feedback-tab="Catatan_Dresta" data-feedback-title="Dresta ${d.wilayah} (${d.soroh_atau_desa_khusus})" data-feedback-region="${d.wilayah}">Koreksi / Tambah Piteket ${d.wilayah}</button>
        </div>
      </article>
    `;
    }).join('')}</div>`;
  } else if (state.tab === 'dewasa') {
    const items = state.dewasa.filter((d) =>
      !q || `${d.nama_dewasa} ${d.kategori} ${d.arti_ringkas} ${d.cocok_untuk}`.toLowerCase().includes(q)
    );
    container.innerHTML = `<div class="cards-grid">${items.map((d) => `
      <article class="card">
        <div class="card-meta">
          <span class="tag ${d.sifat === 'Ayu' ? 'pill-ok' : 'pill-utpatti'}">${d.sifat}</span>
          <span class="tag pill-yadnya">${d.kategori}</span>
          <span class="tag ${statusClass(d.status_verifikasi)}">${d.status_verifikasi}</span>
        </div>
        <h3>${d.nama_dewasa}</h3>
        <p><strong>Arti:</strong> ${d.arti_ringkas}</p>
        <p><strong>Cocok untuk:</strong> ${d.cocok_untuk}</p>
        <p><strong>Hindari:</strong> ${d.hindari_untuk}</p>
        <p><em>Catatan Wariga: ${d.catatan_wariga}</em></p>
        <div class="card-actions">
          <button class="btn btn-outline" data-feedback-id="${d.id}" data-feedback-tab="Dewasa_Ayu" data-feedback-title="${d.nama_dewasa}">Koreksi / Tambah Piteket</button>
        </div>
      </article>
    `).join('')}</div>`;
  } else if (state.tab === 'aksara') {
    const items = state.glosarium.filter((g) =>
      !q || `${g.istilah_bali} ${g.arti_indonesia} ${g.kategori}`.toLowerCase().includes(q)
    );
    container.innerHTML = `<div class="cards-grid">${items.map((g) => `
      <article class="card">
        <div class="card-meta">
          <span class="tag pill-yadnya">${g.kategori}</span>
          <span class="tag ${statusClass(g.status_verifikasi)}">${g.status_verifikasi}</span>
        </div>
        <div class="card-aksara aksara" style="font-size:1.5rem;">${g.aksara_bali_unicode}</div>
        <h3>${g.istilah_bali} <span style="font-weight:400;color:#66584D;font-size:0.85rem;">(${g.pelafalan})</span></h3>
        <p>${g.arti_indonesia}</p>
        <p><em>"${g.contoh_penggunaan}"</em></p>
        <div class="card-actions">
          <button class="btn btn-outline" data-feedback-id="${g.id}" data-feedback-tab="Glosarium_Aksara" data-feedback-title="${g.istilah_bali}">Koreksi Aksara / Arti</button>
        </div>
      </article>
    `).join('')}</div>`;
  }
}

function buildDrestaCard(label, regionName, topicId, fallbackText) {
  const matches = state.dresta.filter((d) => d.id_topik === topicId && d.wilayah === regionName);
  if (matches.length) {
    return matches.map((m) => {
      const firstUrl = (m.sumber_referensi || '').split('|')[0].trim();
      return `
      <div class="dresta-card">
        <strong>${label}: ${m.wilayah} (${m.soroh_atau_desa_khusus})</strong>
        <p>${m.catatan_dresta}</p>
        <div style="margin-top:6px;">
          <span class="tag pill-warn" style="font-size:0.72rem;">${m.status_verifikasi}</span>
          ${firstUrl ? `<br/><a class="dresta-source-link" href="${firstUrl}" target="_blank" rel="noopener">Sumber Jurnal / Literatur</a>` : ''}
        </div>
      </div>
    `;
    }).join('');
  }
  if (fallbackText && (regionName === 'Denpasar' || regionName === 'Badung' || regionName === 'Karangasem')) {
    return `
      <div class="dresta-card">
        <strong>${label}: ${regionName}</strong>
        <p>${fallbackText}</p>
      </div>
    `;
  }
  return `
    <div class="dresta-empty">
      <strong>${label}: ${regionName}</strong><br/>
      Belum ada catatan literatur/dresta spesifik untuk <strong>${regionName}</strong> pada topik ini. Punya piteket dari orang tua atau desa adat di ${regionName}?
      <div style="margin-top:8px;">
        <button class="btn btn-outline" data-inline-dresta-fb="${regionName}">+ Tambah Piteket ${regionName}</button>
      </div>
    </div>
  `;
}

function openGuideModal(id) {
  const item = state.guides.find((g) => g.id === id);
  if (!item) return;
  const links = (item.sumber_referensi || '')
    .split('|')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u, i) => `<a href="${u}" target="_blank" rel="noopener">Sumber ${i + 1}</a>`)
    .join(' · ');

  const domFallback = (state.domisili === 'Denpasar' || state.domisili === 'Badung') ? item.catatan_denpasar_badung : '';
  const kawFallback = state.kawitan === 'Karangasem' ? item.catatan_kawitan_karangasem : '';

  document.getElementById('detail-title').textContent = item.judul;
  document.getElementById('detail-aksara').textContent = item.aksara_bali || '';
  document.getElementById('detail-body').innerHTML = `
    <div class="card-meta" style="margin-bottom:14px;">
      <span class="tag ${cycleClass(item.siklus_tri_kona)}">${item.siklus_tri_kona}</span>
      <span class="tag pill-yadnya">${item.panca_yadnya}</span>
      <span class="tag ${statusClass(item.status_verifikasi)}">${item.status_verifikasi}</span>
    </div>
    <div class="layer-block">
      <h4>1. Tattwa (Filosofi & Makna)</h4>
      <p>${item.tattwa_filosofi}</p>
    </div>
    <div class="layer-block">
      <h4>2. Susila & Etika Praktis</h4>
      <p>${item.susila_etika_praktis}</p>
    </div>
    <div class="layer-block">
      <h4>3. Upacara (Gambaran Umum)</h4>
      <p>${item.upacara_gambaran_umum}</p>
    </div>
    <div class="layer-block">
      <h4>4. Desa Kala Patra (Sesuai Profil Anda: Domisili ${state.domisili} · Kawitan ${state.kawitan})</h4>
      <div class="dresta-grid">
        ${buildDrestaCard('Domisili', state.domisili, item.id, domFallback)}
        ${buildDrestaCard('Kawitan', state.kawitan, item.id, kawFallback)}
      </div>
    </div>
    <div class="elder-box">
      <strong>🙏 Tanyakan ke Orang Tua / Kelian Banjar / Jero Mangku:</strong>
      <p style="margin:6px 0 0;white-space:pre-line;">${item.tanyakan_ke_tetua}</p>
    </div>
    <p style="font-size:0.82rem;color:#66584D;margin-top:12px;">Referensi: ${links || 'Catatan Keluarga'} · Diperbarui: ${item.terakhir_diperbarui}</p>
    <div style="margin-top:14px;">
      <button class="btn btn-primary" id="modal-feedback-trigger">Kirim Piteket / Koreksi untuk Topik Ini</button>
    </div>
  `;

  document.getElementById('modal-feedback-trigger').onclick = () => {
    closeModal('detail-modal');
    openFeedbackModal(item.id, item.siklus_tri_kona, item.judul, `${state.domisili} / ${state.kawitan}`);
  };
  document.querySelectorAll('[data-inline-dresta-fb]').forEach((btn) => {
    btn.onclick = () => {
      const reg = btn.dataset.inlineDrestaFb;
      closeModal('detail-modal');
      openFeedbackModal(item.id, 'Catatan_Dresta', `${item.judul} — ${reg}`, reg);
    };
  });
  document.getElementById('detail-modal').classList.add('open');
}

function openFeedbackModal(id, tab, title, preselectRegion) {
  state.activeFeedbackTopic = { id, tab, title };
  document.getElementById('fb-topic-display').textContent = `${title} (${id})`;
  const drestaSelect = document.getElementById('fb-dresta');
  if (preselectRegion && REGIONS.includes(preselectRegion)) {
    drestaSelect.value = preselectRegion;
  } else {
    drestaSelect.value = state.domisili;
  }
  document.getElementById('feedback-modal').classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const payload = {
    nama_pengirim: document.getElementById('fb-name').value.trim(),
    hubungan_keluarga: document.getElementById('fb-relation').value,
    tab_terkait: state.activeFeedbackTopic?.tab || 'Umum',
    id_topik: state.activeFeedbackTopic?.id || 'umum',
    judul_topik: state.activeFeedbackTopic?.title || 'Masukan Umum',
    asal_dresta: document.getElementById('fb-dresta').value,
    isi_masukan_atau_koreksi: document.getElementById('fb-text').value.trim()
  };

  if (!payload.nama_pengirim || !payload.isi_masukan_atau_koreksi) {
    showToast('Mohon isi nama dan masukan/koreksi terlebih dahulu.');
    return;
  }

  if (PITEKET_CONFIG.appsScriptWebAppUrl) {
    try {
      await fetch(PITEKET_CONFIG.appsScriptWebAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      showToast('Suksma! Piteket Anda sudah terkirim ke Google Sheet keluarga.');
      document.getElementById('feedback-form').reset();
      closeModal('feedback-modal');
      return;
    } catch (err) {
      console.error(err);
    }
  }

  const waText = `[PITEKET KELUARGA]\nTopik: ${payload.judul_topik} (${payload.id_topik})\nDari: ${payload.nama_pengirim} (${payload.hubungan_keluarga})\nDresta: ${payload.asal_dresta}\nMasukan: ${payload.isi_masukan_atau_koreksi}`;
  try {
    await navigator.clipboard.writeText(waText);
    showToast('Teks piteket disalin! Tempel ke grup WhatsApp keluarga.');
  } catch {
    alert(waText);
  }
  closeModal('feedback-modal');
}

function switchTab(tabName) {
  state.tab = tabName;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.getElementById('cycle-filter').style.display = tabName === 'panduan' ? 'inline-block' : 'none';
  renderContent();
}

document.addEventListener('DOMContentLoaded', () => {
  const domSelect = document.getElementById('select-domisili');
  const kawSelect = document.getElementById('select-kawitan');
  const fbDresta = document.getElementById('fb-dresta');

  REGIONS.forEach((r) => {
    domSelect.add(new Option(r, r));
    kawSelect.add(new Option(r, r));
    fbDresta.add(new Option(r, r));
  });
  fbDresta.add(new Option('Keduanya / Umum', 'Keduanya / Umum'));

  domSelect.value = state.domisili;
  kawSelect.value = state.kawitan;
  updateRegionBadge();

  domSelect.addEventListener('change', (e) => {
    state.domisili = e.target.value;
    localStorage.setItem('piteket_domisili', state.domisili);
    updateRegionBadge();
    renderContent();
    showToast(`Domisili diatur ke ${state.domisili}`);
  });

  kawSelect.addEventListener('change', (e) => {
    state.kawitan = e.target.value;
    localStorage.setItem('piteket_kawitan', state.kawitan);
    updateRegionBadge();
    renderContent();
    showToast(`Kawitan diatur ke ${state.kawitan}`);
  });

  const datePicker = document.getElementById('date-picker');
  datePicker.value = todayIso;
  renderCalendar(todayIso);
  datePicker.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split('-').map(Number);
    state.selectedIso = val;
    state.calYear = parts[0];
    state.calMonth = parts[1] - 1;
    renderCalendar(val);
    if (state.tab === 'kalender') renderContent();
  });

  document.getElementById('jump-calendar-btn').addEventListener('click', () => {
    switchTab('kalender');
    document.getElementById('content-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderContent();
  });

  document.getElementById('cycle-filter').addEventListener('change', (e) => {
    state.cycleFilter = e.target.value;
    renderContent();
  });

  document.getElementById('content-area').addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-guide]');
    if (openBtn) openGuideModal(openBtn.dataset.openGuide);
    const fbBtn = e.target.closest('[data-feedback-id]');
    if (fbBtn) {
      openFeedbackModal(
        fbBtn.dataset.feedbackId,
        fbBtn.dataset.feedbackTab,
        fbBtn.dataset.feedbackTitle,
        fbBtn.dataset.feedbackRegion
      );
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);

  loadData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
