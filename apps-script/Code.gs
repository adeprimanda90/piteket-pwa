// ============================================================================
// PITEKET PWA — Google Apps Script Backend Terpadu (Tahap B)
// 1) CMS Publisher: Publish 6 tab konten publik ke GitHub (data/*.json)
// 2) Feedback Hub: Simpan Piteket / Koreksi ke tab Masukan_Keluarga
// 3) Sistem Akun Privat: Daftar + Konfirmasi Email OTP, Login, Lupa Password OTP
//    (disimpan di tab privat Akun_Pengguna & Catatan_Pengguna — TIDAK dipublish)
// 4) Pengingat Otonan Otomatis (Trigger Harian 07:00 WITA via Gmail Anda)
// ============================================================================

const PUBLIC_SHEET_FILES = [
  { sheetName: 'Utpatti', filePath: 'data/utpatti.json' },
  { sheetName: 'Sthiti', filePath: 'data/sthiti.json' },
  { sheetName: 'Pralina', filePath: 'data/pralina.json' },
  { sheetName: 'Catatan_Dresta', filePath: 'data/catatan-dresta.json' },
  { sheetName: 'Dewasa_Ayu', filePath: 'data/dewasa-ayu.json' },
  { sheetName: 'Glosarium_Aksara', filePath: 'data/glosarium-aksara.json' }
];

const TAB_USERS = 'Akun_Pengguna';
const TAB_USER_DATA = 'Catatan_Pengguna';
const TAB_FEEDBACK = 'Masukan_Keluarga';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Piteket CMS')
    .addItem('Publish Semua Data ke GitHub (PWA)', 'publishAllToGitHub')
    .addSeparator()
    .addItem('Siapkan Tab Akun & Catatan Privat', 'ensurePrivateTabs')
    .addItem('Pasang Pengingat Otonan Harian (07:00 WITA)', 'installDailyOtonanTrigger')
    .addItem('Uji Kirim Pengingat Otonan Sekarang', 'kirimPengingatOtonanHarian')
    .addSeparator()
    .addItem('Cek Status Konfigurasi GitHub', 'checkConfig')
    .addToUi();
}

function checkConfig() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GITHUB_OWNER') || '(belum diisi)';
  const repo = props.getProperty('GITHUB_REPO') || '(belum diisi)';
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const hasToken = props.getProperty('GITHUB_TOKEN') ? 'Tersimpan' : '(belum diisi)';
  const hasGoogleId = props.getProperty('GOOGLE_CLIENT_ID') ? 'Tersimpan' : '(belum diisi — opsional untuk Login Google)';
  const hasGeminiKey = props.getProperty('GEMINI_API_KEY') ? 'Tersimpan' : '(belum diisi — opsional untuk Tanya Piteket AI)';
  const quota = MailApp.getRemainingDailyQuota();
  SpreadsheetApp.getUi().alert(
    'Konfigurasi Piteket CMS:\n' +
    '• GITHUB_OWNER: ' + owner + '\n' +
    '• GITHUB_REPO: ' + repo + '\n' +
    '• GITHUB_BRANCH: ' + branch + '\n' +
    '• GITHUB_TOKEN: ' + hasToken + '\n' +
    '• GOOGLE_CLIENT_ID: ' + hasGoogleId + '\n' +
    '• GEMINI_API_KEY: ' + hasGeminiKey + '\n' +
    '• Sisa Kuota Email Gmail Hari Ini: ' + quota + ' penerima'
  );
}

// ======================= 1. CMS PUBLISHER KE GITHUB ==========================
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every((cell) => String(cell).trim() === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const val = row[idx];
      obj[h] = val instanceof Date ? Utilities.formatDate(val, 'Asia/Makassar', 'yyyy-MM-dd') : String(val);
    });
    rows.push(obj);
  }
  return rows;
}

