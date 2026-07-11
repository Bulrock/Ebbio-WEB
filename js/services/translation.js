// Translation hints via the free MyMemory API (no key, browser-friendly
// CORS). The daily character limit is practically unreachable for single
// words.

export async function translate(text, sourceLang, targetLang) {
  // A same-language course needs no hint, and MyMemory returns garbage
  // for identical language pairs.
  if (sourceLang === targetLang) return null;
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLang}|${targetLang}`,
  });
  const url = `https://api.mymemory.translated.net/get?${params}`;
  // A hung request must not block the add-word flow indefinitely.
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  return parseTranslation(await response.text());
}

/// Parses a MyMemory response. Kept separate for offline tests.
export function parseTranslation(jsonBody) {
  let decoded;
  try {
    decoded = JSON.parse(jsonBody);
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== 'object') return null;

  // MyMemory reports errors (quota, invalid pair) as text with a
  // responseStatus other than 200.
  const status = decoded.responseStatus;
  if (status !== 200 && status !== '200') return null;

  const data = decoded.responseData;
  const translated = data && data.translatedText;
  if (typeof translated !== 'string') return null;

  // Low-confidence memory matches are usually unrelated garbage.
  const match = data.match;
  if (typeof match === 'number' && match < 0.3) return null;

  const result = translated.trim();
  if (result === '' || result.toUpperCase().includes('MYMEMORY WARNING')) {
    return null;
  }
  return result;
}
