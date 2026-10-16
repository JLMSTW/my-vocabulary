/**
 * 學習紀錄（Dashboard）：每日目標、連續練習、本月達標、月曆、生字庫、待複習。
 */
import { loadData } from '../data.js';
import { computeDashboard, calendarCells, weekday, DAILY_GOAL } from '../stats.js';
import { h, icon } from '../util.js';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const STATE_LABEL = { fr: '練了法文', it: '練了義大利文', both: '法文、義大利文都有練', none: '沒練習', future: '' };

export async function renderRecord(container) {
  const data = await loadData();
  const stats = computeDashboard(data);
  const [year, month, date] = stats.today.split('-').map(Number);

  container.append(
    h('header', { class: 'page-head' },
      h('h1', {}, '學習紀錄'),
      h('span', { class: 'page-head-meta' }, `${month} 月 ${date} 日 週${WEEKDAYS[weekday(stats.today)]}`)
    ),
    goalCard(stats.daily),
    h('div', { class: 'grid-2' },
      statCard('連續練習', stats.streak, ' 天'),
      statCard('本月達標', stats.achievedDays, ` / ${stats.elapsedDays} 天`)
    ),
    calendarCard(stats, year, month),
    h('div', { class: 'grid-2' },
      h('div', { class: 'stat-card' },
        h('div', { class: 'stat-label' }, '生字庫'),
        h('div', { class: 'stat-value' }, stats.library.total),
        h('div', { class: 'stat-sub' }, `法文 ${stats.library.FR} · 義大利文 ${stats.library.IT}`)
      ),
      h('button', {
        class: 'stat-card stat-card-review',
        type: 'button',
        'aria-label': `待複習 ${stats.review.total} 個字，點一下開始練習待複習的字`,
        onclick: () => { location.hash = '#/filter?review=1'; },
      },
        h('div', { class: 'stat-label' }, '待複習'),
        h('div', { class: 'stat-value' }, stats.review.total),
        h('div', { class: 'stat-sub' }, `法文 ${stats.review.FR} · 義大利文 ${stats.review.IT}`)
      )
    )
  );
}

function goalCard(daily) {
  const scale = Math.max(daily.total, DAILY_GOAL);
  const remaining = Math.max(DAILY_GOAL - daily.total, 0);
  return h('section', { class: 'goal-card', 'aria-label': '今天的目標' },
    h('div', { class: 'goal-top' },
      h('span', {}, '今天的目標'),
      h('span', { class: 'goal-rule' }, `每天 ${DAILY_GOAL} 個字`)
    ),
    h('div', { class: 'goal-count' },
      h('strong', {}, daily.total),
      h('span', {}, ` / ${DAILY_GOAL} 個字`)
    ),
    h('div', {
      class: 'goal-bar',
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': DAILY_GOAL,
      'aria-valuenow': Math.min(daily.total, DAILY_GOAL),
    },
      h('span', { class: 'seg-fr', style: `width:${(daily.FR / scale) * 100}%` }),
      h('span', { class: 'seg-it', style: `width:${(daily.IT / scale) * 100}%` })
    ),
    h('div', { class: 'goal-legend' },
      h('span', {}, h('i', { class: 'dot dot-fr' }), `法文 ${daily.FR}`),
      h('span', {}, h('i', { class: 'dot dot-it' }), `義大利文 ${daily.IT}`)
    ),
    remaining > 0
      ? h('div', { class: 'goal-bottom' },
          h('span', {}, `再練 ${remaining} 個字就達標`),
          h('a', { class: 'btn btn-light', href: '#/flashcard' }, '繼續練習'))
      : h('div', { class: 'goal-bottom' },
          h('span', { class: 'goal-done' }, icon('check'), '今天已達標'))
  );
}

function statCard(label, value, unit) {
  return h('div', { class: 'stat-card' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value' }, value, h('small', {}, unit))
  );
}

function calendarCard(stats, year, month) {
  const card = h('section', { class: 'calendar-card', 'aria-label': '練習月曆' });
  const [thisYear, thisMonth] = stats.today.split('-').map(Number);
  let view = { year, month };

  const draw = () => {
    const isCurrent = view.year === thisYear && view.month === thisMonth;
    const shift = (n) => {
      const m = view.month - 1 + n;
      view = { year: view.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
      draw();
    };
    const cells = calendarCells(view.year, view.month, stats.days, stats.today);

    card.replaceChildren(
      h('div', { class: 'cal-head' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': '上個月', onclick: () => shift(-1) }, icon('chevron-left')),
        h('h2', {}, `${view.year} 年 ${view.month} 月`),
        h('button', {
          class: 'icon-btn', type: 'button', 'aria-label': '下個月',
          disabled: isCurrent, onclick: () => shift(1),
        }, icon('chevron-right'))
      ),
      h('div', { class: 'cal-grid cal-weekdays', 'aria-hidden': 'true' },
        ['一', '二', '三', '四', '五', '六', '日'].map((d) => h('span', {}, d))
      ),
      h('div', { class: 'cal-grid', role: 'list' },
        cells.map((c) => c
          ? h('span', {
              class: `cal-day is-${c.state}${c.isToday ? ' is-today' : ''}`,
              role: 'listitem',
              'aria-label': `${view.month} 月 ${c.date} 日${c.isToday ? '（今天）' : ''} ${STATE_LABEL[c.state]}`,
            }, c.date)
          : h('span', { 'aria-hidden': 'true' }))
      ),
      h('div', { class: 'cal-legend' },
        h('span', {}, h('i', { class: 'swatch is-fr' }), '法文'),
        h('span', {}, h('i', { class: 'swatch is-it' }), '義大利文'),
        h('span', {}, h('i', { class: 'swatch is-both' }), '兩種都有'),
        h('span', {}, h('i', { class: 'swatch is-none' }), '沒練習')
      )
    );
  };

  draw();
  return card;
}