function publishAllToGitHub() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const token = props.getProperty('GITHUB_TOKEN');

  if (!owner || !repo || !token) {
    SpreadsheetApp.getUi().alert('Lengkapi Script Properties (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN) terlebih dahulu.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  PUBLIC_SHEET_FILES.forEach((item) => {
    const sheet = ss.getSheetByName(item.sheetName);
    if (!sheet) {
      results.push('SKIP ' + item.sheetName + ' (tab tidak ditemukan)');
      return;
    }
    const data = sheetToObjects(sheet);
    const jsonStr = JSON.stringify(data, null, 2);
    const ok = pushFileToGitHub(owner, repo, branch, token, item.filePath, jsonStr, 'Update ' + item.filePath + ' dari Piteket CMS');
    results.push((ok ? 'OK ' : 'GAGAL ') + item.filePath + ' (' + data.length + ' entri)');
  });

  SpreadsheetApp.getUi().alert('Hasil Publish ke GitHub:\n' + results.join('\n') + '\n\nCloudflare Pages akan deploy otomatis dalam ~30–60 detik.');
}

function pushFileToGitHub(owner, repo, branch, token, path, content, message) {
  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha = null;
  const getRes = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(branch), {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  const payload = {
    message: message,
    content: Utilities.base64Encode(Utilities.newBlob(content, 'application/json').getBytes()),
    branch: branch
  };
  if (sha) payload.sha = sha;

  const putRes = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = putRes.getResponseCode();
  return code === 200 || code === 201;
}

// ======================= 2. TAB PRIVAT & UTILITAS KEAMANAN ===================
function ensurePrivateTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let uSheet = ss.getSheetByName(TAB_USERS);
  if (!uSheet) {
    uSheet = ss.insertSheet(TAB_USERS);
    uSheet.appendRow([
      'user_id', 'username', 'email', 'password_hash', 'salt',
      'status', 'otp_code', 'otp_expires_ms', 'session_token',
      'created_at', 'last_login'
    ]);
    uSheet.setFrozenRows(1);
  }

  let dSheet = ss.getSheetByName(TAB_USER_DATA);
  if (!dSheet) {
    dSheet = ss.insertSheet(TAB_USER_DATA);
    dSheet.appendRow([
      'user_id', 'email', 'domisili', 'kawitan',
      'reminders_enabled', 'data_json', 'updated_at'
    ]);
    dSheet.setFrozenRows(1);
  }
  return { uSheet: uSheet, dSheet: dSheet };
}

function sha256Hex(text) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return digest.map((b) => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function generateOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================= 3. ROUTER WEB APP (doPost) ==========================
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const action = body.action || 'feedback';

    if (action === 'feedback') return handleFeedback(body);
    if (action === 'register') return handleRegister(body);
    if (action === 'verify_email') return handleVerifyEmail(body);
    if (action === 'login') return handleLogin(body);
    if (action === 'google_login') return handleGoogleLogin(body);
    if (action === 'forgot_password') return handleForgotPassword(body);
    if (action === 'reset_password') return handleResetPassword(body);
    if (action === 'sync_load') return handleSyncLoad(body);
    if (action === 'sync_save') return handleSyncSave(body);
    if (action === 'ask_ai') return handleAskAi(body);

    return jsonResponse({ ok: false, error: 'Aksi tidak dikenali.' });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Terjadi kesalahan server: ' + err.message });
  }
}

function handleFeedback(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_FEEDBACK);
  if (!sheet) return jsonResponse({ ok: false, error: 'Tab Masukan_Keluarga tidak ditemukan.' });
  const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([
    now,
    body.nama_pengirim || '',
    body.hubungan_keluarga || '',
    body.tab_terkait || '',
    body.id_topik || '',
    body.judul_topik || '',
    body.asal_dresta || '',
    body.isi_masukan_atau_koreksi || '',
    'Terbuka',
    ''
  ]);
  return jsonResponse({ ok: true, message: 'Piteket tersimpan.' });
}

