/**
 * 練習畫面共用元件：頂部（標題、語言切換、篩選條件列）、分段按鈕、發音列。
 * 生字卡、拼字、選擇題都使用。
 */
import { filterSummary, LANGUAGE_SHORT } from '../filters.js';
import { getSpeechRate, setSpeechRate, SPEECH_RATES } from '../prefs.js';
import { speak } from '../speech.js';
import { h, icon } from '../util.js';

/**
 * options：{ filter, count, from, onLanguage(language) }
 * from：篩選頁套用後要回到的畫面（flashcard / spelling / choice）
 */
export function practiceHead({ filter, count, from, onLanguage }) {
  return h('div', { class: 'practice-head' },
    h('header', { class: 'page-head page-head-center' },
      h('h1', { class: 'brand' }, 'My Vocabulary'),
      languageToggle(filter.language, onLanguage, 'seg-dark')
    ),
    h('a', { class: 'filter-bar', href: `#/filter?from=${from}` },
      icon('filter'),
      h('span', { class: 'filter-bar-text' }, filterSummary(filter)),
      h('span', { class: 'filter-bar-count' }, `${count} 字`)
    )
  );
}

/** 生字卡、選擇題的方向選項 */
export const DIRECTIONS = [
  { value: 'foreign', label: '外文 → 中文' },
  { value: 'zh', label: '中文 → 外文' },
];

/** 語言切換。variant：'seg-dark'（深色選中）或空字串（白色選中）。 */
export function languageToggle(current, onChange, variant = '') {
  return segmented(
    Object.entries(LANGUAGE_SHORT).map(([value, label]) => ({ value, label })),
    current, onChange, { label: '語言', variant }
  );
}

/** 分段按鈕。items：[{ value, label, ariaLabel? }] */
export function segmented(items, current, onChange, { label = '', variant = '' } = {}) {
  return h('div', { class: `seg ${variant}`, role: 'radiogroup', 'aria-label': label },
    items.map((item) =>
      h('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': String(item.value === current),
        'aria-label': item.ariaLabel,
        onclick: () => { if (item.value !== current) onChange(item.value); },
      }, item.label)
    )
  );
}

/**
 * 發音列：「發音」按鈕 + 速度選擇（0.6× / 0.8× / 1×，會記住）。
 * 回傳 { el, setEnabled(boolean) }，作答前不能發音時可停用按鈕。
 */
export function speakRow(getText, language, { enabled = true } = {}) {
  const button = h('button', {
    type: 'button',
    class: 'pill',
    disabled: !enabled,
    onclick: () => speak(getText(), language),
  }, icon('speaker'), '發音');

  const rates = h('div', { class: 'rate-picker' });
  const drawRates = () => {
    rates.replaceChildren(segmented(
      SPEECH_RATES.map((r) => ({ value: r, label: `${r}×`, ariaLabel: `發音速度 ${r} 倍` })),
      getSpeechRate(),
      (r) => { setSpeechRate(r); drawRates(); },
      { label: '發音速度', variant: 'seg-small' }
    ));
  };
  drawRates();

  return {
    el: h('div', { class: 'speak-row' }, button, rates),
    setEnabled: (on) => { button.disabled = !on; },
  };
}

/** 符合的字太少時的提示卡。 */
export function notEnoughCard(count, from, message) {
  return h('div', { class: 'notice notice-wrong' },
    h('p', {}, message || `符合條件的字只有 ${count} 個，至少要 5 個字才能開始。請擴大範圍。`),
    h('a', { class: 'btn btn-primary', href: `#/filter?from=${from}` }, '調整範圍')
  );
}
