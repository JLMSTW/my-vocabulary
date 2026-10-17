/**
 * App 入口：hash 路由、底部分頁、讀取中與錯誤畫面、待重送提示、鍵盤處理。
 * 網址格式：#/route?key=value
 * 畫面的 render 可以回傳清理函式，離開該畫面時會先執行（生字卡用來寫入紀錄）。
 */
import { ApiError, errorMessage, isNotConfigured, loadData, USE_MOCK } from './data.js';
import { onPendingChange, retryPending } from './sync.js';
import { h, icon, toast } from './util.js';
import { renderRecord } from './views/record.js';
import { renderFilter } from './views/filter.js';
import { renderFlashcard } from './views/flashcard.js';
import { quizRoute } from './views/quiz.js';
import { renderAdd } from './views/add.js';
import { renderSettings } from './views/settings.js';
import { renderWords } from './views/words.js';

// tab：這個畫面屬於哪個底部分頁；null 表示不顯示底部分頁
const ROUTES = {
  record: { title: '紀錄', tab: 'record', render: renderRecord },
  flashcard: { title: '生字卡', tab: 'flashcard', render: renderFlashcard },
  spelling: { title: '拼字', tab: 'spelling', render: quizRoute('spelling') },
  choice: { title: '選擇題', tab: 'choice', render: quizRoute('choice') },
  add: { title: '新增', tab: 'add', render: renderAdd },
  filter: { title: '選擇範圍', tab: null, render: renderFilter },
  settings: { title: '連線設定', tab: null, render: renderSettings },
  words: { title: '單字紀錄', tab: 'record', render: renderWords },
};
const DEFAULT_ROUTE = 'record';

const view = document.getElementById('view');
let cleanup = null;
let renderId = 0;

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const name = ROUTES[path] ? path : DEFAULT_ROUTE;
  return { name, params: new URLSearchParams(query) };
}

async function render() {
  const id = ++renderId;
  if (cleanup) {
    const fn = cleanup;
    cleanup = null;
    await fn();
  }
  if (id !== renderId) return; // 期間又換了畫面

  let { name, params } = parseHash();
  // 還沒設定連線時，一律先到連線設定
  if (isNotConfigured() && name !== 'settings') {
    history.replaceState(null, '', '#/settings');
    name = 'settings';
  }
  const route = ROUTES[name];
  document.title = `${route.title} · My Vocabulary`;
  document.body.classList.toggle('no-tabbar', !route.tab);
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.route === route.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // 先顯示讀取中，畫面在獨立的容器裡準備好再換上
  const page = h('div', { class: 'page' });
  const loading = setTimeout(() => {
    if (id === renderId) view.replaceChildren(h('div', { class: 'loading', role: 'status' }, h('span', { class: 'spinner' }), '讀取中…'));
  }, 150);
  window.scrollTo(0, 0);

  try {
    const result = await route.render(page, params);
    if (id !== renderId) {
      if (typeof result === 'function') await result();
      return;
    }
    if (typeof result === 'function') cleanup = result;
    view.replaceChildren(page);
  } catch (err) {
    console.error(err);
    if (id === renderId) view.replaceChildren(errorPage(err));
  } finally {
    clearTimeout(loading);
  }
}

function errorPage(err) {
  const needsSettings = err instanceof ApiError && ['unauthorized', 'not_configured', 'bad_response'].includes(err.code);
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, '讀取失敗')),
    h('div', { class: 'notice notice-wrong' }, h('p', {}, errorMessage(err))),
    h('div', { class: 'grid-2' },
      h('button', {
        type: 'button', class: 'btn btn-large',
        onclick: async () => { await loadData({ force: true }).catch(() => {}); render(); },
      }, '重試'),
      needsSettings ? h('a', { class: 'btn btn-primary btn-large', href: '#/settings' }, '連線設定') : null
    )
  );
}

/** 有練習紀錄送出失敗時，畫面上方顯示提示與重送按鈕。 */
function setupPendingBanner() {
  const text = h('span', {});
  const button = h('button', {
    type: 'button',
    class: 'btn btn-small',
    onclick: async () => {
      const left = await retryPending();
      toast(left ? `還有 ${left} 回合沒有存成功，請稍後再試。` : '已重新存到 Google Sheet。');
    },
  }, '重送');
  const banner = h('div', { class: 'pending-banner', role: 'alert', hidden: true }, icon('x'), text, button);
  document.body.append(banner);

  onPendingChange((count, retrying) => {
    banner.hidden = count === 0;
    text.textContent = `有 ${count} 回合的紀錄還沒存到 Google Sheet`;
    button.disabled = retrying;
    button.textContent = retrying ? '重送中…' : '重送';
  });
}

/** 輸入框取得焦點時隱藏底部分頁，避免被鍵盤擋住。 */
function watchKeyboard() {
  const isField = (el) => el && el.matches && el.matches('input, textarea');
  document.addEventListener('focusin', (e) => {
    if (isField(e.target)) document.body.classList.add('keyboard-open');
  });
  document.addEventListener('focusout', (e) => {
    if (isField(e.target)) document.body.classList.remove('keyboard-open');
  });
}

document.getElementById('data-badge').hidden = !USE_MOCK;
setupPendingBanner();
watchKeyboard();
window.addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', `#/${DEFAULT_ROUTE}`);
render();
