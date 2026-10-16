/**
 * 共用小工具：文字正規化、時間、ID。
 */

/** NFC 正規化並去除前後空白；null / undefined 視為空字串。 */
function normText(value) {
  if (value === null || value === undefined) return '';
  return String(value).normalize('NFC').trim();
}

/** 目前時間，ISO 8601 含時區，例如 2026-10-16T09:30:00+08:00。 */
function nowIso() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * 標籤正規化：接受陣列或逗號分隔字串（半形、全形逗號皆可），
 * 去空白、去重複後以半形逗號串接。
 */
function normTags(value) {
  const parts = Array.isArray(value) ? value : String(value || '').split(/[,，]/);
  const tags = parts.map(normText).filter(Boolean);
  return [...new Set(tags)].join(',');
}

function splitTags(value) {
  return normTags(value).split(',').filter(Boolean);
}

function newId() {
  return Utilities.getUuid();
}

/** API 可預期的錯誤，code 會原樣回傳給前端。 */
class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function getSheet(def) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.name);
  if (!sheet) throw new Error(`找不到工作表 ${def.name}，請先執行 setup()`);
  return sheet;
}

/** 讀取整張工作表（不含標題列），每列轉成以欄位名稱為 key 的物件，值一律為字串。 */
function readRows(def) {
  const sheet = getSheet(def);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet
    .getRange(2, 1, lastRow - 1, def.headers.length)
    .getDisplayValues()
    .map((row) => Object.fromEntries(def.headers.map((h, i) => [h, row[i]])));
}

/** 在工作表最後面加入多列，先設成純文字格式再寫入。 */
function appendRows(def, records) {
  if (!records.length) return;
  const sheet = getSheet(def);
  const start = sheet.getLastRow() + 1;
  const end = start + records.length - 1;
  if (end > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), end - sheet.getMaxRows());
  }
  const values = records.map((r) =>
    def.headers.map((h) => (r[h] === undefined || r[h] === null ? '' : String(r[h])))
  );
  const range = sheet.getRange(start, 1, records.length, def.headers.length);
  range.setNumberFormat('@');
  range.setValues(values);
}

/** 以 records 覆寫整張工作表的資料區（不含標題列），用於整批更新。 */
function writeAllRows(def, records) {
  const sheet = getSheet(def);
  const oldCount = Math.max(sheet.getLastRow() - 1, 0);
  if (records.length + 1 > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), records.length + 1 - sheet.getMaxRows());
  }
  if (records.length) {
    const values = records.map((r) =>
      def.headers.map((h) => (r[h] === undefined || r[h] === null ? '' : String(r[h])))
    );
    const range = sheet.getRange(2, 1, records.length, def.headers.length);
    range.setNumberFormat('@');
    range.setValues(values);
  }
  if (oldCount > records.length) {
    sheet.getRange(records.length + 2, 1, oldCount - records.length, def.headers.length).clearContent();
  }
}

/** 寫入用的鎖，避免同時寫入造成資料錯亂。 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new ApiError('busy');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
