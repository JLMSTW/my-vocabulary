/**
 * 單字紀錄：每個字答對、答錯幾次、最後練習日期、是否待複習。
 * 網址參數：view=review（待複習，預設）或 all（全部）、lang=FR / IT
 */
import { loadData } from '../data.js';
import { loadFilter, LANGUAGE_NAMES } from '../filters.js';
import { speak } from '../speech.js';
import { h, icon, posLabel, setChildren, taipeiDay } from '../util.js';
import { languageToggle, segmented } from './common.js';

export async function renderWords(container, params) {
  const data = await loadData();
  let view = params.get('view') === 'all' ? 'all' : 'review';
  let language = LANGUAGE_NAMES[params.get('lang')] ? params.get('lang') : loadFilter().language;
  const progressOf = new Map(data.progress.map((p) => [p.word_id, p]));

  const draw = () => {
    const words = data.vocabulary
      .filter((w) => w.language === language)
      .map((w) => ({ word: w, p: progressOf.get(w.word_id) }));
    const review = words.filter((x) => x.p && x.p.needs_review);
    const list = (view === 'review' ? review : words).sort(byWeakness);

    setChildren(container,
      h('header', { class: 'page-head page-head-back' },
        h('a', { class: 'icon-btn', href: '#/record', 'aria-label': '返回' }, icon('chevron-left')),
        h('h1', {}, '單字紀錄')
      ),
      languageToggle(language, (code) => { language = code; draw(); }),
      segmented([
        { value: 'review', label: `待複習 ${review.length}` },
        { value: 'all', label: `全部 ${words.length}` },
      ], view, (value) => { view = value; draw(); }, { label: '顯示範圍', variant: 'seg-compact' }),
      list.length
        ? h('div', { class: 'word-list' }, list.map(wordRow))
        : h('div', { class: 'notice notice-info' }, icon('check'),
            h('span', {}, view === 'review'
              ? `${LANGUAGE_NAMES[language]}目前沒有待複習的字。練習時答錯的字會出現在這裡。`
              : `${LANGUAGE_NAMES[language]}還沒有單字。`)),
      view === 'review' && review.length
        ? h('a', {
            class: 'btn btn-primary btn-block btn-large',
            href: '#/filter?review=1&from=flashcard&back=record',
          }, `練習這 ${review.length} 個字`)
        : null
    );
  };

  draw();
}

/** 答錯多的在前；同樣時，最近練過的在前；沒練過的在最後。 */
function byWeakness(a, b) {
  const wrong = (x) => (x.p ? x.p.incorrect_count : -1);
  if (wrong(b) !== wrong(a)) return wrong(b) - wrong(a);
  const last = (x) => (x.p && x.p.last_reviewed_at) || '';
  return last(b).localeCompare(last(a));
}

function wordRow({ word, p }) {
  const lang = word.language.toLowerCase();
  const practiced = p && p.correct_count + p.incorrect_count > 0;
  return h('div', { class: 'word-row' },
    h('div', { class: 'word-row-main' },
      h('div', { class: 'word-row-title' },
        h('span', { class: 'word-row-word', lang }, word.word),
        p && p.needs_review ? h('span', { class: 'tag-review' }, icon('x'), '待複習') : null
      ),
      h('div', {}, word.meaning_zh,
        word.part_of_speech ? h('span', { class: 'muted small' }, ` · ${posLabel(word.part_of_speech)}`) : null),
      practiced
        ? h('div', { class: 'word-row-stats' },
            h('span', { class: 'stat-ok' }, icon('check'), `答對 ${p.correct_count}`),
            h('span', { class: 'stat-ng' }, icon('x'), `答錯 ${p.incorrect_count}`),
            p.last_reviewed_at ? h('span', { class: 'muted' }, `最後練習 ${shortDate(p.last_reviewed_at)}`) : null)
        : h('div', { class: 'muted small' }, '還沒練過')
    ),
    h('button', {
      type: 'button', class: 'icon-btn icon-btn-outline',
      'aria-label': `播放 ${word.word} 的發音`,
      onclick: () => speak(word.word, word.language),
    }, icon('speaker'))
  );
}

function shortDate(iso) {
  const [, m, d] = taipeiDay(iso).split('-');
  return `${Number(m)}/${Number(d)}`;
}
