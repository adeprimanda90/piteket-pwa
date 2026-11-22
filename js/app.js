import { PITEKET_CONFIG } from './config.js';
import { getBalineseCalendarInfo } from './calendar-engine.js';

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
  activeFeedbackTopic: null
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
    fetch('./data/utpatti.json').then((r) => r.json()),
    fetch('./data/sthiti.json').then((r) => r.json()),
    fetch('./data/pralina.json').then((r) => r.json()),
    fetch('./data/catatan-dresta.json').then((r) => r.json()).catch(() => []),
    fetch('./data/dewasa-ayu.json').then((r) => r.json()),
    fetch('./data/glosarium-aksara.json').then((r) => r.json())
  ]);
  state.guides = [...u, ...s, ...p];
  state.dresta = dr;
  state.dewasa = d;
  state.glosarium = g;
  renderContent();
}

function renderCalendar(dateStr) {
  const dateObj = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const info = getBalineseCalendarInfo(dateObj);
  document.getElementById('cal-wewaran').textContent = `${info.saptaWara} ${info.pancaWara}`;
  document.getElementById('cal-triwara').textContent = `${info.triWara} · Urip ${info.urip}`;
  document.getElementById('cal-wuku').textContent = `${info.wuku} (Ingkel ${info.ingkel})`;
  document.getElementById('cal-sasih').textContent = info.sasih + (info.penanggal ? ` · ${info.penanggal}` : '');
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
  }
  if (info.dewasa.length) {
    info.dewasa.slice(0, 4).forEach((d) => {
      const span = document.createElement('span');
      span.className = 'tag tag-rahinan';
      span.textContent = d;
      tagsEl.appendChild(span);
    });
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

function renderContent() {
  const container = document.getElementById('content-area');
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
    container.innerHTML = `<div class="cards-grid">${prioritized.map((d) => `
      <article class="card">
        <div class="card-meta">
          <span class="tag ${cycleClass(d.siklus)}">${d.wilayah}</span>
          <span class="tag pill-yadnya">${d.peran_konteks} · ${d.siklus}</span>
          <span class="tag ${statusClass(d.status_verifikasi)}">${d.status_verifikasi}</span>
        </div>
        <h3>${d.wilayah} — ${d.soroh_atau_desa_khusus}</h3>
        <p>${d.catatan_dresta}</p>
        ${d.sumber_referensi ? `<a class="dresta-source-link" href="${d.sumber_referensi}" target="_blank" rel="noopener">Lihat Sumber Jurnal / Literatur</a>` : ''}
        <div class="card-actions">
          <button class="btn btn-outline" data-feedback-id="${d.id_catatan}" data-feedback-tab="Catatan_Dresta" data-feedback-title="Dresta ${d.wilayah} (${d.soroh_atau_desa_khusus})" data-feedback-region="${d.wilayah}">Koreksi / Tambah Piteket ${d.wilayah}</button>
        </div>
      </article>
    `).join('')}</div>`;
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
    return matches.map((m) => `
      <div class="dresta-card">
        <strong>${label}: ${m.wilayah} (${m.soroh_atau_desa_khusus})</strong>
        <p>${m.catatan_dresta}</p>
        <div style="margin-top:6px;">
          <span class="tag pill-warn" style="font-size:0.72rem;">${m.status_verifikasi}</span>
          ${m.sumber_referensi ? `<br/><a class="dresta-source-link" href="${m.sumber_referensi}" target="_blank" rel="noopener">Sumber Jurnal / Literatur</a>` : ''}
        </div>
      </div>
    `).join('');
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const datePicker = document.getElementById('date-picker');
  datePicker.value = todayStr;
  renderCalendar(todayStr);
  datePicker.addEventListener('change', (e) => renderCalendar(e.target.value));

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tab = btn.dataset.tab;
      document.getElementById('cycle-filter').style.display = state.tab === 'panduan' ? 'inline-block' : 'none';
      renderContent();
    });
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
