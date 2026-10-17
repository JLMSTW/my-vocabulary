/** 共用小工具 */

export const TIME_ZONE = 'Asia/Taipei';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 任一 ISO 時間 → 台北日期 'YYYY-MM-DD'。 */
export function taipeiDay(value) {
  return dayFormatter.format(value instanceof Date ? value : new Date(value));
}

/** 目前時間，ISO 8601 含 +08:00，與後端格式一致。 */
export function nowIso() {
  const d = new Date();
  const local = new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 19);
  return `${local}+08:00`;
}

/** UUID v4。randomUUID 只在 https 可用，用手機連本機 http 預覽時改用 getRandomValues。 */
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 文字正規化：NFC + 去前後空白。 */
export function normText(value) {
  return String(value ?? '').normalize('NFC').trim();
}

/** 洗牌，回傳新陣列。 */
export function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const POS_LABELS = {
  'n.m.': '名詞（陽性）',
  'n.f.': '名詞（陰性）',
  'n.m.pl.': '名詞（陽性複數）',
  'n.f.pl.': '名詞（陰性複數）',
  'n.': '名詞',
  'v.': '動詞',
  'adj.': '形容詞',
  'adv.': '副詞',
  'conj.': '連接詞',
  'prep.': '介系詞',
  'pron.': '代名詞',
};

/** 詞性顯示文字：常見縮寫轉成中文，其他照原樣。 */
export function posLabel(pos) {
  return POS_LABELS[String(pos || '').trim().toLowerCase()] || pos || '';
}

let toastTimer = null;

/** 畫面下方的短暫提示。 */
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3M18 3v4h-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
};

/** 線條圖示，顏色跟隨文字顏色。 */
export function icon(name) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;
  return span;
}

/** 建立 DOM 元素的簡寫：h('div', { class: 'card' }, '文字', childEl) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else {
      el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
