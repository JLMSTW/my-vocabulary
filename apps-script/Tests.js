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

function token_() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
}

function log_(label, res) {
  Logger.log(`${label}：${JSON.stringify(res)}`);
}
