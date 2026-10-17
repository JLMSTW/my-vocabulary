/**
 * 拼字練習（中文 → 外文）與選擇題（可切換：看外文選中文／看中文選外文）。
 * 每回合 5 題，不重複，錯題優先加權抽題。
 * 回合結束後一次寫入；中途離開不存檔。
 */
import { loadData, USE_MOCK } from '../data.js';
import { applyFilter, filterSummary, loadFilter, saveFilter, switchLanguage, LANGUAGE_NAMES, MIN_WORDS } from '../filters.js';
import { gradeSpelling, canonical } from '../grading.js';
import { choiceOptions, distinctMeanings, reviewSet, weightedSample, ROUND_SIZE } from '../picker.js';
import { getChoiceDirection, setChoiceDirection } from '../prefs.js';
import { speak } from '../speech.js';
import { retryPending, submitRound } from '../sync.js';
import { appendChildren, h, icon, nowIso, posLabel, setChildren, uuid } from '../util.js';
import { DIRECTIONS, notEnoughCard, practiceHead, segmented, speakRow } from './common.js';

const MODES = {
  spelling: {
    title: '拼字',
    intro: () => '看中文與詞性，拼出外文。大小寫不計，重音符號與定冠詞要正確。',
    yourAnswer: '你寫的',
  },
  choice: {
    title: '選擇題',
    intro: (direction) => (direction === 'zh'
      ? '看中文與詞性，從四個選項中選出外文。'
      : '看外文，從四個選項中選出中文意思。'),
    yourAnswer: '你選了',
  },
};

export function quizRoute(mode) {
  return (container) => renderQuiz(container, mode);
}

