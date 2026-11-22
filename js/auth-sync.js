// ============================================================================
// Piteket — Klien Akun & Sinkronisasi Cloud (100% Google Apps Script)
// Menggunakan POST text/plain (simple CORS request) agar respons JSON terbaca
// ============================================================================

import { PITEKET_CONFIG } from './config.js';

const STORAGE_SESSION_KEY = 'piteket_auth_session';

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(sessionObj) {
  if (!sessionObj) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } else {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionObj));
  }
}

async function callApi(payload) {
  const url = PITEKET_CONFIG.appsScriptWebAppUrl;
  if (!url) {
    throw new Error('URL Google Apps Script belum diatur di js/config.js.');
  }
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Respons server tidak valid. Pastikan Web App Apps Script sudah di-deploy versi terbaru (Anyone).');
  }
}

export const AuthApi = {
  register: (username, email, password) =>
    callApi({ action: 'register', username, email, password }),

  verifyEmail: (email, otp) =>
    callApi({ action: 'verify_email', email, otp }),

  login: (identifier, password) =>
    callApi({ action: 'login', identifier, password }),

  forgotPassword: (email) =>
    callApi({ action: 'forgot_password', email }),

  resetPassword: (email, otp, newPassword) =>
    callApi({ action: 'reset_password', email, otp, newPassword }),

  syncLoad: (token) =>
    callApi({ action: 'sync_load', token }),

  syncSave: (token, data) =>
    callApi({ action: 'sync_save', token, ...data })
};