function handleRegister(body) {
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (username.length < 3) return jsonResponse({ ok: false, error: 'Username minimal 3 karakter.' });
  if (!email.includes('@')) return jsonResponse({ ok: false, error: 'Format email tidak valid.' });
  if (password.length < 6) return jsonResponse({ ok: false, error: 'Password minimal 6 karakter.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { uSheet } = ensurePrivateTabs();
    const rows = uSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const existingUser = String(rows[i][1]).trim().toLowerCase();
      const existingEmail = String(rows[i][2]).trim().toLowerCase();
      const status = String(rows[i][5]).trim();
      if (existingEmail === email && status === 'AKTIF') {
        return jsonResponse({ ok: false, error: 'Email sudah terdaftar. Silakan masuk atau gunakan Lupa Password.' });
      }
      if (existingUser === username.toLowerCase() && existingEmail !== email && status === 'AKTIF') {
        return jsonResponse({ ok: false, error: 'Username sudah dipakai pengguna lain.' });
      }
      // Jika pendaftaran lama belum terverifikasi, perbarui kode OTP-nya
      if (existingEmail === email && status !== 'AKTIF') {
        const salt = Utilities.getUuid().slice(0, 12);
        const hash = sha256Hex(salt + ':' + password);
        const otp = generateOtp6();
        const exp = Date.now() + 15 * 60 * 1000;
        uSheet.getRange(i + 1, 2).setValue(username);
        uSheet.getRange(i + 1, 4).setValue(hash);
        uSheet.getRange(i + 1, 5).setValue(salt);
        uSheet.getRange(i + 1, 7).setValue(otp);
        uSheet.getRange(i + 1, 8).setValue(exp);
        sendOtpEmail(email, username, otp, 'register');
        return jsonResponse({ ok: true, needsVerification: true, message: 'Kode konfirmasi 6 digit telah dikirim ke email Anda.' });
      }
    }

    const userId = 'usr_' + Utilities.getUuid().slice(0, 8);
    const salt = Utilities.getUuid().slice(0, 12);
    const hash = sha256Hex(salt + ':' + password);
    const otp = generateOtp6();
    const exp = Date.now() + 15 * 60 * 1000;
    const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');

    uSheet.appendRow([userId, username, email, hash, salt, 'MENUNGGU_VERIFIKASI', otp, exp, '', now, '']);
    sendOtpEmail(email, username, otp, 'register');
    return jsonResponse({ ok: true, needsVerification: true, message: 'Kode konfirmasi 6 digit telah dikirim ke email Anda.' });
  } finally {
    lock.releaseLock();
  }
}

function handleVerifyEmail(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();
  const { uSheet, dSheet } = ensurePrivateTabs();
  const rows = uSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim().toLowerCase() === email) {
      const savedOtp = String(rows[i][6]).trim();
      const exp = Number(rows[i][7] || 0);
      if (!savedOtp || savedOtp !== otp) {
        return jsonResponse({ ok: false, error: 'Kode konfirmasi salah.' });
      }
      if (Date.now() > exp) {
        return jsonResponse({ ok: false, error: 'Kode konfirmasi sudah kedaluwarsa. Silakan daftar ulang untuk mengirim kode baru.' });
      }
      const token = generateToken();
      const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');
      uSheet.getRange(i + 1, 6).setValue('AKTIF');
      uSheet.getRange(i + 1, 7).setValue('');
      uSheet.getRange(i + 1, 8).setValue('');
      uSheet.getRange(i + 1, 9).setValue(token);
      uSheet.getRange(i + 1, 11).setValue(now);

      const userId = String(rows[i][0]);
      const username = String(rows[i][1]);
      const cloud = getUserCloudData(dSheet, userId);

      return jsonResponse({
        ok: true,
        token: token,
        user: { userId: userId, username: username, email: email },
        cloud: cloud
      });
    }
  }
  return jsonResponse({ ok: false, error: 'Email tidak ditemukan.' });
}

