/**
 * Bind this script to the destination Google Sheet: Extensions > Apps Script.
 * Set Script Property WISHES_SHARED_SECRET to the same random secret as Vercel.
 * Deploy as Web app, Execute as: Me, Who has access: Anyone.
 */
const SHEET_NAME = 'Wishes';
const HEADERS = ['Thời gian', 'Người gửi', 'Lời chúc'];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Prevent names or wishes beginning with spreadsheet operators from becoming formulas.
function textCell_(value) {
  const text = String(value);
  return /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
}

function doPost(e) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('WISHES_SHARED_SECRET');
    if (!expected) return json_({ ok: false, error: 'Secret not configured' });
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 10000) return json_({ ok: false, error: 'Invalid payload' });
    const data = JSON.parse(raw);
    if (typeof data.secret !== 'string' || data.secret !== expected) {
      return json_({ ok: false, error: 'Unauthorized' });
    }
    if (typeof data.name !== 'string' || typeof data.wish !== 'string') {
      return json_({ ok: false, error: 'Invalid fields' });
    }
    const name = data.name.trim();
    const wish = data.wish.trim();
    if (!name || !wish || name.length > 80 || wish.length > 1200) {
      return json_({ ok: false, error: 'Invalid length' });
    }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ ok: false, error: 'Busy; retry' });
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
        sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#dce7ff');
      }
      sheet.appendRow([new Date(), textCell_(name), textCell_(wish)]);
      const last = sheet.getLastRow();
      sheet.getRange(last, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sheet.getRange(last, 2, 1, 2).setNumberFormat('@');
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'Save failed' });
  }
}

// Optional: run once to create a styled header, without adding a sample wish.
function setupWishesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#dce7ff');
  sheet.setColumnWidths(1, 1, 180);
  sheet.setColumnWidths(2, 1, 200);
  sheet.setColumnWidths(3, 1, 560);
  sheet.getRange('C:C').setWrap(true);
}
