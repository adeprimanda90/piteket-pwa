import { PITEKET_CONFIG } from './config.js';
import {
  SAPTA_WARA,
  getBalineseCalendarInfo,
  getMonthCalendar,
  getUpcomingRahinan,
  calculateOtonan,
  formatIsoDate
} from './calendar-engine.js';
import { evaluateAlaAyuningDewasa, findGoodDaysInMonth } from './dewasa-engine.js';
import { buildIcsContent, downloadIcsFile } from './ics-export.js';
import { DEFAULT_CHECKLISTS } from './checklists.js';
import { AuthApi, getSavedSession, saveSession, getGoogleClientId } from './auth-sync.js';
import { runSmartSearch, buildAiContextPayload } from './smart-search.js';

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
  // Kalender & Otonan
  calYear: nowDate.getFullYear(),
  calMonth: nowDate.getMonth(),
  calViewMode: localStorage.getItem('piteket_cal_view') || 'classic',
  dewasaFinderCat: 'usaha',
  selectedIso: todayIso,
  rahinanFilter: 'ALL',
  otonanBirthDate: localStorage.getItem('piteket_last_otonan_birth') || todayIso,
  otonanName: '',
  reminderCategory: 'otonan',
  reminderRepeat: true,
  reminderRecurType: 'pawukon_210',
  familyOtonan: loadJsonStorage('piteket_family_otonan', []),
  // Ceklis
  checklistChecked: loadJsonStorage('piteket_checklist_checked', {}),
  checklistCustom: loadJsonStorage('piteket_checklist_custom', {}),
  // Tahap B: Akun & Pengingat Otonan Langsung
  session: getSavedSession(), // { token, user: { userId, username, email } }
  remindersEnabled: localStorage.getItem('piteket_reminders_enabled') !== 'false',
  syncStatus: '',
  authView: 'login',
  pendingAuthEmail: ''
};

let syncTimer = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3400);
}

function updateRegionBadge() {
  document.getElementById('region-label').textContent = `Domisili: ${state.domisili} · Kawitan: ${state.kawitan}`;
}


const RECUR_LABELS = {
  pawukon_210: 'Otonan / Odalan Pawukon (tiap 210 hari)',
  sasih_once: 'Odalan Sasih / Purnama-Tilem (tanpa ulang 210 hari)',
  yearly: 'Tahunan Masehi (tiap 1 tahun)',
  once: 'Upacara / Acara Sekali Saja'
};