function handleLogin(body) {
  const identifier = String(body.identifier || '').trim().toLowerCase();
  const password = String(body.password || '');
  const { uSheet, dSheet } = ensurePrivateTabs();
  const rows = uSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const uname = String(rows[i][1]).trim().toLowerCase();
    const email = String(rows[i][2]).trim().toLowerCase();
    if (identifier === email || identifier === uname) {
      if (String(rows[i][5]).trim() !== 'AKTIF') {
        return jsonResponse({ ok: false, needsVerification: true, email: email, error: 'Akun belum diverifikasi. Masukkan kode 6 digit dari email Anda.' });
      }
      const salt = String(rows[i][4]);
      const expectedHash = String(rows[i][3]);
      if (expectedHash === 'GOOGLE_OAUTH') {
        return jsonResponse({ ok: false, error: 'Akun ini terdaftar lewat Google. Klik tombol "Masuk dengan Google" di atas, atau gunakan Lupa Password untuk membuat password manual.' });
      }
      if (sha256Hex(salt + ':' + password) !== expectedHash) {
        return jsonResponse({ ok: false, error: 'Password salah.' });
      }
      const token = generateToken();
      const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');
      uSheet.getRange(i + 1, 9).setValue(token);
      uSheet.getRange(i + 1, 11).setValue(now);

      const userId = String(rows[i][0]);
      const cloud = getUserCloudData(dSheet, userId);
      return jsonResponse({
        ok: true,
        token: token,
        user: { userId: userId, username: String(rows[i][1]), email: email },
        cloud: cloud
      });
    }
  }
  return jsonResponse({ ok: false, error: 'Akun tidak ditemukan. Periksa email/username Anda.' });
}


function handleGoogleLogin(body) {
  const props = PropertiesService.getScriptProperties();
  const expectedClientId = String(props.getProperty('GOOGLE_CLIENT_ID') || '').trim();
  if (!expectedClientId) {
    return jsonResponse({ ok: false, error: 'GOOGLE_CLIENT_ID belum diatur di Script Properties Google Apps Script.' });
  }

  const credential = String(body.credential || '').trim();
  if (!credential) {
    return jsonResponse({ ok: false, error: 'Token Google kosong.' });
  }

  const verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential);
  const res = UrlFetchApp.fetch(verifyUrl, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    return jsonResponse({ ok: false, error: 'Verifikasi token Google gagal atau sudah kedaluwarsa. Silakan coba lagi.' });
  }

  let info = {};
  try {
    info = JSON.parse(res.getContentText());
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Respons verifikasi Google tidak valid.' });
  }

  const validIss = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  const emailVerified = info.email_verified === 'true' || info.email_verified === true;
  const notExpired = !info.exp || Number(info.exp) * 1000 > Date.now();

  if (info.aud !== expectedClientId || !validIss || !emailVerified || !notExpired || !info.sub || !info.email) {
    return jsonResponse({ ok: false, error: 'Token Google tidak sesuai dengan aplikasi Piteket.' });
  }

  const email = String(info.email).trim().toLowerCase();
  const googleSub = String(info.sub).trim();
  const displayName = String(info.name || info.given_name || email.split('@')[0]).trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { uSheet, dSheet } = ensurePrivateTabs();
    const rows = uSheet.getDataRange().getValues();
    const token = generateToken();
    const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');

    // Cari akun berdasarkan email atau google sub
    for (let i = 1; i < rows.length; i++) {
      const existingEmail = String(rows[i][2]).trim().toLowerCase();
      const existingSalt = String(rows[i][4]).trim();
      if (existingEmail === email || existingSalt === 'google:' + googleSub) {
        uSheet.getRange(i + 1, 6).setValue('AKTIF');
        uSheet.getRange(i + 1, 7).setValue('');
        uSheet.getRange(i + 1, 8).setValue('');
        uSheet.getRange(i + 1, 9).setValue(token);
        uSheet.getRange(i + 1, 11).setValue(now);

        const userId = String(rows[i][0]);
        const username = String(rows[i][1]);
        const cloud = getUserCloudData(dSheet, userId);
        return jsonResponse({
          ok: true,
          token: token,
          user: { userId: userId, username: username, email: email },
          cloud: cloud,
          isNewUser: false
        });
      }
    }

    // Buat username unik dari nama/email Google
    const taken = {};
    for (let i = 1; i < rows.length; i++) {
      taken[String(rows[i][1]).trim().toLowerCase()] = true;
    }
    let baseUser = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
    if (baseUser.length < 3) baseUser = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
    if (baseUser.length < 3) baseUser = 'semeton';
    let finalUsername = baseUser;
    let suffix = 1;
    while (taken[finalUsername]) {
      finalUsername = baseUser + suffix;
      suffix++;
    }

    const userId = 'ggl_' + googleSub.slice(0, 12);
    uSheet.appendRow([userId, finalUsername, email, 'GOOGLE_OAUTH', 'google:' + googleSub, 'AKTIF', '', '', token, now, now]);

    return jsonResponse({
      ok: true,
      token: token,
      user: { userId: userId, username: finalUsername, email: email },
      cloud: null,
      isNewUser: true
    });
  } finally {
    lock.releaseLock();
  }
}

