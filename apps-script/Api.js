/**
 * Web App 入口。
 * 請求：POST，Content-Type: text/plain，body 為 { token, action, payload }
 * 回應：{ ok: true, data } 或 { ok: false, error }
 */

/** 只做健康檢查，不回傳任何資料。 */
function doGet() {
  return jsonOutput_({ ok: true, data: { status: 'ok' } });
}

function doPost(e) {
  let body = null;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    // 解析失敗視同沒有 token
  }
  return jsonOutput_(handleRequest_(body));
}

function handleRequest_(body) {
  if (!body || !isAuthorized_(body.token)) {
    return { ok: false, error: 'unauthorized' };
  }
  const payload = body.payload || {};
  try {
    switch (body.action) {
      case 'getData':
        return { ok: true, data: getData_() };
      case 'addWord':
        return { ok: true, data: addWord_(payload) };
      case 'saveRound':
        return { ok: true, data: saveRound_(payload) };
      default:
        return { ok: false, error: 'unknown_action' };
    }
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.code };
    console.error(err);
    return { ok: false, error: 'server_error' };
  }
}

function isAuthorized_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  return Boolean(expected) && typeof token === 'string' && token === expected;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
