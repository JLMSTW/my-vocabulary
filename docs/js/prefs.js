/**
 * 個人偏好，存在這支手機的 localStorage：發音速度、生字卡方向。
 */

export const SPEECH_RATES = [0.6, 0.8, 1];

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // 無法儲存時只影響下次開啟的預設值
  }
}

export function getSpeechRate() {
  const rate = read('mv.speechRate', 1);
  return SPEECH_RATES.includes(rate) ? rate : 1;
}

export function setSpeechRate(rate) {
  write('mv.speechRate', rate);
}

/** 新增單字時上次選的語言 */
export function getAddLanguage() {
  return read('mv.addLanguage', 'FR') === 'IT' ? 'IT' : 'FR';
}

export function setAddLanguage(language) {
  write('mv.addLanguage', language);
}

/** 選擇題方向：'foreign'（看外文選中文）或 'zh'（看中文選外文） */
export function getChoiceDirection() {
  return read('mv.choiceDirection', 'foreign') === 'zh' ? 'zh' : 'foreign';
}

export function setChoiceDirection(direction) {
  write('mv.choiceDirection', direction);
}

/** 生字卡方向：'foreign'（外文 → 中文）或 'zh'（中文 → 外文） */
export function getCardDirection() {
  return read('mv.cardDirection', 'foreign') === 'zh' ? 'zh' : 'foreign';
}

export function setCardDirection(direction) {
  write('mv.cardDirection', direction);
}
