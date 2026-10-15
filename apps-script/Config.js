/**
 * 工作表名稱與欄位定義。欄位順序即 Sheet 的欄位順序，修改時要同步調整 Sheet。
 */

const TIME_ZONE = 'Asia/Taipei';
const TOKEN_PROPERTY = 'API_TOKEN';
const LANGUAGES = ['FR', 'IT'];
const PRACTICE_MODES = ['spelling', 'choice', 'flashcard'];

const SHEETS = {
  vocabulary: {
    name: 'Vocabulary',
    headers: [
      'word_id', 'language', 'word', 'meaning_zh', 'part_of_speech',
      'example', 'topic', 'tags', 'date_added', 'updated_at',
    ],
  },
  history: {
    name: 'PracticeHistory',
    headers: [
      'attempt_id', 'round_id', 'word_id', 'practice_mode',
      'user_answer', 'correct_answer', 'is_correct', 'practiced_at',
    ],
  },
  progress: {
    name: 'ReviewProgress',
    headers: [
      'word_id', 'correct_count', 'incorrect_count',
      'consecutive_correct', 'needs_review', 'last_reviewed_at',
    ],
  },
  rounds: {
    name: 'Rounds',
    headers: [
      'round_id', 'practice_mode', 'language', 'filters',
      'score', 'total', 'started_at', 'finished_at',
    ],
  },
};