function computeReminderNext(item, refIso) {
  const recur = item.recur || 'pawukon_210';
  const baseIso = item.birthDate || item.date;
  if (recur === 'pawukon_210') {
    const calc = calculateOtonan(baseIso, refIso, 1);
    const nxt = calc.upcoming[0];
    return {
      recur,
      recurLabel: 'Berulang tiap 210 hari',
      subLabel: `${calc.wewaran} ${calc.wuku}`,
      nextIso: nxt.isoDate,
      nextIndo: nxt.indoDate,
      daysUntil: nxt.daysUntil,
      isPast: false
    };
  }
  const [y, m, d] = baseIso.split('-').map(Number);
  const [ty, tm, td] = refIso.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  if (recur === 'yearly') {
    let targetY = ty;
    let candUtc = Date.UTC(targetY, m - 1, d);
    if (candUtc < todayUtc) {
      targetY += 1;
      candUtc = Date.UTC(targetY, m - 1, d);
    }
    const nextIso = `${targetY}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const info = getBalineseCalendarInfo(nextIso);
    return {
      recur,
      recurLabel: 'Berulang tiap 1 tahun',
      subLabel: `${info.saptaWara} ${info.pancaWara} ${info.wuku}`,
      nextIso,
      nextIndo: info.indoDate,
      daysUntil: Math.round((candUtc - todayUtc) / 86400000),
      isPast: false
    };
  }
  const baseUtc = Date.UTC(y, m - 1, d);
  const diff = Math.round((baseUtc - todayUtc) / 86400000);
  const info = getBalineseCalendarInfo(baseIso);
  return {
    recur,
    recurLabel: recur === 'sasih_once' ? 'Odalan Sasih (sekali / cek ulang Sasih berikutnya)' : 'Sekali saja',
    subLabel: `${info.saptaWara} ${info.pancaWara} ${info.wuku} · ${info.sasih}`,
    nextIso: baseIso,
    nextIndo: info.indoDate,
    daysUntil: diff,
    isPast: diff < 0
  };
}

function buildGoogleCalendarUrl(item, nextInfo) {
  const iso = nextInfo.nextIso;
  const [y, m, d] = iso.split('-').map(Number);
  const startStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  const endDate = new Date(Date.UTC(y, m - 1, d + 1));
  const endStr = `${endDate.getUTCFullYear()}${String(endDate.getUTCMonth() + 1).padStart(2, '0')}${String(endDate.getUTCDate()).padStart(2, '0')}`;

  const title = item.recur && item.recur !== 'pawukon_210'
    ? `[Piteket] ${item.name}`
    : `[Piteket] Otonan / Pawukon: ${item.name}`;
  const details = `Pengingat dari Piteket PWA (https://piteket-pwa.pages.dev)\nJadwal: ${item.name}\nKalender Bali: ${nextInfo.subLabel}\nJenis Pengulangan: ${nextInfo.recurLabel}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details
  });
  if (nextInfo.recur === 'pawukon_210') {
    params.set('recur', 'RRULE:FREQ=DAILY;INTERVAL=210');
  } else if (nextInfo.recur === 'yearly') {
    params.set('recur', 'RRULE:FREQ=YEARLY');
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getNearOtonanAlerts() {
  if (!state.session) return [];
  return state.familyOtonan
    .map((f) => {
      const nxt = computeReminderNext(f, todayIso);
      return { ...f, isPast: nxt.isPast, next: { daysUntil: nxt.daysUntil, indoDate: nxt.nextIndo }, wewaran: nxt.subLabel };
    })
    .filter((x) => !x.isPast && x.next.daysUntil >= 0 && x.next.daysUntil <= 7)
    .sort((a, b) => a.next.daysUntil - b.next.daysUntil);
}

function renderAuthBarAndBanner() {
  const bar = document.getElementById('auth-bar');
  const banner = document.getElementById('otonan-alert-banner');
  const alerts = getNearOtonanAlerts();

  if (state.session && state.session.user) {
    const bellBadge = alerts.length ? `<span class="bell-count">${alerts.length}</span>` : '';
    bar.innerHTML = `
      <div class="auth-user-pill">
        <span>👤 @${state.session.user.username}</span>
        <button type="button" class="btn-hero-bell" id="hero-bell-btn" title="Pengingat Otonan">🔔${bellBadge}</button>
        <button type="button" class="btn-hero-logout" id="hero-logout-btn">Keluar</button>
      </div>
    `;
    document.getElementById('hero-bell-btn').onclick = () => {
      switchTab('kalender');
      setTimeout(() => {
        const el = document.getElementById('otonan-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    };
    document.getElementById('hero-logout-btn').onclick = () => {
      state.session = null;
      saveSession(null);
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      state.syncStatus = '';
      renderAuthBarAndBanner();
      renderContent();
      showToast('Anda telah keluar dari akun.');
    };
  } else {
    bar.innerHTML = `<button type="button" class="btn-hero-auth" id="open-auth-btn">Masuk / Daftar Akun</button>`;
    document.getElementById('open-auth-btn').onclick = () => openAuthModal('login');
  }

  if (state.session && alerts.length) {
    banner.style.display = 'block';
    banner.innerHTML = `
      <strong>🔔 Pengingat Otonan Terdekat (${alerts.length}):</strong>
      ${alerts.map((a) => `<span><strong>${a.name}</strong> (${a.next.daysUntil === 0 ? 'HARI INI' : `H-${a.next.daysUntil}`}, ${a.next.indoDate})</span>`).join(' · ')}
    `;
  } else {
    banner.style.display = 'none';
  }
}

function persistLocalUserState() {
  localStorage.setItem('piteket_domisili', state.domisili);
  localStorage.setItem('piteket_kawitan', state.kawitan);
  localStorage.setItem('piteket_family_otonan', JSON.stringify(state.familyOtonan));
  localStorage.setItem('piteket_checklist_checked', JSON.stringify(state.checklistChecked));
  localStorage.setItem('piteket_checklist_custom', JSON.stringify(state.checklistCustom));
  localStorage.setItem('piteket_reminders_enabled', String(state.remindersEnabled));
}

function scheduleCloudSync() {
  persistLocalUserState();
  renderAuthBarAndBanner();
  if (!state.session || !state.session.token) return;

  state.syncStatus = 'Menyinkronkan ke akun...';
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const res = await AuthApi.syncSave(state.session.token, {
        domisili: state.domisili,
        kawitan: state.kawitan,
        remindersEnabled: state.remindersEnabled,
        familyOtonan: state.familyOtonan,
        checklistChecked: state.checklistChecked,
        checklistCustom: state.checklistCustom
      });
      if (res.ok) {
        state.syncStatus = `Tersinkron ke @${state.session.user.username}`;
      } else {
        state.syncStatus = 'Gagal sinkronisasi (cek sesi login)';
      }
      const badge = document.getElementById('sync-status-label');
      if (badge) badge.textContent = state.syncStatus;
    } catch {
      state.syncStatus = 'Offline — tersimpan lokal, akan disinkronkan saat online.';
      const badge = document.getElementById('sync-status-label');
      if (badge) badge.textContent = state.syncStatus;
    }
  }, 600);
}

function applyCloudData(cloud) {
  if (!cloud) return;
  if (cloud.domisili && REGIONS.includes(cloud.domisili)) state.domisili = cloud.domisili;
  if (cloud.kawitan && REGIONS.includes(cloud.kawitan)) state.kawitan = cloud.kawitan;
  state.remindersEnabled = cloud.remindersEnabled !== false;
  if (Array.isArray(cloud.familyOtonan)) state.familyOtonan = cloud.familyOtonan;
  if (cloud.checklistChecked && typeof cloud.checklistChecked === 'object') state.checklistChecked = cloud.checklistChecked;
  if (cloud.checklistCustom && typeof cloud.checklistCustom === 'object') state.checklistCustom = cloud.checklistCustom;

  persistLocalUserState();
  const domSel = document.getElementById('select-domisili');
  const kawSel = document.getElementById('select-kawitan');
  if (domSel) domSel.value = state.domisili;
  if (kawSel) kawSel.value = state.kawitan;
  updateRegionBadge();
}


let googleGsiInitialized = false;

async function handleGoogleCredentialResponse(response) {
  const msg = document.getElementById('auth-msg');
  if (!response || !response.credential) {
    if (msg) msg.textContent = 'Login Google dibatalkan.';
    return;
  }
  if (msg) msg.textContent = 'Memverifikasi akun Google...';
  try {
    const res = await AuthApi.googleLogin(response.credential);
    if (!res.ok) {
      if (msg) msg.textContent = res.error || 'Gagal masuk dengan Google.';
      return;
    }
    state.session = { token: res.token, user: res.user };
    saveSession(state.session);
    if (res.cloud) applyCloudData(res.cloud);
    else scheduleCloudSync();
    state.syncStatus = `Tersinkron ke @${res.user.username}`;
    closeModal('auth-modal');
    renderAuthBarAndBanner();
    renderContent();
    showToast(res.isNewUser
      ? `Akun Google @${res.user.username} siap! Catatan Anda kini tersinkron.`
      : `Rahajeng rauh, @${res.user.username}!`);
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

function mountGoogleSignInButton(modeText = 'signin_with', attempt = 0) {
  const clientId = getGoogleClientId();
  const wrap = document.getElementById('google-auth-wrap');
  const slot = document.getElementById('google-btn-slot');
  if (!wrap || !slot) return;
  if (!clientId) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  if (window.google && window.google.accounts && window.google.accounts.id) {
    if (!googleGsiInitialized) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false
      });
      googleGsiInitialized = true;
    }
    slot.innerHTML = '';
    const btnWidth = Math.min(340, Math.max(240, wrap.clientWidth || 320));
    window.google.accounts.id.renderButton(slot, {
      theme: 'outline',
      size: 'large',
      text: modeText,
      shape: 'pill',
      width: btnWidth,
      locale: 'id'
    });
    return;
  }

  if (attempt < 12) {
    setTimeout(() => mountGoogleSignInButton(modeText, attempt + 1), 250);
  } else {
    slot.innerHTML = '<div class="google-offline-note">Tombol Google memerlukan koneksi internet. Gunakan form di bawah saat offline.</div>';
  }
}

// ======================= MODAL AKUN (LOGIN / DAFTAR / OTP / LUPA PW) =========
function openAuthModal(view = 'login') {
  state.authView = view;
  renderAuthModalBody();
  document.getElementById('auth-modal').classList.add('open');
}

function renderAuthModalBody() {
  const titleEl = document.getElementById('auth-modal-title');
  const subEl = document.getElementById('auth-modal-sub');
  const bodyEl = document.getElementById('auth-modal-body');

  if (state.authView === 'login') {
    titleEl.textContent = 'Masuk ke Akun Piteket';
    subEl.textContent = 'Catatan Otonan, Ceklis, dan Profil Dresta Anda otomatis ikut di perangkat mana pun.';
    bodyEl.innerHTML = `
      <div id="google-auth-wrap" class="google-auth-wrap" style="display:none;">
        <div id="google-btn-slot" class="google-btn-slot"></div>
        <div class="auth-divider">atau dengan email &amp; password</div>
      </div>
      <form id="auth-login-form">
        <div class="form-group">
          <label for="login-id">Email atau Username</label>
          <input id="login-id" type="text" placeholder="contoh@gmail.com atau username" required />
        </div>
        <div class="form-group">
          <label for="login-pw">Password</label>
          <input id="login-pw" type="password" placeholder="Masukkan password Anda" required />
        </div>
        <div id="auth-msg" class="auth-msg"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Masuk</button>
      </form>
      <div class="auth-links">
        <button type="button" class="link-btn" id="goto-forgot">Lupa Password?</button>
        <button type="button" class="link-btn" id="goto-register">Belum punya akun? Daftar</button>
      </div>
    `;
    mountGoogleSignInButton('signin_with');
    document.getElementById('goto-forgot').onclick = () => { state.authView = 'forgot'; renderAuthModalBody(); };
    document.getElementById('goto-register').onclick = () => { state.authView = 'register'; renderAuthModalBody(); };
    document.getElementById('auth-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('auth-msg');
      msg.textContent = 'Memeriksa akun...';
      try {
        const res = await AuthApi.login(
          document.getElementById('login-id').value.trim(),
          document.getElementById('login-pw').value
        );
        if (!res.ok) {
          if (res.needsVerification && res.email) {
            state.pendingAuthEmail = res.email;
            state.authView = 'verify';
            renderAuthModalBody();
            showToast(res.error);
            return;
          }
          msg.textContent = res.error || 'Gagal masuk.';
          return;
        }
        state.session = { token: res.token, user: res.user };
        saveSession(state.session);
        if (res.cloud) applyCloudData(res.cloud);
        else scheduleCloudSync();
        state.syncStatus = `Tersinkron ke @${res.user.username}`;
        closeModal('auth-modal');
        renderAuthBarAndBanner();
        renderContent();
        showToast(`Rahajeng rauh, @${res.user.username}!`);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  } else if (state.authView === 'register') {
    titleEl.textContent = 'Daftar Akun Piteket';
    subEl.textContent = 'Kode konfirmasi 6 digit akan dikirim langsung ke email Anda.';
    bodyEl.innerHTML = `
      <div id="google-auth-wrap" class="google-auth-wrap" style="display:none;">
        <div id="google-btn-slot" class="google-btn-slot"></div>
        <div class="auth-divider">atau dengan email &amp; password</div>
      </div>
      <form id="auth-reg-form">
        <div class="form-group">
          <label for="reg-user">Username</label>
          <input id="reg-user" type="text" placeholder="Minimal 3 karakter (contoh: bimasena)" minlength="3" required />
        </div>
        <div class="form-group">
          <label for="reg-email">Email Aktif</label>
          <input id="reg-email" type="email" placeholder="nama@email.com" required />
        </div>
        <div class="form-group">
          <label for="reg-pw">Password</label>
          <input id="reg-pw" type="password" placeholder="Minimal 6 karakter" minlength="6" required />
        </div>
        <div id="auth-msg" class="auth-msg"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Daftar & Kirim Kode Konfirmasi</button>
      </form>
      <div class="auth-links">
        <button type="button" class="link-btn" id="goto-login">Sudah punya akun? Masuk</button>
      </div>
    `;
    mountGoogleSignInButton('signup_with');
    document.getElementById('goto-login').onclick = () => { state.authView = 'login'; renderAuthModalBody(); };
    document.getElementById('auth-reg-form').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('auth-msg');
      const email = document.getElementById('reg-email').value.trim();
      msg.textContent = 'Mengirim kode konfirmasi ke email Anda...';
      try {
        const res = await AuthApi.register(
          document.getElementById('reg-user').value.trim(),
          email,
          document.getElementById('reg-pw').value
        );
        if (!res.ok) {
          msg.textContent = res.error || 'Pendaftaran gagal.';
          return;
        }
        state.pendingAuthEmail = email;
        state.authView = 'verify';
        renderAuthModalBody();
        showToast(res.message);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  } else if (state.authView === 'verify') {
    titleEl.textContent = 'Konfirmasi Email';
    subEl.textContent = `Masukkan kode 6 digit yang dikirim ke ${state.pendingAuthEmail || 'email Anda'} (cek juga folder Spam).`;
    bodyEl.innerHTML = `
      <form id="auth-verify-form">
        <div class="form-group">
          <label for="ver-email">Email</label>
          <input id="ver-email" type="email" value="${state.pendingAuthEmail}" required />
        </div>
        <div class="form-group">
          <label for="ver-otp">Kode Konfirmasi 6 Digit</label>
          <input id="ver-otp" type="text" inputmode="numeric" maxlength="6" placeholder="123456" required />
        </div>
        <div id="auth-msg" class="auth-msg"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Aktifkan Akun & Masuk</button>
      </form>
      <div class="auth-links">
        <button type="button" class="link-btn" id="goto-login">Kembali ke Masuk</button>
      </div>
    `;
    document.getElementById('goto-login').onclick = () => { state.authView = 'login'; renderAuthModalBody(); };
    document.getElementById('auth-verify-form').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('auth-msg');
      msg.textContent = 'Memverifikasi kode...';
      try {
        const res = await AuthApi.verifyEmail(
          document.getElementById('ver-email').value.trim(),
          document.getElementById('ver-otp').value.trim()
        );
        if (!res.ok) {
          msg.textContent = res.error || 'Verifikasi gagal.';
          return;
        }
        state.session = { token: res.token, user: res.user };
        saveSession(state.session);
        scheduleCloudSync(); // Unggah data lokal awal ke akun baru
        closeModal('auth-modal');
        renderAuthBarAndBanner();
        renderContent();
        showToast(`Akun @${res.user.username} aktif! Catatan Anda kini tersinkron.`);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  } else if (state.authView === 'forgot') {
    titleEl.textContent = 'Lupa Password';
    subEl.textContent = 'Kami akan mengirimkan kode sementara 6 digit ke email terdaftar Anda.';
    bodyEl.innerHTML = `
      <form id="auth-forgot-form">
        <div class="form-group">
          <label for="fg-email">Email Terdaftar</label>
          <input id="fg-email" type="email" placeholder="nama@email.com" value="${state.pendingAuthEmail}" required />
        </div>
        <div id="auth-msg" class="auth-msg"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Kirim Kode Sementara</button>
      </form>
      <div class="auth-links">
        <button type="button" class="link-btn" id="goto-reset">Sudah punya kode? Reset Password</button>
        <button type="button" class="link-btn" id="goto-login">Kembali ke Masuk</button>
      </div>
    `;
    document.getElementById('goto-reset').onclick = () => { state.authView = 'reset'; renderAuthModalBody(); };
    document.getElementById('goto-login').onclick = () => { state.authView = 'login'; renderAuthModalBody(); };
    document.getElementById('auth-forgot-form').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('auth-msg');
      const email = document.getElementById('fg-email').value.trim();
      msg.textContent = 'Mengirim kode sementara ke email Anda...';
      try {
        const res = await AuthApi.forgotPassword(email);
        if (!res.ok) {
          msg.textContent = res.error || 'Gagal mengirim kode.';
          return;
        }
        state.pendingAuthEmail = email;
        state.authView = 'reset';
        renderAuthModalBody();
        showToast(res.message);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  } else if (state.authView === 'reset') {
    titleEl.textContent = 'Buat Password Baru';
    subEl.textContent = 'Masukkan kode sementara 6 digit dari email dan password baru Anda.';
    bodyEl.innerHTML = `
      <form id="auth-reset-form">
        <div class="form-group">
          <label for="rs-email">Email</label>
          <input id="rs-email" type="email" value="${state.pendingAuthEmail}" required />
        </div>
        <div class="form-group">
          <label for="rs-otp">Kode Sementara 6 Digit</label>
          <input id="rs-otp" type="text" inputmode="numeric" maxlength="6" placeholder="123456" required />
        </div>
        <div class="form-group">
          <label for="rs-pw">Password Baru (min. 6 karakter)</label>
          <input id="rs-pw" type="password" minlength="6" required />
        </div>
        <div id="auth-msg" class="auth-msg"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Simpan Password Baru</button>
      </form>
      <div class="auth-links">
        <button type="button" class="link-btn" id="goto-login">Kembali ke Masuk</button>
      </div>
    `;
    document.getElementById('goto-login').onclick = () => { state.authView = 'login'; renderAuthModalBody(); };
    document.getElementById('auth-reset-form').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('auth-msg');
      msg.textContent = 'Memperbarui password...';
      try {
        const res = await AuthApi.resetPassword(
          document.getElementById('rs-email').value.trim(),
          document.getElementById('rs-otp').value.trim(),
          document.getElementById('rs-pw').value
        );
        if (!res.ok) {
          msg.textContent = res.error || 'Gagal reset password.';
          return;
        }
        state.authView = 'login';
        renderAuthModalBody();
        showToast(res.message);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  }
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

  // Muat sinkronisasi akun di latar belakang jika sudah login
  if (state.session && state.session.token) {
    try {
      const res = await AuthApi.syncLoad(state.session.token);
      if (res.ok && res.cloud) {
        applyCloudData(res.cloud);
        state.syncStatus = `Tersinkron ke @${state.session.user.username}`;
        renderAuthBarAndBanner();
        renderContent();
      }
    } catch {
      state.syncStatus = 'Mode Offline (catatan lokal aktif)';
    }
  }
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
    description: `${r.name} (${r.wewaran}) — Diekspor dari Piteket PWA.`,
    alarmDaysBefore: [1]
  }));
  const labelMap = { ALL: 'Semua Rahinan', MAJOR: 'Hari Raya & Tumpek', LUNAR: 'Purnama & Tilem' };
  const ics = buildIcsContent(`Piteket — ${labelMap[state.rahinanFilter] || 'Rahinan'}`, events);
  downloadIcsFile(`piteket-rahinan-${state.rahinanFilter.toLowerCase()}.ics`, ics);
  showToast(`File .ics berisi ${events.length} jadwal Rahinan diunduh!`);
}

function renderClassicVerticalGrid(monthData) {
  const weeks = monthData.weeks;
  const colTemplate = `78px repeat(${weeks.length}, minmax(56px, 1fr))`;

  const headerRow = `
    <div class="kb-row kb-head" style="grid-template-columns:${colTemplate};">
      <div class="kb-day-label kb-corner">Wuku &rarr;</div>
      ${weeks.map((w) => `<div class="kb-wuku-head" title="Wuku ${w.wuku}">${w.wukuShort}<small>${w.wuku}</small></div>`).join('')}
    </div>
  `;

  const bodyRows = SAPTA_WARA.map((sw, dowIdx) => {
    const isRedite = dowIdx === 0;
    const cells = weeks.map((w) => {
      const d = w.days[dowIdx];
      if (!d) return '<div class="kb-cell kb-empty"></div>';
      const isToday = d.isoDate === todayIso;
      const isSelected = d.isoDate === state.selectedIso;
      const hasMajor = d.rahinanMajor.length > 0 || d.rahinan.some((r) => r.startsWith('Tumpek'));
      const hasKK = d.rahinan.includes('Kajeng Kliwon');

      const dots = [];
      if (d.isPurnama) dots.push('<span class="mcal-dot dot-purnama" title="Purnama"></span>');
      if (d.isTilem) dots.push('<span class="mcal-dot dot-tilem" title="Tilem"></span>');
      if (hasMajor) dots.push('<span class="mcal-dot dot-major" title="Hari Raya / Tumpek"></span>');
      if (hasKK) dots.push('<span class="mcal-dot dot-kk" title="Kajeng Kliwon"></span>');

      return `
        <button type="button" class="kb-cell ${isRedite ? 'is-redite' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-select-iso="${d.isoDate}">
          <div class="kb-cell-top">
            <span class="kb-tithi">${d.phaseName === 'Penanggal' ? 'P' : 'Pg'}${d.sasihDay}</span>
            <span class="kb-panca">${d.pancaShort}</span>
          </div>
          <div class="kb-num ${hasMajor ? 'is-holiday' : ''}">${d.day}</div>
          <div class="mcal-dots" style="justify-content:center;">${dots.join('')}</div>
        </button>
      `;
    }).join('');

    return `
      <div class="kb-row" style="grid-template-columns:${colTemplate};">
        <div class="kb-day-label ${isRedite ? 'is-redite' : ''}">
          <strong>${sw.indo}</strong>
          <span>${sw.short}</span>
        </div>
        ${cells}
      </div>
    `;
  }).join('');

  return `<div class="kb-table-wrap">${headerRow}${bodyRows}</div>`;
}

function renderStandardMonthGrid(monthData) {
  const leadingBlanks = Array.from({ length: monthData.firstDow }, () => '<div class="mcal-cell mcal-blank"></div>').join('');
  const dayCells = monthData.days.map((d) => {
    const isToday = d.isoDate === todayIso;
    const isSelected = d.isoDate === state.selectedIso;
    const hasMajor = d.rahinanMajor.length > 0 || d.rahinan.some((r) => r.startsWith('Tumpek'));
    const hasKK = d.rahinan.includes('Kajeng Kliwon');

    const dots = [];
    if (d.isPurnama) dots.push('<span class="mcal-dot dot-purnama" title="Purnama"></span>');
    if (d.isTilem) dots.push('<span class="mcal-dot dot-tilem" title="Tilem"></span>');
    if (hasMajor) dots.push('<span class="mcal-dot dot-major" title="Hari Raya / Tumpek"></span>');
    if (hasKK) dots.push('<span class="mcal-dot dot-kk" title="Kajeng Kliwon"></span>');

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

  return `
    <div class="mcal-weekdays">
      <div>Redite<br/><small>Min</small></div>
      <div>Soma<br/><small>Sen</small></div>
      <div>Anggara<br/><small>Sel</small></div>
      <div>Buda<br/><small>Rab</small></div>
      <div>Wraspati<br/><small>Kam</small></div>
      <div>Sukra<br/><small>Jum</small></div>
      <div>Saniscara<br/><small>Sab</small></div>
    </div>
    <div class="mcal-grid">${leadingBlanks}${dayCells}</div>
  `;
}

function renderFase2CalendarTab(container) {
  const monthData = getMonthCalendar(state.calYear, state.calMonth);
  const selectedInfo = getBalineseCalendarInfo(state.selectedIso);
  const dewasaEval = evaluateAlaAyuningDewasa(selectedInfo);
  const goodDays = findGoodDaysInMonth(monthData.days, state.dewasaFinderCat);
  const upcomingRahinan = getUpcomingRahinan(todayIso, 180, state.rahinanFilter).slice(0, 8);
  const otonanResult = state.otonanBirthDate ? calculateOtonan(state.otonanBirthDate, todayIso, 3) : null;
  const isLoggedIn = Boolean(state.session && state.session.user);

  const savedOtonanSorted = state.familyOtonan
    .map((f) => ({ ...f, rem: computeReminderNext(f, todayIso) }))
    .sort((a, b) => (a.rem.isPast ? 99999 : a.rem.daysUntil) - (b.rem.isPast ? 99999 : b.rem.daysUntil));

  container.innerHTML = `
    <div class="fase2-layout">
      <section class="f2-panel">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Kalender Bali Lengkap (10 Wewaran & Ala Ayuning Dewasa)</h3>
            <p class="f2-sub">Pilih tampilan Klasik Cetak Bali (vertikal per Wuku) atau Bulanan. Klik tanggal untuk detail lengkap.</p>
          </div>
          <div class="mcal-nav">
            <button type="button" class="btn btn-outline btn-sm" id="mcal-prev">&larr;</button>
            <strong class="mcal-month-label">${monthData.monthName} ${monthData.year}</strong>
            <button type="button" class="btn btn-outline btn-sm" id="mcal-next">&rarr;</button>
            <button type="button" class="btn btn-primary btn-sm" id="mcal-today">Hari Ini</button>
          </div>
        </div>

        <div class="mcal-toolbar">
          <div class="view-toggle">
            <button type="button" class="btn btn-sm ${state.calViewMode === 'classic' ? 'btn-primary' : 'btn-outline'}" data-cal-view="classic">Mode Cetak Bali (Per Wuku)</button>
            <button type="button" class="btn btn-sm ${state.calViewMode === 'standard' ? 'btn-primary' : 'btn-outline'}" data-cal-view="standard">Mode Bulanan Standar</button>
          </div>
          <div class="mcal-legend" style="margin:0;">
            <span><i class="mcal-dot dot-purnama"></i> Purnama</span>
            <span><i class="mcal-dot dot-tilem"></i> Tilem</span>
            <span><i class="mcal-dot dot-major"></i> Hari Raya / Tumpek</span>
            <span><i class="mcal-dot dot-kk"></i> Kajeng Kliwon</span>
          </div>
        </div>

        ${state.calViewMode === 'classic' ? renderClassicVerticalGrid(monthData) : renderStandardMonthGrid(monthData)}

        <div class="day-detail-box">
          <div class="day-detail-head">
            <div>
              <div class="day-detail-date">${selectedInfo.indoDate}</div>
              <div class="day-detail-bali">${selectedInfo.saptaWara} ${selectedInfo.pancaWara} · Wuku ${selectedInfo.wuku} · ${selectedInfo.sasih} (${selectedInfo.penanggal}) · ${selectedInfo.saka}</div>
            </div>
            <span class="tag pill-yadnya">Urip ${selectedInfo.urip} · Ingkel ${selectedInfo.ingkel}</span>
          </div>

          ${selectedInfo.rahinan.length ? `
            <div class="cal-tags" style="margin-top:10px;">
              ${selectedInfo.rahinan.map((r) => `<span class="tag tag-rahinan">Rahinan: ${r}</span>`).join('')}
            </div>
          ` : ''}

          <div class="wewaran10-grid">
            <div class="w10-item"><span>Penanggal / Pangelong</span><strong>${selectedInfo.penanggal}</strong></div>
            <div class="w10-item"><span>Ekawara</span><strong>${selectedInfo.ekaWara}</strong></div>
            <div class="w10-item"><span>Dwiwara</span><strong>${selectedInfo.dwiWara}</strong></div>
            <div class="w10-item"><span>Triwara</span><strong>${selectedInfo.triWara}</strong></div>
            <div class="w10-item"><span>Caturwara</span><strong>${selectedInfo.caturWara}</strong></div>
            <div class="w10-item"><span>Pancawara</span><strong>${selectedInfo.pancaWara}</strong></div>
            <div class="w10-item"><span>Sadwara</span><strong>${selectedInfo.sadWara}</strong></div>
            <div class="w10-item"><span>Saptawara</span><strong>${selectedInfo.saptaWara}</strong></div>
            <div class="w10-item"><span>Astawara</span><strong>${selectedInfo.astaWara}</strong></div>
            <div class="w10-item"><span>Sangawara</span><strong>${selectedInfo.sangaWara}</strong></div>
            <div class="w10-item"><span>Dasawara</span><strong>${selectedInfo.dasaWara}</strong></div>
            <div class="w10-item"><span>Wuku</span><strong>${selectedInfo.wuku}</strong></div>
            <div class="w10-item"><span>Sasih</span><strong>${selectedInfo.sasihRaw}</strong></div>
            <div class="w10-item"><span>Ingkel / Jejepan</span><strong>${selectedInfo.ingkel} / ${selectedInfo.jejepan}</strong></div>
            <div class="w10-item"><span>Urip (Sapta + Panca)</span><strong>${selectedInfo.urip}</strong></div>
            <div class="w10-item"><span>Tahun Saka</span><strong>${selectedInfo.sakaYear}</strong></div>
          </div>

          <div class="wariga-preview">
            <strong>Ala Ayuning Dewasa (${selectedInfo.indoDate}):</strong>
            <div class="dewasa-split">
              <div class="dewasa-col">
                <div class="dewasa-col-head is-ayu">Dewasa Ayu / Baik Untuk (${dewasaEval.ayu.length})</div>
                ${dewasaEval.ayu.length ? `
                  <ul>${dewasaEval.ayu.map((a) => `<li><div><strong>${a.name}:</strong> ${a.desc}</div></li>`).join('')}</ul>
                ` : `<p class="f2-sub">Tidak ada Dewasa Ayu khusus utama yang tercatat pada rumusan dasar tanggal ini.</p>`}
              </div>
              <div class="dewasa-col">
                <div class="dewasa-col-head is-ala">Ala Dewasa / Pantangan (${dewasaEval.ala.length})</div>
                ${dewasaEval.ala.length ? `
                  <ul>${dewasaEval.ala.map((a) => `<li><div><strong>${a.name}:</strong> ${a.desc}</div></li>`).join('')}</ul>
                ` : `<p class="f2-sub">Bebas dari pantangan Ala Dewasa utama pada daftar rumusan dasar.</p>`}
              </div>
            </div>
            <p class="wariga-note">Catatan Ingkel ${selectedInfo.ingkel}: ${selectedInfo.ingkelNote} — Untuk penetapan akhir <em>Dewasa Ayu</em> karya besar (Pawiwahan, Ngaben, Mlaspas), tetap konsultasikan dengan Sulinggih atau ahli Wariga setempat.</p>
          </div>
        </div>
      </section>

      <section class="f2-panel">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Cari Kandidat Hari Baik — ${monthData.monthName} ${monthData.year}</h3>
            <p class="f2-sub">Menyaring tanggal yang memiliki Dewasa Ayu sesuai kebutuhan dan bebas pantangan utama terkait.</p>
          </div>
          <div class="rahinan-filters">
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'belanja' ? 'btn-primary' : 'btn-outline'}" data-dfcat="belanja">Beli Barang / Elektronik</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'usaha' ? 'btn-primary' : 'btn-outline'}" data-dfcat="usaha">Usaha / Dagang</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'bangunan' ? 'btn-primary' : 'btn-outline'}" data-dfcat="bangunan">Bangunan / Mlaspas</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'yadnya' ? 'btn-primary' : 'btn-outline'}" data-dfcat="yadnya">Dewa / Pitra Yadnya</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'pawiwahan' ? 'btn-primary' : 'btn-outline'}" data-dfcat="pawiwahan">Pawiwahan</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'perjalanan' ? 'btn-primary' : 'btn-outline'}" data-dfcat="perjalanan">Bepergian / Belajar</button>
            <button type="button" class="btn btn-sm ${state.dewasaFinderCat === 'melukat' ? 'btn-primary' : 'btn-outline'}" data-dfcat="melukat">Melukat</button>
          </div>
        </div>
        ${goodDays.length ? `
          <div class="rahinan-list">
            ${goodDays.slice(0, 8).map((g) => `
              <div class="rahinan-item" data-select-iso="${g.dayInfo.isoDate}">
                <div class="rahinan-badge" style="background:#E7F3EC;color:#1F5C3A;">${g.dayInfo.day} ${monthData.monthName.slice(0, 3)}</div>
                <div class="rahinan-info">
                  <strong>${g.matchingAyu.map((a) => a.name).join(', ')}</strong>
                  <span>${g.dayInfo.saptaWara} ${g.dayInfo.pancaWara} ${g.dayInfo.wuku} · ${g.dayInfo.penanggal}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `<p class="f2-sub">Belum ada kandidat bebas pantangan utama pada bulan ${monthData.monthName} ${monthData.year} untuk kategori ini.</p>`}
      </section>

      <section class="f2-panel">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Hitung Mundur Rahinan Terdekat</h3>
            <p class="f2-sub">Dihitung otomatis 100% offline dari hari ini.</p>
          </div>
          <div class="rahinan-filters">
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" data-rfilter="ALL">Semua</button>
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'MAJOR' ? 'btn-primary' : 'btn-outline'}" data-rfilter="MAJOR">Hari Raya & Tumpek</button>
            <button type="button" class="btn btn-sm ${state.rahinanFilter === 'LUNAR' ? 'btn-primary' : 'btn-outline'}" data-rfilter="LUNAR">Purnama & Tilem</button>
          </div>
        </div>
        <div class="rahinan-list">
          ${upcomingRahinan.map((r) => {
            const rGcal = buildGoogleCalendarUrl(
              { name: r.name, recur: 'once' },
              { nextIso: r.isoDate, recur: 'once', subLabel: r.wewaran, recurLabel: 'Rahinan Bali' }
            );
            return `
            <div class="rahinan-item" data-select-iso="${r.isoDate}">
              <div class="rahinan-badge ${r.daysUntil === 0 ? 'is-now' : ''}">
                ${r.daysUntil === 0 ? 'HARI INI' : `H-${r.daysUntil}`}
              </div>
              <div class="rahinan-info" style="flex:1;">
                <strong>${r.name}</strong>
                <span>${r.indoDate} · ${r.wewaran}</span>
              </div>
              <a class="btn btn-outline btn-sm" href="${rGcal}" target="_blank" rel="noopener" onclick="event.stopPropagation();" title="Tambahkan Rahinan ini ke Google Calendar">📅 +GCal</a>
            </div>
          `;
          }).join('')}
        </div>
      </section>

      <section class="f2-panel" id="otonan-section">
        <div class="mcal-header">
          <div>
            <h3 class="f2-title">Kalkulator Otonan &amp; Pengingat Jadwal Keluarga</h3>
            <p class="f2-sub">Simpan Otonan (210 hari), Odalan Pura/Merajan, peringatan tahunan, atau upacara sekali jalan. Pengguna login bebas memilih notifikasi di aplikasi, email (ON/OFF), atau 1-klik ke Google Calendar.</p>
          </div>
          ${isLoggedIn ? `<span class="tag pill-ok" id="sync-status-label">${state.syncStatus || `Tersinkron ke @${state.session.user.username}`}</span>` : ''}
        </div>

        <form id="otonan-form" class="otonan-form">
          <div class="form-group" style="margin:0;">
            <label for="otonan-cat">Kategori Pengingat</label>
            <select id="otonan-cat">
              <option value="otonan" ${state.reminderCategory === 'otonan' ? 'selected' : ''}>Otonan Keluarga</option>
              <option value="odalan_pawukon" ${state.reminderCategory === 'odalan_pawukon' ? 'selected' : ''}>Odalan Pura / Merajan (Pawukon)</option>
              <option value="odalan_sasih" ${state.reminderCategory === 'odalan_sasih' ? 'selected' : ''}>Odalan Sasih (Purnama / Tilem)</option>
              <option value="rahinan" ${state.reminderCategory === 'rahinan' ? 'selected' : ''}>Rahinan / Hari Suci Lainnya</option>
              <option value="upacara" ${state.reminderCategory === 'upacara' ? 'selected' : ''}>Upacara / Acara Khusus</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="otonan-name">Nama / Judul Jadwal</label>
            <input type="text" id="otonan-name" placeholder="Contoh: Odalan Merajan Sanggah / Otonan Gek Ayu" value="${state.otonanName}" />
          </div>
          <div class="form-group" style="margin:0;">
            <label for="otonan-birth">Tanggal Lahir / Tanggal Acara</label>
            <input type="date" id="otonan-birth" value="${state.otonanBirthDate}" required />
          </div>
          <div class="form-group" style="margin:0;">
            <label for="otonan-recur">Pengulangan Pengingat</label>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <label style="display:inline-flex;align-items:center;gap:5px;font-weight:500;font-size:0.84rem;margin:0;cursor:pointer;">
                <input type="checkbox" id="otonan-repeat-toggle" ${state.reminderRepeat ? 'checked' : ''} style="width:auto;" />
                Berulang
              </label>
              <select id="otonan-recur" ${state.reminderRepeat ? '' : 'disabled'} style="flex:1;min-width:170px;">
                <option value="pawukon_210" ${state.reminderRecurType === 'pawukon_210' ? 'selected' : ''}>Tiap 210 hari (Pawukon)</option>
                <option value="yearly" ${state.reminderRecurType === 'yearly' ? 'selected' : ''}>Tiap 1 tahun (Masehi)</option>
              </select>
            </div>
            <small style="color:var(--ink-muted);font-size:0.74rem;">${state.reminderRepeat ? 'Pengingat otomatis berulang sesuai pilihan.' : 'Pengingat hanya 1 kali (tidak berulang).'}</small>
          </div>
          <div class="otonan-actions" style="grid-column:1 / -1;">
            <button type="submit" class="btn btn-primary">Cek Kalender Bali</button>
            ${isLoggedIn
              ? `<button type="button" class="btn btn-outline" id="save-otonan-btn">+ Simpan ke Akun</button>`
              : `<button type="button" class="btn btn-outline" id="login-for-otonan-btn">Masuk untuk Simpan ke Akun</button>`}
            ${(() => {
              const effRecur = state.reminderRepeat ? state.reminderRecurType : (state.reminderCategory === 'odalan_sasih' ? 'sasih_once' : 'once');
              const draftTitle = state.otonanName || (state.reminderCategory === 'otonan' ? 'Otonan Keluarga' : 'Pengingat Odalan / Rahinan');
              const draftIso = state.otonanBirthDate || todayIso;
              const previewRem = computeReminderNext({ name: draftTitle, birthDate: draftIso, recur: effRecur }, todayIso);
              const directGcal = buildGoogleCalendarUrl({ name: draftTitle, birthDate: draftIso, recur: effRecur }, previewRem);
              return `<a class="btn btn-ics" href="${directGcal}" target="_blank" rel="noopener" id="direct-gcal-btn">📅 + Google Calendar (1 Klik)</a>`;
            })()}
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
          ${isLoggedIn ? `
            <div class="reminder-toggle-box">
              <div style="font-weight:700;margin-bottom:6px;">Pilih Jalur Notifikasi Anda:</div>
              <div style="font-size:0.82rem;margin-bottom:8px;">• <strong>🔔 Notifikasi Aplikasi:</strong> Aktif otomatis di lonceng &amp; spanduk saat H-7 s.d. Hari H.<br/>• <strong>📅 Google Calendar (1 Klik):</strong> Klik tombol <em>+ Google Calendar</em> pada tiap jadwal di bawah.</div>
              <label>
                <input type="checkbox" id="toggle-email-reminders" ${state.remindersEnabled ? 'checked' : ''} />
                <span><strong>✉️ Kirim juga Pengingat Email Harian</strong> (H-3, H-1, &amp; Hari H ke <strong>${state.session.user.email}</strong> — matikan jika tidak ingin email)</span>
              </label>
            </div>
            <h4 style="margin:12px 0 8px;">Daftar Jadwal &amp; Otonan Akun @${state.session.user.username} (${savedOtonanSorted.length})</h4>
            ${savedOtonanSorted.length ? `
              <div class="family-otonan-list">
                ${savedOtonanSorted.map((f) => {
                  const gcalUrl = buildGoogleCalendarUrl(f, f.rem);
                  const badgeDays = f.rem.isPast ? 'Sudah lewat' : (f.rem.daysUntil === 0 ? 'HARI INI' : `H-${f.rem.daysUntil}`);
                  return `
                  <div class="family-otonan-item">
                    <div>
                      <strong>${f.name}</strong> <span class="tag pill-yadnya" style="font-size:0.7rem;">${f.rem.recurLabel}</span>
                      <div class="f2-sub">${f.rem.subLabel} · Berikutnya: <strong>${f.rem.nextIndo}</strong> (${badgeDays})</div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <a class="btn btn-outline btn-sm" href="${gcalUrl}" target="_blank" rel="noopener">📅 + Google Calendar</a>
                      <button type="button" class="btn btn-outline btn-sm" data-del-otonan="${f.id}">Hapus</button>
                    </div>
                  </div>
                `;
                }).join('')}
              </div>
            ` : `<p class="f2-sub">Belum ada jadwal yang disimpan di akun Anda. Isi nama, tanggal, dan jenis pengulangan di atas lalu klik <strong>+ Simpan Jadwal</strong>.</p>`}
          ` : `
            <div class="auth-gate-box">
              <strong>🔒 Pengingat Otonan & Sinkronisasi Lintas Perangkat (Khusus Akun Login)</strong>
              <p>Masuk atau daftar akun gratis dengan email & username Anda agar catatan Otonan keluarga tetap menempel meski berganti HP/laptop, sekaligus mengaktifkan pengingat langsung di aplikasi & email otomatis (H-3, H-1, Hari H) tanpa perlu mengunduh file kalender terpisah.</p>
              <button type="button" class="btn btn-primary btn-sm" id="gate-open-auth">Masuk / Daftar Akun Gratis</button>
            </div>
          `}
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

  container.querySelectorAll('[data-cal-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.calViewMode = btn.dataset.calView;
      localStorage.setItem('piteket_cal_view', state.calViewMode);
      renderContent();
    });
  });

  container.querySelectorAll('[data-dfcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dewasaFinderCat = btn.dataset.dfcat;
      renderContent();
    });
  });

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


  document.getElementById('otonan-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.otonanName = document.getElementById('otonan-name').value.trim();
    state.otonanBirthDate = document.getElementById('otonan-birth').value;
    if (state.otonanBirthDate) {
      localStorage.setItem('piteket_last_otonan_birth', state.otonanBirthDate);
      renderContent();
    }
  });

  const catSel = document.getElementById('otonan-cat');
  if (catSel) {
    catSel.onchange = () => {
      state.reminderCategory = catSel.value;
      state.otonanName = document.getElementById('otonan-name').value.trim();
      state.otonanBirthDate = document.getElementById('otonan-birth').value || todayIso;
      if (catSel.value === 'otonan' || catSel.value === 'odalan_pawukon') {
        state.reminderRepeat = true;
        state.reminderRecurType = 'pawukon_210';
      } else if (catSel.value === 'odalan_sasih' || catSel.value === 'upacara') {
        state.reminderRepeat = false;
      }
      renderContent();
    };
  }

  const repToggle = document.getElementById('otonan-repeat-toggle');
  if (repToggle) {
    repToggle.onchange = () => {
      state.reminderRepeat = repToggle.checked;
      state.otonanName = document.getElementById('otonan-name').value.trim();
      state.otonanBirthDate = document.getElementById('otonan-birth').value || todayIso;
      renderContent();
    };
  }

  const recurSel = document.getElementById('otonan-recur');
  if (recurSel) {
    recurSel.onchange = () => {
      state.reminderRecurType = recurSel.value;
      state.otonanName = document.getElementById('otonan-name').value.trim();
      state.otonanBirthDate = document.getElementById('otonan-birth').value || todayIso;
      renderContent();
    };
  }

  const saveOtonBtn = document.getElementById('save-otonan-btn');
  if (saveOtonBtn) {
    saveOtonBtn.onclick = () => {
      const name = document.getElementById('otonan-name').value.trim();
      const birthDate = document.getElementById('otonan-birth').value;
      if (!name || !birthDate) {
        showToast('Isi nama/judul dan tanggal terlebih dahulu.');
        return;
      }
      const isRep = document.getElementById('otonan-repeat-toggle') ? document.getElementById('otonan-repeat-toggle').checked : true;
      const recurVal = document.getElementById('otonan-recur') ? document.getElementById('otonan-recur').value : 'pawukon_210';
      const catVal = document.getElementById('otonan-cat') ? document.getElementById('otonan-cat').value : 'otonan';
      const finalRecur = isRep ? recurVal : (catVal === 'odalan_sasih' ? 'sasih_once' : 'once');

      state.otonanName = '';
      state.otonanBirthDate = birthDate;
      localStorage.setItem('piteket_last_otonan_birth', birthDate);
      state.familyOtonan.push({ id: String(Date.now()), name, birthDate, recur: finalRecur, category: catVal });
      scheduleCloudSync();
      showToast(`Jadwal "${name}" disimpan & disinkronkan ke akun Anda!`);
      renderContent();
    };
  }

  const loginForOtonBtn = document.getElementById('login-for-otonan-btn');
  if (loginForOtonBtn) loginForOtonBtn.onclick = () => openAuthModal('login');

  const gateAuthBtn = document.getElementById('gate-open-auth');
  if (gateAuthBtn) gateAuthBtn.onclick = () => openAuthModal('login');

  const toggleRem = document.getElementById('toggle-email-reminders');
  if (toggleRem) {
    toggleRem.onchange = () => {
      state.remindersEnabled = toggleRem.checked;
      scheduleCloudSync();
      showToast(state.remindersEnabled ? 'Pengingat email Otonan diaktifkan.' : 'Pengingat email Otonan dimatikan.');
    };
  }

  container.querySelectorAll('[data-del-otonan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.familyOtonan = state.familyOtonan.filter((x) => x.id !== btn.dataset.delOtonan);
      scheduleCloudSync();
      showToast('Data Otonan dihapus dari akun.');
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
      scheduleCloudSync();
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
      scheduleCloudSync();
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
        scheduleCloudSync();
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
      scheduleCloudSync();
      showToast('Centang ceklis di-reset.');
      renderContent();
    });
  });
}

function renderContent() {
  const container = document.getElementById('content-area');
  const controlsBar = document.getElementById('controls-bar');
  if (controlsBar) controlsBar.style.display = 'flex';
  const cycSel = document.getElementById('cycle-filter');
  if (cycSel) cycSel.style.display = state.tab === 'panduan' ? 'inline-block' : 'none';

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
        <div class="card-quick-brief">
          <span class="quick-brief-label">⚡ Intisari Singkat</span>
          <p>${item.ringkasan}</p>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" data-open-guide="${item.id}">Baca Artikel Lengkap</button>
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


function friendlySourceLabel(url, idx) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h.includes('unhi.ac.id')) return 'UNHI Press / Repository';
    if (h.includes('warmadewa.ac.id')) return 'Jurnal Univ. Warmadewa';
    if (h.includes('parisada.or.id')) return 'PHDI Pusat (Dharmika)';
    if (h.includes('jayapanguspress')) return 'Jayapangus Press (Jurnal Hindu)';
    if (h.includes('iahn-gdepudja')) return 'Repository IAHN Gde Pudja';
    if (h.includes('researchgate.net')) return 'ResearchGate (Jurnal Ilmiah)';
    if (h.includes('neliti.com')) return 'Neliti (Teks Siwagama)';
    if (h.includes('sthd-jateng')) return 'Jurnal Jawa Dwipa STHD';
    if (h.includes('undana.ac.id')) return 'Jurnal Communio Undana';
    if (h.includes('uinsa.ac.id')) return 'Digilib UIN Sunan Ampel';
    if (h.includes('mahadewa.ac.id')) return 'Jurnal Univ. PGRI Mahadewa';
    if (h.includes('rewangrencang')) return 'Jurnal Hukum JHLG';
    if (h.includes('kemenagbadung')) return 'Kemenag Badung';
    return `${h} (Sumber ${idx + 1})`;
  } catch {
    return `Sumber ${idx + 1}`;
  }
}

function formatUpacaraWithTiers(rawText) {
  const txt = String(rawText || '').trim();
  if (!/\[(NISTA|MADYA|UTAMA)\]/i.test(txt)) {
    return `<p>${txt}</p>`;
  }
  const parts = txt.split(/(?=\[(?:NISTA|MADYA|UTAMA)\]\s*:?)/i);
  const intro = [];
  const tiers = [];
  parts.forEach((part) => {
    const p = part.trim();
    if (!p) return;
    const m = p.match(/^\[(NISTA|MADYA|UTAMA)\]\s*:?\s*([\s\S]+)$/i);
    if (m) {
      tiers.push({ level: m[1].toUpperCase(), body: m[2].trim() });
    } else {
      intro.push(p);
    }
  });
  const levelMeta = {
    NISTA: { label: 'Nista (Sederhana / Alit)', cls: 'tier-nista' },
    MADYA: { label: 'Madya (Menengah)', cls: 'tier-madya' },
    UTAMA: { label: 'Utama (Lengkap / Ageng)', cls: 'tier-utama' }
  };
  return `
    ${intro.length ? `<p style="margin-bottom:10px;">${intro.join('\n\n')}</p>` : ''}
    <div class="tier-grid">
      ${tiers.map((t) => {
        const meta = levelMeta[t.level] || { label: t.level, cls: 'tier-madya' };
        return `
          <div class="tier-card ${meta.cls}">
            <div class="tier-badge">${meta.label}</div>
            <p>${t.body}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openGuideModal(id) {
  const item = state.guides.find((g) => g.id === id);
  if (!item) return;
  const links = (item.sumber_referensi || '')
    .split('|')
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .map((u, i) => `<a class="source-chip" href="${u}" target="_blank" rel="noopener">📚 ${friendlySourceLabel(u, i)}</a>`)
    .join(' ');

  const domFallback = (state.domisili === 'Denpasar' || state.domisili === 'Badung') ? item.catatan_denpasar_badung : '';
  const kawFallback = state.kawitan === 'Karangasem' ? item.catatan_kawitan_karangasem : '';

  document.getElementById('detail-title').textContent = item.judul;
  document.getElementById('detail-aksara').textContent = item.aksara_bali || '';
  document.getElementById('detail-body').innerHTML = `
    <div class="card-meta" style="margin-bottom:12px;">
      <span class="tag ${cycleClass(item.siklus_tri_kona)}">${item.siklus_tri_kona}</span>
      <span class="tag pill-yadnya">${item.panca_yadnya}</span>
      <span class="tag ${statusClass(item.status_verifikasi)}">${item.status_verifikasi}</span>
    </div>
    <div class="quick-brief-modal-box">
      <div class="quick-brief-modal-head">⚡ Ringkasan Cepat (Intisari 30 Detik)</div>
      <p>${item.ringkasan}</p>
    </div>
    <div class="layer-block">
      <h4>1. Tattwa (Filosofi &amp; Makna Mendalam)</h4>
      <p>${item.tattwa_filosofi}</p>
    </div>
    <div class="layer-block">
      <h4>2. Susila &amp; Etika Praktis</h4>
      <p>${item.susila_etika_praktis}</p>
    </div>
    <div class="layer-block">
      <h4>3. Upacara &amp; Tingkatan Upakara (Nista · Madya · Utama)</h4>
      ${formatUpacaraWithTiers(item.upacara_gambaran_umum)}
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
    action: 'feedback',
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


// ======================= MENU INFO (TENTANG, VERSI, TUTORIAL GIF) ============
const APP_VERSION = 'v1.8.1';
const CHANGELOG_ENTRIES = [
  {
    version: 'v1.8.1 (Saat Ini)',
    date: '22 November 2026',
    title: 'Pendalaman 21 Artikel Tri Kona, Kartu Intisari Cepat, Tingkatan Nista-Madya-Utama & Topik Banten Baru',
    items: [
      'Menampilkan kartu Ringkasan Cepat (Intisari 30 Detik) di bagian atas setiap kartu dan artikel lengkap agar mudah dipindai sebelum membaca detail.',
      'Menampilkan kartu visual Tingkatan Nista, Madya, dan Utama secara terstruktur di setiap topik (termasuk Mebanten Sehari-hari, Jenis Banten Dasar, Kramaning Sembah, Piodalan, 6 Tumpek, dan Nyegara Gunung).',
      'Memperluas seluruh artikel dengan bahasa umum yang inklusif serta tautan sumber rujukan ilmiah yang dapat diklik.'
    ]
  },
  {
    version: 'v1.7.1',
    date: '22 November 2026',
    title: 'Aksi Pengingat Otomatis dari Pencarian/AI, Pilihan Odalan/Rahinan & Tombol Google Calendar Langsung',
    items: [
      'Menambahkan deteksi perintah pengingat di Pencarian Pintar & Piteket AI (contoh: "tambahkan pengingat odalan" atau "catat odalan merajan sanggah hari ini") yang langsung mengisi form pengingat beserta kelengkapan Kalender Bali hari tersebut.',
      'Menampilkan tombol 1-klik "+ Google Calendar" langsung di form pengingat, di setiap kartu Rahinan terdekat, dan di daftar jadwal tersimpan, lengkap dengan pilihan kategori (Otonan, Odalan Pawukon/Sasih, Rahinan, Upacara) serta centang Berulang / Sekali Saja.',
      'Mengunci Piteket AI langsung ke Gemini 3.5 Flash-Lite agar respons lebih cepat tanpa mencoba model lain.'
    ]
  },
  {
    version: 'v1.6',
    date: '22 November 2026',
    title: 'Percepatan AI, Perluasan Database Wariga & Pengingat Fleksibel + Google Calendar 1-Klik',
    items: [
      'Mempercepat respons Tanya Piteket AI dengan memprioritaskan Gemini 3.5 Flash-Lite dan cache model aktif di server.',
      'Menambahkan aturan Wariga otentik di mesin offline (Asuasa, Catur Laba, Amerta Dadi, Amerta Danta, Jiwa Menganti, Derman Bagia, Buda Suka, Sanga Wara Tulus/Dadi) beserta kategori khusus Beli Barang/Elektronik/Kendaraan & Bepergian.',
      'Menghadirkan Pengingat Keluarga fleksibel (Otonan 210 hari, Odalan Sasih, Tahunan Masehi, atau Sekali Saja) dengan 3 pilihan notifikasi: Aplikasi, Email ON/OFF, dan tombol 1-klik langsung ke Google Calendar.'
    ]
  },
  {
    version: 'v1.5.2',
    date: '22 November 2026',
    title: 'Menu Info, Tutorial GIF Lengkap & Pencarian Pintar Hybrid (AI)',
    items: [
      'Menambahkan menu Info di pojok kanan atas berisi profil kolaborasi Semeton Bali & Gemini, riwayat versi, serta 4 tutorial animasi GIF.',
      'Menghadirkan Pencarian Pintar lintas seluruh data (Tri Kona, Kalender Bali, Ceklis, Dresta 10 Wilayah, Dewasa Ayu, Glosarium) yang memahami maksud pertanyaan secara offline.',
      'Menambahkan tombol opsional "Tanya Piteket AI" bertenaga Gemini API melalui Google Apps Script dengan kunci ketat anti-halusinasi agar hanya merujuk data kalender & materi Piteket serta jujur terhadap batas perhitungan Wariga personal.'
    ]
  },
  {
    version: 'v1.4',
    date: '22 November 2026',
    title: 'Masuk dengan Akun Google (Google Identity Services)',
    items: [
      'Menambahkan tombol resmi Masuk dengan Google berdampingan dengan login email & password.',
      'Verifikasi token ID Google di sisi server Google Apps Script sehingga akun langsung aktif tanpa memotong kuota OTP Gmail.'
    ]
  },
  {
    version: 'v1.3',
    date: '21 November 2026',
    title: 'Sistem Akun Privat, Sinkronisasi Lintas Perangkat & Pengingat Otonan',
    items: [
      'Pendaftaran akun dengan konfirmasi kode OTP 6 digit & fitur Lupa Password via Gmail.',
      'Sinkronisasi otomatis daftar Otonan, ceklis, dan Profil Dresta ke akun pengguna lintas perangkat.',
      'Pengingat Otonan langsung di dalam aplikasi (lonceng & spanduk) serta email otomatis H-3, H-1, dan Hari H pukul 07:00 WITA.'
    ]
  },
  {
    version: 'v1.2',
    date: '21 November 2026',
    title: 'Kalender Bali Klasik (Bangbang Gde Rawi) & Ala Ayuning Dewasa',
    items: [
      'Tampilan Kalender Bali cetak vertikal per Wuku dengan tombol pindah ke tampilan bulanan standar.',
      'Perhitungan 10 Wewaran lengkap (Ekawara sampai Dasawara), Ingkel, Jejepan, Urip, serta mesin otomatis Ala Ayuning Dewasa & Pencari Hari Baik.'
    ]
  },
  {
    version: 'v1.1',
    date: '20 November 2026',
    title: 'Kalender Saka/Pawukon Offline & 6 Ceklis Persiapan Upacara',
    items: [
      'Mesin Kalender Saka (Pangalantaka) & Pawukon 100% offline, hitung mundur Rahinan, dan kalkulator Otonan.',
      'Penambahan 6 ceklis persiapan interaktif (Galungan/Kuningan, Nyepi, Otonan, Nelubulanin, Pawiwahan, Ngaben).'
    ]
  },
  {
    version: 'v1.0',
    date: '19 November 2026',
    title: 'Rilis Perdana Piteket PWA & 97 Entri CMS Keluarga',
    items: [
      'Fondasi PWA offline berbasis Google Sheets CMS + GitHub + Cloudflare Pages.',
      '97 entri panduan Siklus Tri Kona (Utpatti, Sthiti, Pralina), Catatan Dresta 10 wilayah, Dewasa Ayu, Glosarium Aksara Bali, dan tombol Beri Piteket.'
    ]
  }
];

const TUTORIAL_GIFS = [
  {
    title: '1. Mengatur Profil Desa Kala Patra (Domisili & Kawitan)',
    gif: './assets/tutorial-1-dresta.gif',
    desc: 'Pilih Domisili sekarang dan Asal Kawitan keluarga agar catatan adat di setiap panduan dan tab Catatan Dresta otomatis menyorot wilayah Anda.'
  },
  {
    title: '2. Membaca Kalender Bali 10 Wewaran & Mencari Hari Baik',
    gif: './assets/tutorial-2-kalender.gif',
    desc: 'Ketuk tanggal pada tampilan klasik per Wuku untuk melihat 10 Wewaran dan Ala Ayuning Dewasa, atau gunakan Pencari Hari Baik untuk menyaring Dewasa Ayu bulan ini.'
  },
  {
    title: '3. Login Google, Sinkronisasi & Pengingat Otonan Otomatis',
    gif: './assets/tutorial-3-otonan.gif',
    desc: 'Masuk dengan Google (1 klik) atau email agar jadwal Otonan keluarga dan ceklis tersinkron lintas HP/laptop serta mendapat pengingat H-3, H-1, dan Hari H.'
  },
  {
    title: '4. Pencarian Pintar Hybrid & Mengirim Piteket / Koreksi',
    gif: './assets/tutorial-4-search-piteket.gif',
    desc: 'Ketik pertanyaan sehari-hari di kolom pencarian untuk jawaban instan lintas topik/kalender, klik Tanya Piteket AI bila perlu rangkuman, dan gunakan Beri Piteket untuk koreksi adat desa.'
  }
];

let activeInfoTab = 'tentang';
let smartSearchTimer = null;
let lastSmartSearchOut = null;
let smartShowAll = false;

function openInfoModal(tab = 'tentang') {
  activeInfoTab = tab;
  document.querySelectorAll('.info-tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.infoTab === tab);
  });
  renderInfoModalBody();
  document.getElementById('info-modal').classList.add('open');
}

function renderInfoModalBody() {
  const body = document.getElementById('info-modal-body');
  if (!body) return;

  if (activeInfoTab === 'tentang') {
    body.innerHTML = `
      <div class="info-hero-note">
        <div class="info-version-pill">Piteket PWA · ${APP_VERSION}</div>
        <h4>Dikembangkan Bersama oleh Semeton Bali &amp; Gemini</h4>
        <p><strong>Piteket</strong> adalah ruang belajar terbuka yang dikembangkan bersama oleh <strong>Semeton Bali dan Gemini</strong> untuk membantu keluarga dan generasi muda Bali memahami alur kehidupan <em>Tri Kona</em> (Utpatti, Sthiti, Pralina), <em>Panca Yadnya</em>, Kalender Bali, serta ragam <em>Desa Kala Patra</em> di 10 wilayah.</p>
        <p>Aplikasi ini lahir dari semangat <em>nunas piteket</em> — bukan untuk menggantikan petunjuk Sulinggih, Pemangku, orang tua, maupun <em>awig-awig</em> desa adat setempat, melainkan sebagai catatan belajar bersama yang rapi, gratis, dan tetap dapat dibuka meski tanpa sinyal.</p>
      </div>
      <div class="info-pillars">
        <div class="info-pillar"><strong>100% Gratis &amp; Offline</strong><span>Kalender Bali 10 Wewaran, Ala Ayuning Dewasa, ceklis, dan materi utama tetap berjalan tanpa internet.</span></div>
        <div class="info-pillar"><strong>Kolaborasi Keluarga</strong><span>Setiap catatan bisa dikoreksi oleh panglingsir dan semeton lewat tombol <em>Beri Piteket</em>.</span></div>
      </div>
    `;
  } else if (activeInfoTab === 'versi') {
    body.innerHTML = `
      <div class="changelog-list">
        ${CHANGELOG_ENTRIES.map((entry, i) => `
          <div class="changelog-card ${i === 0 ? 'latest' : ''}">
            <div class="changelog-head">
              <span class="changelog-ver">${entry.version}</span>
              <span class="changelog-date">${entry.date}</span>
            </div>
            <h5>${entry.title}</h5>
            <ul>${entry.items.map((it) => `<li>${it}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    body.innerHTML = `
      <p class="tutorial-intro">Ikuti 4 panduan singkat bergambar di bawah ini untuk memaksimalkan seluruh fitur Piteket:</p>
      <div class="tutorial-grid">
        ${TUTORIAL_GIFS.map((t) => `
          <article class="tutorial-card">
            <h5>${t.title}</h5>
            <img src="${t.gif}" alt="${t.title}" class="tutorial-gif" loading="lazy" />
            <p>${t.desc}</p>
          </article>
        `).join('')}
      </div>
    `;
  }
}

function getSearchDataset() {
  return {
    todayIso,
    calYear: state.calYear,
    calMonth: state.calMonth,
    domisili: state.domisili,
    kawitan: state.kawitan,
    guides: state.guides,
    dresta: state.dresta,
    dewasa: state.dewasa,
    glosarium: state.glosarium,
    checklists: DEFAULT_CHECKLISTS
  };
}

function renderSmartSearchPanel() {
  const panel = document.getElementById('smart-search-panel');
  if (!panel) return;
  const q = state.search.trim();
  if (q.length < 2) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    lastSmartSearchOut = null;
    smartShowAll = false;
    return;
  }

  const out = runSmartSearch(q, getSearchDataset());
  lastSmartSearchOut = out;
  panel.style.display = 'block';

  const visibleResults = smartShowAll ? out.results : out.results.slice(0, 5);
  const moreCount = out.results.length - visibleResults.length;

  panel.innerHTML = `
    <div class="smart-panel-head">
      <div>
        <strong>Pencarian Pintar Lintas Data</strong>
        <span class="smart-count">${out.totalMatches} hasil paling relevan untuk "${q.replace(/</g, '&lt;')}"</span>
      </div>
      <div class="smart-head-btns">
        <button type="button" class="btn-ai-ask" id="btn-ask-piteket-ai">✨ Tanya Piteket AI</button>
        <button type="button" class="btn-smart-clear" id="btn-smart-clear" title="Bersihkan pencarian">✕</button>
      </div>
    </div>

    <div id="smart-ai-slot"></div>

    ${out.instantCards.length ? `
      <div class="smart-instant-list">
        ${out.instantCards.map((c, idx) => `
          <div class="smart-instant-card">
            <div class="smart-badge">${c.badge}</div>
            <div class="smart-instant-title">${c.title}</div>
            <div class="smart-instant-sum">${c.summary}</div>
            <button type="button" class="btn btn-outline btn-sm smart-instant-act" data-instant-idx="${idx}">${c.actionLabel}</button>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${visibleResults.length ? `
      <div class="smart-results-list">
        ${visibleResults.map((r, idx) => `
          <button type="button" class="smart-result-row" data-result-idx="${idx}">
            <div class="smart-row-top">
              <span class="smart-badge">${r.badge}</span>
              <span class="smart-row-title">${r.title}</span>
            </div>
            <div class="smart-row-snippet">${String(r.snippet || '').slice(0, 145)}${String(r.snippet || '').length > 145 ? '…' : ''}</div>
          </button>
        `).join('')}
      </div>
      ${moreCount > 0 ? `<button type="button" class="link-btn" id="btn-smart-more" style="margin-top:8px;">Lihat ${moreCount} hasil lainnya</button>` : ''}
    ` : (!out.instantCards.length ? `
      <div class="smart-empty">Belum ada kecocokan langsung di pencarian lokal. Klik <strong>✨ Tanya Piteket AI</strong> di kanan atas agar Gemini membantu merangkum maksud pertanyaan Anda.</div>
    ` : '')}
  `;

  document.getElementById('btn-smart-clear').onclick = () => {
    state.search = '';
    document.getElementById('search-input').value = '';
    renderSmartSearchPanel();
    renderContent();
  };

  document.getElementById('btn-ask-piteket-ai').onclick = () => handleAskPiteketAi();

  const moreBtn = document.getElementById('btn-smart-more');
  if (moreBtn) {
    moreBtn.onclick = () => {
      smartShowAll = true;
      renderSmartSearchPanel();
    };
  }

  panel.querySelectorAll('[data-instant-idx]').forEach((btn) => {
    btn.onclick = () => {
      const card = out.instantCards[Number(btn.dataset.instantIdx)];
      if (!card) return;
      if (card.actionType === 'open-date' && card.targetIso) {
        const parts = card.targetIso.split('-').map(Number);
        state.selectedIso = card.targetIso;
        state.calYear = parts[0];
        state.calMonth = parts[1] - 1;
        renderCalendar(card.targetIso);
        switchTab('kalender');
      } else if (card.actionType === 'open-finder') {
        state.dewasaFinderCat = card.finderCat || 'usaha';
        switchTab('kalender');
        setTimeout(() => {
          const el = document.getElementById('dewasa-finder-section') || document.getElementById('content-area');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (card.actionType === 'prefill-reminder' && card.draft) {
        const d = card.draft;
        state.otonanName = d.title;
        state.otonanBirthDate = d.dateIso;
        state.reminderCategory = d.category || 'odalan_pawukon';
        if (d.recommendedRecur === 'pawukon_210' || d.recommendedRecur === 'yearly') {
          state.reminderRepeat = true;
          state.reminderRecurType = d.recommendedRecur;
        } else {
          state.reminderRepeat = false;
        }
        switchTab('kalender');
        setTimeout(() => {
          const el = document.getElementById('otonan-section') || document.getElementById('content-area');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.style.boxShadow = '0 0 0 3px #C89B3C';
            setTimeout(() => { el.style.boxShadow = ''; }, 2400);
          }
          showToast(`Form pengingat "${d.title}" sudah diisi otomatis — silakan cek & simpan!`);
        }, 80);
      } else if (card.actionType === 'open-otonan') {
        switchTab('kalender');
        setTimeout(() => {
          const el = document.getElementById('otonan-section') || document.getElementById('content-area');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    };
  });

  panel.querySelectorAll('[data-result-idx]').forEach((btn) => {
    btn.onclick = () => {
      const r = visibleResults[Number(btn.dataset.resultIdx)];
      if (!r) return;
      if (r.type === 'guide') {
        openGuideModal(r.id);
      } else if (r.type === 'checklist') {
        switchTab('ceklis');
        document.getElementById('content-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (r.type === 'dresta') {
        state.search = r.filterTerm || '';
        document.getElementById('search-input').value = state.search;
        switchTab('dresta');
        document.getElementById('content-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (r.type === 'dewasa') {
        state.search = r.filterTerm || '';
        document.getElementById('search-input').value = state.search;
        switchTab('dewasa');
        document.getElementById('content-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (r.type === 'glosarium') {
        state.search = r.filterTerm || '';
        document.getElementById('search-input').value = state.search;
        switchTab('aksara');
        document.getElementById('content-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  });
}

async function handleAskPiteketAi() {
  const slot = document.getElementById('smart-ai-slot');
  const btn = document.getElementById('btn-ask-piteket-ai');
  const q = state.search.trim();
  if (!slot || !q) return;

  if (btn) btn.disabled = true;
  slot.innerHTML = '<div class="smart-ai-box loading">✨ Piteket AI sedang membaca materi &amp; kalender yang relevan...</div>';
  try {
    const contextText = buildAiContextPayload(lastSmartSearchOut, getSearchDataset());
    const res = await AuthApi.askAi(q, contextText);
    if (!res.ok) {
      slot.innerHTML = `<div class="smart-ai-box error">${res.error || 'Tidak dapat menghubungi Piteket AI saat ini.'}</div>`;
    } else {
      const safeHtml = String(res.answer)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
      slot.innerHTML = `
        <div class="smart-ai-box">
          <div class="smart-ai-label">✨ Rangkuman Piteket AI (berdasarkan data Piteket)</div>
          <div class="smart-ai-text">${safeHtml}</div>
        </div>
      `;
    }
  } catch {
    slot.innerHTML = '<div class="smart-ai-box error">Tanya Piteket AI memerlukan koneksi internet. Gunakan hasil Pencarian Pintar Lokal di bawah yang tetap berjalan offline.</div>';
  } finally {
    if (btn) btn.disabled = false;
  }
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
  renderAuthBarAndBanner();

  domSelect.addEventListener('change', (e) => {
    state.domisili = e.target.value;
    updateRegionBadge();
    scheduleCloudSync();
    renderContent();
    showToast(`Domisili diatur ke ${state.domisili}`);
  });

  kawSelect.addEventListener('change', (e) => {
    state.kawitan = e.target.value;
    updateRegionBadge();
    scheduleCloudSync();
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
    smartShowAll = false;
    clearTimeout(smartSearchTimer);
    smartSearchTimer = setTimeout(() => {
      renderSmartSearchPanel();
      renderContent();
    }, 160);
  });

  const openInfoBtn = document.getElementById('open-info-btn');
  if (openInfoBtn) openInfoBtn.addEventListener('click', () => openInfoModal('tentang'));
  document.querySelectorAll('.info-tab-btn').forEach((b) => {
    b.addEventListener('click', () => openInfoModal(b.dataset.infoTab));
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

  // Tutup modal otomatis saat klik di area gelap di luar kotak konten (atau tekan tombol Esc)
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach((m) => closeModal(m.id));
    }
  });

  document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);

  loadData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
