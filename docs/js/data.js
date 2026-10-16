/**
 * 資料層：畫面只透過這裡讀寫資料。
 * 目前是假資料模式；第 3 步串接 Apps Script 時只改這個檔案。
 */
import { createMockData } from './mock.js';
import { nowIso, uuid } from './util.js';

export const USE_MOCK = true;

let cache = null;

/** 取得全部資料 { vocabulary, progress, history }，已載入過就用快取。 */
export async function loadData({ force = false } = {}) {
  if (cache && !force) return cache;
  cache = createMockData();
  return cache;
}

/** 新增單字，回傳新增的單字。 */
export async function addWord(input) {
  const data = await loadData();
  const word = { ...input, word_id: `mock-${uuid()}`, date_added: nowIso() };
  data.vocabulary.push(word);
  return word;
}

/** 寫入一回合結果。 */
export async function saveRound(round, attempts) {
  const data = await loadData();
  attempts.forEach((a) => data.history.push({ ...a, round_id: round.round_id, practice_mode: round.practice_mode }));
  return { round_id: round.round_id, score: attempts.filter((a) => a.is_correct).length, total: attempts.length };
}
