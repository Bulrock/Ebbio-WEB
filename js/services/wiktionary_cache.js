// Cache of Wiktionary lookups in its own IndexedDB store, so
// dictionary data and user cards never mix. Entries hold the raw
// extract and are re-cleaned by the current parser on every hit —
// improving the parser retroactively improves cached lookups without
// a refetch.
import { get, put, getAll, del } from '../db.js';
import {
  PARSER_VERSION,
  cleanExtract,
  extractLanguageSection,
} from './dictionary.js';

const STORE = 'wiktionaryCache';

/// A cache hit younger than this skips the network entirely.
export const FRESH_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/// Entries unused this long are evicted at startup.
export const KEEP_FOR_MS = 90 * 24 * 60 * 60 * 1000;

export function cacheKeyFor(word, lang) {
  return `${lang.trim().toLowerCase()}|${word.trim().toLowerCase()}`;
}

/// Returns the cached entry, bumping its last-used timestamp.
export async function cacheLookup(word, lang, nowMs) {
  const entry = await get(STORE, cacheKeyFor(word, lang));
  if (!entry) return null;
  entry.lastUsedAt = nowMs;
  await put(STORE, entry);
  return entry;
}

export function isFresh(entry, nowMs) {
  return nowMs - entry.fetchedAt < FRESH_FOR_MS;
}

export function cacheStore(word, lang, entry, nowMs) {
  return put(STORE, {
    cacheKey: cacheKeyFor(word, lang),
    word: word.trim(),
    lang: lang.trim().toLowerCase(),
    title: entry.title,
    pageId: entry.pageId,
    sourceUrl: entry.sourceUrl,
    rawExtract: entry.rawExtract,
    fetchedAt: nowMs,
    lastUsedAt: nowMs,
    parserVersion: PARSER_VERSION,
  });
}

/// Rebuilds a dictionary entry from the cache, cleaning the raw
/// extract with the current parser. Lenient about the
/// language-section filter: a cached entry was a success once, so
/// serving all of it beats serving nothing.
export function toEntry(cached) {
  const section =
    extractLanguageSection(cached.rawExtract, cached.lang) ?? cached.rawExtract;
  return {
    definition: cleanExtract(section),
    title: cached.title,
    pageId: cached.pageId,
    sourceUrl: cached.sourceUrl,
    rawExtract: cached.rawExtract,
  };
}

/// Evicts entries that have not been used for KEEP_FOR_MS.
export async function cachePrune(nowMs) {
  for (const entry of await getAll(STORE)) {
    if (nowMs - entry.lastUsedAt > KEEP_FOR_MS) {
      await del(STORE, entry.cacheKey);
    }
  }
}
