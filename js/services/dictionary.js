// Word definitions from Wiktionary via the MediaWiki Action API with the
// TextExtracts extension. Unlike the REST page/definition endpoint it is
// available on every language domain ({lang}.wiktionary.org), so the
// definition comes in the language being learned. Note that the language
// code is the Wiktionary *edition* (the language of the explanations),
// not the language of the word itself.
//
// `origin=*` opts into anonymous CORS so the browser request succeeds.
//
// Results are typed objects instead of nullable strings, so the UI can
// tell "no such word" from "no network":
//   { status: 'success', entry: { definition, title, pageId, sourceUrl, rawExtract } }
//   { status: 'notFound' | 'timeout' | 'networkError' | 'invalidResponse' }

/// Version of the cleaning algorithm, recorded with every cache entry.
export const PARSER_VERSION = 2;

/// Wiktionary edition codes are short lowercase subdomain labels;
/// anything else must never reach the host name.
const LANG_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;

const ok = (entry) => ({ status: 'success', entry });
const failure = (status) => ({ status });

export async function fetchDefinition(word, targetLang) {
  const term = word.trim();
  const lang = targetLang.trim().toLowerCase();
  if (term === '' || !LANG_PATTERN.test(lang)) return failure('notFound');

  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    format: 'json',
    // Pages arrive as a list instead of a pageid-keyed object.
    formatversion: '2',
    origin: '*',
    titles: term,
  });
  const url = `https://${lang}.wiktionary.org/w/api.php?${params}`;

  let response;
  try {
    // A hung request must not block the add-word flow indefinitely.
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    return failure(e && e.name === 'TimeoutError' ? 'timeout' : 'networkError');
  }
  if (!response.ok) return failure('networkError');
  return parseResult(await response.text(), lang);
}

/// Parses a formatversion=2 Action API response body. Kept separate so
/// it can be tested without network access.
export function parseResult(jsonBody, lang) {
  let decoded;
  try {
    decoded = JSON.parse(jsonBody);
  } catch {
    return failure('invalidResponse');
  }
  if (!decoded || typeof decoded !== 'object') return failure('invalidResponse');

  const pages = decoded.query && decoded.query.pages;
  if (!Array.isArray(pages)) return failure('invalidResponse');

  for (const page of pages) {
    if (!page || typeof page !== 'object') continue;
    // With formatversion=2 a missing article has "missing": true.
    if (page.missing === true) continue;
    const extract = page.extract;
    const title = page.title;
    if (typeof extract !== 'string' || extract.trim() === '') continue;
    if (typeof title !== 'string') continue;

    // An article that has no section about the course language is
    // "no such word" for this course, even though the page exists.
    const section = extractLanguageSection(extract, lang);
    if (section == null || section.trim() === '') continue;

    return ok({
      definition: cleanExtract(section),
      title,
      pageId: Number.isInteger(page.pageid) ? page.pageid : 0,
      sourceUrl: articleUrl(lang, title),
      rawExtract: extract,
    });
  }
  return failure('notFound');
}

/// Canonical article link; built from the title (spaces become
/// underscores), which survives redirects.
export function articleUrl(lang, title) {
  return `https://${lang}.wiktionary.org/wiki/${encodeURI(title.replaceAll(' ', '_'))}`;
}

// How each supported edition titles the section about its own language.
// Editions like en/es title it with the bare language name
// ("== English =="); pl/de put it in parentheses after the word
// ("== ryba (język polski) =="); ru/pt use level-1 headings.
const OWN_LANGUAGE_SECTION = {
  en: ['English'],
  pl: ['język polski'],
  ru: ['Русский'],
  es: ['Español'],
  de: ['Deutsch'],
  fr: ['Français'],
  pt: ['Português'],
  it: ['Italiano'],
  tr: ['Türkçe'],
  zh: ['漢語', '汉语'],
  ja: ['日本語'],
};

function headingLevel(line) {
  if (line.length < 3 || !line.startsWith('=') || !line.endsWith('=')) {
    return null;
  }
  let level = 0;
  while (level < line.length && line[level] === '=') level++;
  return level;
}

/// Cuts the article down to the section about the edition's own
/// language: an English course must not learn "д" as an English word
/// just because the article exists.
///
/// Returns null when the article has language sections but none of
/// them is the target language. An extract without headings is
/// returned unchanged.
export function extractLanguageSection(raw, lang) {
  const markers = OWN_LANGUAGE_SECTION[lang.trim().toLowerCase()];
  if (!markers) return raw; // unknown edition — keep all

  const lines = raw.split('\n').map((l) => l.trim());
  let topLevel = Infinity;
  for (const line of lines) {
    const level = headingLevel(line);
    if (level != null && level < topLevel) topLevel = level;
  }
  if (topLevel === Infinity) return raw;

  const kept = [];
  let inSection = false;
  for (const line of lines) {
    const level = headingLevel(line);
    if (level != null && level <= topLevel) {
      const text = line.replaceAll('=', '').trim();
      // Exact name or "word (name)" — a plain contains-check would
      // let "Old English" pass for "English".
      inSection = markers.some((m) => text === m || text.endsWith(`(${m})`));
      continue;
    }
    if (inSection) kept.push(line);
  }
  return kept.length === 0 ? null : kept.join('\n');
}

// Section labels whose content is a word-in-200-languages list —
// noise on a flashcard (the article link has it all).
const TRANSLATION_SECTION_LABELS = new Set([
  'translations', // en
  'tłumaczenia', // pl
  'перевод', // ru
  'traducciones', // es
  'übersetzungen', // de
  'traductions', // fr
  'traduções', // pt
  'traduzioni', // it
  'çeviriler', // tr
  '翻譯', '翻译', // zh
  '訳語', // ja
]);

/// A short "label:" line — the same shape the definition formatter
/// treats as a section header.
const SECTION_HEADER_PATTERN = /^[\p{L}][\p{L} ]{0,30}:$/u;

/// Removes section headings ("== Español =="), blank lines, and the
/// translation sections. The rest of the article text is kept in full —
/// the card scrolls.
export function cleanExtract(raw) {
  const kept = [];
  let skippingTranslations = false;
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (line.startsWith('=') && line.endsWith('=')) continue;

    if (SECTION_HEADER_PATTERN.test(line)) {
      const label = line.slice(0, -1).trim().toLowerCase();
      skippingTranslations = TRANSLATION_SECTION_LABELS.has(label);
      if (skippingTranslations) continue;
    }
    if (skippingTranslations) continue;
    kept.push(line);
  }
  return kept.join('\n');
}
