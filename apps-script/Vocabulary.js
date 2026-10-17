/**
 * 讀取全部資料、新增單字。
 */

/**
 * 前端一次取得所需資料：單字（不含例句）、複習進度、練習紀錄。
 * 缺 word_id 或 word 的列（例如 onEdit 尚未補上）會略過。
 */
function getData_() {
  fillMissingIdsIfIdle_();
  const vocabulary = readRows(SHEETS.vocabulary)
    .filter((r) => r.word_id && r.word)
    .map(toVocabItem_);

  const progress = readRows(SHEETS.progress)
    .filter((r) => r.word_id)
    .map((r) => ({
      word_id: r.word_id,
      correct_count: Number(r.correct_count) || 0,
      incorrect_count: Number(r.incorrect_count) || 0,
      consecutive_correct: Number(r.consecutive_correct) || 0,
      needs_review: r.needs_review === 'TRUE',
      last_reviewed_at: r.last_reviewed_at,
    }));

  const history = readRows(SHEETS.history)
    .filter((r) => r.word_id)
    .map((r) => ({
      round_id: r.round_id,
      word_id: r.word_id,
      practice_mode: r.practice_mode,
      is_correct: r.is_correct === 'TRUE',
      practiced_at: r.practiced_at,
    }));

  return { vocabulary, progress, history };
}

/**
 * 補上 Vocabulary 缺少或重複的 word_id（保險機制：onEdit 沒觸發時，例如手機 App、貼上整列）。
 * 有 word 但沒有 word_id 的列補新 ID；與上方列重複的 word_id 換新 ID 並重設 date_added。
 * 只寫回有變動的列。呼叫端負責加鎖。回傳補上的數量。
 */
function fillMissingIds_() {
  const def = SHEETS.vocabulary;
  const sheet = getSheet(def);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const col = (h) => def.headers.indexOf(h);
  const values = sheet.getRange(2, 1, lastRow - 1, def.headers.length).getDisplayValues();
  const seen = new Set();
  const now = nowIso();
  const changed = [];

  values.forEach((row, i) => {
    if (!normText(row[col('word')])) return;
    const id = normText(row[col('word_id')]);
    if (id && !seen.has(id)) {
      seen.add(id);
      return;
    }
    const newWordId = newId();
    seen.add(newWordId);
    row[col('word_id')] = newWordId;
    if (id || !normText(row[col('date_added')])) row[col('date_added')] = now;
    row[col('updated_at')] = now;
    changed.push(i);
  });

  changed.forEach((i) => {
    const range = sheet.getRange(i + 2, 1, 1, def.headers.length);
    range.setNumberFormat('@');
    range.setValues([values[i]]);
  });
  return changed.length;
}

/** 讀取資料前順手補 ID；正在寫入時就跳過，下次讀取再補。 */
function fillMissingIdsIfIdle_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;
  try {
    fillMissingIds_();
  } finally {
    lock.releaseLock();
  }
}

/**
 * 新增單字。payload：language, word, meaning_zh（必填），
 * part_of_speech, example, topic, tags（選填，tags 可為陣列或逗號字串）。
 */
function addWord_(payload) {
  const input = {
    language: normText(payload.language).toUpperCase(),
    word: normText(payload.word),
    meaning_zh: normText(payload.meaning_zh),
    part_of_speech: normText(payload.part_of_speech),
    example: normText(payload.example),
    topic: normText(payload.topic),
    tags: normTags(payload.tags),
  };
  if (!LANGUAGES.includes(input.language)) throw new ApiError('invalid_language');
  if (!input.word) throw new ApiError('missing_word');
  if (!input.meaning_zh) throw new ApiError('missing_meaning');

  return withLock(() => {
    if (isDuplicate_(input)) throw new ApiError('duplicate');
    const now = nowIso();
    const record = { ...input, word_id: newId(), date_added: now, updated_at: now };
    appendRows(SHEETS.vocabulary, [record]);
    return toVocabItem_(record);
  });
}

/** 重複判定：language + word（不分大小寫）+ meaning_zh 都相同。 */
function isDuplicate_(input) {
  const key = duplicateKey_(input);
  return readRows(SHEETS.vocabulary).some((r) => r.word && duplicateKey_(r) === key);
}

function duplicateKey_(r) {
  return [
    normText(r.language).toUpperCase(),
    normText(r.word).toLowerCase(),
    normText(r.meaning_zh),
  ].join('\u0000');
}

function toVocabItem_(r) {
  return {
    word_id: r.word_id,
    language: normText(r.language).toUpperCase(),
    word: normText(r.word),
    meaning_zh: normText(r.meaning_zh),
    part_of_speech: normText(r.part_of_speech),
    topic: normText(r.topic),
    tags: splitTags(r.tags),
    date_added: r.date_added,
  };
}
