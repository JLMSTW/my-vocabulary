/**
 * 篩選範圍頁。
 * 網址參數：from（套用後回到哪個練習畫面）、back（左上返回到哪裡）、review=1（預設開啟只練待複習）
 */
import { loadData } from '../data.js';
import {
  applyFilter, defaultFilter, filterOptions, loadFilter, saveFilter, switchLanguage,
  monthLabel, DATE_OPTIONS, MIN_WORDS,
} from '../filters.js';
import { appendChildren, h, icon, setChildren } from '../util.js';
import { languageToggle } from './common.js';

const PRACTICE_ROUTES = ['flashcard', 'spelling', 'choice'];

export async function renderFilter(container, params) {
  const data = await loadData();
  const from = PRACTICE_ROUTES.includes(params.get('from')) ? params.get('from') : 'flashcard';
  const back = params.get('back') || from;
  let draft = loadFilter();
  if (params.get('review') === '1') draft.reviewOnly = true;

  const draw = () => {
    const options = filterOptions(data, draft.language);
    const count = applyFilter(data, draft).length;
    const languageOf = new Map(data.vocabulary.map((w) => [w.word_id, w.language]));
    const reviewCount = data.progress.filter((p) => p.needs_review && languageOf.get(p.word_id) === draft.language).length;
    const update = (patch) => { draft = { ...draft, ...patch }; draw(); };
    const updateDate = (patch) => update({ date: { ...draft.date, ...patch } });

    setChildren(container, 
      h('header', { class: 'page-head page-head-back' },
        h('a', { class: 'icon-btn', href: `#/${back}`, 'aria-label': '返回' }, icon('chevron-left')),
        h('h1', {}, '選擇範圍')
      ),

      field('語言', languageToggle(draft.language, (lang) => { draft = switchLanguage(data, draft, lang); draw(); })),

      field('主題',
        h('select', {
          class: 'select',
          'aria-label': '主題',
          onchange: (e) => update({ topic: e.target.value }),
        },
          h('option', { value: '' }, '全部主題'),
          options.topics.map((t) => h('option', { value: t, selected: t === draft.topic }, t))
        )
      ),

      field(h('span', { class: 'field-label-row' }, '標籤', h('small', {}, '可多選')),
        options.tags.length
          ? h('div', { class: 'chips', role: 'group', 'aria-label': '標籤' },
              options.tags.map((tag) => {
                const on = draft.tags.includes(tag);
                return h('button', {
                  type: 'button',
                  class: 'chip',
                  'aria-pressed': String(on),
                  onclick: () => update({ tags: on ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag] }),
                }, on ? icon('check') : null, tag);
              }))
          : h('p', { class: 'muted' }, '這個語言還沒有標籤。')
      ),

      field('加入日期',
        h('select', {
          class: 'select',
          'aria-label': '加入日期',
          onchange: (e) => updateDate({ type: e.target.value }),
        }, DATE_OPTIONS.map(([value, label]) => h('option', { value, selected: value === draft.date.type }, label))),
        draft.date.type === 'pick-month'
          ? h('select', {
              class: 'select',
              'aria-label': '月份',
              onchange: (e) => updateDate({ month: e.target.value }),
            },
              h('option', { value: '' }, '選擇月份'),
              options.months.map((m) => h('option', { value: m, selected: m === draft.date.month }, monthLabel(m))))
          : null,
        draft.date.type === 'range'
          ? h('div', { class: 'grid-2' },
              h('label', { class: 'mini-field' }, '從',
                h('input', { class: 'input', type: 'date', value: draft.date.from, onchange: (e) => updateDate({ from: e.target.value }) })),
              h('label', { class: 'mini-field' }, '到',
                h('input', { class: 'input', type: 'date', value: draft.date.to, onchange: (e) => updateDate({ to: e.target.value }) })))
          : null
      ),

      h('div', { class: 'switch-row' },
        h('div', {},
          h('div', { class: 'switch-title', id: 'review-only-label' }, '只練待複習'),
          h('div', { class: 'muted small' }, `${draft.language === 'FR' ? '法文' : '義大利文'}目前有 ${reviewCount} 個待複習的字`)
        ),
        h('button', {
          type: 'button',
          class: 'switch',
          role: 'switch',
          'aria-checked': String(draft.reviewOnly),
          'aria-labelledby': 'review-only-label',
          onclick: () => update({ reviewOnly: !draft.reviewOnly }),
        }, h('span', { class: 'switch-knob' }))
      ),

      count >= MIN_WORDS
        ? h('div', { class: 'notice notice-info' }, icon('info'), h('span', {}, '同時符合以上條件：', h('strong', {}, `${count} 個字`)))
        : h('div', { class: 'notice notice-wrong' }, icon('info'),
            h('span', {}, draft.reviewOnly && reviewCount === 0
              ? '「只練待複習」已開啟，但目前沒有待複習的字（練習答錯的字才會變成待複習）。請關掉這個開關。'
              : `只有 ${count} 個字符合，至少要 ${MIN_WORDS} 個字才能開始。請擴大範圍。`)),

      h('div', { class: 'action-bar' },
        h('button', { type: 'button', class: 'btn', onclick: () => { draft = defaultFilter(draft.language); draw(); } }, '清除'),
        h('button', {
          type: 'button',
          class: 'btn btn-primary',
          disabled: count < MIN_WORDS,
          onclick: () => { saveFilter(draft); location.hash = `#/${from}`; },
        }, '套用')
      )
    );
  };

  draw();
}

function field(label, ...controls) {
  return h('section', { class: 'field' },
    h('div', { class: 'field-label' }, label),
    ...controls
  );
}
