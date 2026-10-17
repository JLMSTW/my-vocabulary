/**
 * 資料層：畫面只透過這裡讀寫資料。
 * 目前是假資料模式；第 3 步串接 Apps Script 時只改這個檔案。
 */
import { createMockData } from './mock.js';
import { normText, nowIso, uuid } from './util.js';

export const USE_MOCK = true;

/** 後端回傳的錯誤，code 與 Apps Script 相同（例如 duplicate、missing_word）。 */
export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

let cache = null;

/** 取得全部資料 { vocabulary, progress, history }，已載入過就用快取。 */
export async function loadData({ force = false } = {}) {
  if (cache && !force) return cache;
  cache = createMockData();
  return cache;
}

/**
 * 新增單字，回傳新增的單字。
 * input：{ language, word, meaning_zh, part_of_speech, topic, tags: [], example }
 * 假資料模式下模擬後端的檢查與正規化。
 */
export async function addWord(input) {
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

  const saved = { ...word, word_id: `mock-${uuid()}`, date_added: nowIso() };
  data.vocabulary.push(saved);
  return saved;
}

/**
 * 寫入一回合結果。
 * round：{ round_id, practice_mode, language, filters, started_at, finished_at }
 * attempts：[{ word_id, user_answer, correct_answer, is_correct, practiced_at }]
 */
export async function saveRound(round, attempts) {
  const data = await loadData();
  if (mockShouldFail()) throw new Error('mock_save_failed');

  const result = {
    round_id: round.round_id,
    score: attempts.filter((a) => a.is_correct).length,
    total: attempts.length,
  };
  if (data.history.some((h) => h.round_id === round.round_id)) return { ...result, already_saved: true };

  attempts.forEach((a) => {
    data.history.push({
      round_id: round.round_id,
      word_id: a.word_id,
      practice_mode: round.practice_mode,
      is_correct: a.is_correct,
      practiced_at: a.practiced_at,
    });
    updateProgress(data, a);
  });
  return { ...result, already_saved: false };
}

/** 與後端相同的錯題優先規則，讓假資料模式下的畫面也會更新。 */
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

/** 開發用：在瀏覽器 console 執行 localStorage.setItem('mv.mockFail', '1') 可模擬存檔失敗。 */
function mockShouldFail() {
  try {
    return localStorage.getItem('mv.mockFail') === '1';
  } catch (err) {
    return false;
  }
}
