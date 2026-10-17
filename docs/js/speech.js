/**
 * 發音：瀏覽器 Web Speech API。只在使用者點擊時呼叫。
 * 法文 fr-FR、義大利文 it-IT；速度可選 0.6 / 0.8 / 1，預設用上次選的速度。
 */
import { getSpeechRate } from './prefs.js';
import { toast } from './util.js';

const LOCALES = { FR: 'fr-FR', IT: 'it-IT' };
const NAMES = { FR: '法文', IT: '義大利文' };

function findVoice(locale) {
  const voices = window.speechSynthesis.getVoices();
  const norm = (v) => v.lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => norm(v) === locale.toLowerCase()) ||
    voices.find((v) => norm(v).startsWith(locale.slice(0, 2)))
  );
}

/** 念出外文。找不到語音時顯示提示。 */
export function speak(text, language, rate = getSpeechRate()) {
  if (!('speechSynthesis' in window)) {
    toast('這個瀏覽器不支援發音');
    return;
  }
  const locale = LOCALES[language];
  const synth = window.speechSynthesis;
  const voice = findVoice(locale);
  // iPhone 第一次呼叫時語音清單可能還是空的，此時仍以語言代碼嘗試發音
  if (!voice && synth.getVoices().length) {
    toast(`找不到${NAMES[language]}語音。iPhone 可到「設定 › 輔助使用 › 朗讀內容 › 聲音」下載。`);
    return;
  }
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  synth.speak(utterance);
}

if ('speechSynthesis' in window) {
  // 先觸發語音清單載入
  window.speechSynthesis.getVoices();
}
