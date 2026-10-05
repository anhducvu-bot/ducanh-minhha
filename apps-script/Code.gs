/**
 * RSVP receiver — paste this into a Google Sheet's Apps Script editor
 * (Extensions → Apps Script), then Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. Copy the /exec URL into config.js → sheetEndpoint.
 *
 * Each RSVP becomes one row in the "RSVP" tab (created automatically).
 */
const SHEET_NAME = "RSVP";
const HEADERS = ["Thời gian", "Tên", "Tham dự", "Khách của", "Số người", "Lời chúc", "Link khách"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    const p = e.parameter;
    // Prefix "'" so values like "=..." are stored as text, not formulas
    const safe = (v) => {
      v = String(v || "").slice(0, 1000);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    };
    sheet.appendRow([
      new Date(),
      safe(p.name),
      safe(p.attending),
      safe(p.side),
      safe(p.count),
      safe(p.message),
      safe(p.guestLink),
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
