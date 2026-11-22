// ============================================================================
// Piteket — Generator File iCalendar (.ics / RFC 5545) 100% Offline
// Kompatibel dengan Google Calendar, Apple Calendar (iOS/macOS), dan Outlook
// ============================================================================

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoToIcsDate(isoDate) {
  return isoDate.replace(/-/g, "");
}

function nextDayIso(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function escapeIcsText(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatUtcStamp(dateObj = new Date()) {
  return (
    dateObj.getUTCFullYear() +
    pad2(dateObj.getUTCMonth() + 1) +
    pad2(dateObj.getUTCDate()) +
    "T" +
    pad2(dateObj.getUTCHours()) +
    pad2(dateObj.getUTCMinutes()) +
    pad2(dateObj.getUTCSeconds()) +
    "Z"
  );
}

export function buildIcsContent(calName, events) {
  const stamp = formatUtcStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Piteket PWA//Kalender Bali Offline//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    "X-WR-TIMEZONE:Asia/Makassar"
  ];

  events.forEach((ev, idx) => {
    const dtStart = isoToIcsDate(ev.isoDate);
    const dtEnd = isoToIcsDate(nextDayIso(ev.isoDate));
    const uid = `piteket-${dtStart}-${idx}-${Math.abs(hashCode(ev.summary))}@piteket-pwa.pages.dev`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }

    const alarms = ev.alarmDaysBefore || [1];
    alarms.forEach((daysBefore) => {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeIcsText(`Pengingat H-${daysBefore}: ${ev.summary}`)}`);
      lines.push(`TRIGGER:-P${daysBefore}D`);
      lines.push("END:VALARM");
    });

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

export function downloadIcsFile(filename, icsText) {
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
