/**
 * RSVP + game scores — paste this into the Google Sheet's Apps Script editor, then
 * Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.
 * (Editing the existing deployment keeps the same /exec link.)
 *
 * Tabs are created automatically:
 *   "RSVP"      — one row per RSVP
 *   "Điểm game" — one row per saved game score (name + score)
 */
const RSVP_SHEET = "RSVP";
const RSVP_HEADERS = ["Thời gian", "Tên", "Tham dự", "Khách của", "Số người", "Lời chúc", "Link khách"];
const SCORE_SHEET = "Điểm game";
const SCORE_HEADERS = ["Thời gian", "Tên", "Điểm", "Link khách"];
const MAX_SCORE = 50000; // ignore obviously fake scores

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Prefix "'" so values like "=..." are stored as text, not formulas
function safe_(v, max) {
  v = String(v == null ? "" : v).slice(0, max || 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  const p = e.parameter;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.type === "score") {
      const score = Math.max(0, Math.min(MAX_SCORE, Math.floor(Number(p.score)) || 0));
      getSheet_(SCORE_SHEET, SCORE_HEADERS).appendRow([
        new Date(),
        safe_(p.name, 40) || "Khách bí ẩn",
        score,
        safe_(p.guestLink, 100),
      ]);
    } else {
      getSheet_(RSVP_SHEET, RSVP_HEADERS).appendRow([
        new Date(),
        safe_(p.name),
        safe_(p.attending),
        safe_(p.side),
        safe_(p.count),
        safe_(p.message),
        safe_(p.guestLink),
      ]);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
