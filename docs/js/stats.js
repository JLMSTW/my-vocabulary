/**
 * 學習紀錄的統計，全部由 PracticeHistory 計算，日期以台北時區切分。
 * 日期一律用 'YYYY-MM-DD' 字串表示。
 */
import { taipeiDay } from './util.js';

export const DAILY_GOAL = 10;

export function todayKey() {
  return taipeiDay(new Date());
}

function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key, n) {
  const d = parseDay(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 星期，0 = 週日 */
export function weekday(key) {
  return parseDay(key).getUTCDay();
}

/**
 * 每天練過的不同單字，依語言分開：Map<day, { FR: Set<word_id>, IT: Set<word_id> }>
 * 生字卡、拼字、選擇題都算；同一個字一天練多次只算一次。
 * 已從 Vocabulary 刪除的字無法得知語言，不計入。
 */
export function practiceByDay(data) {
  const languageOf = new Map(data.vocabulary.map((w) => [w.word_id, w.language]));
  const days = new Map();
  for (const item of data.history) {
    const language = languageOf.get(item.word_id);
    if (!language) continue;
    const key = taipeiDay(item.practiced_at);
    if (!days.has(key)) days.set(key, { FR: new Set(), IT: new Set() });
    days.get(key)[language].add(item.word_id);
  }
  return days;
}

export function computeDashboard(data, today = todayKey()) {
  const days = practiceByDay(data);
  const sizeOf = (day) => (day ? day.FR.size + day.IT.size : 0);

  const todayPractice = days.get(today);
  const daily = {
    FR: todayPractice ? todayPractice.FR.size : 0,
    IT: todayPractice ? todayPractice.IT.size : 0,
  };
  daily.total = daily.FR + daily.IT;

  // 連續練習：今天還沒練就從昨天往前算；有練就算，不論是否達標
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  // 本月達標：本月達到每日目標的天數 / 本月已過天數（含今天）
  const month = today.slice(0, 7);
  let achievedDays = 0;
  for (const [key, day] of days) {
    if (key.startsWith(month) && key <= today && sizeOf(day) >= DAILY_GOAL) achievedDays++;
  }
  const elapsedDays = Number(today.slice(8));

  const library = { FR: 0, IT: 0 };
  data.vocabulary.forEach((w) => { if (w.language in library) library[w.language]++; });
  library.total = library.FR + library.IT;

  const languageOf = new Map(data.vocabulary.map((w) => [w.word_id, w.language]));
  const review = { FR: 0, IT: 0 };
  data.progress.forEach((p) => {
    const language = languageOf.get(p.word_id);
    if (p.needs_review && language in review) review[language]++;
  });
  review.total = review.FR + review.IT;

  return { today, days, daily, streak, achievedDays, elapsedDays, library, review };
}

/**
 * 月曆格子，週一為一週第一天。前面補 null 對齊星期。
 * 每格：{ key, date, state: 'fr' | 'it' | 'both' | 'none' | 'future', isToday }
 */
export function calendarCells(year, month, days, today) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const lead = (weekday(first) + 6) % 7;
  const cells = Array(lead).fill(null);
  for (let key = first; key.startsWith(first.slice(0, 7)); key = addDays(key, 1)) {
    const day = days.get(key);
    let state = 'none';
    if (key > today) state = 'future';
    else if (day && day.FR.size && day.IT.size) state = 'both';
    else if (day && day.FR.size) state = 'fr';
    else if (day && day.IT.size) state = 'it';
    cells.push({ key, date: Number(key.slice(8)), state, isToday: key === today });
  }
  return cells;
}
