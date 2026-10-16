/**
 * 在 Apps Script 編輯器手動執行的測試，不經過 Web App，直接呼叫 handleRequest_。
 */

function testAuth() {
  log_('沒有 token', handleRequest_({ action: 'getData' }));
  log_('錯誤 token', handleRequest_({ token: 'wrong', action: 'getData' }));
  log_('不存在的 action', handleRequest_({ token: token_(), action: 'nope' }));
}

function testGetData() {
  const res = handleRequest_({ token: token_(), action: 'getData' });
  if (!res.ok) return log_('getData 失敗', res);
  const { vocabulary, progress, history } = res.data;
  Logger.log(`單字 ${vocabulary.length}、複習進度 ${progress.length}、練習紀錄 ${history.length}`);
  vocabulary.slice(0, 5).forEach((w) => Logger.log(JSON.stringify(w)));
}

/** 新增一個範例字。執行第二次應回傳 duplicate。測完可直接在 Sheet 刪掉該列。 */
function testAddWord() {
  log_('新增', handleRequest_({
    token: token_(),
    action: 'addWord',
    payload: {
      language: 'fr',
      word: '  la boulangerie ',
      meaning_zh: '麵包店',
      part_of_speech: 'n.f.',
      topic: '城市',
      tags: '地點，商店, 地點',
    },
  }));
}

/**
 * 用第一個單字模擬：答錯 1 次，再連續答對 3 次，最後重送最後一回合。
 * 預期 needs_review：TRUE → TRUE → TRUE → FALSE，重送回傳 already_saved: true。
 * 測試資料的 round_id 以 test- 開頭，測完執行 testCleanup 刪除。
 */
function testSaveRound() {
  const data = handleRequest_({ token: token_(), action: 'getData' }).data;
  const word = data.vocabulary[0];
  if (!word) return Logger.log('Vocabulary 沒有單字，請先執行 testAddWord');
  Logger.log(`測試單字：${word.word}`);

  const sequence = [false, true, true, true];
  let last = null;
  sequence.forEach((isCorrect, i) => {
    last = {
      round: {
        round_id: `test-${newId()}`,
        practice_mode: 'spelling',
        language: word.language,
        filters: { test: true },
      },
      attempts: [{
        word_id: word.word_id,
        user_answer: isCorrect ? word.word : 'boulangerie',
        correct_answer: word.word,
        is_correct: isCorrect,
      }],
    };
    const res = handleRequest_({ token: token_(), action: 'saveRound', payload: last });
    const p = readRows(SHEETS.progress).find((r) => r.word_id === word.word_id) || {};
    Logger.log(
      `第 ${i + 1} 回（${isCorrect ? '答對' : '答錯'}）：${JSON.stringify(res)}｜` +
      `連續答對 ${p.consecutive_correct}、needs_review ${p.needs_review}`
    );
  });

  log_('重送最後一回合', handleRequest_({ token: token_(), action: 'saveRound', payload: last }));
}

/** 刪除 round_id 以 test- 開頭的紀錄，並移除已無任何練習紀錄的複習進度。 */
function testCleanup() {
  const isTest = (id) => String(id).startsWith('test-');
  const removed = {
    rounds: deleteRowsWhere_(SHEETS.rounds, (r) => isTest(r.round_id)),
    history: deleteRowsWhere_(SHEETS.history, (r) => isTest(r.round_id)),
  };
  const practiced = new Set(readRows(SHEETS.history).map((r) => r.word_id));
  removed.progress = deleteRowsWhere_(SHEETS.progress, (r) => !practiced.has(r.word_id));
  Logger.log(`已刪除：Rounds ${removed.rounds} 列、PracticeHistory ${removed.history} 列、ReviewProgress ${removed.progress} 列`);
}

function deleteRowsWhere_(def, predicate) {
  const sheet = getSheet(def);
  const rows = readRows(def);
  let count = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i])) {
      sheet.deleteRow(i + 2);
      count++;
    }
  }
  return count;
}

function token_() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
}

function log_(label, res) {
  Logger.log(`${label}：${JSON.stringify(res)}`);
}
