/**
 * RSVP + game leaderboard receiver — paste this into a Google Sheet's Apps Script editor
 * (Extensions → Apps Script), then Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. Copy the /exec URL into config.js → sheetEndpoint.
 *
 * Sheets (tabs) are created automatically:
 *   "RSVP"        — one row per RSVP
 *   "Leaderboard" — one row per saved game score
 */
const RSVP_SHEET = "RSVP";
const RSVP_HEADERS = ["Thời gian", "Tên", "Tham dự", "Khách của", "Số người", "Lời chúc", "Link khách"];
const SCORE_SHEET = "Leaderboard";
const SCORE_HEADERS = ["Thời gian", "Tên", "Điểm", "Slime", "Tim", "Lì xì", "Vấp", "Thời gian chơi (s)"];
const MAX_SCORE = 50000; // sanity cap against obviously fake scores
const TOP_N = 10;

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

function int_(v, max) {
  const n = Math.floor(Number(v));
  return isFinite(n) ? Math.max(0, Math.min(n, max)) : 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = e.parameter;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.type === "score") {
      getSheet_(SCORE_SHEET, SCORE_HEADERS).appendRow([
        new Date(),
        safe_(p.name, 24) || "Khách bí ẩn",
        int_(p.score, MAX_SCORE),
        int_(p.slimes, 999),
        int_(p.hearts, 999),
        int_(p.lixi, 999),
        int_(p.hits, 999),
        int_(p.time, 9999),
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
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// GET ?action=leaderboard → { ok, top: [{ name, score }] }  (best score per name)
function doGet(e) {
  if ((e.parameter || {}).action !== "leaderboard") return json_({ ok: true });
  const sheet = getSheet_(SCORE_SHEET, SCORE_HEADERS);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getValues() : [];
  const best = {};
  rows.forEach(function (r) {
    const name = String(r[0]).replace(/^'/, "").trim() || "Khách bí ẩn";
    const key = name.toLowerCase();
    const score = Number(r[1]) || 0;
    if (!best[key] || score > best[key].score) best[key] = { name: name, score: score };
  });
  const top = Object.keys(best)
    .map(function (k) { return best[k]; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, TOP_N);
  return json_({ ok: true, top: top });
}
