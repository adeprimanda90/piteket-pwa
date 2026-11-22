# Panduan Setup Phase 1 — Piteket PWA (Gratis 100%)

Panduan ini ditulis langkah demi langkah tanpa mengasumsikan latar belakang coding.

## Arsitektur Anda
1. **Google Sheet (`Piteket — Master Database & Masukan Keluarga`)** di Google Drive: tempat Anda dan keluarga menulis, mengedit, dan menerima koreksi.
2. **GitHub (`adeprimanda90/piteket-pwa`)**: tempat menyimpan kode PWA dan file JSON hasil export dari Google Sheet.
3. **Cloudflare Pages (Gratis)**: menayangkan PWA ke HP seluruh keluarga dengan kecepatan tinggi dan dukungan offline.

## Langkah 1 — Upload Starter Kit ke GitHub
1. Buka [GitHub](https://github.com) dan login ke akun **`adeprimanda90`**.
2. Klik tombol **+** di kanan atas → **New repository**.
3. Isi **Repository name**: `piteket-pwa`, pilih **Public** (atau Private), lalu klik **Create repository**.
4. Ekstrak file `piteket-pwa-phase1.zip` di Mac Anda.
5. Di halaman repository GitHub yang baru dibuat, klik **uploading an existing file**.
6. Tarik (*drag & drop*) **semua isi di dalam folder `piteket-pwa/`** (`index.html`, `manifest.json`, `sw.js`, folder `css/`, `js/`, `data/`, `icons/`, `apps-script/`) ke kotak upload GitHub, lalu klik **Commit changes**.

## Langkah 2 — Tayangkan di Cloudflare Pages (Gratis)
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) → menu **Workers & Pages** → **Create** → pilih tab **Pages** → **Connect to Git**.
2. Pilih repository **`adeprimanda90/piteket-pwa`**.
3. Pada bagian Build settings:
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `/` *(atau biarkan kosong)*
4. Klik **Save and Deploy**. Dalam ±20 detik, PWA Piteket langsung online di `https://piteket-pwa.pages.dev`!
5. Uji di HP Anda: buka link tersebut di **Safari (iPhone)** → tombol Share → **Add to Home Screen**, atau di **Chrome (Android)** → **Install App**.

## Langkah 3 — Pasang Google Apps Script (Penerima Masukan Keluarga & 1-Klik Publish)
1. Buka Google Sheet **[Piteket — Master Database & Masukan Keluarga](https://docs.google.com/spreadsheets/d/1QURn1ADXU7c9uMPPCV3MB5f_-cKvpxId4tTNlx3JeIs/edit)**.
2. Klik menu **Extensions** → **Apps Script**.
3. Hapus kode bawaan di editor, lalu salin-tempel seluruh isi file `apps-script/Code.gs` (buka dengan CotEditor atau TextEdit mode Plain Text di Mac).
4. Klik ikon **Save** (💾).

### A. Aktifkan Penerima Masukan Keluarga (Form di dalam PWA)
1. Di Apps Script, klik **Deploy** → **New deployment** → ikon gir → pilih **Web app**.
2. Isi:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
3. Klik **Deploy**, setujui izin Google Anda (*Advanced → Go to project (unsafe)* karena ini skrip pribadi Anda sendiri), lalu salin **Web app URL** yang muncul (`https://script.google.com/macros/s/.../exec`).
4. Buka file `js/config.js` di GitHub (`adeprimanda90/piteket-pwa`), klik ikon pensil (**Edit**), tempel URL tersebut di `appsScriptWebAppUrl: "..."`, lalu klik **Commit changes**.

### B. Aktifkan Tombol 1-Klik "Publish ke GitHub" dari Google Sheet
1. Di GitHub, buka **Settings** (profil kanan atas) → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Pilih **Only select repositories** → `piteket-pwa`. Di bagian **Repository permissions**, ubah **Contents** menjadi **Read and write**. Klik **Generate token** dan salin tokennya.
3. Kembali ke Google Apps Script → klik **Project Settings** (ikon gir di kiri) → gulir ke **Script Properties** → **Add script property**:
   - `GITHUB_TOKEN` = *(tempel token GitHub Anda)*
   - `GITHUB_OWNER` = `adeprimanda90`
   - `GITHUB_REPO` = `piteket-pwa`
   - `GITHUB_BRANCH` = `main`
4. Reload Google Sheet Anda. Akan muncul menu baru **Piteket CMS** di bagian atas → klik **Publish Semua Data ke GitHub (PWA)** kapan pun Anda selesai menambah atau mengedit isi Sheet!
