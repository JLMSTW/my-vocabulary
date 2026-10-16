/**
 * 回合結果寫入：PracticeHistory、ReviewProgress、Rounds。
 * 拼字、選擇題在回合結束時呼叫；生字卡在離開畫面時呼叫一次。
 */

const REVIEW_CLEAR_STREAK = 3;

/**
 * payload：
 * {
 *   round: { round_id, practice_mode, language, filters, started_at, finished_at },
 *   attempts: [{ word_id, user_answer, correct_answer, is_correct, practiced_at }]
 * }
 * round_id 由前端產生，重送時沿用同一個；已寫過的回合不會重複寫入。
 * score 與 total 由後端依 attempts 計算。
 */
function saveRound_(payload) {
  const round = payload.round || {};
  const roundId = normText(round.round_id);
  const mode = normText(round.practice_mode);
  const language = normText(round.language).toUpperCase();
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];

  if (!roundId) throw new ApiError('missing_round_id');
  if (!PRACTICE_MODES.includes(mode)) throw new ApiError('invalid_practice_mode');
  if (!LANGUAGES.includes(language)) throw new ApiError('invalid_language');
  if (!attempts.length) throw new ApiError('missing_attempts');

  const now = nowIso();
  const rows = attempts.map((a) => {
    const wordId = normText(a.word_id);
    if (!wordId || typeof a.is_correct !== 'boolean') throw new ApiError('invalid_attempt');
    return {
      attempt_id: newId(),
      round_id: roundId,
      word_id: wordId,
      practice_mode: mode,
      user_answer: normText(a.user_answer),
      correct_answer: normText(a.correct_answer),
      is_correct: a.is_correct ? 'TRUE' : 'FALSE',
      practiced_at: normText(a.practiced_at) || now,
    };
  });
  const score = rows.filter((r) => r.is_correct === 'TRUE').length;
  const result = { round_id: roundId, score, total: rows.length };

  return withLock(() => {
    if (readRows(SHEETS.rounds).some((r) => r.round_id === roundId)) {
      return { ...result, already_saved: true };
    }
    // 上次寫到一半失敗時，紀錄可能已寫入，避免重複
    if (!readRows(SHEETS.history).some((r) => r.round_id === roundId)) {
      appendRows(SHEETS.history, rows);
    }
    updateProgress_(rows);
    appendRows(SHEETS.rounds, [{
      round_id: roundId,
      practice_mode: mode,
      language,
      filters: typeof round.filters === 'string' ? round.filters : JSON.stringify(round.filters || {}),
      score,
      total: rows.length,
      started_at: normText(round.started_at) || now,
      finished_at: normText(round.finished_at) || now,
    }]);
    return { ...result, already_saved: false };
  });
}

/**
 * 錯題優先規則：
 * - 答錯：incorrect_count + 1，consecutive_correct = 0，needs_review = TRUE
 * - 答對：correct_count + 1，consecutive_correct + 1，達到 3 時 needs_review = FALSE
 */
function updateProgress_(historyRows) {
  const records = readRows(SHEETS.progress).filter((r) => r.word_id);
  const byId = new Map(records.map((r) => [r.word_id, r]));

  historyRows.forEach((h) => {
    let p = byId.get(h.word_id);
    if (!p) {
      p = {
        word_id: h.word_id,
        correct_count: 0,
        incorrect_count: 0,
        consecutive_correct: 0,
        needs_review: 'FALSE',
        last_reviewed_at: '',
      };
      byId.set(h.word_id, p);
      records.push(p);
    }
    if (h.is_correct === 'TRUE') {
      p.correct_count = (Number(p.correct_count) || 0) + 1;
      p.consecutive_correct = (Number(p.consecutive_correct) || 0) + 1;
      if (p.consecutive_correct >= REVIEW_CLEAR_STREAK) p.needs_review = 'FALSE';
    } else {
      p.incorrect_count = (Number(p.incorrect_count) || 0) + 1;
      p.consecutive_correct = 0;
      p.needs_review = 'TRUE';
    }
    p.last_reviewed_at = h.practiced_at;
  });

  writeAllRows(SHEETS.progress, records);
}
