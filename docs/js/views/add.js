/**
 * 新增單字：先選語言，再填表單。
 * 外文（含定冠詞）與中文必填；主題、標籤可選既有的或輸入新的；例句只存在 Sheet。
 * 送出成功後清空表單（保留語言），可以連續新增。
 */
import { addWord, ApiError, errorMessage, loadData } from '../data.js';
import { canonical } from '../grading.js';
import { getAddLanguage, setAddLanguage } from '../prefs.js';
import { appendChildren, h, icon, normText, setChildren, toast } from '../util.js';
import { languageToggle } from './common.js';

const POS_OPTIONS = [
  ['', '（不填）'],
  ['n.m.', '名詞（陽性）'],
  ['n.f.', '名詞（陰性）'],
  ['n.m.pl.', '名詞（陽性複數）'],
  ['n.f.pl.', '名詞（陰性複數）'],
  ['v.', '動詞'],
  ['adj.', '形容詞'],
  ['adv.', '副詞'],
  ['prep.', '介系詞'],
  ['conj.', '連接詞'],
  ['pron.', '代名詞'],
  ['phr.', '片語'],
];
const NEW_TOPIC = '__new__';
const ARTICLE = { FR: /^(l'|(le|la|les)\s)/i, IT: /^(l'|(il|lo|la|i|gli|le)\s)/i };
const ARTICLE_EXAMPLE = { FR: 'la boulangerie', IT: 'il pane' };

const ERRORS = {
  duplicate: '這個字已經在生字庫裡了（語言、外文、中文都相同）。',
  missing_word: '請填外文。',
  missing_meaning: '請填中文。',
};

const byLocale = (a, b) => a.localeCompare(b, 'zh-Hant');

