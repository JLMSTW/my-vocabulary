/**
 * 資料層：畫面只透過這裡讀寫資料。
 * 正式模式呼叫 Apps Script Web App；開發時可在網址加 ?mock=1 改用假資料（?mock=0 關閉）。
 *
 * API：POST，Content-Type: text/plain（不會觸發 CORS 預檢），body 為 { token, action, payload }
 * 回傳 { ok: true, data } 或 { ok: false, error }
 */
import { getConnection } from './connection.js';
import { createMockData } from './mock.js';
import { normText, nowIso, uuid } from './util.js';

export const USE_MOCK = detectMock();

function detectMock() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('mock')) {
      if (params.get('mock') === '0') localStorage.removeItem('mv.mock');
      else localStorage.setItem('mv.mock', '1');
    }
    return localStorage.getItem('mv.mock') === '1';
  } catch (err) {
    return false;
  }
}

/** 錯誤代碼：後端回傳的（unauthorized、duplicate…）或前端的（network、timeout、not_configured）。 */
export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const MESSAGES = {
  unauthorized: 'token 不正確，請到連線設定重新輸入。',
  not_configured: '還沒有設定連線。',
  network: '連不上 Google Apps Script，請檢查網路後再試一次。',
  timeout: 'Google Apps Script 太久沒有回應，請再試一次。',
  busy: '伺服器正在處理其他寫入，請稍後再試。',
  bad_response: '伺服器回傳的資料無法讀取，請確認網址是 Web App 的 /exec 網址。',
};

export function errorMessage(err) {
  const code = err instanceof ApiError ? err.code : '';
  return MESSAGES[code] || '伺服器發生錯誤，請稍後再試。';
}

export function isNotConfigured() {
  return !USE_MOCK && !getConnection();
}

const TIMEOUT_MS = 30000;

/** 呼叫 Web App。connection 可指定（連線設定頁測試新網址時用）。 */
export async function callApi(action, payload = {}, { connection = getConnection(), keepalive = false } = {}) {
  if (!connection) throw new ApiError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(connection.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: connection.token, action, payload }),
      signal: controller.signal,
      keepalive,
    });
  } catch (err) {
    throw new ApiError(err.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError('network');

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new ApiError('bad_response');
  }
  if (!body || body.ok !== true) throw new ApiError((body && body.error) || 'server_error');
  return body.data;
}

// ---------- 讀取 ----------

let cache = null;

/** 取得全部資料 { vocabulary, progress, history }，已載入過就用快取；force 重新讀取。 */
export async function loadData({ force = false } = {}) {
  if (cache && !force) return cache;
  const data = USE_MOCK ? createMockData() : await callApi('getData');
  cache = {
    vocabulary: (data.vocabulary || []).map((w) => ({ ...w, tags: w.tags || [] })),
    progress: data.progress || [],
    history: data.history || [],
  };
  return cache;
}

export function clearCache() {
  cache = null;
}

// ---------- 新增單字 ----------

/**
 * 新增單字，回傳新增的單字。
 * input：{ language, word, meaning_zh, part_of_speech, topic, tags: [], example }
 */
export async function addWord(input) {
  const saved = USE_MOCK ? await mockAddWord(input) : await callApi('addWord', input);
  if (cache && !cache.vocabulary.some((w) => w.word_id === saved.word_id)) {
    cache.vocabulary.push({ ...saved, tags: saved.tags || [] });
  }
  return saved;
}

/** 假資料模式：模擬後端的檢查與正規化。 */
async function mockAddWord(input) {
  const data = await loadData();
  const word = {
    language: normText(input.language).toUpperCase(),
    word: normText(input.word),
    meaning_zh: normText(input.meaning_zh),
    part_of_speech: normText(input.part_of_speech),
    topic: normText(input.topic),
    tags: [...new Set((input.tags || []).map(normText).filter(Boolean))],
  };
  if (!['FR', 'IT'].includes(word.language)) throw new ApiError('invalid_language');
  if (!word.word) throw new ApiError('missing_word');
  if (!word.meaning_zh) throw new ApiError('missing_meaning');
  const key = (w) => [w.language, w.word.toLowerCase(), w.meaning_zh].join('\u0000');
  if (data.vocabulary.some((w) => key(w) === key(word))) throw new ApiError('duplicate');
  return { ...word, word_id: `mock-${uuid()}`, date_added: nowIso() };
}

// ---------- 寫入回合 ----------

/**
 * 寫入一回合結果。
 * round：{ round_id, practice_mode, language, filters, started_at, finished_at }
 * attempts：[{ word_id, user_answer, correct_answer, is_correct, practiced_at }]
 * 成功後同步更新本機快取，學習紀錄頁不用重新讀取就會更新。
 */
export async function saveRound(round, attempts) {
  let result;
  if (USE_MOCK) {
    if (mockShouldFail()) throw new ApiError('network');
    result = { round_id: round.round_id, score: attempts.filter((a) => a.is_correct).length, total: attempts.length };
  } else {
    // keepalive：App 進背景時送出的請求不會被中斷
    result = await callApi('saveRound', { round, attempts }, { keepalive: true });
  }
  applyRoundLocally(round, attempts);
  return result;
}

function applyRoundLocally(round, attempts) {
  if (!cache || cache.history.some((h) => h.round_id === round.round_id)) return;
  attempts.forEach((a) => {
    cache.history.push({
      round_id: round.round_id,
      word_id: a.word_id,
      practice_mode: round.practice_mode,
      is_correct: a.is_correct,
      practiced_at: a.practiced_at,
    });
    updateProgress(cache, a);
  });
}

/** 與後端相同的錯題優先規則。 */
function updateProgress(data, attempt) {
  let p = data.progress.find((x) => x.word_id === attempt.word_id);
  if (!p) {
    p = { word_id: attempt.word_id, correct_count: 0, incorrect_count: 0, consecutive_correct: 0, needs_review: false, last_reviewed_at: '' };
    data.progress.push(p);
  }
  if (attempt.is_correct) {
    p.correct_count++;
    p.consecutive_correct++;
    if (p.consecutive_correct >= 3) p.needs_review = false;
  } else {
    p.incorrect_count++;
    p.consecutive_correct = 0;
    p.needs_review = true;
  }
  p.last_reviewed_at = attempt.practiced_at;
}

/** 開發用：假資料模式下，在 console 執行 localStorage.setItem('mv.mockFail', '1') 可模擬存檔失敗。 */
function mockShouldFail() {
  try {
    return localStorage.getItem('mv.mockFail') === '1';
  } catch (err) {
    return false;
  }
}
