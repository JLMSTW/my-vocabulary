/**
 * 抽題與選項。
 * 錯題優先：needs_review = TRUE 的字權重 3，其餘為 1，加權隨機、不重複。
 */
import { shuffle } from './util.js';

export const ROUND_SIZE = 5;
export const REVIEW_WEIGHT = 3;

export function reviewSet(data) {
  return new Set(data.progress.filter((p) => p.needs_review).map((p) => p.word_id));
}

/** 加權隨機抽 n 個不重複的字。 */
export function weightedSample(words, n, review) {
  const pool = words.map((w) => ({ w, weight: review.has(w.word_id) ? REVIEW_WEIGHT : 1 }));
  const picked = [];
  while (picked.length < n && pool.length) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let i = 0;
    while (r >= pool[i].weight) {
      r -= pool[i].weight;
      i++;
    }
    picked.push(pool.splice(i, 1)[0].w);
  }
  return shuffle(picked);
}

/** 同語言不同的中文意思數量（選擇題至少要 4 個）。 */
export function distinctMeanings(data, language) {
  return new Set(data.vocabulary.filter((w) => w.language === language).map((w) => w.meaning_zh)).size;
}

/**
 * 選擇題的 4 個選項：正解 + 3 個干擾選項，位置隨機。
 * 干擾選項來自同語言的其他單字，中文意思與正解、彼此都不相同（避免兩個選項都算對）。
 * direction：'foreign'（看外文，選項是中文）或 'zh'（看中文，選項是外文）。
 */
export function choiceOptions(data, word, direction = 'foreign') {
  const pick = (w) => (direction === 'zh' ? w.word : w.meaning_zh);
  const seenMeanings = new Set([word.meaning_zh]);
  const seenOptions = new Set([pick(word).toLowerCase()]);
  const distractors = [];
  for (const w of shuffle(data.vocabulary)) {
    if (w.language !== word.language || seenMeanings.has(w.meaning_zh)) continue;
    if (seenOptions.has(pick(w).toLowerCase())) continue;
    seenMeanings.add(w.meaning_zh);
    seenOptions.add(pick(w).toLowerCase());
    distractors.push(pick(w));
    if (distractors.length === 3) break;
  }
  return shuffle([pick(word), ...distractors]);
}
