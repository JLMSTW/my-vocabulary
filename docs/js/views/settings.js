/**
 * 連線設定：輸入 Apps Script Web App 網址與 token，測試連線成功後才儲存到這支手機。
 */
import { clearConnection, getConnection, setConnection, URL_PATTERN } from '../connection.js';
import { callApi, clearCache, errorMessage, USE_MOCK } from '../data.js';
import { h, icon, toast } from '../util.js';

export async function renderSettings(container) {
  const saved = getConnection();

  const urlInput = h('input', {
    id: 'set-url', class: 'input', type: 'url', inputmode: 'url',
    autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'https://script.google.com/macros/s/…/exec',
    value: saved ? saved.url : '',
  });
  const tokenInput = h('input', {
    id: 'set-token', class: 'input', type: 'password',
    autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false',
    placeholder: saved ? '已儲存；不變更可留空' : '貼上 token',
  });
  const showToken = h('button', {
    type: 'button', class: 'link-btn link-btn-inline',
    onclick: () => {
      const hidden = tokenInput.type === 'password';
      tokenInput.type = hidden ? 'text' : 'password';
      showToken.textContent = hidden ? '隱藏 token' : '顯示 token';
    },
  }, '顯示 token');
  const message = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-large' }, '連線並儲存');

  const showMessage = (text) => {
    message.textContent = text;
    message.hidden = false;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    message.hidden = true;
    const url = urlInput.value.trim();
    // 從執行記錄複製時可能連「token：」和空白、換行一起貼上，先去掉
    const typed = tokenInput.value.replace(/^\s*token\s*[:：]/i, '').replace(/\s+/g, '');
    // 已設定過且 token 欄留空時，沿用原本的 token
    const token = typed || (saved ? saved.token : '');

    if (!URL_PATTERN.test(url)) {
      showMessage('網址格式不對。請貼上部署時的「網頁應用程式」網址，開頭是 https://script.google.com/，結尾是 /exec。');
      urlInput.focus();
      return;
    }
    if (!token) {
      showMessage('請貼上 token。');
      tokenInput.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = '連線中…';
    try {
      const data = await callApi('getData', {}, { connection: { url, token } });
      try {
        setConnection({ url, token });
      } catch (err) {
        showMessage('連線成功，但這個瀏覽器無法儲存設定（可能是私密瀏覽模式）。');
        return;
      }
      clearCache();
      toast(`連線成功，生字庫共 ${(data.vocabulary || []).length} 個字`);
      location.hash = '#/record';
    } catch (err) {
      showMessage(errorMessage(err));
    } finally {
      submit.disabled = false;
      submit.textContent = '連線並儲存';
    }
  };

  const confirmClear = h('div', { class: 'notice notice-wrong', hidden: true },
    h('p', {}, '要清除這支手機上的網址與 token 嗎？Google Sheet 裡的資料不受影響。'),
    h('div', { class: 'exit-actions' },
      h('button', { type: 'button', class: 'btn btn-small', onclick: () => { confirmClear.hidden = true; } }, '取消'),
      h('button', {
        type: 'button', class: 'btn btn-small btn-primary',
        onclick: () => {
          clearConnection();
          clearCache();
          toast('已清除連線設定');
          location.hash = '#/settings';
          renderSettingsAgain();
        },
      }, '清除'))
  );
  const renderSettingsAgain = () => {
    container.replaceChildren();
    renderSettings(container);
  };

  container.append(
    h('header', { class: 'page-head page-head-back' },
      saved ? h('a', { class: 'icon-btn', href: '#/record', 'aria-label': '返回' }, icon('chevron-left')) : null,
      h('h1', {}, '連線設定')
    ),
    USE_MOCK
      ? h('div', { class: 'notice notice-wrong' }, h('p', {}, '目前是假資料模式（網址有 ?mock=1）。要使用 Google Sheet，請在網址加上 ?mock=0 重新開啟。'))
      : null,
    h('p', { class: 'muted' },
      saved
        ? '已連線到你的 Google Sheet。要更換網址或 token 時，在下面重新輸入。'
        : '第一次使用，請貼上 Apps Script 的「網頁應用程式」網址和 token。這兩樣只會存在這支手機上。'),
    h('form', { class: 'add-form', novalidate: true, onsubmit: onSubmit },
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'set-url' }, 'Web App 網址'), urlInput),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'set-token' }, 'token'), tokenInput, showToken),
      message,
      submit
    ),
    saved
      ? h('div', { class: 'stack' },
          h('button', { type: 'button', class: 'link-btn', onclick: () => { confirmClear.hidden = false; } }, '清除這支手機上的連線設定'),
          confirmClear)
      : null
  );
}
