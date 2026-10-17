/**
 * 篩選：語言（必選）、主題、標籤（可多選，取交集）、加入日期、只練待複習。
 * 多個條件之間取交集。篩選條件存在 localStorage，生字卡、拼字、選擇題共用。
 */
import { taipeiDay } from './util.js';
import { todayKey, addDays, weekday } from './stats.js';

export const MIN_WORDS = 5;
export const LANGUAGE_NAMES = { FR: '法文', IT: '義大利文' };
/** 切換按鈕用的短名稱 */
export const LANGUAGE_SHORT = { FR: '法文', IT: '義文' };
export const DATE_OPTIONS = [
  ['all', '全部'],
  ['week', '本週'],
  ['month', '本月'],
  ['pick-month', '指定月份'],
  ['range', '自訂區間'],
];

const STORAGE_KEY = 'mv.filter';

export function defaultFilter(language = 'FR') {
  return { language, topic: '', tags: [], date: { type: 'all', month: '', from: '', to: '' }, reviewOnly: false };
}

export function loadFilter() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && LANGUAGE_NAMES[saved.language]) {
      const base = defaultFilter(saved.language);
      return { ...base, ...saved, date: { ...base.date, ...saved.date }, tags: saved.tags || [] };
    }
  } catch (err) {
    // 讀不到就用預設值
  }
  return defaultFilter();
}

export function saveFilter(filter) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch (err) {
    // 無法儲存時只影響下次開啟的預設值
  }
}

/** 加入日期的範圍，回傳 [from, to]（'YYYY-MM-DD'，含頭尾），不限時回傳 null。 */
export function dateRange(date, today = todayKey()) {
  switch (date.type) {
    case 'week':
      return [addDays(today, -((weekday(today) + 6) % 7)), today];
    case 'month':
      return [`${today.slice(0, 7)}-01`, today];
    case 'pick-month':
      return date.month ? [`${date.month}-01`, `${date.month}-31`] : null;
    case 'range': {
      if (!date.from && !date.to) return null;
      const from = date.from || '0000-01-01';
      const to = date.to || '9999-12-31';
      return from <= to ? [from, to] : [to, from];
    }
    default:
      return null;
  }
}

export function applyFilter(data, filter, today = todayKey()) {
  const review = new Set(data.progress.filter((p) => p.needs_review).map((p) => p.word_id));
  const range = dateRange(filter.date, today);
  return data.vocabulary.filter((w) => {
    if (w.language !== filter.language) return false;
    if (filter.topic && w.topic !== filter.topic) return false;
    if (!filter.tags.every((t) => w.tags.includes(t))) return false;
    if (range) {
      const day = w.date_added ? taipeiDay(w.date_added) : '';
      if (!day || day < range[0] || day > range[1]) return false;
    }
    if (filter.reviewOnly && !review.has(w.word_id)) return false;
    return true;
  });
}

const byLocale = (a, b) => a.localeCompare(b, 'zh-Hant');

/** 某語言的主題、標籤、加入月份選項，從 Vocabulary 統計。 */
export function filterOptions(data, language) {
  const words = data.vocabulary.filter((w) => w.language === language);
  const topics = [...new Set(words.map((w) => w.topic).filter(Boolean))].sort(byLocale);
  const tags = [...new Set(words.flatMap((w) => w.tags))].sort(byLocale);
  const months = [...new Set(words.map((w) => w.date_added && taipeiDay(w.date_added).slice(0, 7)).filter(Boolean))]
    .sort()
    .reverse();
  return { topics, tags, months };
}

/** 切換語言時，保留新語言也有的主題與標籤。 */
export function switchLanguage(data, filter, language) {
  const { topics, tags } = filterOptions(data, language);
  return {
    ...filter,
    language,
    topic: topics.includes(filter.topic) ? filter.topic : '',
    tags: filter.tags.filter((t) => tags.includes(t)),
  };
}

export function monthLabel(month) {
  const [y, m] = month.split('-');
  return `${y} 年 ${Number(m)} 月`;
}

function shortDay(key) {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 篩選條件摘要，例如「日常生活 · B1 + 名詞 · 本月」 */
export function filterSummary(filter) {
  const parts = [];
  if (filter.topic) parts.push(filter.topic);
  if (filter.tags.length) parts.push(filter.tags.join(' + '));
  const { type, month, from, to } = filter.date;
  if (type === 'week') parts.push('本週');
  if (type === 'month') parts.push('本月');
  if (type === 'pick-month' && month) parts.push(monthLabel(month));
  if (type === 'range' && (from || to)) parts.push(`${from ? shortDay(from) : '…'}–${to ? shortDay(to) : '…'}`);
  if (filter.reviewOnly) parts.push('只練待複習');
  return parts.length ? parts.join(' · ') : '全部單字';
}
