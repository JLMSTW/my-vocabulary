/**
 * 直接在 Sheet 編輯 Vocabulary 時：
 * - 填入 word 後自動補 word_id、date_added
 * - 更新 updated_at
 * - 文字做 NFC 正規化並去空白，語言轉大寫，標籤整理成半形逗號
 * - 與既有單字重複時跳出提示（不擋下，請自行刪除）
 *
 * 這是 simple trigger，名稱必須是 onEdit，不需要另外設定觸發條件。
 * 透過 API 或腳本寫入不會觸發。
 */

const CONTENT_FIELDS = ['language', 'word', 'meaning_zh', 'part_of_speech', 'example', 'topic', 'tags'];

function onEdit(e) {
  if (!e || !e.range) return;
  const def = SHEETS.vocabulary;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== def.name) return;

  const firstRow = Math.max(e.range.getRow(), 2);
  const lastRow = e.range.getLastRow();
  if (lastRow < firstRow) return;

  // 只改 word_id、date_added、updated_at 這類欄位時不處理
  const fromCol = e.range.getColumn() - 1;
  const toCol = e.range.getLastColumn() - 1;
  const touchesContent = CONTENT_FIELDS
    .map((f) => def.headers.indexOf(f))
    .some((c) => c >= fromCol && c <= toCol);
  if (!touchesContent) return;

  const range = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, def.headers.length);
  const now = nowIso();
  const edited = [];

  const values = range.getValues().map((row) => {
    const r = Object.fromEntries(def.headers.map((h, i) => [h, row[i]]));
    if (!normText(r.word)) return row;

    const next = {
      ...r,
      language: normText(r.language).toUpperCase(),
      word: normText(r.word),
      meaning_zh: normText(r.meaning_zh),
      part_of_speech: normText(r.part_of_speech),
      example: normText(r.example),
      topic: normText(r.topic),
      tags: normTags(r.tags),
      word_id: normText(r.word_id) || newId(),
      date_added: normText(r.date_added) || now,
      updated_at: now,
    };
    edited.push(next);
    return def.headers.map((h) => String(next[h]));
  });

  if (!edited.length) return;
  range.setNumberFormat('@');
  range.setValues(values);
  warnDuplicates_(edited);
}

function warnDuplicates_(edited) {
  const all = readRows(SHEETS.vocabulary).filter((r) => r.word && r.meaning_zh);
  const dups = edited
    .filter((w) => w.meaning_zh)
    .filter((w) => all.some((r) => r.word_id !== w.word_id && duplicateKey_(r) === duplicateKey_(w)))
    .map((w) => `${w.word}（${w.meaning_zh}）`);
  if (dups.length) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `${dups.join('、')} 與既有單字重複，請刪除其中一列。`,
      '重複的單字',
      10
    );
  }
}
