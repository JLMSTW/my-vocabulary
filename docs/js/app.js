/**
 * App 入口：hash 路由、底部分頁、鍵盤處理。
 * 網址格式：#/route?key=value
 */
import { loadData, USE_MOCK } from './data.js';
import { h } from './util.js';
import { renderRecord } from './views/record.js';

// tab：這個畫面屬於哪個底部分頁
const ROUTES = {
  record: { title: '紀錄', tab: 'record', render: renderRecord },
  flashcard: { title: '生字卡', tab: 'flashcard', render: placeholder('生字卡') },
  spelling: { title: '拼字', tab: 'spelling', render: placeholder('拼字練習') },
  choice: { title: '選擇題', tab: 'choice', render: placeholder('選擇題') },
  add: { title: '新增', tab: 'add', render: placeholder('新增單字') },
  filter: { title: '選擇範圍', tab: null, render: placeholder('篩選範圍') },
};
const DEFAULT_ROUTE = 'record';

const view = document.getElementById('view');

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const name = ROUTES[path] ? path : DEFAULT_ROUTE;
  return { name, params: new URLSearchParams(query) };
}

async function render() {
  const { name, params } = parseHash();
  const route = ROUTES[name];
  document.title = `${route.title} · My Vocabulary`;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.route === route.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  view.replaceChildren();
  window.scrollTo(0, 0);
  await route.render(view, params);
}

/** 尚未實作的畫面 */
function placeholder(label) {
  return async (container) => {
    const { vocabulary } = await loadData();
    container.append(
      h('header', { class: 'page-head' }, h('h1', {}, label)),
      h('div', { class: 'card stack' },
        h('p', {}, `「${label}」畫面會在之後的段落實作。`),
        h('p', { class: 'muted' }, `已讀到 ${vocabulary.length} 個單字。`)
      )
    );
  };
}

/** 輸入框取得焦點時隱藏底部分頁，避免被鍵盤擋住。 */
function watchKeyboard() {
  const isField = (el) => el && el.matches && el.matches('input, textarea, select');
  document.addEventListener('focusin', (e) => {
    if (isField(e.target)) document.body.classList.add('keyboard-open');
  });
  document.addEventListener('focusout', (e) => {
    if (isField(e.target)) document.body.classList.remove('keyboard-open');
  });
}

document.getElementById('data-badge').hidden = !USE_MOCK;
watchKeyboard();
window.addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', `#/${DEFAULT_ROUTE}`);
render();
