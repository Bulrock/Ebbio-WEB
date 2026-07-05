// Speaks words in the target language using the browser Web Speech API
// (SpeechSynthesis) — the web counterpart of flutter_tts, fully offline
// once the OS voices are installed.

const LOCALES = {
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  pl: 'pl-PL',
  nl: 'nl-NL',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
};

// Voices load asynchronously in most browsers; keep the list warm.
let _voices = [];
function refreshVoices() {
  if ('speechSynthesis' in window) _voices = window.speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickVoice(locale) {
  if (_voices.length === 0) refreshVoices();
  const lang = locale.toLowerCase();
  const two = lang.slice(0, 2);
  return (
    _voices.find((v) => v.lang.toLowerCase() === lang) ||
    _voices.find((v) => v.lang.toLowerCase().startsWith(two)) ||
    null
  );
}

export function speak(text, langCode) {
  if (!('speechSynthesis' in window)) return;
  const locale = LOCALES[langCode] || langCode;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  const voice = pickVoice(locale);
  if (voice) u.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