function handleForgotPassword(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const { uSheet } = ensurePrivateTabs();
  const rows = uSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim().toLowerCase() === email) {
      const otp = generateOtp6();
      const exp = Date.now() + 15 * 60 * 1000;
      uSheet.getRange(i + 1, 7).setValue(otp);
      uSheet.getRange(i + 1, 8).setValue(exp);
      sendOtpEmail(email, String(rows[i][1]), otp, 'reset');
      return jsonResponse({ ok: true, message: 'Kode sementara 6 digit sudah dikirim ke email Anda (berlaku 15 menit).' });
    }
  }
  return jsonResponse({ ok: false, error: 'Email tersebut belum terdaftar di Piteket.' });
}

function handleResetPassword(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();
  const newPassword = String(body.newPassword || '');

  if (newPassword.length < 6) return jsonResponse({ ok: false, error: 'Password baru minimal 6 karakter.' });

  const { uSheet } = ensurePrivateTabs();
  const rows = uSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim().toLowerCase() === email) {
      const savedOtp = String(rows[i][6]).trim();
      const exp = Number(rows[i][7] || 0);
      if (!savedOtp || savedOtp !== otp) return jsonResponse({ ok: false, error: 'Kode sementara salah.' });
      if (Date.now() > exp) return jsonResponse({ ok: false, error: 'Kode sementara sudah kedaluwarsa. Minta kode baru lagi.' });

      const salt = Utilities.getUuid().slice(0, 12);
      const hash = sha256Hex(salt + ':' + newPassword);
      uSheet.getRange(i + 1, 4).setValue(hash);
      uSheet.getRange(i + 1, 5).setValue(salt);
      uSheet.getRange(i + 1, 6).setValue('AKTIF');
      uSheet.getRange(i + 1, 7).setValue('');
      uSheet.getRange(i + 1, 8).setValue('');
      uSheet.getRange(i + 1, 9).setValue('');
      return jsonResponse({ ok: true, message: 'Password berhasil diperbarui. Silakan masuk dengan password baru Anda.' });
    }
  }
  return jsonResponse({ ok: false, error: 'Email tidak ditemukan.' });
}

function findUserByToken(uSheet, token) {
  if (!token) return null;
  const rows = uSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][8]).trim() === token && String(rows[i][5]).trim() === 'AKTIF') {
      return {
        rowIdx: i + 1,
        userId: String(rows[i][0]),
        username: String(rows[i][1]),
        email: String(rows[i][2])
      };
    }
  }
  return null;
}

