// Word definitions from Wiktionary via the MediaWiki Action API with the
// TextExtracts extension. Unlike the REST page/definition endpoint it is
// available on every language domain ({lang}.wiktionary.org), so the
// definition comes in the language being learned.
//
// `origin=*` opts into anonymous CORS so the browser request succeeds.

export async function fetchDefinition(word, targetLang) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    format: 'json',
    origin: '*',
    titles: word,
  });
  const url = `https://${targetLang}.wiktionary.org/w/api.php?${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return parseExtract(await response.text());
}

/// Extracts the text from an Action API response and strips wiki markup.
export function parseExtract(jsonBody) {
  let decoded;
  try {
    decoded = JSON.parse(jsonBody);
  } catch {
    return null;
  }
  const pages = decoded && decoded.query && decoded.query.pages;
  if (!pages || typeof pages !== 'object') return null;

  for (const page of Object.values(pages)) {
    if (!page || typeof page !== 'object') continue;
    // A missing article arrives as {"missing": ""} with pageid = -1.
    if ('missing' in page) continue;
    const extract = page.extract;
    if (typeof extract === 'string' && extract.trim() !== '') {
      return cleanExtract(extract);
    }
  }
  return null;
}

function lastWhitespaceIndex(s) {
  for (let i = s.length - 1; i >= 0; i--) {
    if (/\s/.test(s[i])) return i;
  }
  return -1;
}

/// Removes section headings ("== Español =="), blank lines, and limits the
/// length so an entire multi-language article never lands in storage.
export function cleanExtract(raw, maxLength = 1500) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .filter((l) => !(l.startsWith('=') && l.endsWith('=')));

  let text = lines.join('\n');
  if (text.length > maxLength) {
    const cut = text.substring(0, maxLength);
    const lastNewline = cut.lastIndexOf('\n');
    const lastSpace = lastWhitespaceIndex(cut);
    const boundary =
      lastNewline > Math.floor(maxLength / 2)
        ? lastNewline
        : lastSpace > 0
          ? lastSpace
          : maxLength;
    text = cut.substring(0, boundary) + '…';
  }
  return text;
}
