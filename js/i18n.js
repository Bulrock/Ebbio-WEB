// Localization: mirrors the Flutter AppLocalizations.
// UI locale resolution matches main.dart resolveUiLocale():
// explicit settings.uiLang wins, else the active course native language,
// falling back to English when unsupported.
import { STRINGS, SUPPORTED_LOCALES } from './i18n_data.js';

let _locale = 'en';

export function setLocale(locale) {
  _locale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  document.documentElement.lang = _locale;
}

export function currentLocale() {
  return _locale;
}

/// Resolves the UI locale the same way the mobile app does.
export function resolveUiLocale(settings, activeCourseNativeLang) {
  const pick = settings && settings.uiLang
    ? settings.uiLang
    : (activeCourseNativeLang || '');
  return SUPPORTED_LOCALES.includes(pick) ? pick : 'en';
}

/// The device locale (2-letter), used before storage opens (splash).
export function deviceLocale() {
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(nav) ? nav : 'en';
}

/// Translates [key], substituting {placeholder} tokens from [params].
/// Falls back to English, then to the raw key.
export function t(key, params) {
  const table = STRINGS[_locale] || STRINGS.en;
  let value = table[key];
  if (value == null) value = STRINGS.en[key];
  if (value == null) return key;
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] != null ? String(params[name]) : m,
    );
  }
  return value;
}

export { SUPPORTED_LOCALES };
