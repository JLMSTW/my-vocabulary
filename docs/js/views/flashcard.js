/**
 * 生字卡：點一下翻面；發音只念外文。
 * 兩種方向：外文 → 中文（正面外文，背面中文與詞性）、中文 → 外文（正面中文與詞性，背面外文）。
 * 中文 → 外文時，翻面前不能發音，避免先聽到答案。
 * 「記住了」視同答對、「再複習」視同答錯。
 * 標記先暫存，離開生字卡畫面（換分頁、切語言、切方向、App 進背景）時一次寫入。
 */
import { loadData } from '../data.js';
import { applyFilter, loadFilter, saveFilter, switchLanguage, MIN_WORDS } from '../filters.js';
import { getCardDirection, setCardDirection } from '../prefs.js';
import { submitRound } from '../sync.js';
import { appendChildren, h, icon, nowIso, posLabel, setChildren, shuffle, toast, uuid } from '../util.js';
import { DIRECTIONS, notEnoughCard, practiceHead, segmented, speakRow } from './common.js';

export async function renderFlashcard(container) {
  const data = await loadData();
  let filter = loadFilter();
  let direction = getCardDirection();
  let session = null;   // 尚未寫入的標記 { round, attempts }
  let deck = [];
  let index = 0;
  let tally = { remembered: [], review: [] };

  const flush = async () => {
    if (!session || !session.attempts.length) return;
    const { round, attempts } = session;
    session = null;
    round.finished_at = nowIso();
    const res = await submitRound(round, attempts);
    if (!res.ok) toast('生字卡紀錄沒有存成功，可以按畫面上方的「重送」。');
  };

  const mark = (word, remembered) => {
    if (!session) {
      session = {
        round: {
          round_id: uuid(),
          practice_mode: 'flashcard',
          language: filter.language,
          filters: { ...filter, card_direction: direction },
          started_at: nowIso(),
        },
        attempts: [],
      };
    }
    session.attempts.push({
      word_id: word.word_id,
      user_answer: remembered ? '記住了' : '再複習',
      correct_answer: word.word,
      is_correct: remembered,
      practiced_at: nowIso(),
    });
    (remembered ? tally.remembered : tally.review).push(word);
    index++;
    draw();
  };

  const startDeck = (words) => {
    deck = shuffle(words);
    index = 0;
    tally = { remembered: [], review: [] };
    draw();
  };

  const changeLanguage = async (language) => {
    await flush();
    filter = switchLanguage(data, filter, language);
    saveFilter(filter);
    startDeck(applyFilter(data, filter));
  };

  const changeDirection = async (value) => {
    await flush();
    direction = value;
    setCardDirection(value);
    draw();
  };

  const draw = () => {
    const matched = applyFilter(data, filter);
    setChildren(container, 
      practiceHead({ filter, count: matched.length, from: 'flashcard', onLanguage: changeLanguage }),
      segmented(DIRECTIONS, direction, changeDirection, { label: '生字卡方向', variant: 'seg-compact' })
    );
    if (matched.length < MIN_WORDS) {
      appendChildren(container, notEnoughCard(matched.length, 'flashcard'));
    } else if (index >= deck.length) {
      appendChildren(container, doneCard());
    } else {
      appendChildren(container, ...cardView(deck[index]));
    }
  };

  const cardView = (word) => {
    let flipped = false;
    const zhFirst = direction === 'zh';
    const lang = word.language.toLowerCase();
    const frontLabel = zhFirst ? '翻回中文' : '翻回外文';
    const hint = h('span', {}, '點卡片翻面');
    const pos = word.part_of_speech ? posLabel(word.part_of_speech) : '';

    // 中文面、外文面；方向決定哪一面在正面
    const foreignFace = (cls, corner) => h('span', { class: `face ${cls}` },
      corner ? h('span', { class: 'face-corner' }, word.meaning_zh) : h('span', { class: 'face-lang' }, word.language),
      h('span', { class: 'face-word', lang }, word.word),
      corner ? null : h('span', { class: 'face-hint' }, icon('flip'), '翻面')
    );
    const zhFace = (cls, corner) => h('span', { class: `face ${cls}` },
      corner ? h('span', { class: 'face-corner', lang }, word.word) : h('span', { class: 'face-lang' }, word.language),
      h('span', { class: 'face-meaning' }, word.meaning_zh),
      pos ? h('span', { class: 'pos-chip' }, pos) : null,
      corner ? null : h('span', { class: 'face-hint' }, icon('flip'), '翻面')
    );
    const front = zhFirst ? zhFace('face-front', false) : foreignFace('face-front', false);
    const back = zhFirst ? foreignFace('face-back', true) : zhFace('face-back', true);
    back.setAttribute('aria-hidden', 'true');

    const speech = speakRow(() => word.word, word.language, { enabled: !zhFirst });
    const card = h('button', {
      type: 'button',
      class: 'flashcard',
      'aria-pressed': 'false',
      onclick: () => {
        flipped = !flipped;
        card.classList.toggle('is-flipped', flipped);
        card.setAttribute('aria-pressed', String(flipped));
        front.setAttribute('aria-hidden', String(flipped));
        back.setAttribute('aria-hidden', String(!flipped));
        hint.textContent = flipped ? `點卡片${frontLabel}` : '點卡片翻面';
        if (zhFirst) speech.setEnabled(flipped);
      },
    }, h('span', { class: 'flashcard-inner' }, front, back));

    return [
      h('div', { class: 'meta-row' }, h('span', {}, `第 ${index + 1} 張，共 ${deck.length} 張`), hint),
      card,
      speech.el,
      h('div', { class: 'grid-2 answer-row' },
        h('button', { type: 'button', class: 'btn btn-review', onclick: () => mark(word, false) }, '再複習'),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => mark(word, true) }, '記住了')
      ),
    ];
  };

  const doneCard = () => h('div', { class: 'card done-card' },
    h('h2', {}, '這一輪看完了'),
    h('p', { class: 'muted' }, `記住了 ${tally.remembered.length} 張 · 再複習 ${tally.review.length} 張`),
    h('div', { class: 'stack' },
      tally.review.length
        ? h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => startDeck(tally.review) },
            `只看再複習的 ${tally.review.length} 張`)
        : null,
      h('button', {
        type: 'button',
        class: `btn btn-block${tally.review.length ? '' : ' btn-primary'}`,
        onclick: () => startDeck(applyFilter(data, filter)),
      }, '再來一輪')
    )
  );

  // App 進入背景（切換 App、鎖定畫面）時先寫入，避免紀錄遺失
  const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', onVisibility);

  startDeck(applyFilter(data, filter));

  // 離開生字卡畫面時由 app.js 呼叫
  return async () => {
    document.removeEventListener('visibilitychange', onVisibility);
    await flush();
  };
}
