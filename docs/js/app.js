/**
 * App 入口：hash 路由、底部分頁、待重送提示、鍵盤處理。
 * 網址格式：#/route?key=value
 * 畫面的 render 可以回傳清理函式，離開該畫面時會先執行（生字卡用來寫入紀錄）。
 */
import { USE_MOCK } from './data.js';
import { onPendingChange, retryPending } from './sync.js';
import { h, toast } from './util.js';
import { renderRecord } from './views/record.js';
import { renderFilter } from './views/filter.js';
import { renderFlashcard } from './views/flashcard.js';
import { quizRoute } from './views/quiz.js';
import { renderAdd } from './views/add.js';

// tab：這個畫面屬於哪個底部分頁；null 表示不顯示底部分頁
const ROUTES = {
  record: { title: '紀錄', tab: 'record', render: renderRecord },
  flashcard: { title: '生字卡', tab: 'flashcard', render: renderFlashcard },
  spelling: { title: '拼字', tab: 'spelling', render: quizRoute('spelling') },
  choice: { title: '選擇題', tab: 'choice', render: quizRoute('choice') },
  add: { title: '新增', tab: 'add', render: renderAdd },
  filter: { title: '選擇範圍', tab: null, render: renderFilter },
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

  const { name, params } = parseHash();
  const route = ROUTES[name];
  document.title = `${route.title} · My Vocabulary`;
  document.body.classList.toggle('no-tabbar', !route.tab);
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.route === route.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  view.replaceChildren();
  window.scrollTo(0, 0);
  const result = await route.render(view, params);
  if (typeof result === 'function') cleanup = result;
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
  const banner = h('div', { class: 'pending-banner', role: 'alert', hidden: true }, text, button);
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