function getUserCloudData(dSheet, userId) {
  const rows = dSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === userId) {
      let parsed = {};
      try { parsed = JSON.parse(rows[i][5] || '{}'); } catch (e) {}
      return {
        domisili: String(rows[i][2] || 'Denpasar'),
        kawitan: String(rows[i][3] || 'Karangasem'),
        remindersEnabled: String(rows[i][4]) !== 'FALSE' && rows[i][4] !== false,
        familyOtonan: parsed.familyOtonan || [],
        checklistChecked: parsed.checklistChecked || {},
        checklistCustom: parsed.checklistCustom || {}
      };
    }
  }
  return null;
}

function handleSyncLoad(body) {
  const { uSheet, dSheet } = ensurePrivateTabs();
  const user = findUserByToken(uSheet, String(body.token || ''));
  if (!user) return jsonResponse({ ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' });
  return jsonResponse({
    ok: true,
    user: { userId: user.userId, username: user.username, email: user.email },
    cloud: getUserCloudData(dSheet, user.userId)
  });
}

function handleSyncSave(body) {
  const { uSheet, dSheet } = ensurePrivateTabs();
  const user = findUserByToken(uSheet, String(body.token || ''));
  if (!user) return jsonResponse({ ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' });

  const domisili = String(body.domisili || 'Denpasar');
  const kawitan = String(body.kawitan || 'Karangasem');
  const remindersEnabled = body.remindersEnabled !== false;
  const payloadJson = JSON.stringify({
    familyOtonan: body.familyOtonan || [],
    checklistChecked: body.checklistChecked || {},
    checklistCustom: body.checklistCustom || {}
  });
  const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');

  const rows = dSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === user.userId) {
      dSheet.getRange(i + 1, 2, 1, 6).setValues([[user.email, domisili, kawitan, remindersEnabled, payloadJson, now]]);
      return jsonResponse({ ok: true, message: 'Catatan tersinkron ke akun.' });
    }
  }

  dSheet.appendRow([user.userId, user.email, domisili, kawitan, remindersEnabled, payloadJson, now]);
  return jsonResponse({ ok: true, message: 'Catatan tersimpan ke akun.' });
}

function sendOtpEmail(toEmail, username, otp, mode) {
  const subject = mode === 'register'
    ? '[Piteket] Kode Konfirmasi Pendaftaran Akun'
    : '[Piteket] Kode Sementara Lupa Password';
  const intro = mode === 'register'
    ? 'Suksma telah mendaftar di Piteket! Masukkan kode 6 digit berikut di aplikasi untuk mengaktifkan akun Anda:'
    : 'Kami menerima permintaan lupa password untuk akun Piteket Anda. Masukkan kode sementara 6 digit berikut untuk membuat password baru:';

  const body =
    'Om Swastyastu ' + username + ',\n\n' +
    intro + '\n\n' +
    'KODE VERIFIKASI: ' + otp + '\n' +
    '(Berlaku selama 15 menit)\n\n' +
    'Jika Anda tidak merasa meminta kode ini, silakan abaikan email ini.\n\n' +
    'Om Santih, Santih, Santih Om,\n' +
    'Piteket — Teman Belajar Hidup Orang Bali\n' +
    'https://piteket-pwa.pages.dev';

  MailApp.sendEmail({ to: toEmail, subject: subject, body: body, name: 'Piteket Bali' });
}

// ======================= 4. PENGINGAT OTONAN HARIAN (GMAIL) ==================
function installDailyOtonanTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((t) => {
    if (t.getHandlerFunction() === 'kirimPengingatOtonanHarian') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('kirimPengingatOtonanHarian')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .inTimezone('Asia/Makassar')
    .create();
  SpreadsheetApp.getUi().alert('Pengingat Otonan harian aktif! Sistem akan mengecek daftar Otonan pengguna login setiap hari pukul 07:00 WITA dan mengirim email pengingat H-3, H-1, dan Hari H.');
}

function daysUntilNextReminder(item, todayUtcMs) {
  const iso = item.birthDate || item.date || '';
  const recur = item.recur || 'pawukon_210';
  const parts = String(iso).split('-').map(Number);
  if (parts.length !== 3) return null;
  const baseUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);

  if (recur === 'pawukon_210') {
    const diff = Math.round((todayUtcMs - baseUtc) / 86400000);
    const nextCycle = diff <= 0 ? 1 : Math.ceil(diff / 210);
    const nextUtc = baseUtc + nextCycle * 210 * 86400000;
    return {
      daysUntil: Math.round((nextUtc - todayUtcMs) / 86400000),
      label: 'Pawukon/Oton ke-' + nextCycle,
      nextIso: Utilities.formatDate(new Date(nextUtc), 'UTC', 'yyyy-MM-dd')
    };
  }
  if (recur === 'yearly') {
    const todayDate = new Date(todayUtcMs);
    let y = todayDate.getUTCFullYear();
    let cand = Date.UTC(y, parts[1] - 1, parts[2]);
    if (cand < todayUtcMs) cand = Date.UTC(y + 1, parts[1] - 1, parts[2]);
    return {
      daysUntil: Math.round((cand - todayUtcMs) / 86400000),
      label: 'Tahunan Masehi',
      nextIso: Utilities.formatDate(new Date(cand), 'UTC', 'yyyy-MM-dd')
    };
  }
  // sasih_once atau once (sekali saja / tanpa pengulangan tetap 210 hari)
  const diffDays = Math.round((baseUtc - todayUtcMs) / 86400000);
  if (diffDays < 0) return null;
  return {
    daysUntil: diffDays,
    label: recur === 'sasih_once' ? 'Odalan Sasih' : 'Jadwal Sekali',
    nextIso: iso
  };
}

function kirimPengingatOtonanHarian() {
  const { dSheet } = ensurePrivateTabs();
  const rows = dSheet.getDataRange().getValues();
  if (rows.length < 2) return;

  const todayStr = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd');
  const p = todayStr.split('-').map(Number);
  const todayUtc = Date.UTC(p[0], p[1] - 1, p[2]);

  let sentCount = 0;
  for (let i = 1; i < rows.length; i++) {
    if (MailApp.getRemainingDailyQuota() <= 5) break;
    const email = String(rows[i][1] || '').trim();
    const enabled = String(rows[i][4]) !== 'FALSE' && rows[i][4] !== false;
    if (!email || !enabled) continue;

    let parsed = {};
    try { parsed = JSON.parse(rows[i][5] || '{}'); } catch (e) { continue; }
    const list = parsed.familyOtonan || [];
    const alerts = [];

    list.forEach((item) => {
      const res = daysUntilNextReminder(item, todayUtc);
      if (res && (res.daysUntil === 3 || res.daysUntil === 1 || res.daysUntil === 0)) {
        const labelHari = res.daysUntil === 0 ? 'HARI INI' : 'H-' + res.daysUntil;
        alerts.push('• ' + item.name + ' — ' + res.label + ' (' + labelHari + ', tanggal ' + res.nextIso + ')');
      }
    });

    if (alerts.length) {
      const body =
        'Om Swastyastu,\n\n' +
        'Berikut pengingat Otonan keluarga yang tersimpan di akun Piteket Anda:\n\n' +
        alerts.join('\n') + '\n\n' +
        'Buka Piteket untuk melihat detail Wewaran, Wuku, dan Ceklis Persiapan Otonan:\n' +
        'https://piteket-pwa.pages.dev\n\n' +
        'Om Santih, Santih, Santih Om,\n' +
        'Piteket — Teman Belajar Hidup Orang Bali';
      MailApp.sendEmail({
        to: email,
        subject: '[Piteket] Pengingat Otonan Keluarga (' + alerts.length + ' jadwal dekat)',
        body: body,
        name: 'Piteket Bali'
      });
      sentCount++;
    }
  }
  Logger.log('Pengingat Otonan terkirim: ' + sentCount);
}

// ======================= 5. TANYA PITEKET AI (GEMINI 3.5 FLASH-LITE) =========
function handleAskAi(body) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = String(props.getProperty('GEMINI_API_KEY') || '').trim();
  if (!apiKey) {
    return jsonResponse({
      ok: false,
      notConfigured: true,
      error: 'Fitur Tanya Piteket AI belum aktif (GEMINI_API_KEY belum diisi di Script Properties Apps Script). Pencarian Pintar Lokal tetap aktif 100%.'
    });
  }

  const query = String(body.query || '').trim().slice(0, 450);
  const contextText = String(body.contextText || '').trim().slice(0, 4800);
  if (!query) return jsonResponse({ ok: false, error: 'Pertanyaan kosong.' });

  // Langsung gunakan gemini-3.5-flash-lite agar cepat tanpa mencoba banyak model lain
  const model = String(props.getProperty('GEMINI_MODEL') || 'gemini-3.5-flash-lite').trim();

  const promptText =
    'Kamu adalah asisten belajar ramah di aplikasi Piteket (Teman Belajar Hidup Orang Bali, dikembangkan oleh Semeton Bali dan Gemini).\n' +
    'ATURAN KETAT:\n' +
    '1. HANYA gunakan tanggal, Wewaran, Wuku, Sasih, Penanggal/Pangelong, Rahinan, Dewasa Ayu, dan materi yang TERTULIS PERSIS di blok DATA di bawah. DILARANG mengarang tanggal atau istilah Wariga di luar blok DATA.\n' +
    '2. Jika di blok DATA terdapat [DRAF PENGINGAT / AKSI SIAP PAKAI] (misalnya pengguna ingin menambah/mencatat pengingat Odalan, Otonan, Merajan, Sanggah, atau Rahinan): sampaikan kelengkapan Kalender Bali pada tanggal tersebut persis seperti di DATA, jelaskan rekomendasi pengulangannya (berulang tiap 210 hari untuk Pawukon, atau sekali saja / Odalan Sasih), lalu arahkan pengguna mengklik tombol "Buka & Isi Form Pengingat" di bawah untuk memeriksa data, menyimpan, atau menambahkannya ke Google Calendar.\n' +
    '3. Jika pengguna menanyakan hari baik pribadi berdasarkan tanggal lahir: sebutkan data kelahiran dan daftar Dewasa Ayu UMUM terdekat persis dari DATA, lalu nyatakan jujur bahwa Piteket belum menghitung kecocokan Dewasa khusus per weton pribadi (tetap konsultasikan dengan Sulinggih/Pemangku).\n' +
    '4. Jika informasi benar-benar tidak ada di DATA, katakan jujur belum tercatat di Piteket.\n' +
    '5. Jawab singkat (3-5 kalimat), hangat, rendah hati (Desa Kala Patra).\n\n' +
    contextText + '\n\n' +
    'PERTANYAAN PENGGUNA: ' + query;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 380
      }
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code === 200) {
    const parsed = JSON.parse(res.getContentText());
    const answer = parsed && parsed.candidates && parsed.candidates[0] &&
      parsed.candidates[0].content && parsed.candidates[0].content.parts &&
      parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
    if (answer) {
      return jsonResponse({ ok: true, answer: String(answer).trim(), model: model });
    }
  }
  if (code === 429) {
    return jsonResponse({ ok: false, error: 'Kuota gratis Gemini 3.5 Flash-Lite sedang padat sementara. Coba lagi sebentar lagi atau gunakan hasil Pencarian Pintar Lokal di bawah.' });
  }
  let detail = '';
  try {
    const errObj = JSON.parse(res.getContentText());
    detail = errObj && errObj.error && errObj.error.message ? errObj.error.message : '';
  } catch (e) {}
  return jsonResponse({ ok: false, error: 'Gemini API (' + model + ') status ' + code + (detail ? ': ' + detail.slice(0, 120) : '') });
}