export async function renderAdd(container) {
  const data = await loadData();
  let language = getAddLanguage();
  let selectedTags = [];
  let newTags = [];   // 這次輸入、生字庫裡還沒有的標籤

  // ---------- 欄位 ----------
  const wordInput = h('input', {
    id: 'add-word', class: 'input', type: 'text', required: true,
    autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false',
    lang: language.toLowerCase(), enterkeyhint: 'next',
  });
  const articleHint = h('p', { class: 'field-hint', hidden: true });
  const meaningInput = h('input', { id: 'add-meaning', class: 'input', type: 'text', required: true, enterkeyhint: 'next' });
  const posSelect = h('select', { id: 'add-pos', class: 'select' },
    POS_OPTIONS.map(([value, label]) => h('option', { value }, label)));
  const topicSelect = h('select', { id: 'add-topic', class: 'select' });
  const topicInput = h('input', {
    class: 'input tag-input', type: 'text', placeholder: '輸入新主題', 'aria-label': '新主題', enterkeyhint: 'done',
  });
  const topicAdder = h('div', { class: 'tag-adder', hidden: true }, topicInput,
    h('button', { type: 'button', class: 'btn btn-small', onclick: () => confirmTopic() }, '加入'));
  const tagBox = h('div', { class: 'chips', role: 'group', 'aria-label': '標籤' });
  const exampleInput = h('textarea', {
    id: 'add-example', class: 'input textarea', rows: 2,
    autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', lang: language.toLowerCase(),
  });
  const formError = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-large' }, '加入生字庫');

  // ---------- 主題 ----------
  let newTopics = [];   // 這次輸入、生字庫裡還沒有的主題
  const drawTopics = (keep = topicSelect.value) => {
    const existing = [...new Set(data.vocabulary.map((w) => w.topic).filter(Boolean))];
    const topics = [...new Set([...existing, ...newTopics])].sort(byLocale);
    setChildren(topicSelect,
      h('option', { value: '' }, '（不填）'),
      topics.map((t) => h('option', { value: t }, t)),
      h('option', { value: NEW_TOPIC }, '＋ 新增主題…')
    );
    topicSelect.value = topics.includes(keep) || keep === NEW_TOPIC ? keep : '';
    topicAdder.hidden = topicSelect.value !== NEW_TOPIC;
  };
  // 按「加入」、Enter，或離開輸入框（例如按 iPhone 鍵盤上方的「完成」）：新主題加進選單並選好
  const confirmTopic = () => {
    const topic = normText(topicInput.value);
    if (!topic) return;
    topicInput.value = '';
    if (!newTopics.includes(topic)) newTopics.push(topic);
    drawTopics(topic);
  };
  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); topicInput.blur(); confirmTopic(); }
  });
  topicInput.addEventListener('change', confirmTopic);
  topicSelect.addEventListener('change', () => {
    topicAdder.hidden = topicSelect.value !== NEW_TOPIC;
    if (!topicAdder.hidden) topicInput.focus();
  });

  // ---------- 標籤 ----------
  let addingTag = false;
  const drawTags = () => {
    const existing = [...new Set(data.vocabulary.flatMap((w) => w.tags))].sort(byLocale);
    const all = [...existing, ...newTags.filter((t) => !existing.includes(t))];
    const chips = all.map((tag) => {
      const on = selectedTags.includes(tag);
      return h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(on),
        onclick: () => {
          selectedTags = on ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
          drawTags();
        },
      }, on ? icon('check') : null, tag);
    });

    if (addingTag) {
      const tagInput = h('input', {
        class: 'input tag-input', type: 'text', placeholder: '新標籤', 'aria-label': '新標籤',
        enterkeyhint: 'done',
      });
      let done = false;
      const confirmTag = () => {
        if (done) return;
        done = true;
        const tag = normText(tagInput.value).replace(/[,，]/g, '');
        addingTag = false;
        if (tag) {
          if (!all.includes(tag)) newTags.push(tag);
          if (!selectedTags.includes(tag)) selectedTags.push(tag);
        }
        drawTags();
      };
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmTag(); }
        if (e.key === 'Escape') { done = true; addingTag = false; drawTags(); }
      });
      // 離開輸入框（例如按 iPhone 鍵盤上方的「完成」）時也加入
      tagInput.addEventListener('change', confirmTag);
      tagBox.replaceChildren(...chips,
        h('div', { class: 'tag-adder' }, tagInput,
          h('button', { type: 'button', class: 'btn btn-small', onclick: confirmTag }, '加入')));
      tagInput.focus();
    } else {
      tagBox.replaceChildren(...chips,
        h('button', { type: 'button', class: 'chip chip-new', onclick: () => { addingTag = true; drawTags(); } },
          icon('plus'), '新標籤'));
    }
  };

  // ---------- 名詞要含定冠詞的提醒（不擋送出） ----------
  const checkArticle = () => {
    const isNoun = posSelect.value.startsWith('n.');
    const value = canonical(wordInput.value);
    const missing = isNoun && value && !ARTICLE[language].test(value);
    articleHint.hidden = !missing;
    articleHint.textContent = missing ? `名詞要含定冠詞，例如 ${ARTICLE_EXAMPLE[language]}。` : '';
  };
  wordInput.addEventListener('input', checkArticle);
  // 外文欄按 Enter 跳到中文欄，不直接送出
  wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); meaningInput.focus(); }
  });
  posSelect.addEventListener('change', checkArticle);

  // ---------- 語言 ----------
  const languageBox = h('div', {});
  const drawLanguage = () => {
    languageBox.replaceChildren(languageToggle(language, (code) => {
      language = code;
      setAddLanguage(code);
      wordInput.lang = code.toLowerCase();
      exampleInput.lang = code.toLowerCase();
      drawLanguage();
      checkArticle();
    }));
  };

  // ---------- 送出 ----------
  const setInvalid = (input, invalid) => {
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  const reset = () => {
    wordInput.value = '';
    meaningInput.value = '';
    posSelect.value = '';
    topicSelect.value = '';
    topicInput.value = '';
    exampleInput.value = '';
    selectedTags = [];
    newTags = [];
    newTopics = [];
    addingTag = false;
    drawTopics('');
    drawTags();
    checkArticle();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    formError.hidden = true;
    const topic = topicSelect.value === NEW_TOPIC ? normText(topicInput.value) : topicSelect.value;
    const payload = {
      language,
      word: canonical(wordInput.value),
      meaning_zh: normText(meaningInput.value),
      part_of_speech: posSelect.value,
      topic,
      tags: selectedTags,
      example: normText(exampleInput.value),
    };

    setInvalid(wordInput, !payload.word);
    setInvalid(meaningInput, !payload.meaning_zh);
    if (!payload.word || !payload.meaning_zh) {
      showError(!payload.word ? ERRORS.missing_word : ERRORS.missing_meaning);
      (!payload.word ? wordInput : meaningInput).focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = '加入中…';
    try {
      const saved = await addWord(payload);
      toast(`已加入：${saved.word}`);
      reset();
      wordInput.focus();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      showError(ERRORS[code] || `沒有加入成功：${errorMessage(err)}`);
    } finally {
      submit.disabled = false;
      submit.textContent = '加入生字庫';
    }
  };

  const showError = (message) => {
    formError.textContent = message;
    formError.hidden = false;
  };

  // ---------- 版面 ----------
  drawLanguage();
  drawTopics('');
  drawTags();

  appendChildren(container,
    h('header', { class: 'page-head' }, h('h1', {}, '新增單字')),
    h('form', { class: 'add-form', novalidate: true, onsubmit: onSubmit },
      languageBox,
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'add-word' }, '外文（含定冠詞）', h('span', { class: 'req' }, ' *')),
        wordInput, articleHint),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'add-meaning' }, '中文', h('span', { class: 'req' }, ' *')),
        meaningInput),
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'add-pos' }, '詞性'), posSelect),
        h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'add-topic' }, '主題'), topicSelect)),
      topicAdder,
      h('div', { class: 'field' },
        h('div', { class: 'field-label field-label-row' }, '標籤', h('small', {}, '可多選')),
        tagBox),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'add-example' }, '例句', h('span', { class: 'field-note' }, ' · 只存在 Sheet，不顯示在卡片上')),
        exampleInput),
      formError,
      submit
    )
  );
}
