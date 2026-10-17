/**
 * 練習結果送出與重送。
 * 送出失敗的回合存在 localStorage，畫面上方顯示提示，可以重送。
 * round_id 不變，後端遇到重複的 round_id 不會重複寫入。
 */
import { saveRound } from './data.js';

const STORAGE_KEY = 'mv.pendingRounds';
const listeners = new Set();
let pending = load();
let retrying = false;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch (err) {
    // 存不進去時仍保留在記憶體，這次開啟期間可以重送
  }
  listeners.forEach((fn) => fn(pending.length, retrying));
}

export function onPendingChange(fn) {
  listeners.add(fn);
  fn(pending.length, retrying);
}

/** 送出一回合。成功回傳 { ok: true, result }；失敗會排入待重送，回傳 { ok: false }。 */
export async function submitRound(round, attempts) {
  try {
    const result = await saveRound(round, attempts);
    return { ok: true, result };
  } catch (err) {
    console.error(err);
    if (!pending.some((p) => p.round.round_id === round.round_id)) {
      pending.push({ round, attempts });
      persist();
    }
    return { ok: false };
  }
}

/** 重送所有失敗的回合，回傳仍失敗的數量。 */
export async function retryPending() {
  if (retrying) return pending.length;
  retrying = true;
  persist();
  const remaining = [];
  for (const item of pending) {
    try {
      await saveRound(item.round, item.attempts);
    } catch (err) {
      remaining.push(item);
    }
  }
  pending = remaining;
  retrying = false;
  persist();
  return pending.length;
}
