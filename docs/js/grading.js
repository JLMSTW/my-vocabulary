/**
 * 拼字批改。
 * - 大小寫不計、去除前後空白、連續空白視為一個
 * - 重音符號嚴格檢查（e ≠ é）
 * - 定冠詞必須拼出且正確
 * - 比對前雙方都做 Unicode NFC 正規化
 * - iPhone 會自動把 ' 打成 ’，視為相同
 * 答錯時盡量說明原因，並標出正確答案中要注意的位置（marks）。
 */

const ARTICLES = {
  FR: /^(?:(l')|(le|la|les)\s+)(.+)$/,
  IT: /^(?:(l')|(il|lo|la|i|gli|le)\s+)(.+)$/,
};

/** 顯示與比對用的標準形式（保留大小寫）。 */
export function canonical(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function base(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

function splitArticle(text, language) {
  const m = ARTICLES[language] && text.match(ARTICLES[language]);
  if (!m) return { article: '', rest: text };
  return { article: m[1] || m[2], rest: m[3] };
}

/** 只差重音符號時，回傳答案中重音不同的位置；不是只差重音則回傳 null。 */
function accentDiff(input, answer) {
  if (input.length !== answer.length || base(input) !== base(answer)) return null;
  const positions = [];
  for (let i = 0; i < answer.length; i++) if (input[i] !== answer[i]) positions.push(i);
  return positions;
}

/**
 * 回傳 { correct, reason, marks }
 * reason：答錯原因（判斷不出來時為 null）
 * marks：正確答案（canonical 後）中要標示的範圍 [[start, end], ...]
 */
export function gradeSpelling(input, answer, language) {
  const shown = canonical(answer);
  const a = canonical(input).toLowerCase();
  const c = shown.toLowerCase();

  if (!a) return { correct: false, reason: '沒有作答', marks: [] };
  if (a === c) return { correct: true, reason: null, marks: [] };

  const ia = splitArticle(a, language);
  const ca = splitArticle(c, language);
  const restOffset = c.length - ca.rest.length;
  const articleMark = [[0, ca.article.replace(/\s+$/, '').length]];

  // 主體只差重音：回傳主體中的標示位置與說明
  const restCheck = (inputRest) => {
    if (inputRest === ca.rest) return { same: true, marks: [], note: '' };
    const diff = accentDiff(inputRest, ca.rest);
    if (!diff) return null;
    return {
      same: true,
      marks: diff.map((i) => [restOffset + i, restOffset + i + 1]),
      note: `重音符號不對，應該是 ${diff.map((i) => ca.rest[i]).join('、')}`,
    };
  };

  if (ca.article) {
    // 少了定冠詞：輸入的整串就是主體
    const missing = restCheck(a);
    if (missing && !ia.article) {
      return {
        correct: false,
        reason: [`少了定冠詞 ${ca.article}`, missing.note].filter(Boolean).join('；'),
        marks: [...articleMark, ...missing.marks],
      };
    }
    // 定冠詞錯了
    const rest = ia.article ? restCheck(ia.rest) : null;
    if (rest && ia.article !== ca.article) {
      return {
        correct: false,
        reason: [`定冠詞應該是 ${ca.article}，不是 ${ia.article}`, rest.note].filter(Boolean).join('；'),
        marks: [...articleMark, ...rest.marks],
      };
    }
    // 定冠詞對，只差重音
    if (rest && rest.note) return { correct: false, reason: rest.note, marks: rest.marks };
  } else if (ia.article && (ia.rest === c || accentDiff(ia.rest, c))) {
    return { correct: false, reason: '這個字不需要定冠詞', marks: [] };
  }

  const diff = accentDiff(a, c);
  if (diff) {
    return {
      correct: false,
      reason: `重音符號不對，應該是 ${diff.map((i) => c[i]).join('、')}`,
      marks: diff.map((i) => [i, i + 1]),
    };
  }
  return { correct: false, reason: null, marks: [] };
}