async function renderQuiz(container, mode) {
  const data = await loadData();
  const M = MODES[mode];
  let filter = loadFilter();
  let direction = getChoiceDirection();
  let round = null;

  // ---------- 開始畫面 ----------
  const drawStart = () => {
    round = null;
    const matched = applyFilter(data, filter);
    const meanings = distinctMeanings(data, filter.language);
    setChildren(container, 
      practiceHead({
        filter,
        count: matched.length,
        from: mode,
        onLanguage: (language) => {
          filter = switchLanguage(data, filter, language);
          saveFilter(filter);
          drawStart();
        },
      }),
      mode === 'choice'
        ? segmented(DIRECTIONS, direction, (value) => {
            direction = value;
            setChoiceDirection(value);
            drawStart();
          }, { label: '選擇題方向', variant: 'seg-compact' })
        : null
    );

    if (matched.length < MIN_WORDS) {
      appendChildren(container, notEnoughCard(matched.length, mode));
    } else if (mode === 'choice' && meanings < 4) {
      appendChildren(container, notEnoughCard(matched.length, mode,
        `${LANGUAGE_NAMES[filter.language]}至少要有 4 個不同的中文意思才能出選擇題，目前只有 ${meanings} 個。`));
    } else {
      appendChildren(container, 
        h('div', { class: 'card start-card' },
          h('h2', {}, `${M.title}練習`),
          h('p', { class: 'muted' }, M.intro(direction)),
          h('p', { class: 'muted small' }, `每回合 ${ROUND_SIZE} 題，待複習的字比較常出現。`),
          h('button', { type: 'button', class: 'btn btn-primary btn-block btn-large', onclick: start }, '開始練習')
        )
      );
    }
  };

  const start = () => {
    const matched = applyFilter(data, filter);
    const words = weightedSample(matched, ROUND_SIZE, reviewSet(data));
    round = {
      meta: {
        round_id: uuid(),
        practice_mode: mode,
        language: filter.language,
        filters: mode === 'choice' ? { ...filter, choice_direction: direction } : { ...filter },
        started_at: nowIso(),
      },
      direction,
      questions: words.map((word) => ({
        word,
        options: mode === 'choice' ? choiceOptions(data, word, direction) : null,
      })),
      index: 0,
      attempts: [],
    };
    drawQuestion();
  };

  // ---------- 作答畫面 ----------
  const quizHead = () => {
    const confirmBar = h('div', { class: 'notice notice-wrong exit-confirm', hidden: true },
      h('p', {}, '要離開這回合嗎？已作答的題目不會存檔。'),
      h('div', { class: 'exit-actions' },
        h('button', { type: 'button', class: 'btn btn-small', onclick: () => { confirmBar.hidden = true; } }, '繼續作答'),
        h('button', { type: 'button', class: 'btn btn-small btn-primary', onclick: drawStart }, '離開'))
    );
    const results = round.attempts.map((a) => a.is_correct);
    return [
      h('header', { class: 'quiz-head' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '離開這回合', onclick: () => { confirmBar.hidden = false; } }, icon('x')),
        h('h1', {}, `${M.title} · ${LANGUAGE_NAMES[round.meta.language]}`),
        h('span', { class: 'quiz-count' }, `${Math.min(round.index + 1, ROUND_SIZE)} / ${round.questions.length}`)
      ),
      progressBar(round.questions.length, results, round.index),
      confirmBar,
    ];
  };

  const record = (q, userAnswer, correctAnswer, isCorrect) => {
    round.attempts.push({
      word_id: q.word.word_id,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      practiced_at: nowIso(),
    });
  };

  const nextButton = () => {
    const last = round.index === round.questions.length - 1;
    return h('button', {
      type: 'button',
      class: 'btn btn-primary btn-block btn-large next-btn',
      onclick: () => {
        round.index++;
        if (last) drawEnd();
        else drawQuestion();
      },
    }, last ? '看結果' : '下一題');
  };

  const drawQuestion = () => {
    const q = round.questions[round.index];
    setChildren(container, ...quizHead());
    window.scrollTo(0, 0);
    if (mode === 'spelling') spellingQuestion(q);
    else choiceQuestion(q);
  };

  const spellingQuestion = (q) => {
    const { word } = q;
    const lang = word.language.toLowerCase();
    const input = h('input', {
      class: 'answer-input',
      type: 'text',
      lang,
      autocapitalize: 'off',
      autocorrect: 'off',
      autocomplete: 'off',
      spellcheck: 'false',
      enterkeyhint: 'done',
      'aria-label': '你的答案',
      placeholder: '輸入外文（含定冠詞）',
    });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-large', disabled: true }, '確認');
    const giveUp = h('button', { type: 'button', class: 'link-btn', onclick: () => check('') }, '不會，看答案');
    input.addEventListener('input', () => { submit.disabled = !input.value.trim(); });

    const answerArea = h('form', {
      class: 'stack',
      onsubmit: (e) => {
        e.preventDefault();
        if (input.value.trim()) check(input.value);
      },
    }, h('div', { class: 'field-label' }, '你的答案'), input, submit, giveUp);

    const check = (value) => {
      const typed = canonical(value);
      const result = gradeSpelling(typed, word.word, word.language);
      record(q, typed, word.word, result.correct);
      input.blur();
      setChildren(container, 
        ...quizHead(),
        promptCard,
        h('div', { class: 'field-label' }, '你的答案'),
        h('div', { class: `answer-box ${result.correct ? 'is-correct' : 'is-wrong'}` },
          h('span', { class: result.correct ? '' : 'struck', lang }, typed || '（沒有作答）'),
          h('span', { class: 'answer-status' },
            icon(result.correct ? 'check' : 'x'), result.correct ? '答對' : '答錯')
        ),
        correctBox(word, result.correct ? '發音' : '正確拼法', result.marks),
        result.correct
          ? null
          : h('p', { class: 'reason' }, [result.reason, '這個字之後會優先出現。'].filter(Boolean).join('，')),
        nextButton()
      );
    };

    const promptCard = h('div', { class: 'prompt-card' },
      h('div', { class: 'prompt-label' }, `請拼出${LANGUAGE_NAMES[word.language]}`),
      h('div', { class: 'prompt-zh' }, word.meaning_zh),
      word.part_of_speech ? h('span', { class: 'pos-chip pos-chip-light' }, posLabel(word.part_of_speech)) : null
    );

    appendChildren(container, promptCard, answerArea);
    input.focus();
  };

  const choiceQuestion = (q) => {
    const { word } = q;
    const zhFirst = round.direction === 'zh';
    const lang = word.language.toLowerCase();
    const answer = zhFirst ? word.word : word.meaning_zh;
    let answered = false;
    const buttons = q.options.map((option) => h('button', {
      type: 'button',
      class: 'option',
      onclick: () => choose(option),
    }, h('span', { class: 'option-text', lang: zhFirst ? lang : null }, option), h('span', { class: 'option-status' })));

    const choose = (option) => {
      if (answered) return;
      answered = true;
      const correct = option === answer;
      record(q, option, answer, correct);
      buttons.forEach((btn, i) => {
        const value = q.options[i];
        const status = btn.querySelector('.option-status');
        btn.disabled = true;
        if (value === answer) {
          btn.classList.add('is-correct');
          status.replaceChildren(icon('check'), correct ? '答對' : '正確答案');
        } else if (value === option) {
          btn.classList.add('is-wrong');
          status.replaceChildren(icon('x'), '你的答案');
        }
      });
      // 進度條即時更新
      container.querySelector('.quiz-progress').replaceWith(
        progressBar(round.questions.length, round.attempts.map((a) => a.is_correct), round.index)
      );
      // 看中文選外文時，作答後才提供正確答案的發音
      if (zhFirst) appendChildren(container, correctBox(word, '正確答案', []));
      appendChildren(container, nextButton());
    };

    const prompt = zhFirst
      ? h('div', { class: 'prompt-card' },
          h('div', { class: 'prompt-label' }, `選出${LANGUAGE_NAMES[word.language]}`),
          h('div', { class: 'prompt-zh' }, word.meaning_zh),
          word.part_of_speech ? h('span', { class: 'pos-chip pos-chip-light' }, posLabel(word.part_of_speech)) : null)
      : h('div', { class: 'prompt-card' },
          h('div', { class: 'prompt-label' }, '選出中文意思'),
          h('div', { class: 'prompt-word', lang }, word.word),
          speakRow(() => word.word, word.language).el);

    appendChildren(container, prompt, h('div', { class: 'options', role: 'group', 'aria-label': '選項' }, buttons));
  };

  // ---------- 回合結束 ----------
  const drawEnd = async () => {
    const { meta, attempts, questions } = round;
    meta.finished_at = nowIso();
    const score = attempts.filter((a) => a.is_correct).length;
    const wrong = attempts
      .map((a, i) => ({ a, word: questions[i].word }))
      .filter((x) => !x.a.is_correct);
    const summary = filterSummary(meta.filters);
    const status = h('p', { class: 'save-status' }, '存檔中…');

    setChildren(container, 
      h('section', { class: 'result-card' },
        h('div', { class: 'result-sub' },
          [M.title, LANGUAGE_NAMES[meta.language], summary === '全部單字' ? '' : summary].filter(Boolean).join(' · ')),
        h('div', { class: 'result-score' }, h('strong', {}, score), h('span', {}, ` / ${questions.length}`)),
        h('div', { class: 'result-label' }, `答對 ${score} 題`),
        progressBar(questions.length, attempts.map((a) => a.is_correct), -1, 'result-progress')
      ),
      wrong.length
        ? h('section', { class: 'stack' },
            h('h2', { class: 'section-title' }, '答錯的字'),
            wrong.map(({ a, word }) => h('div', { class: 'wrong-item' },
              h('div', {},
                h('div', { class: 'wrong-word', lang: word.language.toLowerCase() }, word.word),
                h('div', {}, word.meaning_zh),
                h('div', { class: 'wrong-mine' }, `${M.yourAnswer}：${a.user_answer || '（沒有作答）'}`)
              ),
              h('button', {
                type: 'button', class: 'icon-btn icon-btn-outline',
                'aria-label': `播放 ${word.word} 的發音`,
                onclick: () => speak(word.word, word.language),
              }, icon('speaker'))
            ))
          )
        : h('div', { class: 'notice notice-info' }, icon('check'), h('span', {}, '全部答對！')),
      status,
      h('div', { class: 'grid-2' },
        h('a', { class: 'btn btn-large', href: '#/flashcard' }, '回生字卡'),
        h('button', { type: 'button', class: 'btn btn-primary btn-large', onclick: start }, '再練一回合')
      )
    );
    window.scrollTo(0, 0);

    const res = await submitRound(meta, attempts);
    if (res.ok) {
      status.className = 'save-status is-saved';
      status.replaceChildren(icon('check'),
        USE_MOCK ? '已存檔（假資料模式，重新整理後會消失）' : '已存到 Google Sheet，答錯的字之後會優先出現');
    } else {
      status.className = 'save-status is-failed';
      status.replaceChildren(icon('x'), '沒有存成功。',
        h('button', {
          type: 'button', class: 'btn btn-small',
          onclick: async () => {
            const left = await retryPending();
            if (!left) {
              status.className = 'save-status is-saved';
              status.replaceChildren(icon('check'), '已重新存檔');
            }
          },
        }, '重送'));
    }
  };

  drawStart();
}

