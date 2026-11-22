/**
 * PITEKET — Google Apps Script Bridge (v2 — termasuk Catatan_Dresta 10 Wilayah)
 */

const TAB_TO_FILE = {
  'Utpatti': 'data/utpatti.json',
  'Sthiti': 'data/sthiti.json',
  'Pralina': 'data/pralina.json',
  'Dewasa_Ayu': 'data/dewasa-ayu.json',
  'Glosarium_Aksara': 'data/glosarium-aksara.json',
  'Catatan_Dresta': 'data/catatan-dresta.json'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Piteket CMS')
    .addItem('Publish Semua Data ke GitHub (PWA)', 'publishAllTabsToGitHub')
    .addToUi();
}

function sheetToJsonArray(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every((cell) => String(cell).trim() === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const val = row[idx];
      obj[h] = val instanceof Date ? Utilities.formatDate(val, 'Asia/Makassar', 'yyyy-MM-dd') : String(val);
    });
    rows.push(obj);
  }
  return rows;
}

function publishAllTabsToGitHub() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER') || 'adeprimanda90';
  const repo = props.getProperty('GITHUB_REPO') || 'piteket-pwa';
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token) {
    SpreadsheetApp.getUi().alert('GITHUB_TOKEN belum diisi di Project Settings > Script Properties.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const updated = [];

  Object.keys(TAB_TO_FILE).forEach((tabName) => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    const jsonString = JSON.stringify(sheetToJsonArray(sheet), null, 2);
    const path = TAB_TO_FILE[tabName];
    pushFileToGitHub(owner, repo, branch, path, jsonString, token, `Update ${path} from Piteket Google Sheet`);
    updated.push(path);
  });

  SpreadsheetApp.getUi().alert('Berhasil publish ke GitHub! Cloudflare Pages akan otomatis update dalam ~15 detik.\n\nFile diperbarui:\n- ' + updated.join('\n- '));
}

function pushFileToGitHub(owner, repo, branch, path, content, token, message) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha = null;
  const getRes = UrlFetchApp.fetch(`${apiUrl}?ref=${branch}`, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  const payload = {
    message: message,
    content: Utilities.base64Encode(Utilities.newBlob(content, 'application/json', path).getBytes()),
    branch: branch
  };
  if (sha) payload.sha = sha;

  const putRes = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (putRes.getResponseCode() < 200 || putRes.getResponseCode() >= 300) {
    throw new Error(`Gagal upload ${path}: ${putRes.getContentText()}`);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Masukan_Keluarga');
    const now = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      now,
      data.nama_pengirim || '',
      data.hubungan_keluarga || '',
      data.tab_terkait || '',
      data.id_topik || '',
      data.judul_topik || '',
      data.asal_dresta || '',
      data.isi_masukan_atau_koreksi || '',
      'Terbuka',
      ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
