/**
 * Apps Script Web App 的網址與 token，只存在這支手機的 localStorage。
 * repo 內不得出現網址或 token。
 */

const STORAGE_KEY = 'mv.connection';

/** 一般帳號：/macros/s/…/exec；Google Workspace 帳號：/a/macros/網域/s/…/exec */
export const URL_PATTERN = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/;

export function getConnection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.url && saved.token) return saved;
  } catch (err) {
    // 讀不到視同未設定
  }
  return null;
}

/** 儲存失敗（例如私密瀏覽）時會丟出錯誤，由呼叫端提示。 */
export function setConnection({ url, token }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, token }));
}

export function clearConnection() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // 忽略
  }
}
