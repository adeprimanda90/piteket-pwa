// ============================================================================
// Piteket PWA v2.0 — Pembaca Artikel Mendalam (Structured Rich-Text Renderer)
// Merender sub-judul (##), poin kronologis (•), Kamus Istilah ([ISTILAH]:),
// Tingkatan Upakara ([NISTA]/[MADYA]/[UTAMA]), serta Panduan Bertanya ke Tetua
// lengkap dengan kotak "Apa yang Perlu Didengarkan" ([DENGARKAN]:).
// ============================================================================

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatInlineMd(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
}

export function friendlySourceLabel(url, idx) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h.includes('unhi.ac.id')) return 'UNHI Press / Repository';
    if (h.includes('warmadewa.ac.id')) return 'Jurnal Univ. Warmadewa';
    if (h.includes('parisada.or.id')) return 'PHDI Pusat';
    if (h.includes('jayapanguspress')) return 'Jayapangus Press (Jurnal Hindu)';
    if (h.includes('iahn-gdepudja')) return 'Repository IAHN Gde Pudja';
    if (h.includes('researchgate.net')) return 'ResearchGate (Jurnal Ilmiah)';
    if (h.includes('neliti.com')) return 'Neliti (Teks Siwagama)';
    if (h.includes('sthd-jateng')) return 'Jurnal Jawa Dwipa STHD';
    if (h.includes('undana.ac.id')) return 'Jurnal Communio Undana';
    if (h.includes('uinsa.ac.id')) return 'Digilib UIN Sunan Ampel';
    if (h.includes('mahadewa.ac.id')) return 'Jurnal Univ. PGRI Mahadewa';
    if (h.includes('undiksha.ac.id')) return 'Jurnal Undiksha';
    if (h.includes('kopertais4.or.id')) return 'Jurnal Qodiri (Kopertais)';
    if (h.includes('rri.co.id')) return 'RRI Denpasar';
    if (h.includes('paduarsana.com')) return 'Paduarsana (Lontar Angastyaprana)';
    if (h.includes('tribunnews.com')) return 'Tribun Bali';
    if (h.includes('scribd.com')) return 'Arsip Naskah Lontar';
    if (h.includes('rewangrencang')) return 'Jurnal Hukum JHLG';
    if (h.includes('kemenagbadung')) return 'Kemenag Badung';
    return `${h} (Sumber ${idx + 1})`;
  } catch {
    return `Sumber ${idx + 1}`;
  }
}

export function renderRichArticleHtml(rawText) {
  const txt = String(rawText || '').trim();
  if (!txt) return '';

  const lines = txt.split(/\r?\n/);
  const out = [];
  let listBuf = [];
  let termBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    out.push(`<ul class="art-list">${listBuf.map((li) => `<li>${formatInlineMd(li)}</li>`).join('')}</ul>`);
    listBuf = [];
  };

  const flushTerms = () => {
    if (!termBuf.length) return;
    out.push(`
      <div class="term-grid">
        ${termBuf.map((t) => {
          const splitMatch = t.match(/^\*\*(.+?)\*\*\s*[—–-]\s*([\s\S]+)$/);
          if (splitMatch) {
            return `<div class="term-card"><span class="term-card-title">📖 ${escapeHtml(splitMatch[1])}:</span> ${formatInlineMd(splitMatch[2])}</div>`;
          }
          return `<div class="term-card">📖 ${formatInlineMd(t)}</div>`;
        }).join('')}
      </div>
    `);
    termBuf = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushTerms();
      return;
    }

    const headMatch = line.match(/^##\s+(.+)$/);
    if (headMatch) {
      flushList();
      flushTerms();
      out.push(`<h5 class="art-subhead">${formatInlineMd(headMatch[1])}</h5>`);
      return;
    }

    const termMatch = line.match(/^\[ISTILAH\]\s*:?\s*(.+)$/i);
    if (termMatch) {
      flushList();
      termBuf.push(termMatch[1].trim());
      return;
    }

    const bulletMatch = line.match(/^(?:•|-|\*)\s+(.+)$/);
    if (bulletMatch) {
      flushTerms();
      listBuf.push(bulletMatch[1].trim());
      return;
    }

    flushList();
    flushTerms();
    out.push(`<p>${formatInlineMd(line)}</p>`);
  });

  flushList();
  flushTerms();
  return out.join('');
}

export function formatUpacaraWithTiers(rawText) {
  const txt = String(rawText || '').trim();
  if (!/\[(NISTA|MADYA|UTAMA)\]/i.test(txt)) {
    return renderRichArticleHtml(txt);
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
    ${intro.length ? renderRichArticleHtml(intro.join('\n\n')) : ''}
    <div class="tier-grid">
      ${tiers.map((t) => {
        const meta = levelMeta[t.level] || { label: t.level, cls: 'tier-madya' };
        return `
          <div class="tier-card ${meta.cls}">
            <div class="tier-badge">${meta.label}</div>
            <p>${formatInlineMd(t.body)}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function formatElderGuide(rawText) {
  const txt = String(rawText || '').trim();
  if (!/\[DENGARKAN\]/i.test(txt)) {
    return `<p style="margin:6px 0 0;white-space:pre-line;">${formatInlineMd(txt)}</p>`;
  }

  const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let current = null;

  lines.forEach((line) => {
    const listenMatch = line.match(/^\[DENGARKAN\]\s*:?\s*(.+)$/i);
    if (listenMatch) {
      if (!current) current = { q: '', listen: [] };
      current.listen.push(listenMatch[1].trim());
    } else {
      if (current) items.push(current);
      current = { q: line, listen: [] };
    }
  });
  if (current) items.push(current);

  return `
    <div class="elder-qa-list">
      ${items.map((it) => `
        <div class="elder-qa-card">
          ${it.q ? `<p class="elder-q-text">${formatInlineMd(it.q)}</p>` : ''}
          ${it.listen.length ? `
            <div class="elder-listen-box">
              <span class="elder-listen-label">👂 Apa yang Perlu Didengarkan (Makna Jawaban Tetua)</span>
              ${it.listen.map((l) => `<div>${formatInlineMd(l)}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
