/**
 * 初始化：建立四個工作表與標題列、設定純文字格式、產生 API token。
 * 可重複執行，不會清除既有資料。在 Apps Script 編輯器手動執行。
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(SHEETS).forEach((def) => setupSheet_(ss, def));
  setupLanguageValidation_(ss);
  removeDefaultSheet_(ss);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(TOKEN_PROPERTY)) {
    props.setProperty(TOKEN_PROPERTY, generateToken_());
    Logger.log('已產生新的 token。');
  }
  showToken();
  Logger.log('setup 完成。');
}

/** 在執行記錄顯示目前的 token。 */
function showToken() {
  const token = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  Logger.log(token ? `token：${token}` : '尚未產生 token，請執行 setup()');
}

/** 換一組新 token。舊 token 立即失效，手機上要重新輸入。 */
function resetToken() {
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, generateToken_());
  showToken();
}

function setupSheet_(ss, def) {
  const sheet = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
  const width = def.headers.length;
  const headerRange = sheet.getRange(1, 1, 1, width);
  const current = headerRange.getValues()[0].map(String);

  if (current.every((v) => v === '')) {
    headerRange.setValues([def.headers]);
  } else if (current.join('|') !== def.headers.join('|')) {
    throw new Error(
      `${def.name} 的標題列與預期不同，未做任何修改。\n` +
      `目前：${current.join(', ')}\n預期：${def.headers.join(', ')}`
    );
  }

  // 整欄設為純文字，避免日期、TRUE/FALSE、數字被自動轉型
  sheet.getRange(1, 1, sheet.getMaxRows(), width).setNumberFormat('@');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);

  // 刪掉多餘的欄，畫面比較乾淨
  const extra = sheet.getMaxColumns() - width;
  if (extra > 0) sheet.deleteColumns(width + 1, extra);
}

/** Vocabulary 的 language 欄加下拉選單，方便直接在 Sheet 輸入。 */
function setupLanguageValidation_(ss) {
  const def = SHEETS.vocabulary;
  const sheet = ss.getSheetByName(def.name);
  const col = def.headers.indexOf('language') + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(LANGUAGES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

/** 新試算表預設的空白工作表（工作表1 / Sheet1）若沒有內容就刪掉。 */
function removeDefaultSheet_(ss) {
  const ours = Object.values(SHEETS).map((d) => d.name);
  ss.getSheets()
    .filter((s) => !ours.includes(s.getName()) && s.getLastRow() === 0 && s.getLastColumn() === 0)
    .forEach((s) => ss.deleteSheet(s));
}

function generateToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}