/** 進度條：答對藍、答錯橘、目前題目深色、未作答灰。 */
function progressBar(total, results, current, extraClass = '') {
  return h('div', { class: `quiz-progress ${extraClass}`, 'aria-hidden': 'true' },
    Array.from({ length: total }, (_, i) => h('span', {
      class: results[i] === true ? 'is-correct' : results[i] === false ? 'is-wrong' : i === current ? 'is-current' : '',
    }))
  );
}

/** 正確答案框：標示要注意的位置（例如少了的定冠詞、重音），附發音按鈕。 */
function correctBox(word, label, marks) {
  const text = canonical(word.word);
  const parts = [];
  let pos = 0;
  [...marks].sort((a, b) => a[0] - b[0]).forEach(([s, e]) => {
    if (s > pos) parts.push(text.slice(pos, s));
    parts.push(h('mark', {}, text.slice(s, e)));
    pos = e;
  });
  parts.push(text.slice(pos));

  return h('div', { class: 'correct-box' },
    h('div', {},
      h('div', { class: 'correct-label' }, label),
      h('div', { class: 'correct-word', lang: word.language.toLowerCase() }, parts)
    ),
    h('button', {
      type: 'button', class: 'icon-btn icon-btn-round',
      'aria-label': `播放 ${word.word} 的發音`,
      onclick: () => speak(word.word, word.language),
    }, icon('speaker'))
  );
}
