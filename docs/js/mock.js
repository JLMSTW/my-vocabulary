/**
 * 假資料：前端原型階段使用，格式與後端 getData 回傳相同。
 * 用固定種子的亂數產生，每次重新整理結果都一樣，方便比對畫面。
 */
import { taipeiDay } from './util.js';

const WORDS = [
  // [language, word, meaning_zh, part_of_speech, topic, tags]
  ['FR', 'la boulangerie', '麵包店', 'n.f.', '城市', '地點,商店'],
  ['FR', 'le marché', '市場', 'n.m.', '城市', '地點,商店'],
  ['FR', 'la gare', '火車站', 'n.f.', '交通', '地點'],
  ['FR', 'le billet', '票', 'n.m.', '交通', '旅行'],
  ['FR', "l'addition", '帳單', 'n.f.', '餐廳', '旅行,常用'],
  ['FR', 'le serveur', '服務生', 'n.m.', '餐廳', '人物'],
  ['FR', 'la fourchette', '叉子', 'n.f.', '餐廳', '餐具'],
  ['FR', 'le couteau', '刀子', 'n.m.', '餐廳', '餐具'],
  ['FR', 'la pomme', '蘋果', 'n.f.', '食物', '水果'],
  ['FR', 'le fromage', '起司', 'n.m.', '食物', '常用'],
  ['FR', 'les épinards', '菠菜', 'n.m.pl.', '食物', '蔬菜'],
  ['FR', 'la chemise', '襯衫', 'n.f.', '衣服', '購物'],
  ['FR', 'le pantalon', '褲子', 'n.m.', '衣服', '購物'],
  ['FR', 'cher', '貴的', 'adj.', '購物', '常用'],
  ['FR', 'acheter', '買', 'v.', '購物', '常用,動詞'],
  ['FR', 'la clé', '鑰匙', 'n.f.', '家', '常用'],
  ['FR', 'la fenêtre', '窗戶', 'n.f.', '家', ''],
  ['FR', "l'hôpital", '醫院', 'n.m.', '城市', '地點'],
  ['FR', 'le médecin', '醫生', 'n.m.', '健康', '人物'],
  ['FR', 'demain', '明天', 'adv.', '時間', '常用'],
  ['IT', 'il pane', '麵包', 'n.m.', '食物', '常用'],
  ['IT', 'la stazione', '火車站', 'n.f.', '交通', '地點'],
  ['IT', 'il biglietto', '票', 'n.m.', '交通', '旅行'],
  ['IT', 'il conto', '帳單', 'n.m.', '餐廳', '旅行,常用'],
  ['IT', 'il cameriere', '服務生', 'n.m.', '餐廳', '人物'],
  ['IT', 'la forchetta', '叉子', 'n.f.', '餐廳', '餐具'],
  ['IT', 'il coltello', '刀子', 'n.m.', '餐廳', '餐具'],
  ['IT', 'la mela', '蘋果', 'n.f.', '食物', '水果'],
  ['IT', 'il formaggio', '起司', 'n.m.', '食物', '常用'],
  ['IT', 'gli spinaci', '菠菜', 'n.m.pl.', '食物', '蔬菜'],
  ['IT', 'la camicia', '襯衫', 'n.f.', '衣服', '購物'],
  ['IT', 'caro', '貴的', 'adj.', '購物', '常用'],
  ['IT', 'comprare', '買', 'v.', '購物', '常用,動詞'],
  ['IT', 'la chiave', '鑰匙', 'n.f.', '家', '常用'],
  ['IT', 'la finestra', '窗戶', 'n.f.', '家', ''],
  ['IT', "l'ospedale", '醫院', 'n.m.', '城市', '地點'],
  ['IT', 'il medico', '醫生', 'n.m.', '健康', '人物'],
  ['IT', 'domani', '明天', 'adv.', '時間', '常用'],
  ['IT', 'la città', '城市', 'n.f.', '城市', '地點'],
  ['IT', 'perché', '為什麼；因為', 'conj.', '常用語', '常用'],
];

/** 固定種子的亂數（mulberry32） */
function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoAt(daysAgo, hour, minute) {
  const day = new Date(Date.now() - daysAgo * 86400000);
  return `${taipeiDay(day)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
}

export function createMockData() {
  const rand = seeded(20261016);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const vocabulary = WORDS.map(([language, word, meaning_zh, part_of_speech, topic, tags], i) => ({
    word_id: `mock-${String(i + 1).padStart(3, '0')}`,
    language,
    word,
    meaning_zh,
    part_of_speech,
    topic,
    tags: tags ? tags.split(',') : [],
    date_added: isoAt(60 - i, 20, 0),
  }));

  const fr = vocabulary.filter((w) => w.language === 'FR');
  const it = vocabulary.filter((w) => w.language === 'IT');
  const modes = ['flashcard', 'spelling', 'choice'];

  // 過去 45 天：約七成的天有練習；今天練了 7 個字，未達標
  const history = [];
  for (let daysAgo = 45; daysAgo >= 0; daysAgo--) {
    if (daysAgo > 0 && rand() < 0.3) continue;
    const r = rand();
    const langs = r < 0.4 ? [fr] : r < 0.7 ? [it] : [fr, it];
    const target = daysAgo === 0 ? 7 : 6 + Math.floor(rand() * 8);
    let count = 0;
    langs.forEach((pool, li) => {
      const n = langs.length === 1 ? target : li === 0 ? Math.ceil(target / 2) : Math.floor(target / 2);
      const roundId = `mock-round-${daysAgo}-${li}`;
      const mode = pick(modes);
      for (let k = 0; k < n; k++) {
        const word = pick(pool);
        count++;
        history.push({
          round_id: roundId,
          word_id: word.word_id,
          practice_mode: mode,
          is_correct: rand() < 0.85,
          practiced_at: isoAt(daysAgo, (daysAgo === 0 ? 8 : 19) + li, k * 2),
        });
      }
    });
  }

  // 由紀錄推算複習進度（與後端規則相同）
  const byId = new Map();
  history.forEach((hItem) => {
    const p = byId.get(hItem.word_id) || {
      word_id: hItem.word_id, correct_count: 0, incorrect_count: 0,
      consecutive_correct: 0, needs_review: false, last_reviewed_at: '',
    };
    if (hItem.is_correct) {
      p.correct_count++;
      p.consecutive_correct++;
      if (p.consecutive_correct >= 3) p.needs_review = false;
    } else {
      p.incorrect_count++;
      p.consecutive_correct = 0;
      p.needs_review = true;
    }
    p.last_reviewed_at = hItem.practiced_at;
    byId.set(hItem.word_id, p);
  });

  return { vocabulary, progress: [...byId.values()], history };
}
